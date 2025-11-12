import express from "express";
import * as dotenv from "dotenv";
import { initializeDatabase, closeDatabase } from "./db/database";
import routes from "./api/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message:
      "Job Recommendation API - TypeScript version (without vectorization)",
  });
});

app.use("/", routes);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ detail: "Internal server error" });
  }
);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await closeDatabase();
  process.exit(0);
});

// Start server
async function start() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(
        `API Documentation available at http://localhost:${PORT}/health`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
