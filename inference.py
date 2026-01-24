#!/usr/bin/env python3
"""
RallyCoach AI - Video Inference Pipeline
=========================================

This script processes uploaded tennis match footage through the following stages:
1. Video Processing - Extract frames and detect player/ball movements
2. Court Detection - Identify court lines and create mini-court visualization
3. Statistics Calculation - Compute shot speeds, recovery times, distances
4. Annotated Video Generation - Overlay tracking and analytics on video
5. Gemini LLM Analysis - Generate professional coaching insights
6. Output Results - Return structured JSON for UI display

Usage:
    python3 inference.py <video_path> <output_dir>
"""

import sys
import os
import json
import time
from typing import Dict, List, Any, Optional
from copy import deepcopy

# Add tennis_analysis to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tennis_analysis'))

# Import tennis analysis utilities
import cv2  # type: ignore
import numpy as np
import pandas as pd

from utils import (read_video, save_video, measure_distance,
                   convert_pixel_distance_to_meters)
import constants
from trackers import PlayerTracker, BallTracker
from court_line_detector import CourtLineDetector
from mini_court import MiniCourt

# ============================================================================
# CONFIGURATION
# ============================================================================

# Model paths (relative to tennis_analysis folder)
TENNIS_ANALYSIS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tennis_analysis')
BALL_MODEL = os.path.join(TENNIS_ANALYSIS_DIR, "models", "last.pt")
COURT_MODEL = os.path.join(TENNIS_ANALYSIS_DIR, "models", "keypoints_model.pth")

# Video settings
FPS = 24
TABLE_WIDTH = 320

# Recovery analysis settings
RECOVERY_RADIUS_METERS = 1.5
BALL_TOUCH_RADIUS_PX = 35
RECOVERY_TOUCH_BUFFER = 10

# Gemini API settings (uses Replit AI Integrations - no API key needed)
GEMINI_MODEL = "gemini-2.5-flash"


# ============================================================================
# TABLE DRAWING UTILITIES
# ============================================================================

