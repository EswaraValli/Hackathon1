import os
import google.generativeai as genai
from dotenv import load_dotenv

# --- Load API Key ---
load_dotenv()
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise ValueError("API_KEY not found. Please create a .env file and add your API key to it.")

# Configure Gemini
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')


def get_ai_nudge(student_data: dict, analysis_result: dict) -> str:
    """
    Generates a personalized nudge using student data + risk analysis.
    This integrates directly with logic.py output.
    """
    try:
        risk_label = analysis_result.get("risk_label", "Medium")
        risk_score = analysis_result.get("risk_score", 50)
        reasons = analysis_result.get("reasons", [])
        action = analysis_result.get("recommended_action", "continue learning")

        # Choose tone based on risk
        if risk_label == "High":
            tone = "urgent and highly motivational"
        elif risk_label == "Low":
            tone = "positive and challenging"
        else:
            tone = "encouraging and supportive"

        prompt = f"""
        You are a friendly student coach helping a learner.

        Their performance:
        - Average Quiz Score: {student_data.get('quiz_avg_score', 0)}%
        - Progress: {student_data.get('progress', 0)}%
        - Engagement Score: {risk_score}/100
        - Risk Level: {risk_label}
        - Issues: {", ".join(reasons)}

        Task: Write a short, {tone} message (under 40 words).
        - If risk is High → suggest one easy action to re-engage.
        - If risk is Medium → encourage consistency.
        - If risk is Low → congratulate + offer a challenge.
        - Don’t use the learner’s name.

        Message:
        """

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"🛑 AI API Error: {e}")

        # Fallback simple messages
        if analysis_result.get("risk_label") == "High":
            return "You're struggling, but you can bounce back! Try revisiting one lesson today."
        elif analysis_result.get("risk_label") == "Medium":
            return "You're making steady progress. Keep up the effort with one more quiz this week!"
        else:
            return "Great work! You're excelling—challenge yourself with a harder module."


# Example test (only runs when executing this file directly)
if __name__ == "__main__":
    dummy_student = {
        "quiz_avg_score": 45,
        "progress": 30,
        "time_spent": 60,
        "last_login_days_ago": 10
    }

    dummy_analysis = {
        "risk_score": 35,
        "risk_label": "High",
        "reasons": ["Low quiz scores", "Inactive for over a week"],
        "recommended_action": "mentor"
    }

    print(get_ai_nudge(dummy_student, dummy_analysis))
