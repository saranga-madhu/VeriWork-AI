import os
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

def generate_sample_data():
    """
    Generates a synthetic dataset of fake and safe job postings
    representing common job board data.
    """
    data = [
        # --- Fraudulent/Scam Jobs (Label: 1) ---
        {
            "title": "Work From Home Data Entry Clerk",
            "company": "Global Data Solutions Inc",
            "description": "Earn money fast! We are looking for urgent data entry clerks to work from the comfort of their homes. Absolutely no experience required. You will be paid $500 to $1000 daily for processing simple forms. Fast cash payments via Bitcoin, PayPal, or wire transfer.",
            "requirements": "Must own a computer or mobile phone. Internet access. Willingness to work 2-3 hours per day. No resume or interview required.",
            "benefits": "Flexible hours, work from home, daily payouts, sign-on bonus.",
            "salary": "$4000/week",
            "label": 1
        },
        {
            "title": "Mystery Shopper & Quality Evaluator",
            "company": "Consumer Research Group (Unverified)",
            "description": "We need remote workers to evaluate stores and retail outlets in your area. We will send you checks in advance. You will cash the check, keep your commission, and spend the remaining balance on Gift Cards (iTunes, Steam, Google Play) and send us the codes to evaluate security. Instant cash.",
            "requirements": "18+ years old. Must have a bank account to deposit check. Reliable smartphone.",
            "benefits": "Free items, high commissions, choose your own hours.",
            "salary": "$800/task",
            "label": 1
        },
        {
            "title": "Package Receiving & Forwarding Agent",
            "company": "Logistics Express Mail",
            "description": "Receive packages at your residential address, inspect the items for damages, relabel them, and ship them out to international addresses. You will be paid per package processed. This is a simple work-from-home position suitable for anyone.",
            "requirements": "Must have a physical address to receive mail. Able to lift packages up to 20 lbs. Basic computer skills to print shipping labels.",
            "benefits": "Work from home, monthly stipend, paid shipping supplies.",
            "salary": "$3000/month",
            "label": 1
        },
        {
            "title": "Financial Transaction Assistant",
            "company": "Apex Wealth Partners",
            "description": "We are seeking a personal assistant to handle payment processing. You will receive payments from our clients into your personal bank account, withdraw the cash, and transfer it via Western Union or buy cryptocurrency. We pay 10% commission on every transaction. Urgent hire.",
            "requirements": "Active bank account. Online banking access. Quick responsiveness via Telegram or WhatsApp.",
            "benefits": "High commission, part-time, flexible schedule.",
            "salary": "$5000/month commission",
            "label": 1
        },
        {
            "title": "Urgent Work from Home Virtual Assistant",
            "company": "StartUp Global Ltd (Free Email Contact)",
            "description": "Looking for a virtual assistant immediately. Basic typing and data handling. Please send your details to onlinejobpostings99@gmail.com. High pay, instant startup, no experience necessary. Payment processed weekly.",
            "requirements": "Access to MS Word and Excel. Fast typing speed.",
            "benefits": "Flexible hours, work from home.",
            "salary": "$35/hour",
            "label": 1
        },

        # --- Safe/Legitimate Jobs (Label: 0) ---
        {
            "title": "Software Engineer (Full-Stack)",
            "company": "TechInnovate Solutions",
            "description": "We are looking for a Software Engineer to join our core development team. You will build and maintain responsive web applications using React, Node.js, and MongoDB. You will collaborate with product managers and UX designers to implement clean, scalable solutions.",
            "requirements": "Bachelor's degree in Computer Science or equivalent experience. 3+ years of professional experience with JavaScript/TypeScript. Familiarity with cloud services like AWS or GCP.",
            "benefits": "Comprehensive medical/dental/vision insurance, 401(k) matching, flexible PTO, hybrid work option.",
            "salary": "$110,000 - $130,000/year",
            "label": 0
        },
        {
            "title": "Customer Support Representative",
            "company": "Apex Care Systems",
            "description": "Join our growing customer success team. You will handle inbound customer inquiries via chat, email, and phone. Help troubleshoot technical issues, guide users through platform features, and document user feedback for the product team.",
            "requirements": "High school diploma or equivalent. 1-2 years in a customer-facing role. Excellent verbal and written communication skills.",
            "benefits": "Paid training, health insurance, career growth opportunities, standard 9-5 shift.",
            "salary": "$20 - $24/hour",
            "label": 0
        },
        {
            "title": "Digital Marketing Coordinator",
            "company": "Vivid Media Group",
            "description": "We are seeking a Digital Marketing Coordinator to manage our social media channels, run paid advertising campaigns (Meta/Google Ads), and assist in content creation. You will analyze campaign metrics and generate weekly performance reports.",
            "requirements": "Degree in Marketing, Communications, or related field. Experience with Google Analytics and SEO tools. Strong copywriting skills.",
            "benefits": "Competitive salary, creative work environment, wellness stipend, professional development budget.",
            "salary": "$55,000 - $65,000/year",
            "label": 0
        },
        {
            "title": "HR Specialist & Recruiter",
            "company": "InnoSource Recruitment",
            "description": "We are seeking an HR Specialist to manage end-to-end recruitment pipelines, coordinate interviews, draft job descriptions, and assist with onboarding new hires. You will ensure a smooth candidate experience and maintain HR compliance records.",
            "requirements": "3+ years of experience in recruitment or HR. Knowledge of labor laws and applicant tracking systems (ATS). Strong organizational skills.",
            "benefits": "Full health benefits, dental insurance, paid parental leave, remote work allowed.",
            "salary": "$70,000 - $85,000/year",
            "label": 0
        },
        {
            "title": "Data Analyst",
            "company": "Insight Metrics Corp",
            "description": "Looking for a Data Analyst to join our business intelligence department. You will clean and analyze complex datasets, build interactive dashboards using Tableau/PowerBI, and extract actionable insights to guide executive decision-making.",
            "requirements": "Proficiency in SQL and Python/R. Strong analytical and mathematical foundation. Experience designing dashboards.",
            "benefits": "Health savings account, annual bonus, flexible working hours, learning allowance.",
            "salary": "$85,000 - $98,000/year",
            "label": 0
        }
    ]
    return pd.DataFrame(data)

