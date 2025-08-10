import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import statsHandler from "./api/stats.js";
import webhookHandler from "./api/onWebhook.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files (index.html, style.css, wall.png, ton.png, script.js)
app.use(express.static(__dirname));

// API endpoints
app.get("/api/stats", statsHandler);
app.get("/api/onWebhook", webhookHandler);

// Fallback to index.html for non-API routes (for SPA support)
app.get("*", (req, res) => {
  // Only serve index.html for non-API requests
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Premium Security app running on port ${PORT}`);
});