import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Allow large payloads (e.g., for PDF attachments)
app.use(express.json({ limit: "20mb" }));

// Configure CORS for broad acceptance.
// For production, you might want to restrict this to your actual frontend URL.
app.use(cors());

// Health check endpoint to confirm the service is running
app.get("/", (_req, res) => res.type("text/plain").send("OK"));

// Create the Nodemailer transporter using your environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,   // Should be smtp.gmail.com
  port: 465,                      // Use 465 for SSL
  secure: true,                   // Must be true for port 465
  auth: {
    user: process.env.EMAIL_USER, // Your full gmail address
    pass: process.env.EMAIL_PASS,   // Your 16-character App Password
  },
});

// Endpoint to handle sending emails
app.post("/send", (req, res) => {
  const { to, subject, text, html, attachments } = req.body;

  if (!to) {
    return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
  }

  // Immediately send a 202 Accepted response
  // This tells the client the request is accepted and will be processed.
  res.status(202).json({ ok: true, message: "Request accepted. Email will be sent." });

  // Process the email sending in the background
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
    console.log("Email sent successfully in background:", info.messageId);
  }).catch(err => {
    console.error("Background email send failed:", err?.message || err);
  });
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`SMTP service listening on port ${port}`);
});