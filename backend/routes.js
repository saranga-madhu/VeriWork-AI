const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { User, Job, Application } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// ==========================================
// Middlewares
// ==========================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized: insufficient permissions' });
    }
    next();
  };
};

// ==========================================
// Authentication Routes
// ==========================================

// Register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, profile } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'seeker',
      profile: profile || {}
    });

    await newUser.save();

    // Create token
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile: newUser.profile
      }
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get/Update profile
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, profile } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (profile) updateData.profile = profile;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// Helper: Call AI Service for Job Assessment
// ==========================================
const evaluateJobFraud = async (jobData) => {
  try {
    console.log(`Sending job details to AI service: ${AI_SERVICE_URL}/predict`);
    const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      requirements: jobData.requirements || '',
      benefits: jobData.benefits || '',
      salary: jobData.salaryRange || ''
    }, { timeout: 4000 }); // 4 second timeout

    return {
      riskLevel: response.data.riskLevel || 'Safe',
      riskScore: response.data.riskScore || 0,
      reasons: response.data.reasons || [],
      evaluatedAt: new Date()
    };
  } catch (error) {
    console.error("AI Service call failed or timed out:", error.message);
    // Fallback assessment in case AI service is offline
    // Run simple regex heuristic locally on backend
    const combinedText = `${jobData.title} ${jobData.company} ${jobData.description} ${jobData.requirements}`.toLowerCase();
    const hasSuspectWords = /bitcoin|crypto|western union|moneygram|wire transfer|gift card|earn daily|payout daily|quick cash|work from home/i.test(combinedText);
    
    return {
      riskLevel: hasSuspectWords ? 'Suspicious' : 'Safe',
      riskScore: hasSuspectWords ? 50.0 : 5.0,
      reasons: hasSuspectWords 
        ? ["AI Service Offline: Local heuristics flagged suspicious buzzwords (e.g. crypto, western union, work from home)."]
        : ["AI Service Offline: Basic local checks completed with no warnings."],
      evaluatedAt: new Date()
    };
  }
};

// ==========================================
// Job Management Routes
// ==========================================

// Get all jobs (with query filters)
router.get('/jobs', async (req, res) => {
  try {
    const { search, location, employmentType, riskLevel } = req.query;
    
    const query = { status: { $ne: 'deleted' } };
    
    // Non-admins and non-employers should only see active jobs. If flagged, they are hidden or shown with warning.
    // Let's allow seekers to see active/flagged jobs, but they'll see the warning on flagged ones.
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (employmentType) {
      query.employmentType = employmentType;
    }
    
    if (riskLevel) {
      query['fraudAssessment.riskLevel'] = riskLevel;
    }

    const jobs = await Job.find(query).populate('postedBy', 'name email profile.companyName').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error("Get Jobs Error:", error);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// Get job by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.query.id || req.params.id)
      .populate('postedBy', 'name email profile.companyName profile.companyWebsite profile.companyDescription');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve job details' });
  }
});

// Create Job (Employer & Admin only)
router.post('/jobs', authenticateToken, requireRole(['employer', 'admin']), async (req, res) => {
  try {
    const { title, company, location, description, requirements, benefits, salaryRange, employmentType } = req.body;

    const jobPayload = {
      title,
      company,
      location,
      description,
      requirements,
      benefits,
      salaryRange,
      employmentType,
      postedBy: req.user.id
    };

    // Run AI fraud evaluation
    const fraudAssessment = await evaluateJobFraud(jobPayload);
    
    const newJob = new Job({
      ...jobPayload,
      fraudAssessment
    });

    await newJob.save();
    res.status(201).json(newJob);
  } catch (error) {
    console.error("Create Job Error:", error);
    res.status(500).json({ error: 'Failed to create job posting' });
  }
});

// Update Job (Employer & Admin only)
router.put('/jobs/:id', authenticateToken, requireRole(['employer', 'admin']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Verify ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this job' });
    }

    const { title, company, location, description, requirements, benefits, salaryRange, employmentType } = req.body;

    // Check if fields relevant to AI classification changed
    const contentChanged = 
      title !== job.title || 
      company !== job.company || 
      description !== job.description || 
      requirements !== job.requirements || 
      benefits !== job.benefits ||
      salaryRange !== job.salaryRange;

    job.title = title || job.title;
    job.company = company || job.company;
    job.location = location || job.location;
    job.description = description || job.description;
    job.requirements = requirements || job.requirements;
    job.benefits = benefits || job.benefits;
    job.salaryRange = salaryRange || job.salaryRange;
    job.employmentType = employmentType || job.employmentType;

    if (contentChanged) {
      job.fraudAssessment = await evaluateJobFraud(job);
    }

    await job.save();
    res.json(job);
  } catch (error) {
    console.error("Update Job Error:", error);
    res.status(500).json({ error: 'Failed to update job posting' });
  }
});

// Delete Job
router.delete('/jobs/:id', authenticateToken, requireRole(['employer', 'admin']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Verify ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    // Soft delete
    job.status = 'deleted';
    await job.save();
    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job posting' });
  }
});

// Admin Flags Job
router.post('/jobs/:id/flag', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.body; // active, flagged
    if (!['active', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.status = status;
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job flag' });
  }
});

// ==========================================
// Application Routes
// ==========================================

// Seeker applies to job
router.post('/applications/:jobId/apply', authenticateToken, requireRole(['seeker']), async (req, res) => {
  try {
    const { coverLetter, resumeUrl } = req.body;
    const jobId = req.params.jobId;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job || job.status === 'deleted') {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    // Check if already applied
    const existingApp = await Application.findOne({ jobId, seekerId: req.user.id });
    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    const newApplication = new Application({
      jobId,
      seekerId: req.user.id,
      resumeUrl: resumeUrl || '',
      coverLetter: coverLetter || ''
    });

    await newApplication.save();
    res.status(201).json(newApplication);
  } catch (error) {
    console.error("Apply Job Error:", error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get Seeker's applications
router.get('/applications/my-applications', authenticateToken, requireRole(['seeker']), async (req, res) => {
  try {
    const apps = await Application.find({ seekerId: req.user.id })
      .populate({
        path: 'jobId',
        populate: { path: 'postedBy', select: 'name email profile.companyName' }
      })
      .sort({ appliedAt: -1 });
    res.json(apps);
  } catch (error) {
    console.error("Get Seeker Applications Error:", error);
    res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

// Get Job's applications (Employer only)
router.get('/applications/job/:jobId', authenticateToken, requireRole(['employer', 'admin']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Verify ownership
    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to job applications' });
    }

    const apps = await Application.find({ jobId: req.params.jobId })
      .populate('seekerId', 'name email profile.skills profile.experience profile.education profile.resumeUrl')
      .sort({ appliedAt: -1 });
    res.json(apps);
  } catch (error) {
    console.error("Get Job Applications Error:", error);
    res.status(500).json({ error: 'Failed to retrieve applications' });
  }
});

// Update Application Status (Employer only)
router.put('/applications/:id/status', authenticateToken, requireRole(['employer', 'admin']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['applied', 'interviewing', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    const application = await Application.findById(req.params.id).populate('jobId');
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Verify ownership of the job
    if (application.jobId.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to manage this application' });
    }

    application.status = status;
    await application.save();
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

module.exports = router;
