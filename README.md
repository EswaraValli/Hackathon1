Project Name: Student Engagement & AI Nudging MVP

Overview: Explain that your backend analyzes quiz scores, predicts engagement, and generates AI nudges. 
Frontend partially implemented.

How to Run Backend Locally:
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
pip install -r requirements.txt
python app.py

example:
POST http://localhost:5000/analyze
Content-Type: application/json

{
  "uid": "testuser123",
  "quiz_score": 75
}
