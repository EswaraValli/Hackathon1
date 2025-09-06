def analyze_student_risk(student):
    """
    Analyze student engagement risk using both current and past data.
    Assumes `student` dict contains:
    - email
    - quiz_scores (list of last few quiz scores)
    - progress_history (list of progress percentages over time)
    - time_spent (current week in minutes)
    - last_login_days (days since last login)
    """

    # ✅ Quiz trend
    quiz_scores = student.get("quiz_scores", [])
    if len(quiz_scores) >= 2:
        quiz_trend = quiz_scores[-1] - quiz_scores[-2]  # improvement or decline
    else:
        quiz_trend = 0

    # ✅ Progress trend
    progress_history = student.get("progress_history", [])
    if len(progress_history) >= 2:
        progress_trend = progress_history[-1] - progress_history[-2]
    else:
        progress_trend = 0

    # ✅ Current values
    current_progress = progress_history[-1] if progress_history else 0
    current_quiz = quiz_scores[-1] if quiz_scores else 0
    time_spent = student.get("time_spent", 0)
    last_login = student.get("last_login_days", 30)

    # Normalize
    time_score = min((time_spent / 180) * 100, 100)  # 180 min/week ideal
    login_penalty = min(last_login * 10, 100)

    # Engagement formula
    engagement_score = (
        current_quiz * 0.25 +
        current_progress * 0.35 +
        time_score * 0.2 +
        quiz_trend * 0.1 +          # trend bonus/penalty
        progress_trend * 0.1 -      # trend bonus/penalty
        login_penalty * 0.15
    )

    final_score = max(0, min(engagement_score, 100))

    # Risk level
    if final_score < 40:
        risk = "High Risk"
        action = "Send mentor reminder"
    elif final_score < 70:
        risk = "Moderate Risk"
        action = "Send micro-assessment"
    else:
        risk = "Low Risk"
        action = "Send congratulation / peer challenge"

    return {
        "risk_score": round(final_score),
        "risk_status": risk,
        "quiz_trend": quiz_trend,
        "progress_trend": progress_trend,
        "recommended_action": action
    }
