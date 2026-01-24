import cv2  
import numpy as np
import pandas as pd
from copy import deepcopy
import gc

from utils import (read_video, save_video, measure_distance,
                   convert_pixel_distance_to_meters)
import constants
from trackers import PlayerTracker, BallTracker
from court_line_detector import CourtLineDetector
from mini_court import MiniCourt

# ======================================================
# CONFIG
# ======================================================
import os

# Default paths (can be overridden by function parameters)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BALL_MODEL = os.path.join(BASE_DIR, "models", "last.pt")
DEFAULT_COURT_MODEL = os.path.join(BASE_DIR, "models", "keypoints_model.pth")

FPS = 24
TABLE_WIDTH = 320


# ======================================================
# TABLE DRAWING
# ======================================================
def draw_ball_table(height, ball_coords, player_coords, last_ball_speed,
                    recovery_times, ball_in_out_status, distance_traveled):
    table = np.full((height, TABLE_WIDTH, 3), 245, dtype=np.uint8)

    y, dy = 40, 30

    cv2.putText(table, "NEW FEATURES", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9,
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

    y += dy
    cv2.putText(table, f"Ball Bounce: {ball_in_out_status}", (20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                (0, 150, 0) if ball_in_out_status == "IN" else (0, 0, 255), 2)
    y += dy * 2

    cv2.putText(table, "Player Coordinates", (20, y), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (0, 0, 0), 2)
    y += dy

    for pid in [1, 2]:
        if pid in player_coords:
            text = f"P{pid}: {player_coords[pid]}"
            color = (0, 0, 0)
        else:
            text = f"P{pid}: not detected"
            color = (120, 120, 120)

        cv2.putText(table, text, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color,
                    2)
        y += dy

    y += dy
    cv2.putText(table, "Recovery Time (s)", (20, y), cv2.FONT_HERSHEY_SIMPLEX,
                0.7, (0, 0, 0), 2)
    y += dy

    for pid in [1, 2]:
        val = recovery_times.get(pid, 0)
        if val == -1:
            text, color = f"P{pid}: no recovery", (0, 0, 255)
        else:
            text, color = f"P{pid}: {val:.2f}s", (0, 120, 0)

        cv2.putText(table, text, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color,
                    2)
        y += dy

    y += dy
    cv2.putText(table, "Distance Traveled (m)", (20, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    y += dy

    for pid in [1, 2]:
        cv2.putText(table, f"P{pid}: {distance_traveled[pid]:.2f}", (20, y),
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


def draw_speed_table(height, stats_row):
    table = np.full((height, TABLE_WIDTH, 3), 235, dtype=np.uint8)

    y = 40
    dy = 30

    cv2.putText(table, "ORIGINAL FEATURES", (20, int(y)),
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


# ======================================================
# MAIN
# ======================================================
def main(input_video: str, output_video: str, 
         ball_model: str | None = None, court_model: str | None = None) -> dict:
    """
    Main video analysis pipeline.
    
    Args:
        input_video: Path to input video file
        output_video: Path for output annotated video
        ball_model: Path to ball detection model (optional, uses default)
        court_model: Path to court detection model (optional, uses default)
    
    Returns:
        Dictionary containing analysis results and metrics
    """
    if input_video is None:
        raise ValueError("input_video path is required")
    if output_video is None:
        raise ValueError("output_video path is required")
    
    # Use default models if not specified
    ball_model = ball_model or DEFAULT_BALL_MODEL
    court_model = court_model or DEFAULT_COURT_MODEL
    
    print(f"[TennisAnalysis] Loading video: {input_video}")
    print(f"[TennisAnalysis] Output path: {output_video}")
    print(f"[TennisAnalysis] Ball model: {ball_model}")
    print(f"[TennisAnalysis] Court model: {court_model}")
    
    video_frames = read_video(input_video)
    print(f"[TennisAnalysis] Loaded {len(video_frames)} frames")
    print(f"[TennisAnalysis] Memory optimization: using yolov8n (nano) model")

    # Use yolov8n (nano) instead of yolov8x for much lower memory usage
    player_tracker = PlayerTracker(model_path="yolov8n")
    ball_tracker = BallTracker(model_path=ball_model)

    print("[TennisAnalysis] Running player detection...")
    player_dets = player_tracker.detect_frames(video_frames)
    print(f"[TennisAnalysis] Player detection complete: {len(player_dets)} frames processed")
    
    # Free memory before next heavy operation
    gc.collect()
    
    print("[TennisAnalysis] Running ball detection...")
    ball_dets = ball_tracker.detect_frames(video_frames)
    print(f"[TennisAnalysis] Ball detection complete: {len(ball_dets)} frames processed")
    ball_dets = ball_tracker.interpolate_ball_positions(ball_dets)

    # Free memory again
    gc.collect()
    
    print("[TennisAnalysis] Detecting court lines...")
    court_detector = CourtLineDetector(court_model)
    court_kps = court_detector.predict(video_frames[0])
    player_dets = player_tracker.choose_and_filter_players(
        court_kps, player_dets)

    mini_court = MiniCourt(video_frames[0])

    player_mc, ball_mc = mini_court.convert_bounding_boxes_to_mini_court_coordinates(
        player_dets, ball_dets, court_kps)

    ball_shot_frames = ball_tracker.get_ball_shot_frames(ball_dets)
    baseline_centers = mini_court.get_baseline_centers()

    ball_in_out_status = "IN"
    bounce_frames = set(ball_shot_frames[1:])

    RECOVERY_RADIUS_METERS = 1.5
    RECOVERY_RADIUS_PX = (RECOVERY_RADIUS_METERS *
                          mini_court.get_width_of_mini_court() /
                          constants.DOUBLE_LINE_WIDTH)

    BALL_TOUCH_RADIUS_PX = 35
    RECOVERY_TOUCH_BUFFER = 10

    recovery_times_by_frame = {}

    for i in range(len(ball_shot_frames) - 1):
        start, end = ball_shot_frames[i], ball_shot_frames[i + 1]

        players = player_mc[start]
        hitter = min(
            players,
            key=lambda p: measure_distance(players[p], ball_mc[start][1]))
        opponent = 1 if hitter == 2 else 2

        recovery_time = -1

        for f in range(start, end):
            if opponent not in player_mc[f]:
                continue
            if measure_distance(
                    player_mc[f][opponent],
                    baseline_centers[opponent]) <= RECOVERY_RADIUS_PX:
                recovery_time = (f - start) / FPS
                break

        recovery_times_by_frame[start] = {opponent: recovery_time}

    player_ball_touch_time: dict[int, float | None] = {1: None, 2: None}
    player_circle_touch_time: dict[int, float | None] = {1: None, 2: None}

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

    for i in range(len(ball_shot_frames) - 1):
        start, end = ball_shot_frames[i], ball_shot_frames[i + 1]
        dt = (end - start) / FPS
        if dt == 0:
            continue

        ball_dist_px = measure_distance(ball_mc[start][1], ball_mc[end][1])
        ball_dist_m = convert_pixel_distance_to_meters(
            ball_dist_px, constants.DOUBLE_LINE_WIDTH,
            mini_court.get_width_of_mini_court())
        ball_speed = (ball_dist_m / dt) * 3.6

        players = player_mc[start]
        hitter = min(
            players,
            key=lambda p: measure_distance(players[p], ball_mc[start][1]))
        opponent = 1 if hitter == 2 else 2

        opp_dist_px = measure_distance(player_mc[start][opponent],
                                       player_mc[end][opponent])
        opp_dist_m = convert_pixel_distance_to_meters(
            opp_dist_px, constants.DOUBLE_LINE_WIDTH,
            mini_court.get_width_of_mini_court())
        opp_speed = (opp_dist_m / dt) * 3.6

        cur = deepcopy(stats[-1])
        cur["frame_num"] = start
        cur[f"player_{hitter}_number_of_shots"] += 1
        cur[f"player_{hitter}_total_shot_speed"] += ball_speed
        cur[f"player_{hitter}_last_shot_speed"] = ball_speed
        cur[f"player_{opponent}_total_player_speed"] += opp_speed
        cur[f"player_{opponent}_last_player_speed"] = opp_speed
        stats.append(cur)

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

    # ===============================
    # DISTANCE TRAVELED (FIXED)
    # ===============================
    distance_traveled = {1: 0.0, 2: 0.0}
    distance_display = {1: 0.0, 2: 0.0}
    last_positions: dict[int, tuple[int, int] | None] = {1: None, 2: None}
    DIST_UPDATE_FRAMES = int(2 * FPS)

    final_frames = []
    last_recovery_display = {1: 0, 2: 0}

    for i, frame in enumerate(frames):

        cv2.putText(frame, f"Frame: {i}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    1, (0, 255, 0), 2)

        # inside main loop
        if player_dets[i]:
            for pid, (x1, y1, x2, y2) in player_dets[i].items():
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

        if i in bounce_frames and i in ball_mc:
            ball_pt = ball_mc[i][1]
            ball_in_out_status = (
                "IN" if mini_court.is_point_inside_court(ball_pt) else "OUT")

        if i in player_mc and i in ball_mc:
            for pid in player_mc[i]:
                if measure_distance(player_mc[i][pid],
                                    ball_mc[i][1]) <= BALL_TOUCH_RADIUS_PX:
                    if player_ball_touch_time[pid] is None:
                        player_ball_touch_time[pid] = i / FPS

        if i in player_mc:
            for pid in player_mc[i]:
                if measure_distance(
                        player_mc[i][pid], baseline_centers[pid]
                ) <= RECOVERY_RADIUS_PX + RECOVERY_TOUCH_BUFFER:
                    if player_circle_touch_time[pid] is None:
                        player_circle_touch_time[pid] = i / FPS

        if i in recovery_times_by_frame:
            for pid, val in recovery_times_by_frame[i].items():
                last_recovery_display[pid] = val

        ball_coords = None
        if ball_dets[i]:
            x1, y1, x2, y2 = next(iter(ball_dets[i].values()))
            ball_coords = (int((x1 + x2) / 2), int((y1 + y2) / 2))

        player_coords = {}
        if player_dets[i]:
            for pid, (x1, y1, x2, y2) in player_dets[i].items():
                player_coords[pid] = (int((x1 + x2) / 2), int((y1 + y2) / 2))

        last_ball_speed = max(df.iloc[i]["player_1_last_shot_speed"],
                              df.iloc[i]["player_2_last_shot_speed"])

        table1 = draw_ball_table(frame.shape[0], ball_coords, player_coords,
                                 last_ball_speed, last_recovery_display,
                                 ball_in_out_status, distance_display)
        table2 = draw_speed_table(frame.shape[0], df.iloc[i])

        final_frames.append(np.hstack((frame, table1, table2)))

    print(f"[TennisAnalysis] Saving annotated video to: {output_video}")
    save_video(final_frames, output_video)
    print(f"[TennisAnalysis] Video saved successfully")
    
    # Compile analysis results to return
    total_frames = len(video_frames)
    duration_seconds = total_frames / FPS
    
    # Calculate aggregate statistics
    final_stats = df.iloc[-1] if len(df) > 0 else {}
    
    player_1_shots = int(final_stats.get('player_1_number_of_shots', 0))
    player_2_shots = int(final_stats.get('player_2_number_of_shots', 0))
    
    results = {
        "video": {
            "input": input_video,
            "output": output_video,
            "total_frames": total_frames,
            "duration_seconds": duration_seconds,
            "fps": FPS
        },
        "players": {
            "player_1": {
                "shots": player_1_shots,
                "avg_shot_speed_kmh": float(final_stats.get('player_1_average_shot_speed', 0)),
                "avg_movement_speed_kmh": float(final_stats.get('player_1_average_player_speed', 0)),
                "distance_traveled_m": distance_traveled.get(1, 0)
            },
            "player_2": {
                "shots": player_2_shots,
                "avg_shot_speed_kmh": float(final_stats.get('player_2_average_shot_speed', 0)),
                "avg_movement_speed_kmh": float(final_stats.get('player_2_average_player_speed', 0)),
                "distance_traveled_m": distance_traveled.get(2, 0)
            }
        },
        "ball_tracking": {
            "shot_frames": ball_shot_frames,
            "total_shots": len(ball_shot_frames) - 1 if len(ball_shot_frames) > 1 else 0,
            "last_bounce_status": ball_in_out_status
        },
        "court_detection": {
            "keypoints_detected": len(court_kps) if court_kps is not None else 0
        }
    }
    
    print(f"[TennisAnalysis] Analysis complete: {player_1_shots + player_2_shots} total shots detected")
    return results


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        main(input_video=sys.argv[1], output_video=sys.argv[2])
    else:
        print("Usage: python utils.py <input_video> <output_video>")
