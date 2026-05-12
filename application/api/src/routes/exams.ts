import { Router } from "express";
import { ExamController } from "../controllers/exam.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Exam CRUD
router.post(API_ROUTES.EXAMS.BASE, ExamController.createExam);
router.get(API_ROUTES.EXAMS.BASE, ExamController.listExams);
router.get(`${API_ROUTES.EXAMS.BASE}/:id`, ExamController.getExam);
router.put(`${API_ROUTES.EXAMS.BASE}/:id`, ExamController.updateExam);
router.delete(`${API_ROUTES.EXAMS.BASE}/:id`, ExamController.deleteExam);

// Exam status management
router.patch(`${API_ROUTES.EXAMS.BASE}/:id/status`, ExamController.updateExamStatus);

// Exam statistics and scans
router.get(`${API_ROUTES.EXAMS.BASE}/:id/statistics`, ExamController.getExamStatistics);
router.get(`${API_ROUTES.EXAMS.BASE}/:id/scans`, ExamController.getExamScans);

export default router;
