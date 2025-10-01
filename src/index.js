import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "20mb" }));

// Allow localhost during development and the deployed Netlify site by default.
// Additional origins can be provided via the ALLOWED_ORIGINS environment variable.
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "https://smtpp3venti.netlify.app",
  'https://your-production-frontend-url.com' // TODO: Add your production URL
];

const configuredAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultAllowedOrigins;

  const normalizeOrigin = (origin) => {
  if (!origin || origin === "*") {
    return origin;
  }

  try {
    const { origin: normalized } = new URL(origin);
    return normalized;
  } catch (error) {
    return origin.endsWith("/") ? origin.slice(0, -1) : origin;
  }
};

const normalizedAllowedOrigins = configuredAllowedOrigins.map(normalizeOrigin);
const hasWildcardOrigin = normalizedAllowedOrigins.includes("*");

const isOriginAllowed = (origin) => {
  if (!origin || hasWildcardOrigin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return normalizedAllowedOrigins.includes(normalizedOrigin);
};

const applyCorsHeaders = (res, origin) => {
  if (hasWildcardOrigin) {
    res.header("Access-Control-Allow-Origin", "*");
    return;
  }

  if (!origin) {
    return;
  }

  res.header("Access-Control-Allow-Origin", normalizeOrigin(origin));
  res.header("Vary", "Origin");
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 204,
  };

// Use the CORS middleware for the actual POST request
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (!isOriginAllowed(requestOrigin)) {
    return res.status(403).json({ ok: false, error: "Origin not allowed by CORS" });
  }
applyCorsHeaders(res, requestOrigin);
  next();
  });

  app.use(cors(corsOptions));

// --- Manual Handler for the OPTIONS Preflight Request ---
// This ensures the browser preflight succeeds with the expected headers.
app.options("/send", (req, res) => {
  console.log("OPTIONS request received for /send");

  if (!isOriginAllowed(req.headers.origin)) {
    return res.status(403).json({ ok: false, error: "Origin not allowed by CORS" });
  }

  applyCorsHeaders(res, req.headers.origin);
  res.header("Access-Control-Allow-Methods", "POST,OPTIONS");
  const requestedHeaders = req.headers["access-control-request-headers"];
  res.header("Access-Control-Allow-Headers", requestedHeaders || "Content-Type");
  res.header("Access-Control-Max-Age", "86400");
  res.sendStatus(204);
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// The POST route for sending the email
app.post("/send", (req, res) => {
  console.log('POST request received for /send');
  const { to, subject, html, attachments } = req.body;

  if (!to) {
    return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
  }

  res.header("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  res.status(202).json({ ok: true, message: "Request accepted. Processing in background." });

  transporter
    .sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      attachments,
    })
    .then((info) => {
      console.log("Background email sent successfully:", info.messageId);
    })
    .catch((err) => {
      console.error("Background email send failed:", err);
    });
});

// Handle CORS errors gracefully instead of falling back to Express's default 500.
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ ok: false, error: "Origin not allowed by CORS" });
  }

  return next(err);
});

// Export the handler for Netlify
export const handler = serverless(app);