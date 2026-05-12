"""
CV Worker - Processes scan jobs from Redis queue.
"""
import json
import redis
from loguru import logger
from pathlib import Path

from app.settings import settings
from app.schemas.scan_job import ScanJob
from app.pipeline.grade import run_detection_pipeline


QUEUE_NAME = "scan_jobs"
RESULTS_QUEUE = "scan_results"


def run_worker():
    """
    Main worker loop.
    
    Workflow:
    1. Block on Redis queue waiting for jobs
    2. Parse job payload
    3. Run detection pipeline
    4. Push result back to results queue
    5. Repeat
    """
    logger.info("=" * 60)
    logger.info("CV Scan Worker Started")
    logger.info(f"Redis: {settings.redis_url}")
    logger.info(f"Image root: {settings.image_root}")
    logger.info(f"Queue: {QUEUE_NAME}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info("=" * 60)

    # Connect to Redis
    redis_client = redis.Redis.from_url(
        settings.redis_url,
        decode_responses=True
    )
    
    # Test connection
    try:
        redis_client.ping()
        logger.success("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return

    logger.info("Waiting for scan jobs...")

    # Main worker loop
    while True:
        try:
            # Block until job available (timeout: 0 = infinite)
            _, raw_job = redis_client.blpop(QUEUE_NAME, timeout=0)
            
            # Parse job
            try:
                job_data = json.loads(raw_job)
                job = ScanJob(**job_data)
            except Exception as e:
                logger.error(f"Failed to parse job: {e}")
                logger.error(f"Raw job data: {raw_job}")
                continue

            logger.info("=" * 60)
            logger.info(f"Processing scan: {job.scan_id}")
            logger.info(f"Template: {job.template_id}")
            logger.info(f"Image: {job.image_path}")
            logger.info("=" * 60)

            # Construct full image path
            image_path = Path(settings.image_root) / job.image_path
            
            if not image_path.exists():
                logger.error(f"Image file not found: {image_path}")
                
                # TODO: Push error result to results queue
                error_result = {
                    "scan_id": job.scan_id,
                    "template_id": job.template_id,
                    "status": "failed",
                    "detections": [],
                    "errors": [{
                        "code": "IMAGE_NOT_FOUND",
                        "message": f"Image file not found: {job.image_path}"
                    }]
                }
                
                redis_client.lpush(RESULTS_QUEUE, json.dumps(error_result))
                continue

            # Run detection pipeline
            try:
                result = run_detection_pipeline(
                    scan_id=job.scan_id,
                    image_path=str(image_path),
                    template_id=job.template_id,
                    strict_quality=False
                )
                
                logger.success(f"Scan {job.scan_id} processed successfully")
                logger.info(f"Status: {result.status}")
                logger.info(f"Questions detected: {len(result.detections)}")
                logger.info(f"Warnings: {len(result.warnings)}")
                logger.info(f"Errors: {len(result.errors)}")
                logger.info(f"Processing time: {result.processing_time_ms:.0f}ms")
                
                if settings.debug:
                    logger.debug(f"Full result: {result.model_dump()}")
                
                # Push result to results queue
                result_json = result.json()  # Use Pydantic's JSON serialization (handles datetime)
                redis_client.lpush(RESULTS_QUEUE, result_json)
                logger.debug(f"Result pushed to {RESULTS_QUEUE}")
                
            except Exception as e:
                logger.exception(f"Detection pipeline failed for scan {job.scan_id}")
                
                # Push error result
                error_result = {
                    "scan_id": job.scan_id,
                    "template_id": job.template_id,
                    "status": "failed",
                    "detections": [],
                    "errors": [{
                        "code": "PIPELINE_ERROR",
                        "message": f"Pipeline error: {type(e).__name__}: {str(e)}"
                    }]
                }
                
                redis_client.lpush(RESULTS_QUEUE, json.dumps(error_result))

        except KeyboardInterrupt:
            logger.info("Worker interrupted by user")
            break
        
        except Exception as e:
            logger.exception("Worker error")
            # Continue running despite errors


if __name__ == "__main__":
    run_worker()
