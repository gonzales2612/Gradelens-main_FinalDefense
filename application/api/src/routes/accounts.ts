// routes/accounts.ts
import { Router } from "express";
import { AccountController } from "../controllers/account.controller.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { API_ROUTES } from "../constants/routes.ts";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Account stats
router.get(`${API_ROUTES.ACCOUNTS.BASE}/stats`, AccountController.getAccountStats);

// Account CRUD
router.post(API_ROUTES.ACCOUNTS.BASE, AccountController.createAccount);
router.get(API_ROUTES.ACCOUNTS.BASE, AccountController.listAccounts);
router.get(`${API_ROUTES.ACCOUNTS.BASE}/:id`, AccountController.getAccount);
router.put(`${API_ROUTES.ACCOUNTS.BASE}/:id`, AccountController.updateAccount);
router.delete(`${API_ROUTES.ACCOUNTS.BASE}/:id`, AccountController.deleteAccount);

export default router;