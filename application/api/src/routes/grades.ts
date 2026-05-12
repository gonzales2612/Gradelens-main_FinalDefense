import { Router } from "express";
import { GradeController } from "../controllers/grade.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Grade CRUD
router.post(API_ROUTES.GRADES.BASE, GradeController.createGrade);
router.get(API_ROUTES.GRADES.BASE, GradeController.listGrades);
router.get(`${API_ROUTES.GRADES.BASE}/:id`, GradeController.getGrade);
router.put(`${API_ROUTES.GRADES.BASE}/:id`, GradeController.updateGrade);
router.delete(`${API_ROUTES.GRADES.BASE}/:id`, GradeController.deleteGrade);

export default router;
