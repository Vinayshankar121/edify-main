import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, HttpError } from "./errors.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "1mb" }));
app.get("/api", (_req, res) => res.json({ name: "Edify API", version: "1.0.0" }));
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use((_req, _res, next) => next(new HttpError(404, "API route not found")));
app.use(errorHandler);