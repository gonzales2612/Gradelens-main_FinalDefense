import { Router } from "express";
const router = Router();

router.get("/health", (_, res) => {
  res.json({ status: "ok", service: "application-api" });
});

export default router;