def train_model():
    print("Generating training data...")
    df = generate_sample_data()
    
    # Combine text fields for NLP processing
    df['combined_text'] = (
        df['title'].fillna('') + " " + 
        df['company'].fillna('') + " " + 
        df['description'].fillna('') + " " + 
        df['requirements'].fillna('') + " " + 
        df['benefits'].fillna('')
    )
    
    X = df['combined_text']
    y = df['label']
    
    print("Training TF-IDF Vectorizer and Logistic Regression Pipeline...")
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(
            ngram_range=(1, 2), 
            stop_words='english',
            min_df=1
        )),
        ('classifier', LogisticRegression(C=1.0, random_state=42))
    ])
    
    pipeline.fit(X, y)
    
    # Let's save the model
    os.makedirs('models', exist_ok=True)
    model_path = 'models/job_fraud_model.pkl'
    joblib.dump(pipeline, model_path)
    print(f"Model trained and saved to {model_path}")
    
    # Quick self-test
    test_scam = "Work from home data entry. Earn cash daily. No experience needed. Western union crypto cash."
    test_safe = "Software engineer with experience in React and Node.js. Medical benefits and standard hybrid office."
    
    pred_scam = pipeline.predict([test_scam])[0]
    prob_scam = pipeline.predict_proba([test_scam])[0][1]
    
    pred_safe = pipeline.predict([test_safe])[0]
    prob_safe = pipeline.predict_proba([test_safe])[0][1]
    
    print("\nSelf-Test Results:")
    print(f"Test Scam Job -> Predicted Label: {pred_scam} (Fraud Probability: {prob_scam:.2%})")
    print(f"Test Safe Job -> Predicted Label: {pred_safe} (Fraud Probability: {prob_safe:.2%})")

if __name__ == '__main__':
    train_model()
