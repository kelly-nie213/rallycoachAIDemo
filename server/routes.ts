import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Object Storage routes for file uploads
  registerObjectStorageRoutes(app);

  // === API Routes ===

  // Upload video metadata (after file is uploaded to storage)
  app.post(api.videos.upload.path, async (req, res) => {
    try {
      // Expecting { originalUrl: string } from client
      const { originalUrl } = req.body;
      if (!originalUrl) {
        return res.status(400).json({ message: "originalUrl is required" });
      }

      const video = await storage.createVideo({
        originalUrl,
        status: "pending"
      });

      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video record" });
    }
  });

  // Get video status
  app.get(api.videos.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process video (Mock inference + AI recommendation)
  // Note: shared/routes.ts didn't define this fully, so we'll use a custom path or match existing pattern
  // We added 'process' in shared/routes.ts in previous step? Yes.
  app.post(api.videos.process.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Update status to processing
      video = await storage.updateVideo(id, { status: "processing" });
      res.status(202).json(video); // Accepted

      // Start background processing
      (async () => {
        try {
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          // Download video from object storage to temp file
          console.log(`[Inference] Starting pipeline for: ${video.originalUrl}`);
          
          const objectStorage = new ObjectStorageService();
          const objectFile = await objectStorage.getObjectEntityFile(video.originalUrl);
          
          // Create temp file path
          const tempVideoPath = path.join("/tmp", `video_${id}_${Date.now()}.mp4`);
          
          console.log(`[Inference] Downloading video to: ${tempVideoPath}`);
          
          // Download the file to temp location
          const writeStream = fs.createWriteStream(tempVideoPath);
          const readStream = objectFile.createReadStream();
          await pipeline(readStream, writeStream);
          
          console.log(`[Inference] Download complete, starting analysis...`);

          // Run the inference pipeline script with the local file path
          const { stdout, stderr } = await execAsync(
            `python3 inference.py "${tempVideoPath}" "/tmp"`,
            { maxBuffer: 10 * 1024 * 1024, timeout: 600000 } // 10MB buffer, 10min timeout
          );
          
          if (stderr) {
            console.warn("Inference script stderr:", stderr);
          }

          console.log("Inference output:", stdout);

          // Parse the structured JSON output from inference.py
          // The script outputs JSON between INFERENCE_RESULT_JSON_START and INFERENCE_RESULT_JSON_END markers
          let analysisData = "{}";
          let annotatedUrl = video.originalUrl;
          
          if (stdout.includes("INFERENCE_RESULT_JSON_START") && stdout.includes("INFERENCE_RESULT_JSON_END")) {
            const jsonStart = stdout.indexOf("INFERENCE_RESULT_JSON_START") + "INFERENCE_RESULT_JSON_START".length;
            const jsonEnd = stdout.indexOf("INFERENCE_RESULT_JSON_END");
            const jsonString = stdout.substring(jsonStart, jsonEnd).trim();
            
            try {
              const inferenceResult = JSON.parse(jsonString);
              console.log("[Inference] Parsed result:", inferenceResult.status);
              
              // Extract the analysis portion for the UI
              // The inference.py script now returns the complete Gemini analysis
              if (inferenceResult.analysis) {
                analysisData = JSON.stringify(inferenceResult.analysis);
              }
              
              // Get the annotated video path if available
              if (inferenceResult.video?.annotated) {
                annotatedUrl = inferenceResult.video.annotated;
              }
            } catch (parseError) {
              console.error("[Inference] Failed to parse JSON output:", parseError);
              // Fall back to using original video URL
            }
          } else if (!stdout.includes("success.done")) {
            throw new Error("Inference script did not complete successfully");
          }

          // Update video record with results from inference.py
          await storage.updateVideo(id, {
            status: "completed",
            annotatedUrl: annotatedUrl,
            analysisData: analysisData,
            recommendation: "Analysis complete. See dashboard for details."
          });
          
          console.log(`[Inference] Completed for video ${id}`);
          
          // Clean up temp file
          try {
            fs.unlinkSync(tempVideoPath);
            console.log(`[Inference] Cleaned up temp file: ${tempVideoPath}`);
          } catch (cleanupErr) {
            console.warn(`[Inference] Failed to clean up temp file: ${cleanupErr}`);
          }
        } catch (err) {
          console.error("Background processing failed:", err);
          await storage.updateVideo(id, { status: "failed" });
        }
      })();

    } catch (error) {
      console.error("Error processing video:", error);
      res.status(500).json({ message: "Failed to start processing" });
    }
  });

  return httpServer;
}
