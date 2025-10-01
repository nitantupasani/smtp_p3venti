import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import serverless from "serverless-http"; // Import the new library
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "20mb" }));
app.use(cors());

// --- Brevo Transporter Configuration ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: (process.env.EMAIL_PORT || 587) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

// --- Send Email Endpoint ---
// The path must include the function name for Netlify
app.post("/send", (req, res) => {
  const { to, subject, text, html, attachments } = req.body;

  if (!to) {
    return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
  }

  // Respond immediately to the frontend to prevent timeouts
  res.status(202).json({ ok: true, message: "Request accepted. Email will be sent." });

  // Send the email in the background
  transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    text,
    html,
    attachments: (attachments || []).map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType || "application/pdf",
      encoding: a.encoding || "base64",
    })),
  }).then(info => {
    console.log("Background email sent successfully:", info.messageId);
  }).catch(err => {
    console.error("Background email send failed:", err);
  });
});

// --- Export the handler for Netlify ---
// This replaces app.listen()
export const handler = serverless(app);