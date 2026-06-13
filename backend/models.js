const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seeker', 'employer', 'admin'], default: 'seeker' },
  profile: {
    // Seeker specific fields
    resumeUrl: { type: String, default: '' },
    skills: [{ type: String }],
    experience: { type: String, default: '' },
    education: { type: String, default: '' },
    // Employer specific fields
    companyName: { type: String, default: '' },
    companyWebsite: { type: String, default: '' },
    companyDescription: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now }
});

// Job Schema
const JobSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String, default: '' },
  benefits: { type: String, default: '' },
  salaryRange: { type: String, default: '' },
  employmentType: { 
    type: String, 
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'], 
    default: 'Full-time' 
  },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'closed', 'flagged'], default: 'active' },
  // AI fraud detection analysis
  fraudAssessment: {
    riskLevel: { type: String, enum: ['Safe', 'Suspicious', 'Fraudulent'], default: 'Safe' },
    riskScore: { type: Number, default: 0 },
    reasons: [{ type: String }],
    evaluatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

// Application Schema
const ApplicationSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String, default: '' },
  coverLetter: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['applied', 'interviewing', 'accepted', 'rejected'], 
    default: 'applied' 
  },
  appliedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const Application = mongoose.model('Application', ApplicationSchema);

module.exports = { User, Job, Application };
