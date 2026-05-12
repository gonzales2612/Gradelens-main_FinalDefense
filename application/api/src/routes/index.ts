import { Router } from "express";
import healthRoutes from "./health.ts";
import authRoutes from "./auth.ts";
import scanRoutes from "./scans.ts";
import studentRoutes from "./students.ts";
import classRoutes from "./classes.ts";
import examRoutes from "./exams.ts";
import gradeRoutes from "./grades.ts";
import sectionRoutes from "./sections.ts";
import reportRoutes from "./reports.ts";
import accountRoutes from "./accounts.ts"

const router = Router();

// Health and auth routes should come first (no authentication needed)
router.use(healthRoutes);
router.use(authRoutes);

// Protected routes
router.use(scanRoutes);
router.use(studentRoutes);
router.use(classRoutes);
router.use(examRoutes);
router.use(gradeRoutes);
router.use(sectionRoutes);
router.use(reportRoutes);
router.use(accountRoutes);

export default router;
