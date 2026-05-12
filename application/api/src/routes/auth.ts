import { Router } from "express";
import {
  login,
  refresh,
  logout,
  me,
} from "../controllers/auth.controller.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

router.post(API_ROUTES.AUTH.LOGIN, login);
router.post(API_ROUTES.AUTH.REFRESH, refresh);
router.post(API_ROUTES.AUTH.LOGOUT, logout);
router.get(API_ROUTES.AUTH.ME, me);

export default router;