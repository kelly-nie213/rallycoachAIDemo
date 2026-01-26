import argparse
import cv2
import base64
import json
import re
from google import genai  # type: ignore
from google.genai import types  # type: ignore

# ===================k=========
# ARGUMENTS
# ============================
def parse_args():
    parser = argparse.ArgumentParser(description="Gemini tennis match analysis")
    parser.add_argument(
        "--api_key",
        type=str,
        required=True,
        help="Google AI Studio API key"
    )
    return parser.parse_args()

# ============================
# CONFIG
# ============================
VIDEO_PATH = "/tmp/annotated_output.mp4"
FRAME_STRIDE = 5
MODEL_NAME = "gemini-3-pro-preview"
OUTPUT_TEXT_PATH = "match_summary.txt"

PROMPT_TEXT = """
You are an elite tennis biomechanics coach analyzing a player's technique.

You are given sequential annotated video frames from a tennis practice or match.
The annotations include:
- Player bounding boxes and skeletal keypoints
- Frame numbers
- Ball and player coordinates
- Court lines and reference points
- Player movement speeds
- Distance traveled

IMPORTANT:
- Analyze the PRIMARY player (closest to camera or most visible)
- Treat frames as continuous video to understand movement patterns
- Do NOT hallucinate events not visually supported
- Reference specific frame numbers when making observations
- Provide actionable coaching insights

OUTPUT STRICT JSON with this EXACT structure:

{
  "dna": {
    "technical": <integer 0-100 based on stroke mechanics, contact point, follow-through>,
    "tactical": <integer 0-100 based on court positioning, shot selection, movement efficiency>,
    "summary": "<2-3 sentence overall assessment of the player's performance>"
  },
  "strengths": [
    "<specific strength with frame reference, e.g. 'Excellent racket preparation on forehand (frames 45-52)'>",
    "<another strength>",
    "<another strength>"
  ],
  "fixes": [
    "<specific issue to fix with frame reference, e.g. 'Late backswing on backhand side (frames 78-85)'>",
    "<another fix needed>",
    "<another fix needed>"
  ],
  "plan": [
    {
      "title": "<drill name>",
      "description": "<specific practice drill to address weaknesses, 2-3 sentences>"
    },
    {
      "title": "<drill name>",
      "description": "<another drill>"
    },
    {
      "title": "<drill name>",
      "description": "<another drill>"
    }
  ]
}

Be specific and reference the video data. Technical score reflects mechanics quality, tactical score reflects decision-making and positioning.
"""

# ============================
# FRAME EXTRACTION
# ============================
def extract_frames(video_path, stride):
    cap = cv2.VideoCapture(video_path)
    frames = []
    idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if idx % stride == 0:
            _, buffer = cv2.imencode(".jpg", frame)
            frames.append(base64.b64encode(buffer).decode("utf-8"))

        idx += 1

    cap.release()
    return frames

# ============================
# JSON CLEANING (NEW FIX)
# ============================
def extract_json(text):
    if not text.strip():
        raise ValueError("Gemini returned empty response")

    # Remove ```json fences if present
    text = re.sub(r"```json|```", "", text).strip()

    # Extract first JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in Gemini response")

    return match.group(0)

# ============================
# FORMAT OUTPUT
# ============================
def format_summary(raw_text):
    json_text = extract_json(raw_text)
    data = json.loads(json_text)

    def format_player(player_name, player_data):
        text = []
        text.append(f"## **{player_name.replace('_', ' ').title()}**\n")

        text.append("**Strong Shots:**")
        if player_data["strong_shots"]:
            for s in player_data["strong_shots"]:
                text.append(f"- **{s}**")
        else:
            text.append("- *None identified*")

        text.append("\n**Weak Shots:**")
        if player_data["weak_shots"]:
            for w in player_data["weak_shots"]:
                text.append(f"- **{w}**")
        else:
            text.append("- *None identified*")

        text.append(f"\n**Footwork Analysis:**\n*{player_data['footwork']}*")
        text.append(f"\n**Shot Tendencies:**\n*{player_data['shot_tendencies']}*\n")

        return "\n".join(text)

    report = []
    report.append("# **Tennis Match Performance Report**\n")
    report.append(format_player("player_1", data["player_1"]))
    report.append(format_player("player_2", data["player_2"]))

    report.append("## **Overall Match Summary**")
    report.append(f"*{data['overall_match_summary']}*")

    return "\n\n".join(report)

# ============================
# GEMINI CALL
# ============================
def analyze_match(api_key, video_path=None):
    """
    Analyze a tennis match video using Gemini.
    
    Args:
        api_key: Google AI Studio API key
        video_path: Path to the annotated video file (optional, uses default if not provided)
    
    Returns:
        Dictionary with analysis results
    """
    video_to_analyze = video_path if video_path else VIDEO_PATH
    print(f"[GeminiAnalysis] Analyzing video: {video_to_analyze}")
    
    client = genai.Client(
        api_key=api_key,
        http_options={"api_version": "v1alpha"}
    )

    frames_b64 = extract_frames(video_to_analyze, FRAME_STRIDE)

    parts = [types.Part(text=PROMPT_TEXT)]

    for f in frames_b64:
        parts.append(
            types.Part(
                inline_data=types.Blob(
                    mime_type="image/jpeg",
                    data=base64.b64decode(f),
                ),
                media_resolution={"level": "media_resolution_high"}
            )
        )

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[types.Content(parts=parts)]
    )

    raw_text = response.text or ""
    print(f"[GeminiAnalysis] Raw response received ({len(raw_text)} chars)")
    
    # Parse and format the response
    json_text = extract_json(raw_text)
    analysis_data = json.loads(json_text)
    formatted_text = format_summary(raw_text)

    with open(OUTPUT_TEXT_PATH, "w", encoding="utf-8") as f:
        f.write(formatted_text)

    print(f"[GeminiAnalysis] Formatted match summary saved to: {OUTPUT_TEXT_PATH}")
    
    # Return the parsed analysis data
    return analysis_data

# ============================
# RUN
# ============================
if __name__ == "__main__":
    args = parse_args()
    analyze_match(args.api_key)
