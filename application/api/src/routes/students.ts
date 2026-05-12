import { Router } from "express";
import { StudentController } from "../controllers/student.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student CRUD
router.post(API_ROUTES.STUDENTS.BASE, StudentController.createStudent);
router.get(API_ROUTES.STUDENTS.BASE, StudentController.listStudents);
router.get(`${API_ROUTES.STUDENTS.BASE}/by-student-id/:student_id`, StudentController.getByStudentId);
router.get(`${API_ROUTES.STUDENTS.BASE}/:id`, StudentController.getStudent);
router.put(`${API_ROUTES.STUDENTS.BASE}/:id`, StudentController.updateStudent);
router.delete(`${API_ROUTES.STUDENTS.BASE}/:id`, StudentController.deleteStudent);

export default router;
