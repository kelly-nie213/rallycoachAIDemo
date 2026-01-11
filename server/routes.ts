import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";

// Initialize OpenAI client using Replit AI env vars
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
          // Simulate computer vision processing time
          // Instead of setTimeout, we'll run the inference script
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);

          // In a real app, we might download the file from object storage first if it's not local
          // For this dummy script, we just pass the URL/path
          const { stdout, stderr } = await execAsync(`python3 inference.py "${video.originalUrl}"`);
          
          if (stderr && !stdout.includes("success.done")) {
            console.error("Inference script stderr:", stderr);
          }

          console.log("Inference output:", stdout);

          // Extract dummy results if present in stdout
          let contextPrompt = `Analyze the tennis performance in this video: ${video.originalUrl}. Provide professional insights for a recreational player.`;
          if (stdout.includes("Test-Results-")) {
            const dummyResults = stdout.split('\n').find(line => line.includes("Test-Results-"));
            contextPrompt += ` Use these technical findings from the vision model: ${dummyResults}`;
          }

          // Generate structured recommendation using OpenAI
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an expert tennis coach. Analyze the player's performance and provide structured feedback in JSON format.
                The response MUST be a JSON object with the following structure:
                {
                  "dna": {
                    "technical": number (0-100),
                    "tactical": number (0-100),
                    "summary": "string (high-level professional analysis)"
                  },
                  "strengths": ["string (at least 3 elite strengths)"],
                  "fixes": ["string (at least 2 biomechanical fixes)"],
                  "plan": [
                    { "title": "DRILL 1", "description": "string" },
                    { "title": "DRILL 2", "description": "string" }
                  ]
                }`
              },
              {
                role: "user",
                content: contextPrompt
              }
            ],
            response_format: { type: "json_object" },
          });

          const analysisData = completion.choices[0].message.content || "{}";

          // Update video with results
          await storage.updateVideo(id, {
            status: "completed",
            annotatedUrl: video.originalUrl,
            analysisData: analysisData,
            recommendation: "Analysis complete. See dashboard for details."
          });
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
