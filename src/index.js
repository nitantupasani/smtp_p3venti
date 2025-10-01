import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "20mb" }));

// --- Explicit CORS Configuration ---
// This tells the browser that requests from ANY domain are allowed.
// For production, you should replace '*' with your frontend's actual URL.
const corsOptions = {
  origin: "*", 
  methods: "POST, OPTIONS", // Allow POST and the preflight OPTIONS request
  allowedHeaders: "Content-Type",
};
app.use(cors(corsOptions));

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// The route is correct, no changes needed here.
app.post("/send", (req, res) => {
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