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
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Mock annotated URL (in real app, this would be the output of the CV model)
          const annotatedUrl = video.originalUrl; // For now, reuse original or add a flag

          // Generate recommendation using OpenAI
          const completion = await openai.chat.completions.create({
            model: "gpt-5.1",
            messages: [
              {
                role: "system",
                content: "You are an expert tennis coach. Analyze the player's performance based on the video context provided and give specific, actionable advice to improve their game. Focus on technique, footwork, and strategy."
              },
              {
                role: "user",
                content: `Analyze the tennis swing in this video: ${video.originalUrl}. (Note: As an AI, simulate the analysis based on general best practices for a recreational player trying to improve top spin). Provide 3 key tips.`
              }
            ],
            max_tokens: 500,
          });

          const recommendation = completion.choices[0].message.content || "Could not generate recommendation.";

          // Update video with results
          await storage.updateVideo(id, {
            status: "completed",
            annotatedUrl: annotatedUrl,
            recommendation: recommendation
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
