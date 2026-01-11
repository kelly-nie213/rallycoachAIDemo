import { db } from "./db";
import { videos, type Video, type InsertVideo } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createVideo(video: any): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  updateVideo(id: number, video: any): Promise<Video>;
}

export class DatabaseStorage implements IStorage {
  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(insertVideo).returning();
    return video;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async updateVideo(id: number, update: Partial<InsertVideo>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set(update)
      .where(eq(videos.id, id))
      .returning();
    return video;
  }
}

export const storage = new DatabaseStorage();
