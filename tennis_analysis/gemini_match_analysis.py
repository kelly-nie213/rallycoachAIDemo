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

PROMPT_BASE = """
You are an elite tennis biomechanics coach analyzing a player's technique.

You are given sequential annotated video frames from a tennis practice or match.
The annotations include:
- Player bounding boxes and skeletal keypoints
- Frame numbers
- Ball and player coordinates
- Court lines and reference points
- Player movement speeds
- Distance traveled

{biomechanics_section}

IMPORTANT:
- Analyze the PRIMARY player (closest to camera or most visible)
- Treat frames as continuous video to understand movement patterns
- Do NOT hallucinate events not visually supported
- Reference specific frame numbers when making observations
- Provide actionable coaching insights
- INCORPORATE the exact biomechanical metrics provided above into your analysis (speeds, distances, percentages)

OUTPUT STRICT JSON with this EXACT structure:

{{
  "dna": {{
    "technical": <integer 0-100 based on stroke mechanics, contact point, follow-through>,
    "tactical": <integer 0-100 based on court positioning, shot selection, movement efficiency>,
    "summary": "<2-3 sentence overall assessment referencing specific metrics like racket speed, efficiency scores>"
  }},
  "strengths": [
    "<specific strength with exact metric, e.g. 'Excellent kinetic chain efficiency at 78%'>",
    "<another strength with data>",
    "<another strength with data>"
  ],
  "fixes": [
    "<specific issue with metric, e.g. 'Footwork efficiency at 75% - needs improvement'>",
    "<another fix with data>",
    "<another fix with data>"
  ],
  "plan": [
    {{
      "title": "<drill name>",
      "description": "<specific practice drill referencing the metrics that need improvement>"
    }},
    {{
      "title": "<drill name>",
      "description": "<another drill>"
    }},
    {{
      "title": "<drill name>",
      "description": "<another drill>"
    }}
  ]
}}

Use the EXACT numbers from the biomechanics data in your response. Technical score reflects mechanics quality, tactical score reflects decision-making and positioning.
"""

def build_prompt(biomechanics=None):
    """Build the prompt with biomechanics data if available."""
    if biomechanics:
        strokes_text = ""
        detected_strokes = biomechanics.get("detected_strokes", [])
        if detected_strokes:
            strokes_text = "Detected strokes:\n"
            for stroke in detected_strokes:
                strokes_text += f"  - {stroke.get('type', 'unknown')}: {stroke.get('count', 0)} shots, avg quality {stroke.get('avg_quality', 0):.0%}\n"
        
        biomechanics_section = f"""
MEASURED BIOMECHANICS DATA (use these exact values in your analysis):
- Kinetic Chain Efficiency: {biomechanics.get('kinetic_chain_efficiency', 'N/A')}%
- Core Rotation Speed: {biomechanics.get('core_rotation_speed', 'N/A')}°/s
- Balance Score: {biomechanics.get('balance_score', 'N/A')}%
- Footwork Efficiency: {biomechanics.get('footwork_efficiency', 'N/A')}%
- Racket Head Speed: {biomechanics.get('racket_head_speed', 'N/A'):.1f} MPH
- Stroke Consistency: {biomechanics.get('stroke_consistency', 'N/A')}%
{strokes_text}"""
    else:
        biomechanics_section = ""
    
    return PROMPT_BASE.format(biomechanics_section=biomechanics_section)

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
def format_summary(data):
    """Format the analysis data into a readable text summary."""
    report = []
    report.append("# **Tennis Performance Report**\n")
    
    # Performance DNA
    dna = data.get("dna", {})
    report.append("## **Performance DNA**")
    report.append(f"- Technical Score: {dna.get('technical', 'N/A')}/100")
    report.append(f"- Tactical Score: {dna.get('tactical', 'N/A')}/100")
    report.append(f"\n**Summary:** {dna.get('summary', 'No summary available.')}\n")
    
    # Strengths
    report.append("## **Key Strengths**")
    strengths = data.get("strengths", [])
    if strengths:
        for s in strengths:
            report.append(f"- {s}")
    else:
        report.append("- *None identified*")
    
    # Areas to Improve
    report.append("\n## **Areas to Improve**")
    fixes = data.get("fixes", [])
    if fixes:
        for f in fixes:
            report.append(f"- {f}")
    else:
        report.append("- *None identified*")
    
    # Training Plan
    report.append("\n## **Training Plan**")
    plan = data.get("plan", [])
    if plan:
        for drill in plan:
            report.append(f"\n**{drill.get('title', 'Drill')}**")
            report.append(f"{drill.get('description', '')}")
    else:
        report.append("- *No drills recommended*")
    
    return "\n".join(report)

# ============================
# GEMINI CALL
# ============================
def analyze_match(api_key, video_path=None, biomechanics=None):
    """
    Analyze a tennis match video using Gemini.
    
    Args:
        api_key: Google AI Studio API key
        video_path: Path to the annotated video file (optional, uses default if not provided)
        biomechanics: Dictionary of measured biomechanics data to include in analysis
    
    Returns:
        Dictionary with analysis results
    """
    video_to_analyze = video_path if video_path else VIDEO_PATH
    print(f"[GeminiAnalysis] Analyzing video: {video_to_analyze}")
    if biomechanics:
        print(f"[GeminiAnalysis] Including biomechanics: {list(biomechanics.keys())}")
    
    client = genai.Client(
        api_key=api_key,
        http_options={"api_version": "v1alpha"}
    )

    frames_b64 = extract_frames(video_to_analyze, FRAME_STRIDE)
    
    # Build prompt with biomechanics data
    prompt_text = build_prompt(biomechanics)

    parts = [types.Part(text=prompt_text)]

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
    
    # Parse the JSON response
    json_text = extract_json(raw_text)
    analysis_data = json.loads(json_text)
    
    print(f"[GeminiAnalysis] Parsed analysis data: dna={analysis_data.get('dna', {})}")
    
    # Format and save a text summary
    formatted_text = format_summary(analysis_data)
    with open(OUTPUT_TEXT_PATH, "w", encoding="utf-8") as f:
        f.write(formatted_text)
    print(f"[GeminiAnalysis] Formatted match summary saved to: {OUTPUT_TEXT_PATH}")
    
    # Return the parsed analysis data directly
    return analysis_data

# ============================
# RUN
# ============================
if __name__ == "__main__":
    args = parse_args()
    analyze_match(args.api_key)
