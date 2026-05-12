import { redis } from "../services/redis.service.ts";

export async function enqueueScan(job: any) {
  await redis.lpush("scan_jobs", JSON.stringify(job));
}
