import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Coins, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion, 
  User, 
  LogOut, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Lock,
  Mail,
  Building,
  Globe
} from 'lucide-react';

const API_BASE = 'http://localhost:5050/api';

export default function App() {
  // Navigation & Authentication
  const [view, setView] = useState('home'); // home, login, register, seeker-dashboard, employer-dashboard, job-detail, post-job
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Core Data State
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [jobApplications, setJobApplications] = useState([]); // applications for a specific job (employer view)
  const [loading, setLoading] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');

  // Form States
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seeker',
    companyName: '',
    companyWebsite: '',
    companyDescription: '',
    skills: '',
    experience: '',
    education: ''
  });

  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    requirements: '',
    benefits: '',
    salaryRange: '',
    employmentType: 'Full-time'
  });

  const [applyForm, setApplyForm] = useState({
    coverLetter: '',
    resumeUrl: ''
  });

  // Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ==========================================
  // Fetch Handlers
  // ==========================================
  
  // Set Auth headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Get current user profile
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders()
      })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(data => {
        setUser(data);
      })
      .catch(err => {
        logout();
      });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // Fetch Jobs list
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (location) queryParams.append('location', location);
      if (employmentType) queryParams.append('employmentType', employmentType);
      if (riskLevel) queryParams.append('riskLevel', riskLevel);

      const res = await fetch(`${API_BASE}/jobs?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [search, location, employmentType, riskLevel]);

  // Fetch job detail
  useEffect(() => {
    if (selectedJobId) {
      setLoading(true);
      fetch(`${API_BASE}/jobs/${selectedJobId}`)
        .then(res => {
          if (!res.ok) throw new Error('Job not found');
          return res.json();
        })
        .then(data => {
          setSelectedJob(data);
        })
        .catch(err => {
          showToast(err.message, 'error');
          setView('home');
        })
        .finally(() => setLoading(false));
    } else {
      setSelectedJob(null);
    }
  }, [selectedJobId]);

  // Fetch seeker applications
  const fetchMyApplications = async () => {
    if (!token || user?.role !== 'seeker') return;
    try {
      const res = await fetch(`${API_BASE}/applications/my-applications`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setMyApplications(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Fetch applications for an employer's job
  const fetchJobApplications = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/applications/job/${jobId}`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load candidates');
      const data = await res.json();
      setJobApplications(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ==========================================
  // Auth Logic
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      setView(data.user.role === 'employer' ? 'employer-dashboard' : 'home');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        role: authForm.role,
        profile: {
          companyName: authForm.companyName,
          companyWebsite: authForm.companyWebsite,
          companyDescription: authForm.companyDescription,
          skills: authForm.skills ? authForm.skills.split(',').map(s => s.trim()) : [],
          experience: authForm.experience,
          education: authForm.education
        }
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setToken(data.token);
      setUser(data.user);
      showToast('Registration successful!', 'success');
      setView(data.user.role === 'employer' ? 'employer-dashboard' : 'home');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    showToast('Logged out successfully', 'info');
    setView('home');
  };

  // ==========================================
  // Job Actions
  // ==========================================
  const handlePostJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(jobForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post job');
      
      showToast('Job posted successfully! AI scanner processed risks.', 'success');
      setJobForm({
        title: '',
        company: '',
        location: '',
        description: '',
        requirements: '',
        benefits: '',
        salaryRange: '',
        employmentType: 'Full-time'
      });
      fetchJobs();
      setView('employer-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditJob = (job) => {
    setEditingJobId(job._id);
    setJobForm({
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      salaryRange: job.salaryRange || '',
      employmentType: job.employmentType || 'Full-time'
    });
    setView('edit-job');
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${editingJobId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(jobForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');
      
      showToast('Job updated successfully! AI risk score updated.', 'success');
      setJobForm({
        title: '',
        company: '',
        location: '',
        description: '',
        requirements: '',
        benefits: '',
        salaryRange: '',
        employmentType: 'Full-time'
      });
      setEditingJobId(null);
      fetchJobs();
      setView('employer-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      setView('login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/applications/${selectedJobId}/apply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(applyForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply');

      showToast('Application submitted successfully!', 'success');
      setApplyForm({ coverLetter: '', resumeUrl: '' });
      fetchMyApplications();
      setView('seeker-dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Applicant status changed to ${newStatus}`, 'success');
      if (selectedJob) {
        fetchJobApplications(selectedJob._id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: user.name,
        profile: user.profile
      };
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setUser(data);
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Helper Components
  // ==========================================
  
  // Render AI Trust Badge
  const renderRiskBadge = (riskLevel) => {
    switch(riskLevel) {
      case 'Safe':
        return <span className="badge badge-safe"><ShieldCheck size={12} /> Safe</span>;
      case 'Suspicious':
        return <span className="badge badge-suspicious"><ShieldQuestion size={12} /> Suspicious</span>;
      case 'Fraudulent':
        return <span className="badge badge-fraud"><ShieldAlert size={12} /> High Risk</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`toast animate-fade-in`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="app-header">
        <div className="container nav-wrapper">
          <div className="logo-wrapper" onClick={() => { setView('home'); setSelectedJobId(null); }}>
            <ShieldCheck className="logo-icon" size={28} />
            <span>VeriWork AI</span>
          </div>

          <nav>
            <ul className="nav-links">
              <li className={`nav-link ${view === 'home' ? 'active' : ''}`} onClick={() => { setView('home'); setSelectedJobId(null); }}>
                Find Jobs
              </li>
              
              {user?.role === 'seeker' && (
                <li className={`nav-link ${view === 'seeker-dashboard' ? 'active' : ''}`} onClick={() => { setView('seeker-dashboard'); fetchMyApplications(); }}>
                  Seeker Profile
                </li>
              )}

              {user?.role === 'employer' && (
                <li className={`nav-link ${view === 'employer-dashboard' ? 'active' : ''}`} onClick={() => setView('employer-dashboard')}>
                  Employer Portal
                </li>
              )}

              {user ? (
                <>
                  <li className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}>
                    <User size={16} />
                    <span style={{ color: 'white' }}>{user.name}</span>
                  </li>
                  <li>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={logout}>
                      <LogOut size={14} /> Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button className="btn btn-text" onClick={() => setView('login')}>Sign In</button>
                  </li>
                  <li>
                    <button className="btn btn-primary" onClick={() => setView('register')}>Join Platform</button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ minHeight: 'calc(100vh - 150px)' }}>
        
        {/* VIEW: HOME / JOB BOARD */}
        {view === 'home' && (
          <div className="animate-fade-in">
            <div className="hero-section">
              <h1 className="hero-title">Secure Job Portal backed by AI</h1>
              <p className="hero-subtitle">
                Search verified job vacancies. Our state-of-the-art NLP model screens every job listing to protect you from job scams, financial fraud, and identity theft.
              </p>
            </div>

            {/* Filter controls */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
              <div className="search-bar-wrapper">
                <div className="search-input-container">
                  <Search className="search-input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by Job title, Company name, or keywords..." 
                    className="form-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '220px' }}>
                  <input 
                    type="text" 
                    placeholder="Location (e.g. Colombo, Remote)" 
                    className="form-input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label">Employment Type</label>
                  <select 
                    className="form-select" 
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label">AI Trust Level</label>
                  <select 
                    className="form-select" 
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                  >
                    <option value="">All Levels</option>
                    <option value="Safe">Safe Only</option>
                    <option value="Suspicious">Suspicious</option>
                    <option value="Fraudulent">High Risk</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => { setSearch(''); setLocation(''); setEmploymentType(''); setRiskLevel(''); }}>
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                Scanning database and analyzing risks...
              </div>
            ) : jobs.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h3>No jobs found matching your filters.</h3>
                <p style={{ marginTop: '10px' }}>Try adjusting your keyword searches or clearing your filters.</p>
              </div>
            ) : (
              <div className="jobs-list-layout">
                {jobs.map((job) => (
                  <div 
                    key={job._id} 
                    className="glass-panel job-card animate-fade-in"
                    onClick={() => { setSelectedJobId(job._id); setView('job-detail'); }}
                  >
                    <div className="job-card-main">
                      <div className="job-card-header">
                        <h3 className="job-card-title">{job.title}</h3>
                        <span className="job-card-company">{job.company}</span>
                      </div>
                      
                      <p className="job-card-desc">{job.description}</p>
                      
                      <div className="job-card-meta">
                        <span className="meta-item"><MapPin size={14} /> {job.location}</span>
                        <span className="meta-item"><Clock size={14} /> {job.employmentType}</span>
                        {job.salaryRange && (
                          <span className="meta-item"><Coins size={14} /> {job.salaryRange}</span>
                        )}
                      </div>
                    </div>

                    <div className="job-card-right">
                      {renderRiskBadge(job.fraudAssessment?.riskLevel)}
                      <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                        View Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: JOB DETAILS */}
        {view === 'job-detail' && selectedJob && (
          <div className="animate-fade-in" style={{ padding: '20px 0' }}>
            <button className="btn btn-text" style={{ marginBottom: '20px' }} onClick={() => setView('home')}>
              <ArrowLeft size={16} /> Back to Listings
            </button>

            <div className="detail-grid">
              {/* Main Job Details */}
              <div className="glass-panel detail-main">
                <div className="detail-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h1 className="detail-title">{selectedJob.title}</h1>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', color: 'var(--color-primary-light)', fontWeight: 500 }}>
                        <Building size={16} /> {selectedJob.company}
                      </div>
                    </div>
                    <div>
                      {renderRiskBadge(selectedJob.fraudAssessment?.riskLevel)}
                    </div>
                  </div>
                  
                  <div className="job-card-meta" style={{ marginTop: '20px' }}>
                    <span className="meta-item"><MapPin size={16} /> {selectedJob.location}</span>
                    <span className="meta-item"><Clock size={16} /> {selectedJob.employmentType}</span>
                    {selectedJob.salaryRange && (
                      <span className="meta-item"><Coins size={16} /> {selectedJob.salaryRange}</span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h3 className="detail-section-title">Job Description</h3>
                  <p className="detail-text">{selectedJob.description}</p>
                </div>

                {selectedJob.requirements && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Job Requirements</h3>
                    <p className="detail-text">{selectedJob.requirements}</p>
                  </div>
                )}

                {selectedJob.benefits && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Benefits & Perks</h3>
                    <p className="detail-text">{selectedJob.benefits}</p>
                  </div>
                )}
                
                {/* Apply section */}
                {user?.role === 'seeker' && (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', marginTop: '32px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Apply For This Job</h3>
                    <form onSubmit={handleApply}>
                      <div className="form-group">
                        <label className="form-label">Resume URL</label>
                        <input 
                          type="text" 
                          placeholder="Link to your resume (Google Drive, LinkedIn, etc.)" 
                          className="form-input"
                          value={applyForm.resumeUrl}
                          onChange={(e) => setApplyForm({ ...applyForm, resumeUrl: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cover Letter</label>
                        <textarea 
                          placeholder="Briefly introduce yourself and why you're a good fit..." 
                          className="form-input form-textarea"
                          value={applyForm.coverLetter}
                          onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </form>
                  </div>
                )}

                {!user && (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '32px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>You must be signed in as a job seeker to apply.</p>
                    <button className="btn btn-primary" onClick={() => setView('login')}>Sign In to Apply</button>
                  </div>
                )}
              </div>

              {/* AI Trust Analysis Sidebar */}
              <div className="detail-sidebar">
                <div className={`glass-panel ai-card ${
                  selectedJob.fraudAssessment?.riskLevel === 'Safe' ? 'safe' : 
                  selectedJob.fraudAssessment?.riskLevel === 'Suspicious' ? 'suspicious' : 'fraud'
                }`}>
                  <h3>AI Scam Evaluation</h3>
                  
                  <div className="ai-score-ring-wrapper">
                    <span className="ai-score-label" style={{ 
                      color: selectedJob.fraudAssessment?.riskLevel === 'Safe' ? 'var(--color-safe)' : 
                             selectedJob.fraudAssessment?.riskLevel === 'Suspicious' ? 'var(--color-suspicious)' : 'var(--color-fraud)'
                    }}>
                      Fraud Risk Score
                    </span>
                    <span className="ai-score-value" style={{ 
                      color: selectedJob.fraudAssessment?.riskLevel === 'Safe' ? 'var(--color-safe)' : 
                             selectedJob.fraudAssessment?.riskLevel === 'Suspicious' ? 'var(--color-suspicious)' : 'var(--color-fraud)'
                    }}>
                      {selectedJob.fraudAssessment?.riskScore}%
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Scanned using NLP models and heuristic indicators. Higher score means higher probability of being a scam.
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '20px', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Analysis Checklist:</h4>
                    <ul className="ai-reasons-list">
                      {selectedJob.fraudAssessment?.reasons?.map((reason, idx) => (
                        <li key={idx} className="ai-reason-item">
                          {selectedJob.fraudAssessment?.riskLevel === 'Safe' ? (
                            <ShieldCheck className="reason-icon safe" size={16} />
                          ) : selectedJob.fraudAssessment?.riskLevel === 'Suspicious' ? (
                            <ShieldQuestion className="reason-icon warn" size={16} />
                          ) : (
                            <ShieldAlert className="reason-icon alert" size={16} />
                          )}
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Employer Profile</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div><strong>Employer:</strong> {selectedJob.postedBy?.name}</div>
                    <div><strong>Email:</strong> {selectedJob.postedBy?.email}</div>
                    {selectedJob.postedBy?.profile?.companyWebsite && (
                      <div><strong>Website:</strong> <a href={selectedJob.postedBy.profile.companyWebsite} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)' }}>{selectedJob.postedBy.profile.companyWebsite}</a></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <div className="auth-container animate-fade-in">
            <div className="glass-panel auth-card">
              <div className="auth-header">
                <h2>Welcome Back</h2>
                <p>Access your secure job finder space</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} size={16} />
                    <input 
                      type="email" 
                      placeholder="name@company.com" 
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} size={16} />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="form-input"
                      style={{ paddingLeft: '48px' }}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Don't have an account? <span style={{ color: 'var(--color-primary-light)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setView('register')}>Register here</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: REGISTER */}
        {view === 'register' && (
          <div className="auth-container animate-fade-in" style={{ padding: '20px 0' }}>
            <div className="glass-panel auth-card" style={{ maxWidth: '520px' }}>
              <div className="auth-header">
                <h2>Create Account</h2>
                <p>Register as a job seeker or posting employer</p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">I want to register as a:</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      type="button"
                      className={`btn ${authForm.role === 'seeker' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setAuthForm({ ...authForm, role: 'seeker' })}
                    >
                      Job Seeker
                    </button>
                    <button 
                      type="button"
                      className={`btn ${authForm.role === 'employer' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setAuthForm({ ...authForm, role: 'employer' })}
                    >
                      Employer
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="form-input"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    className="form-input"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    placeholder="Min 6 characters" 
                    className="form-input"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                </div>

                {/* SEEKER FIELDS */}
                {authForm.role === 'seeker' && (
                  <div className="animate-fade-in" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Professional Details</h4>
                    <div className="form-group">
                      <label className="form-label">Education Background</label>
                      <input 
                        type="text" 
                        placeholder="Bachelor's in CS / High School Diploma" 
                        className="form-input"
                        value={authForm.education}
                        onChange={(e) => setAuthForm({ ...authForm, education: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Work Experience</label>
                      <textarea 
                        placeholder="Describe your previous work experience..." 
                        className="form-input form-textarea"
                        style={{ minHeight: '80px' }}
                        value={authForm.experience}
                        onChange={(e) => setAuthForm({ ...authForm, experience: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Skills (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="React, Node.js, Photoshop, Customer Support" 
                        className="form-input"
                        value={authForm.skills}
                        onChange={(e) => setAuthForm({ ...authForm, skills: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* EMPLOYER FIELDS */}
                {authForm.role === 'employer' && (
                  <div className="animate-fade-in" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Company Information</h4>
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input 
                        type="text" 
                        placeholder="Tech Solutions Ltd" 
                        className="form-input"
                        value={authForm.companyName}
                        onChange={(e) => setAuthForm({ ...authForm, companyName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Website URL</label>
                      <input 
                        type="url" 
                        placeholder="https://techsolutions.com" 
                        className="form-input"
                        value={authForm.companyWebsite}
                        onChange={(e) => setAuthForm({ ...authForm, companyWebsite: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Description</label>
                      <textarea 
                        placeholder="What does your company do?" 
                        className="form-input form-textarea"
                        style={{ minHeight: '80px' }}
                        value={authForm.companyDescription}
                        onChange={(e) => setAuthForm({ ...authForm, companyDescription: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Register'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Already have an account? <span style={{ color: 'var(--color-primary-light)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setView('login')}>Sign In here</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SEEKER DASHBOARD */}
        {view === 'seeker-dashboard' && user && (
          <div className="animate-fade-in">
            <h1 style={{ marginTop: '40px' }}>Job Seeker Dashboard</h1>
            
            <div className="dashboard-grid">
              {/* Sidebar controls */}
              <div className="glass-panel dashboard-sidebar">
                <div className="sidebar-item active">My Applications</div>
                <div className="sidebar-item" onClick={() => showToast('Profile details can be modified in the main form below.', 'info')}>Profile Details</div>
              </div>

              {/* Main panel content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Section: Applications list */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'white' }}>Submitted Applications ({myApplications.length})</h2>
                  
                  {myApplications.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>You haven't submitted any job applications yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {myApplications.map((app) => (
                        <div key={app._id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white' }}>{app.jobId?.title}</h3>
                            <div style={{ fontSize: '13px', color: 'var(--color-primary-light)', marginTop: '4px' }}>
                              {app.jobId?.company}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Applied on: {new Date(app.appliedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {app.jobId?.fraudAssessment?.riskLevel === 'Fraudulent' && (
                              <span className="badge badge-fraud" style={{ fontSize: '10px' }}><ShieldAlert size={10} /> Scam Alerted</span>
                            )}
                            <span style={{ 
                              textTransform: 'capitalize',
                              fontWeight: 600,
                              fontSize: '13px',
                              color: app.status === 'accepted' ? 'var(--color-safe)' : 
                                     app.status === 'rejected' ? 'var(--color-fraud)' : 
                                     app.status === 'interviewing' ? 'var(--color-suspicious)' : 'var(--text-muted)'
                            }}>
                              Status: {app.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Edit Profile */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'white' }}>My Seeker Profile</h2>
                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={user.name} 
                        onChange={(e) => setUser({ ...user, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Education Background</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={user.profile.education || ''} 
                        onChange={(e) => setUser({ 
                          ...user, 
                          profile: { ...user.profile, education: e.target.value } 
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Skills (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={user.profile.skills ? user.profile.skills.join(', ') : ''} 
                        onChange={(e) => setUser({ 
                          ...user, 
                          profile: { ...user.profile, skills: e.target.value.split(',').map(s => s.trim()) } 
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Work Experience</label>
                      <textarea 
                        className="form-input form-textarea" 
                        value={user.profile.experience || ''} 
                        onChange={(e) => setUser({ 
                          ...user, 
                          profile: { ...user.profile, experience: e.target.value } 
                        })}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: EMPLOYER PORTAL / DASHBOARD */}
        {view === 'employer-dashboard' && user && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
              <h1>Employer Operations</h1>
              <button className="btn btn-primary" onClick={() => setView('post-job')}>
                <PlusCircle size={16} /> Post Job Opening
              </button>
            </div>

            <div className="dashboard-grid">
              <div className="glass-panel dashboard-sidebar">
                <div className="sidebar-item active">My Job Postings</div>
              </div>

              {/* Main Panel */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'white' }}>Active Vacancies</h2>
                
                {/* Filter jobs created by this employer */}
                {jobs.filter(j => j.postedBy?._id === (user?.id || user?._id) || j.postedBy === (user?.id || user?._id)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    <p>You haven't posted any jobs yet.</p>
                    <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => setView('post-job')}>
                      Post Your First Job
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {jobs.filter(j => j.postedBy?._id === (user?.id || user?._id) || j.postedBy === (user?.id || user?._id)).map(job => (
                      <div key={job._id} className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontSize: '18px', color: 'white' }}>{job.title}</h3>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Location: {job.location} | Type: {job.employmentType}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              {renderRiskBadge(job.fraudAssessment?.riskLevel)}
                              <span className="badge badge-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                Risk Score: {job.fraudAssessment?.riskScore}%
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedJob(job);
                                fetchJobApplications(job._id);
                              }}
                            >
                              View Applicants
                            </button>
                            <button 
                              className="btn btn-primary"
                              style={{ background: 'rgba(79, 70, 229, 0.2)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-light)' }}
                              onClick={() => startEditJob(job)}
                            >
                              Edit Job
                            </button>
                          </div>
                        </div>

                        {/* If this job is selected in employer dashboard, show candidate application lists */}
                        {selectedJob?._id === job._id && (
                          <div className="animate-fade-in" style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                            <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '16px' }}>Applicants for this posting ({jobApplications.length})</h4>
                            
                            {jobApplications.length === 0 ? (
                              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No candidates have applied for this job yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {jobApplications.map((app) => (
                                  <div key={app._id} className="glass-panel applicant-card">
                                    <div className="applicant-header">
                                      <div>
                                        <div className="applicant-name">{app.seekerId?.name}</div>
                                        <div className="applicant-email">{app.seekerId?.email}</div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                          className={`btn ${app.status === 'interviewing' ? 'btn-primary' : 'btn-secondary'}`}
                                          style={{ padding: '6px 12px', fontSize: '11px' }}
                                          onClick={() => handleStatusChange(app._id, 'interviewing')}
                                        >
                                          Interview
                                        </button>
                                        <button 
                                          className="btn btn-secondary"
                                          style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--color-safe)' }}
                                          onClick={() => handleStatusChange(app._id, 'accepted')}
                                        >
                                          Accept
                                        </button>
                                        <button 
                                          className="btn btn-secondary"
                                          style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--color-fraud)' }}
                                          onClick={() => handleStatusChange(app._id, 'rejected')}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>

                                    <div className="applicant-details">
                                      {app.resumeUrl && (
                                        <div><strong>Resume link:</strong> <a href={app.resumeUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-light)' }}>View Resume</a></div>
                                      )}
                                      {app.seekerId?.profile?.education && (
                                        <div><strong>Education:</strong> {app.seekerId.profile.education}</div>
                                      )}
                                      {app.seekerId?.profile?.skills && app.seekerId.profile.skills.length > 0 && (
                                        <div><strong>Skills:</strong> {app.seekerId.profile.skills.join(', ')}</div>
                                      )}
                                      {app.coverLetter && (
                                        <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', fontStyle: 'italic' }}>
                                          "{app.coverLetter}"
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: POST OR EDIT A JOB */}
        {(view === 'post-job' || view === 'edit-job') && user?.role === 'employer' && (
          <div className="animate-fade-in" style={{ padding: '40px 0' }}>
            <div className="glass-panel" style={{ maxWidth: '720px', margin: '0 auto', padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button className="btn btn-text" onClick={() => { setView('employer-dashboard'); setEditingJobId(null); }} style={{ padding: 0 }}>
                  <ArrowLeft size={20} />
                </button>
                <h2>{view === 'edit-job' ? 'Edit Job Vacancy' : 'Create Job Vacancy'}</h2>
              </div>

              <form onSubmit={view === 'edit-job' ? handleUpdateJob : handlePostJob}>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Backend Engineer" 
                    className="form-input"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corporation" 
                      className="form-input"
                      value={jobForm.company}
                      onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Job Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Colombo, Sri Lanka / Remote" 
                      className="form-input"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Salary Range</label>
                    <input 
                      type="text" 
                      placeholder="e.g. LKR 60,000 - 80,000/month" 
                      className="form-input"
                      value={jobForm.salaryRange}
                      onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Employment Type</label>
                    <select 
                      className="form-select"
                      value={jobForm.employmentType}
                      onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Description</label>
                  <textarea 
                    placeholder="Provide a comprehensive job description. Keep it detailed to receive a positive AI safety score." 
                    className="form-input form-textarea"
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Requirements (comma-separated or lines)</label>
                  <textarea 
                    placeholder="e.g. 3+ years experience with Javascript, Degree in CS..." 
                    className="form-input form-textarea"
                    style={{ minHeight: '80px' }}
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Benefits & Perks</label>
                  <textarea 
                    placeholder="e.g. Comprehensive health insurance, 401(k) matching, wellness budget..." 
                    className="form-input form-textarea"
                    style={{ minHeight: '80px' }}
                    value={jobForm.benefits}
                    onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                  />
                </div>

                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(79, 70, 229, 0.05)', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong>Note:</strong> Upon clicking "Publish Posting", our integrated NLP Scanner will evaluate this text for job scam patterns and assign an initial safety trust score. Legitimate listings usually receive "Safe" ratings immediately.
                  </p>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Submitting & running AI scan...' : (view === 'edit-job' ? 'Update Posting' : 'Publish Posting')}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '40px 0', marginTop: '60px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '13px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            © 2026 VeriWork AI. All rights reserved. Secure job search powered by Natural Language Processing.
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <span>Security Audits</span>
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
