import os
import re
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

MODEL_PATH = 'models/job_fraud_model.pkl'
model = None

def load_or_train_model():
    global model
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Bootstrapping training process...")
        try:
            from train import train_model
            train_model()
        except Exception as e:
            print(f"Error while training model: {e}")
            return False
            
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("Successfully loaded model from", MODEL_PATH)
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    return False

# Initialize model
load_or_train_model()

# List of common free email services
FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'zoho.com', 'protonmail.com', 'yandex.com']

# Suspect words check list
PAYMENT_BUZZWORDS = [
    (r'\b(bitcoin|crypto|usdt|ethereum|cryptocurrency)\b', "Mentions cryptocurrency payments or processing."),
    (r'\b(western union|moneygram|wire transfer|zelle|cashapp|venmo)\b', "Requires receiving or sending money via wire transfer, Western Union, Zelle, or CashApp."),
    (r'\b(gift card|itunes card|amazon card|steam card)\b', "Mentions purchase or evaluation of gift cards."),
    (r'\b(package|shipping|forward|forwarding|re-shipping|re-labeling|inspect package)\b', "Involves package forwarding, re-shipping, or residential parcel handling."),
    (r'\b(earn daily|daily payout|payout daily|quick cash|earn fast|make money fast|instant start)\b', "Promises high daily payouts or quick cash with instant setup."),
    (r'\b(no experience|no resume|no interview|anyone can do|no skills required)\b', "Claims no experience, resume, or interview is required for high-paying tasks.")
]

def analyze_heuristics(title, company, description, requirements, benefits, salary):
    reasons = []
    combined_text = f"{title} {company} {description} {requirements} {benefits} {salary}".lower()
    
    # 1. Check for email addresses and see if they use free domains
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', combined_text)
    for email in emails:
        domain = email.split('@')[-1]
        if domain in FREE_EMAIL_DOMAINS:
            reasons.append(f"Uses a generic free email address ({email}) for recruitment inquiries.")
            break # Only report once
            
    # 2. Check for payment/scam buzzwords
    for pattern, description_text in PAYMENT_BUZZWORDS:
        if re.search(pattern, combined_text):
            reasons.append(description_text)
            
    # 3. Check for suspiciously high salary flags
    salary_lower = salary.lower()
    is_lkr = any(curr in salary_lower or curr in combined_text for curr in ['lkr', 'rs', 'rupee', 'rupees', 'slr'])
    
    if any(keyword in salary_lower for keyword in ['/day', 'daily', '/week', 'weekly', '/hr', '/hour', 'hourly', 'month', 'monthly']):
        # Extract number if possible (remove commas first)
        numbers = [int(s) for s in re.findall(r'\d+', salary_lower.replace(',', ''))]
        if numbers:
            max_num = max(numbers)
            if is_lkr:
                # Sri Lankan Rupee thresholds
                if '/hour' in salary_lower or '/hr' in salary_lower:
                    if max_num > 8000 and ('data entry' in combined_text or 'assistant' in combined_text or 'clerk' in combined_text or 'typing' in combined_text):
                        reasons.append(f"Offers an unusually high hourly rate (LKR {max_num:,}/hr) for entry-level tasks.")
                elif 'day' in salary_lower:
                    if max_num > 40000:
                        reasons.append(f"Offers an unusually high daily rate (LKR {max_num:,}/day).")
                elif 'week' in salary_lower:
                    if max_num > 100000:
                        reasons.append(f"Offers an extremely high weekly salary (LKR {max_num:,}/week).")
                elif 'month' in salary_lower or 'monthly' in salary_lower:
                    if max_num > 400000 and ('data entry' in combined_text or 'assistant' in combined_text or 'clerk' in combined_text or 'typing' in combined_text or 'intern' in combined_text):
                        reasons.append(f"Offers an extremely high monthly salary (LKR {max_num:,}/month) for entry-level/internship work.")
            else:
                # USD thresholds
                if '/hour' in salary_lower or '/hr' in salary_lower:
                    if max_num > 60 and ('data entry' in combined_text or 'assistant' in combined_text or 'clerk' in combined_text or 'typing' in combined_text):
                        reasons.append(f"Offers an unusually high hourly rate (${max_num}/hr) for entry-level tasks.")
                elif 'day' in salary_lower:
                    if max_num > 300:
                        reasons.append(f"Offers an unusually high daily rate (${max_num}/day).")
                elif 'week' in salary_lower:
                    if max_num > 1500:
                        reasons.append(f"Offers an extremely high weekly salary (${max_num}/week) for remote positions.")
                    
    # 4. Check for lack of detail in requirements
    if len(requirements.strip()) < 15 and len(description.strip()) > 50:
        reasons.append("The job listing has extremely minimal requirements, indicating a low barrier to entry for highly paid work.")
        
    return reasons

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    global model
    if model is None:
        # Try loading or training again
        success = load_or_train_model()
        if not success:
            return jsonify({"error": "Machine learning model is not initialized or loaded."}), 500
            
    data = request.json or {}
    title = data.get('title', '')
    company = data.get('company', '')
    description = data.get('description', '')
    requirements = data.get('requirements', '')
    benefits = data.get('benefits', '')
    salary = data.get('salary', '')
    
    # 1. Combine fields for the ML model
    text_to_classify = f"{title} {company} {description} {requirements} {benefits}"
    
    # 2. Predict probability from ML model
    try:
        # predict_proba returns [ [prob_class_0, prob_class_1] ]
        prob_fraud = float(model.predict_proba([text_to_classify])[0][1])
    except Exception as e:
        print(f"Prediction failed, falling back to heuristics: {e}")
        prob_fraud = 0.5 # fallback mid-point
        
    # 3. Collect heuristic red flags
    heuristic_flags = analyze_heuristics(title, company, description, requirements, benefits, salary)
    
    # 4. Calculate overall risk score
    # We combine ML probability and heuristics.
    # Each heuristic adds to the risk score, but we cap it at 100%.
    heuristic_weight = len(heuristic_flags) * 20.0
    risk_score = min(100.0, (prob_fraud * 100.0 * 0.6) + (heuristic_weight * 0.4))
    
    # If there are 2 or more solid heuristics, we force the score up
    if len(heuristic_flags) >= 2:
        risk_score = max(risk_score, 70.0)
        
    # 5. Classify risk level
    if risk_score >= 70.0:
        risk_level = "Fraudulent"
    elif risk_score >= 35.0:
        risk_level = "Suspicious"
    else:
        risk_level = "Safe"
        
    # 6. Generate reasoning explanations
    reasons = []
    if risk_level == "Safe":
        reasons.append("Job description uses standard professional terminology and standard employment benefits structure.")
        reasons.append("No common phishing, parcel-forwarding, or wire transfer transaction signals detected.")
    else:
        # Add the specific heuristic warnings
        reasons.extend(heuristic_flags)
        # Add a general model warning if ML probability was high
        if prob_fraud > 0.6:
            reasons.append("Machine learning text classifier identified semantic patterns matching previous known job scams.")
        # Ensure we have at least one reason for non-safe
        if not reasons:
            reasons.append("Overall textual patterns and missing structural details trigger suspicious ranking.")
            
    return jsonify({
        "riskLevel": risk_level,
        "riskScore": round(risk_score, 1),
        "reasons": reasons
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
