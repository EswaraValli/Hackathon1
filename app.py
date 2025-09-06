import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import your existing logic files. No changes are needed in them.
from logic import analyze_student_risk
from ai_nudge import get_ai_nudge

# --- 1. INITIALIZE FIREBASE ADMIN SDK ---
# IMPORTANT: Change the text in quotes to be the exact filename of your downloaded JSON key.
try:
    # Make sure this file is in the same folder as your app.py
    cred = credentials.Certificate("studentengagementplatform-firebase-adminsdk-fbsvc-b83da779af.json") 
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print("CRITICAL ERROR: Could not initialize Firebase Admin SDK.", e)
    print("Please make sure your service account JSON file's name is correct and it's in the same folder.")
    db = None

app = Flask(__name__)
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze():
    if not db:
        return jsonify({"error": "Firebase is not initialized on the server. Check the terminal for errors."}), 500

    request_data = request.get_json()
    uid = request_data.get('uid')
    new_quiz_score = request_data.get('quiz_score')

    if not uid or new_quiz_score is None:
        return jsonify({"error": "A user ID (uid) and a quiz_score are required."}), 400

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return jsonify({"error": "User not found in the database"}), 404
        
        user_data = user_doc.to_dict()

        last_login_str = user_data.get("activity", {}).get("last_login")
        days_ago = 0
        if last_login_str:
            last_login_date = datetime.fromisoformat(last_login_str.replace('Z', '+00:00'))
            days_ago = (datetime.now(timezone.utc) - last_login_date).days
        
        all_scores = user_data.get('quizScores', []) + [new_quiz_score]
        avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

        prediction_data = {
           "email": user_data.get("email"),
            "quiz_scores": all_scores,  # keep full history list
            "progress_history": user_data.get("activity", {}).get("progress_history", []),
            "time_spent": user_data.get("activity", {}).get("time_spent_minutes", 0),
            "last_login_days": days_ago
        }

        analysis = analyze_student_risk(prediction_data)
        nudge_message = get_ai_nudge(prediction_data, analysis)
        analysis['ai_nudge'] = nudge_message

        user_ref.update({
            "quizScores": firestore.ArrayUnion([new_quiz_score])
        })

        return jsonify(analysis)

    except Exception as e:
        print(f"An error occurred during analysis: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(debug=True)

