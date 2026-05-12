import { Router } from "express";
import { ClassController } from "../controllers/class.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Class CRUD
router.post(API_ROUTES.CLASSES.BASE, ClassController.createClass);
router.get(API_ROUTES.CLASSES.BASE, ClassController.listClasses);
router.get(`${API_ROUTES.CLASSES.BASE}/:id`, ClassController.getClass);
router.put(`${API_ROUTES.CLASSES.BASE}/:id`, ClassController.updateClass);
router.delete(`${API_ROUTES.CLASSES.BASE}/:id`, ClassController.deleteClass);

// Student management
router.get(`${API_ROUTES.CLASSES.BASE}/:id/students`, ClassController.getClassStudents);

// (DEPRECATED): Now using ClassStudentSyncService in backend
// router.post(`${API_ROUTES.CLASSES.BASE}/:id/students`, ClassController.addStudent);
// router.delete(`${API_ROUTES.CLASSES.BASE}/:id/students/:studentId`, ClassController.removeStudent);

export default router;
