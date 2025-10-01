import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "20mb" }));

// --- Explicit CORS Configuration ---
// This allows requests from your local machine and any future production site.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // For Vite dev servers
  'https://your-production-frontend-url.com' // TODO: Add your production URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Use the CORS middleware for the actual POST request
app.use(cors(corsOptions));


// --- Manual Handler for the OPTIONS Preflight Request ---
// This is the key change. It intercepts the browser's security check.
app.options('/send', (req, res) => {
  console.log('OPTIONS request received for /send');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204); // Send 'No Content' status
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