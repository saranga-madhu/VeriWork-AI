const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Job, Application } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fraud_job_db';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Clear collections
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Job.deleteMany({});
    await Application.deleteMany({});

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create users
    console.log('Seeding Sri Lankan users...');
    const employer = new User({
      name: 'Chaminda Silva (HR Director)',
      email: 'employer@test.com',
      password: hashedPassword,
      role: 'employer',
      profile: {
        companyName: 'Lanka Software Technologies',
        companyWebsite: 'https://lankasofttech.lk',
        companyDescription: 'Premium software development agency specializing in enterprise resource planning and mobile solutions based in Colombo, Sri Lanka.'
      }
    });

    const seeker = new User({
      name: 'Kasun Perera',
      email: 'seeker@test.com',
      password: hashedPassword,
      role: 'seeker',
      profile: {
        resumeUrl: 'https://drive.google.com/file/d/kasun-perera-resume/view',
        skills: ['Java', 'Spring Boot', 'React', 'REST APIs'],
        experience: 'Final year undergraduate in Software Engineering.',
        education: 'BSc (Hons) in Software Engineering, SLIIT'
      }
    });

    await employer.save();
    await seeker.save();

    console.log('Seeding Sri Lankan jobs (including internships)...');
    const jobsData = [
      {
        title: 'Associate Software Engineer (Internship)',
        company: 'Lanka Software Technologies',
        location: 'Colombo, Sri Lanka (Hybrid)',
        description: 'We are looking for an enthusiastic Software Engineering Intern to join our web team. You will work alongside senior engineers to design and code features in React and Node.js. This is a 6-month internship with potential for full-time absorption.',
        requirements: 'Good understanding of Javascript/HTML/CSS. Basic knowledge of databases. Currently pursuing a degree in CS or equivalent.',
        benefits: 'Monthly allowance, mentorship from senior leads, hybrid work structure, office snacks.',
        salaryRange: 'LKR 40,000 - 55,000/month',
        employmentType: 'Internship',
        postedBy: employer._id,
        fraudAssessment: {
          riskLevel: 'Safe',
          riskScore: 4.8,
          reasons: [
            'Job details use standard professional terminology.',
            'Salary is within the standard range for tech internships in Sri Lanka.',
            'Requires specific educational and technical background.'
          ],
          evaluatedAt: new Date()
        }
      },
      {
        title: 'Internship: Data Entry & Processing Clerk (Urgent)',
        company: 'Fast Lanka Payments Group',
        location: 'Kandy, Sri Lanka',
        description: 'Urgent internship vacancy for students. Work from home doing simple typing and money processing tasks. Earn high income. We will transfer money to your Commercial Bank or BOC account. You will buy crypto tokens or gift cards and forward them. Immediate payment.',
        requirements: 'No resume required. Just need a smartphone or PC and active bank account in Sri Lanka. Undergraduates welcome.',
        benefits: 'Work from home, daily commission payouts, flexible hours.',
        salaryRange: 'LKR 120,000 - 150,000/week',
        employmentType: 'Internship',
        postedBy: employer._id,
        fraudAssessment: {
          riskLevel: 'Fraudulent',
          riskScore: 92.6,
          reasons: [
            'Promises extremely high weekly payouts (LKR 150,000/week is anomalous for an internship).',
            'Involves cryptocurrency purchases and forwarding transactions (high correlation with money laundering scams).',
            'No resume, experience, or interview required.'
          ],
          evaluatedAt: new Date()
        }
      },
      {
        title: 'Associate UI/UX Designer',
        company: 'Lanka Software Technologies',
        location: 'Colombo, Sri Lanka',
        description: 'We are seeking an Associate UI/UX Designer to create user interfaces and interactive prototypes. You will cooperate with product managers to transform complex wireframes into intuitive user flows.',
        requirements: 'Proficiency in Figma and Adobe XD. Understanding of responsive design principles. Good portfolio of design projects.',
        benefits: 'Health insurance, annual performance bonus, professional training allowances.',
        salaryRange: 'LKR 80,000 - 110,000/month',
        employmentType: 'Full-time',
        postedBy: employer._id,
        fraudAssessment: {
          riskLevel: 'Safe',
          riskScore: 6.2,
          reasons: [
            'Uses standard design terminology and structures.',
            'Salary matches standard market expectations for associate designers in Sri Lanka.',
            'Professional company framework verified.'
          ],
          evaluatedAt: new Date()
        }
      },
      {
        title: 'QA Engineer (Internship)',
        company: 'Mitra Lanka Systems',
        location: 'Colombo, Sri Lanka',
        description: 'Mitra Lanka is looking for a QA Intern to assist in writing test plans, manual test execution, and identifying bugs in web and mobile products.',
        requirements: 'Basic understanding of software testing life cycle (STLC). Detail-oriented mindset. Good communication skills.',
        benefits: 'Monthly internship allowance, transport allowance, performance incentives.',
        salaryRange: 'LKR 35,000 - 45,000/month',
        employmentType: 'Internship',
        postedBy: employer._id,
        fraudAssessment: {
          riskLevel: 'Safe',
          riskScore: 5.5,
          reasons: [
            'Details reflect a standard quality assurance internship.',
            'Allowed salary is typical of entry-level trainee/intern allowances.',
            'Standard educational requirements mentioned.'
          ],
          evaluatedAt: new Date()
        }
      },
      {
        title: 'Remote Support Agent (Foreign Client)',
        company: 'Apex Global Partners',
        location: 'Remote (Sri Lanka-based)',
        description: 'Provide customer support via email and chat for our US and UK clients. This is a full-time remote role for Sri Lankans. Shift patterns follow international business hours.',
        requirements: 'Excellent fluent English (written and spoken). Reliable power backup and high-speed internet. 1+ years experience in customer service.',
        benefits: 'Salary pegged to USD, internet and electricity allowance, medical cover.',
        salaryRange: 'LKR 200,000 - 250,000/month',
        employmentType: 'Remote',
        postedBy: employer._id,
        fraudAssessment: {
          riskLevel: 'Safe',
          riskScore: 12.4,
          reasons: [
            'Requires strict English fluency and infrastructure (power backup).',
            'Salary range is realistic for USD-pegged client support roles.',
            'Structured screening process outlined.'
          ],
          evaluatedAt: new Date()
        }
      }
    ];

    await Job.insertMany(jobsData);
    console.log('Seeded Sri Lankan jobs successfully.');

    // Add one mock application
    const firstJob = await Job.findOne({ title: 'Associate Software Engineer (Internship)' });
    if (firstJob) {
      const app = new Application({
        jobId: firstJob._id,
        seekerId: seeker._id,
        coverLetter: 'Hello Chaminda, I am a final-year student at SLIIT and I have strong knowledge of React. I would love to join Lanka Software Technologies as an intern!',
        resumeUrl: seeker.profile.resumeUrl,
        status: 'applied'
      });
      await app.save();
      console.log('Seeded one test application.');
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Seeding error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

seedDatabase();
