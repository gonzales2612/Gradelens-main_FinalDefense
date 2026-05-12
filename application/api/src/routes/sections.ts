import { Router } from "express";
import { SectionController } from "../controllers/section.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Section CRUD
router.post(API_ROUTES.SECTIONS.BASE, SectionController.createSection);
router.get(API_ROUTES.SECTIONS.BASE, SectionController.listSections);
router.get(`${API_ROUTES.SECTIONS.BASE}/:id`, SectionController.getSection);
router.put(`${API_ROUTES.SECTIONS.BASE}/:id`, SectionController.updateSection);
router.delete(`${API_ROUTES.SECTIONS.BASE}/:id`, SectionController.deleteSection);

export default router;
