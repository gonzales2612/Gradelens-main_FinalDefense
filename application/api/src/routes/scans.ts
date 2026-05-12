import { Router } from "express";
import {
  uploadScan,
  uploadAnswerKeyScan,
  getScans,
  getScanById,
  updateScanAnswersController,
  markAsReviewedController,
  deleteScanController
} from "../controllers/scan.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(API_ROUTES.SCANS.BASE, uploadScan);
router.post(`${API_ROUTES.SCANS.BASE}/answer-key`, uploadAnswerKeyScan);
router.get(API_ROUTES.SCANS.BASE, getScans);
router.get(`${API_ROUTES.SCANS.BASE}/:scan_id`, getScanById);
router.patch(`${API_ROUTES.SCANS.BASE}/:scan_id/answers`, updateScanAnswersController);
router.patch(`${API_ROUTES.SCANS.BASE}/:scan_id/reviewed`, markAsReviewedController);
router.delete(`${API_ROUTES.SCANS.BASE}/:scan_id`, deleteScanController);

export default router;