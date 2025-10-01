import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// --- Explicit CORS Configuration ---
// This is a more robust way to handle CORS.
// It tells the browser that requests from your local machine are allowed.
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-production-frontend-url.com' // TODO: Add your production frontend URL here later
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "POST, OPTIONS",
  allowedHeaders: "Content-Type",
};

// Use the CORS middleware for all routes
app.use(cors(corsOptions));
app.use(express.json({ limit: "20mb" }));


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// The route is correct from our last change.
app.post("/send", (req, res) => {
  console.log("Received a POST request to /send");
  const { to, subject, html, attachments } = req.body;

  if (!to) {
    return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
  }

  res.status(202).json({ ok: true, message: "Request accepted. Processing in background." });

  transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to, subject, html, attachments
  }).then(info => {
    console.log("Background email sent successfully:", info.messageId);
  }).catch(err => {
    console.error("Background email send failed:", err);
  });
});

// Export the handler for Netlify
export const handler = serverless(app);