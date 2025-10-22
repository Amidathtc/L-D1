import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import routes from "./routes/index";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS
// app.use(
//   cors({
//     origin: config.cors.origin,
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = config.cors.origin
        ? typeof config.cors.origin === "string"
          ? config.cors.origin.split(",").map((url) => url.trim())
          : config.cors.origin
        : ["http://localhost:3000"];

      // In production, be more strict about origins but allow requests without origin
      if (config.env === "production") {
        // Allow requests without origin (server-to-server, health checks, etc.)
        if (!origin) {
          console.log("✅ Allowing request without origin in production");
          return callback(null, true);
        }

        console.log("🔍 Checking origin in production:", origin);
        console.log("📋 Allowed origins:", allowedOrigins);

        if (allowedOrigins.includes(origin)) {
          console.log("✅ Origin allowed:", origin);
          callback(null, true);
        } else {
          console.log("❌ Blocked origin in production:", origin);
          callback(new Error("Not allowed by CORS"), false);
        }
      } else {
        // In development, be more permissive
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log("❌ Blocked origin:", origin);
          callback(new Error("Not allowed by CORS"), false);
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    hasRegistration: true,
    routes: ["/api/test", "/api/auth/test", "/api/auth/register"],
  });
});

// Direct test route to bypass route mounting
app.get("/api/direct-test", (req, res) => {
  res.json({
    message: "Direct route works - server is updated",
    timestamp: new Date().toISOString(),
    hasRegistration: true,
  });
});

// API routes
console.log("Mounting API routes...");
console.log("🟡 Routes type:", typeof routes);

app.use("/api", routes);
console.log("API routes mounted successfully");

// Debug: List all routes
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log("Route:", middleware.route.path);
  } else if (middleware.name === "router") {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        console.log("Nested route:", handler.route.path);
      }
    });
  }
});

// Static files for uploads
app.use("/uploads", express.static("uploads"));
app.use("/api/uploads", express.static("uploads"));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
