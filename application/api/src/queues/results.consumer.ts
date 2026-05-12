import Redis from "ioredis";
import { ScanModel } from "../models/Scan.ts";
import type { DetectionResult } from "@packages/types/scans/scans.types.ts";
import { gradeDetectionResult } from "../services/grading.service.ts";
import { logger } from "../utils/logger.ts";

const RESULTS_QUEUE = "scan_results";

/**
 * Results Consumer
 * 
 * Consumes detection results from Python worker and updates MongoDB.
 * 
 * Flow:
 * 1. Python worker pushes to Redis scan_results queue
 * 2. This consumer reads from queue
 * 3. Updates Scan document with detection_result
 * 4. Frontend polls to get updated data
 */

export class ResultsConsumer {
  private redis: Redis.Redis;
  private running = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redis = new Redis.default(redisUrl);
    
    this.redis.on("error", (err: Error) => {
      logger.error("Redis consumer error:", err);
    });
    
    this.redis.on("connect", () => {
      logger.info("Results consumer connected to Redis");
    });
  }

  /**
   * Start consuming results from Redis queue
   */
  async start() {
    if (this.running) {
      logger.warn("Results consumer already running");
      return;
    }

    this.running = true;
    logger.info(`Results consumer started, listening on ${RESULTS_QUEUE}`);

    while (this.running) {
      try {
        // Block and wait for result (timeout: 5 seconds)
        const result = await this.redis.brpop(RESULTS_QUEUE, 5);

        if (!result) continue; // Timeout, try again

        const [, rawResult] = result;
        await this.processResult(rawResult);

      } catch (error) {
        logger.error("Error in results consumer loop:", error);
        // Wait a bit before retrying to avoid tight loop on persistent errors
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info("Results consumer stopped");
  }

  /**
   * Stop the consumer
   */
  stop() {
    this.running = false;
    logger.info("Stopping results consumer...");
  }

  /**
   * Process a single result from the queue
   */
  private async processResult(rawResult: string) {
    try {
      const result = JSON.parse(rawResult) as DetectionResult & { scan_id: string; template_id: string };

      logger.info(`Processing result for scan ${result.scan_id}`);

      // Find scan document
      const scan = await ScanModel.findOne({ scan_id: result.scan_id });

      if (!scan) {
        logger.error(`Scan not found: ${result.scan_id}`);
        return;
      }

      // Update scan with detection results
      scan.detection_result = result;
      scan.processing_time_ms = result.processing_time_ms;
      
      if (result.status === "success") {
        scan.status = "detected";
      } else if (result.status === "needs_review") {
        scan.status = "needs_review";
      } else {
        scan.status = "failed";
        scan.error_message = result.errors?.[0]?.message;
        scan.error_code = result.errors?.[0]?.code;
      }
      
      scan.processing_completed_at = new Date();
      await scan.save();

      logger.info(`Scan ${result.scan_id} updated: status=${scan.status}, detections=${result.detections?.length || 0}`);

      // Automatically grade the scan after successful detection
      if (scan.status === "detected" && scan.exam_id) {
        try {
          logger.info(`Auto-grading scan ${result.scan_id} with exam ${scan.exam_id}`);
          const gradingResult = await gradeDetectionResult(result, scan.exam_id);
          
          scan.grading_result = gradingResult;
          scan.status = gradingResult.needs_manual_review ? "needs_review" : "graded";
          await scan.save();
          
          logger.info(`Scan ${result.scan_id} graded: score=${gradingResult.score.percentage.toFixed(1)}%, status=${scan.status}`);
        } catch (error) {
          logger.error(`Failed to grade scan ${result.scan_id}:`, error);
        }
      }

    } catch (error) {
      logger.error("Failed to process result:", error);
      logger.error("Raw result:", rawResult);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.stop();
    await this.redis.quit();
    logger.info("Results consumer shut down");
  }
}

// Create singleton instance
let consumerInstance: ResultsConsumer | null = null;

export function startResultsConsumer() {
  if (consumerInstance) {
    logger.warn("Results consumer already started");
    return consumerInstance;
  }

  consumerInstance = new ResultsConsumer();
  
  // Start consuming in background
  consumerInstance.start().catch(error => {
    logger.error("Results consumer crashed:", error);
  });

  return consumerInstance;
}

export function stopResultsConsumer() {
  if (consumerInstance) {
    consumerInstance.shutdown();
    consumerInstance = null;
  }
}