def draw_ball_table(height: int, ball_coords: Optional[tuple], player_coords: dict,
                    last_ball_speed: float, recovery_times: dict,
                    ball_in_out_status: str, distance_traveled: dict) -> np.ndarray:
    """Draw the ball/recovery statistics table overlay."""
    table = np.full((height, TABLE_WIDTH, 3), 245, dtype=np.uint8)
    y, dy = 40, 30

    cv2.putText(table, "LIVE STATS", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                (0, 0, 0), 2)
    y += dy * 2

    if ball_coords:
        cv2.putText(table, f"Ball X: {ball_coords[0]}", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
        y += dy
        cv2.putText(table, f"Ball Y: {ball_coords[1]}", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
        y += dy
    else:
        cv2.putText(table, "Ball not detected", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (120, 120, 120), 2)
        y += dy * 2

    cv2.putText(table, f"Ball Status: {ball_in_out_status}", (20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
    y += dy * 2

    for pid in [1, 2]:
        cv2.putText(table, f"P{pid} Dist: {distance_traveled.get(pid, 0):.1f}m",
                    (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        y += dy
        rec_time = recovery_times.get(pid, -1)
        rec_str = f"{rec_time:.2f}s" if rec_time >= 0 else "..."
        cv2.putText(table, f"P{pid} Recovery: {rec_str}", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        y += dy

    y += dy
    cv2.putText(table, "Last Shot Speed", (20, y), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (0, 0, 0), 2)
    y += dy

    if last_ball_speed > 0:
        cv2.putText(table, f"{last_ball_speed:.1f} km/h", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 120, 0), 2)
    else:
        cv2.putText(table, "...", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                    (140, 140, 140), 2)

    return table


def draw_speed_table(height: int, stats_row: pd.Series) -> np.ndarray:
    """Draw the player speed statistics table overlay."""
    table = np.full((height, TABLE_WIDTH, 3), 235, dtype=np.uint8)
    y, dy = 40, 30

    cv2.putText(table, "PLAYER STATS", (20, int(y)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    y += dy * 2

    for pid in [1, 2]:
        cv2.putText(table, f"PLAYER {pid}", (20, int(y)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)
        y += dy

        cv2.putText(
            table,
            f"Last Shot: {stats_row[f'player_{pid}_last_shot_speed']:.1f} km/h",
            (20, int(y)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        y += dy

        cv2.putText(
            table,
            f"Avg Shot: {stats_row[f'player_{pid}_average_shot_speed']:.1f} km/h",
            (20, int(y)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        y += dy

        cv2.putText(
            table,
            f"Avg Move: {stats_row[f'player_{pid}_average_player_speed']:.1f} km/h",
            (20, int(y)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        y += int(dy * 1.5)

    return table


# ============================================================================
# MAIN VIDEO ANALYSIS PIPELINE
# ============================================================================

def analyze_video(input_video: str, output_video: str) -> Dict[str, Any]:
    """
    Run the complete tennis video analysis pipeline.
    
    Args:
        input_video: Path to input video file
        output_video: Path to save annotated output video
        
    Returns:
        Dictionary containing all analysis results and statistics
    """
    print(f"[STEP 1] Loading video: {input_video}")
    
    # Check if models exist
    if not os.path.exists(BALL_MODEL):
        print(f"[WARNING] Ball model not found at {BALL_MODEL}")
        print("[INFO] Using default YOLOv8 model for ball detection")
        ball_model_path = "yolov8n"  # Fallback to pretrained
    else:
        ball_model_path = BALL_MODEL
        
    if not os.path.exists(COURT_MODEL):
        print(f"[WARNING] Court model not found at {COURT_MODEL}")
        raise FileNotFoundError(f"Court keypoints model required at {COURT_MODEL}")
    
    # Read video frames
    video_frames = read_video(input_video)
    total_frames = len(video_frames)
    print(f"[STEP 1] Loaded {total_frames} frames")
    
    # Initialize trackers
    print("[STEP 2] Initializing trackers...")
    player_tracker = PlayerTracker(model_path="yolov8x")
    ball_tracker = BallTracker(model_path=ball_model_path)
    
    # Detect players and ball
    print("[STEP 2] Detecting players...")
    player_dets = player_tracker.detect_frames(video_frames)
    
    print("[STEP 2] Detecting ball...")
    ball_dets = ball_tracker.detect_frames(video_frames)
    ball_dets = ball_tracker.interpolate_ball_positions(ball_dets)
    
    # Detect court lines
    print("[STEP 3] Detecting court lines...")
    court_detector = CourtLineDetector(COURT_MODEL)
    court_kps = court_detector.predict(video_frames[0])
    player_dets = player_tracker.choose_and_filter_players(court_kps, player_dets)
    
    # Initialize mini court
    print("[STEP 3] Creating mini court visualization...")
    mini_court = MiniCourt(video_frames[0])
    
    # Convert coordinates to mini court space
    player_mc, ball_mc = mini_court.convert_bounding_boxes_to_mini_court_coordinates(
        player_dets, ball_dets, court_kps)
    
    # Get ball shot frames
    ball_shot_frames = ball_tracker.get_ball_shot_frames(ball_dets)
    baseline_centers = mini_court.get_baseline_centers()
    
    # Calculate recovery radius in pixels
    RECOVERY_RADIUS_PX = (RECOVERY_RADIUS_METERS *
                          mini_court.get_width_of_mini_court() /
                          constants.DOUBLE_LINE_WIDTH)
    
    # ============================================================================
    # CALCULATE STATISTICS
    # ============================================================================
    print("[STEP 4] Calculating statistics...")
    
    ball_in_out_status = "IN"
    bounce_frames = set(ball_shot_frames[1:])
    recovery_times_by_frame: Dict[int, Dict[int, float]] = {}
    
    # Calculate recovery times
    for i in range(len(ball_shot_frames) - 1):
        start, end = ball_shot_frames[i], ball_shot_frames[i + 1]
        
        if start not in player_mc or start not in ball_mc:
            continue
            
        players = player_mc[start]
        if not players:
            continue
            
        hitter = min(
            players,
            key=lambda p: measure_distance(players[p], ball_mc[start][1]))
        opponent = 1 if hitter == 2 else 2
        
        recovery_time = -1
        for f in range(start, end):
            if f not in player_mc or opponent not in player_mc[f]:
                continue
            if measure_distance(
                    player_mc[f][opponent],
                    baseline_centers[opponent]) <= RECOVERY_RADIUS_PX:
                recovery_time = (f - start) / FPS
                break
        
        recovery_times_by_frame[start] = {opponent: recovery_time}
    
    # Initialize tracking variables
    player_ball_touch_time: dict[int, float | None] = {1: None, 2: None}
    player_circle_touch_time: dict[int, float | None] = {1: None, 2: None}
    
    # Initialize stats
    stats = [{
        "frame_num": 0,
        "player_1_number_of_shots": 0,
        "player_1_total_shot_speed": 0,
        "player_1_last_shot_speed": 0,
        "player_1_total_player_speed": 0,
        "player_1_last_player_speed": 0,
        "player_2_number_of_shots": 0,
        "player_2_total_shot_speed": 0,
        "player_2_last_shot_speed": 0,
        "player_2_total_player_speed": 0,
        "player_2_last_player_speed": 0,
    }]
    
    # Calculate shot speeds
    for i in range(len(ball_shot_frames) - 1):
        start, end = ball_shot_frames[i], ball_shot_frames[i + 1]
        dt = (end - start) / FPS
        if dt == 0:
            continue
        
        if start not in ball_mc or end not in ball_mc:
            continue
        if start not in player_mc:
            continue
            
        ball_dist_px = measure_distance(ball_mc[start][1], ball_mc[end][1])
        ball_dist_m = convert_pixel_distance_to_meters(
            ball_dist_px, constants.DOUBLE_LINE_WIDTH,
            mini_court.get_width_of_mini_court())
        ball_speed = (ball_dist_m / dt) * 3.6
        
        players = player_mc[start]
        if not players:
            continue
            
        hitter = min(
            players,
            key=lambda p: measure_distance(players[p], ball_mc[start][1]))
        opponent = 1 if hitter == 2 else 2
        
        if end in player_mc and opponent in player_mc[start] and opponent in player_mc[end]:
            opp_dist_px = measure_distance(player_mc[start][opponent],
                                           player_mc[end][opponent])
            opp_dist_m = convert_pixel_distance_to_meters(
                opp_dist_px, constants.DOUBLE_LINE_WIDTH,
                mini_court.get_width_of_mini_court())
            opp_speed = (opp_dist_m / dt) * 3.6
        else:
            opp_speed = 0
        
        cur = deepcopy(stats[-1])
        cur["frame_num"] = start
        cur[f"player_{hitter}_number_of_shots"] += 1
        cur[f"player_{hitter}_total_shot_speed"] += ball_speed
        cur[f"player_{hitter}_last_shot_speed"] = ball_speed
        cur[f"player_{opponent}_total_player_speed"] += opp_speed
        cur[f"player_{opponent}_last_player_speed"] = opp_speed
        stats.append(cur)
    
    # Create stats dataframe
    df = pd.DataFrame(stats)
    frames_df = pd.DataFrame({"frame_num": range(len(video_frames))})
    df = pd.merge(frames_df, df, on="frame_num", how="left").ffill().fillna(0)
    
    df["player_1_average_shot_speed"] = df["player_1_total_shot_speed"] / df[
        "player_1_number_of_shots"].replace(0, 1)
    df["player_2_average_shot_speed"] = df["player_2_total_shot_speed"] / df[
        "player_2_number_of_shots"].replace(0, 1)
    df["player_1_average_player_speed"] = df[
        "player_1_total_player_speed"] / df[
            "player_2_number_of_shots"].replace(0, 1)
    df["player_2_average_player_speed"] = df[
        "player_2_total_player_speed"] / df[
            "player_1_number_of_shots"].replace(0, 1)
    
    # ============================================================================
    # GENERATE ANNOTATED VIDEO
    # ============================================================================
    print("[STEP 5] Drawing annotations...")
    
    frames = player_tracker.draw_bboxes(video_frames, player_dets)
    frames = ball_tracker.draw_bboxes(frames, ball_dets)
    frames = court_detector.draw_keypoints_on_video(frames, court_kps)
    frames = mini_court.draw_mini_court(frames)
    
    frames = mini_court.draw_circle_on_mini_court(frames, baseline_centers,
                                                  int(RECOVERY_RADIUS_PX),
                                                  (255, 0, 0), 2)
    
    frames = mini_court.draw_points_on_mini_court(frames, player_mc)
    frames = mini_court.draw_points_on_mini_court(frames,
                                                  ball_mc,
                                                  color=(0, 255, 255))
    
    # Track distance traveled
    distance_traveled = {1: 0.0, 2: 0.0}
    distance_display = {1: 0.0, 2: 0.0}
    last_positions: dict[int, tuple[int, int] | None] = {1: None, 2: None}
    DIST_UPDATE_FRAMES = int(2 * FPS)
    
    final_frames = []
    last_recovery_display: dict[int, float] = {1: 0.0, 2: 0.0}
    
    print("[STEP 5] Generating final video frames...")
    for i, frame in enumerate(frames):
        cv2.putText(frame, f"Frame: {i}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    1, (0, 255, 0), 2)
        
        # Update distance traveled
        if i in player_dets and player_dets[i]:
            for pid, bbox in player_dets[i].items():
                if len(bbox) >= 4:
                    x1, y1, x2, y2 = bbox[:4]
                    center = (int((x1 + x2) / 2), int((y1 + y2) / 2))
                    
                    if last_positions[pid] is not None:
                        dist_px = measure_distance(last_positions[pid], center)
                        dist_m = convert_pixel_distance_to_meters(
                            dist_px, constants.DOUBLE_LINE_WIDTH,
                            mini_court.get_width_of_mini_court())
                        distance_traveled[pid] += dist_m
                    
                    last_positions[pid] = center
        
        if i % DIST_UPDATE_FRAMES == 0:
            distance_display[1] = distance_traveled[1]
            distance_display[2] = distance_traveled[2]
        
        # Check ball in/out status
        if i in bounce_frames and i in ball_mc:
            ball_pt = ball_mc[i][1]
            ball_in_out_status = (
                "IN" if mini_court.is_point_inside_court(ball_pt) else "OUT")
        
        # Update recovery display
        if i in recovery_times_by_frame:
            for pid, val in recovery_times_by_frame[i].items():
                last_recovery_display[pid] = val
        
        # Get ball coordinates for display
        ball_coords = None
        if i in ball_mc:
            ball_coords = ball_mc[i][1]
        
        # Get player coordinates
        player_coords = {}
        if i in player_mc:
            player_coords = player_mc[i]
        
        last_ball_speed = max(df.iloc[i]["player_1_last_shot_speed"],
                              df.iloc[i]["player_2_last_shot_speed"])
        
        # Draw tables
        table1 = draw_ball_table(frame.shape[0], ball_coords, player_coords,
                                 last_ball_speed, last_recovery_display,
                                 ball_in_out_status, distance_display)
        table2 = draw_speed_table(frame.shape[0], df.iloc[i])
        
        final_frames.append(np.hstack((frame, table1, table2)))
    
    # Save output video
    print(f"[STEP 5] Saving annotated video to: {output_video}")
    save_video(final_frames, output_video)
    
    # ============================================================================
    # EXTRACT BIOMECHANICS DATA
    # ============================================================================
    
    # Get final stats
    final_stats = df.iloc[-1] if len(df) > 0 else df.iloc[0]
    
    # Calculate aggregate metrics
    p1_shots = int(final_stats["player_1_number_of_shots"])
    p2_shots = int(final_stats["player_2_number_of_shots"])
    total_shots = p1_shots + p2_shots
    
    p1_avg_speed = float(final_stats["player_1_average_shot_speed"])
    p2_avg_speed = float(final_stats["player_2_average_shot_speed"])
    
    p1_move_speed = float(final_stats["player_1_average_player_speed"])
    p2_move_speed = float(final_stats["player_2_average_player_speed"])
    
    # Calculate recovery time averages
    p1_recovery_times = [v[1] for v in recovery_times_by_frame.values() if 1 in v and v[1] >= 0]
    p2_recovery_times = [v[2] for v in recovery_times_by_frame.values() if 2 in v and v[2] >= 0]
    
    avg_recovery_p1 = sum(p1_recovery_times) / len(p1_recovery_times) if p1_recovery_times else 0
    avg_recovery_p2 = sum(p2_recovery_times) / len(p2_recovery_times) if p2_recovery_times else 0
    
    biomechanics = {
        "total_shots": total_shots,
        "player_1_shots": p1_shots,
        "player_2_shots": p2_shots,
        "player_1_avg_shot_speed": round(p1_avg_speed, 1),
        "player_2_avg_shot_speed": round(p2_avg_speed, 1),
        "player_1_avg_move_speed": round(p1_move_speed, 1),
        "player_2_avg_move_speed": round(p2_move_speed, 1),
        "player_1_distance_traveled": round(distance_traveled[1], 1),
        "player_2_distance_traveled": round(distance_traveled[2], 1),
        "player_1_avg_recovery_time": round(avg_recovery_p1, 2),
        "player_2_avg_recovery_time": round(avg_recovery_p2, 2),
        "total_frames": total_frames,
        "duration_seconds": round(total_frames / FPS, 1),
        "detected_strokes": [
            {"type": "player_1_shots", "count": p1_shots},
            {"type": "player_2_shots", "count": p2_shots}
        ]
    }
    
    return {
        "biomechanics": biomechanics,
        "annotated_video_path": output_video,
        "total_frames": total_frames
    }


# ============================================================================
# GEMINI LLM ANALYSIS
# ============================================================================

def call_gemini_llm(biomechanics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Gemini LLM to generate professional coaching insights.
    
    Uses Replit AI Integrations for Gemini access (no API key required).
    """
    print("[STEP 6] Calling Gemini LLM for coaching analysis...")
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            api_key=os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY", ""),
            base_url=os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL", "")
        )
        
        prompt = f"""You are an expert tennis coach analyzing match statistics from a video analysis system.

MATCH STATISTICS:
{json.dumps(biomechanics, indent=2)}

Based on these statistics, provide coaching feedback in this exact JSON format:
{{
    "dna": {{
        "technical": <score 0-100 based on shot speeds and consistency>,
        "tactical": <score 0-100 based on movement and recovery>,
        "summary": "<2-3 sentence professional analysis>"
    }},
    "strengths": [
        "<strength 1 with specific numbers from data>",
        "<strength 2 with specific numbers from data>",
        "<strength 3>"
    ],
    "fixes": [
        "<area to improve with specific recommendation>",
        "<area to improve with specific recommendation>"
    ],
    "plan": [
        {{"title": "DRILL 1: <name>", "description": "<detailed drill description>"}},
        {{"title": "DRILL 2: <name>", "description": "<detailed drill description>"}}
    ]
}}

Respond ONLY with valid JSON, no additional text."""

        response = client.chat.completions.create(
            model=GEMINI_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert tennis coach. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2048
        )
        
        response_text = response.choices[0].message.content
        
        # Parse JSON from response
        if response_text:
            # Clean up response if needed
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            analysis = json.loads(response_text.strip())
            print(f"[STEP 6] Gemini analysis complete")
            return analysis
            
    except Exception as e:
        print(f"[WARNING] Gemini API call failed: {e}")
        print("[INFO] Using fallback analysis")
    
    # Fallback analysis if Gemini fails
    p1_speed = biomechanics.get("player_1_avg_shot_speed", 0)
    p2_speed = biomechanics.get("player_2_avg_shot_speed", 0)
    avg_speed = (p1_speed + p2_speed) / 2 if (p1_speed + p2_speed) > 0 else 50
    
    technical_score = min(100, int(avg_speed * 1.5))
    tactical_score = min(100, int(70 + (biomechanics.get("total_shots", 0) * 2)))
    
    return {
        "dna": {
            "technical": technical_score,
            "tactical": tactical_score,
            "summary": (
                f"Analysis of {biomechanics.get('total_shots', 0)} total shots over "
                f"{biomechanics.get('duration_seconds', 0)} seconds. "
                f"Player 1 averaged {p1_speed} km/h shot speed, "
                f"Player 2 averaged {p2_speed} km/h."
            )
        },
        "strengths": [
            f"Player 1 shot speed averaging {p1_speed} km/h",
            f"Player 2 movement covering {biomechanics.get('player_2_distance_traveled', 0)}m",
            f"Consistent rally with {biomechanics.get('total_shots', 0)} total shots"
        ],
        "fixes": [
            f"Work on recovery positioning (current avg: {biomechanics.get('player_1_avg_recovery_time', 0)}s)",
            "Focus on footwork drills to improve court coverage"
        ],
        "plan": [
            {
                "title": "DRILL 1: Recovery Sprint",
                "description": "Practice split-step timing and recovery to baseline center after each shot. 10 reps x 3 sets."
            },
            {
                "title": "DRILL 2: Shot Speed Progression",
                "description": "Gradually increase racket head speed while maintaining consistency. Start at 70% power, build to 100%."
            }
        ]
    }


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main entry point for the inference pipeline."""
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "No input file provided",
            "usage": "python3 inference.py <video_path> [output_dir]"
        }))
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp"
    
    print("=" * 60)
    print("RallyCoach AI - Video Inference Pipeline")
    print("=" * 60)
    print(f"Input: {video_path}")
    print(f"Output directory: {output_dir}")
    print("=" * 60)
    
    try:
        # Generate output path
        annotated_path = os.path.join(output_dir, "annotated_output.mp4")
        
        # Run video analysis
        analysis_results = analyze_video(video_path, annotated_path)
        biomechanics = analysis_results["biomechanics"]
        
        # Get LLM coaching insights
        gemini_analysis = call_gemini_llm(biomechanics)
        
        # Format final output
        output = {
            "status": "success",
            "video": {
                "original": video_path,
                "annotated": annotated_path,
                "duration": biomechanics["duration_seconds"],
                "total_frames": biomechanics["total_frames"]
            },
            "biomechanics": biomechanics,
            "analysis": gemini_analysis
        }
        
        # Print result between markers for backend parsing
        print("\n" + "=" * 60)
        print("INFERENCE_RESULT_JSON_START")
        print(json.dumps(output, indent=2))
        print("INFERENCE_RESULT_JSON_END")
        print("=" * 60)
        
        print("\n[COMPLETE] Video analysis finished successfully!")
        
    except FileNotFoundError as e:
        error_output = {
            "status": "error",
            "message": str(e),
            "type": "file_not_found"
        }
        print("INFERENCE_RESULT_JSON_START")
        print(json.dumps(error_output, indent=2))
        print("INFERENCE_RESULT_JSON_END")
        sys.exit(1)
        
    except Exception as e:
        error_output = {
            "status": "error",
            "message": str(e),
            "type": "processing_error"
        }
        print("INFERENCE_RESULT_JSON_START")
        print(json.dumps(error_output, indent=2))
        print("INFERENCE_RESULT_JSON_END")
        sys.exit(1)


if __name__ == "__main__":
    main()
