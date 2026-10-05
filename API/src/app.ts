import express, {
  type NextFunction,
  type Application,
  type Request,
  type Response,
} from "express";

import path from "path";

import router from "./router/router";
import { Errorhandler } from "./middleware/ErrorHandling";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// MongoDB connection
import "./config/mongodb";

// Express application
const app: Application = express();

// ==============================
// CORS
// ==============================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ==============================
// Helmet
// ==============================

app.use(
  helmet({
    xXssProtection: true,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ==============================
// Rate Limiter
// ==============================

const limiter = rateLimit({
  limit: 150,
  windowMs: 300000,
});

app.use(limiter);

// ==============================
// Body Parser
// ==============================

app.use(
  express.json({
    limit: "3mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==============================
// STATIC FILES
// ==============================

// Expose the public folder through /assets
app.use(
  "/assets",
  express.static(path.join(process.cwd(), "public"))
);

// ==============================
// Routes
// ==============================

app.use(router);

// ==============================
// 404 Route
// ==============================

app.use(
  (req: Request, res: Response, next: NextFunction) => {
    next({
      code: 404,
      message: "Route not found",
    });
  }
);

// ==============================
// Error Handler
// ==============================

app.use(Errorhandler);

export default app;