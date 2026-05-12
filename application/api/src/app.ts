import express from "express";
import cookieParser from "cookie-parser";
import routes from "./routes/index.ts";
import { errorMiddleware } from "./middlewares/error.middleware.ts";
import cors from "cors";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim());

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  }));

  // Increase body size limit for image uploads (10MB)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // Debug: log all requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  app.use("/api", routes);

  app.use(errorMiddleware);

  return app;
}