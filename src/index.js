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
const missingEnvVars = ["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS", "FROM_EMAIL"].filter(
  (key) => !process.env[key]
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Warning: Missing required email environment variables: ${missingEnvVars.join(", ")}`
  );
}

const emailPort = Number.parseInt(process.env.EMAIL_PORT ?? "", 10);
const connectionTimeout = Number.parseInt(process.env.EMAIL_CONNECTION_TIMEOUT ?? "15000", 10);
const greetingTimeout = Number.parseInt(process.env.EMAIL_GREETING_TIMEOUT ?? "15000", 10);
const socketTimeout = Number.parseInt(process.env.EMAIL_SOCKET_TIMEOUT ?? "20000", 10);
const parsedIpFamily = Number.parseInt(process.env.EMAIL_IP_FAMILY ?? "", 10);
const ipFamily = parsedIpFamily === 4 || parsedIpFamily === 6 ? parsedIpFamily : undefined;
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
  port: Number.isFinite(emailPort) ? emailPort : 465,
  secure:
    process.env.EMAIL_SECURE !== undefined
      ? process.env.EMAIL_SECURE.toLowerCase() === "true"
      : !Number.isFinite(emailPort) || emailPort === 465,
  connectionTimeout: Number.isFinite(connectionTimeout) ? connectionTimeout : 15000,
  greetingTimeout: Number.isFinite(greetingTimeout) ? greetingTimeout : 15000,
  socketTimeout: Number.isFinite(socketTimeout) ? socketTimeout : 20000,
  family: ipFamily,                  
  auth: {
    user: process.env.EMAIL_USER, // Your full email address
    pass: process.env.EMAIL_PASS, // Your provider password or app password
  },
  tls:
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED?.toLowerCase() === "false"
      ? { rejectUnauthorized: false }
      : undefined,
});

const parsedRetryCount = Number.parseInt(process.env.EMAIL_MAX_RETRIES ?? "2", 10);
const maxAdditionalEmailRetries =
  Number.isFinite(parsedRetryCount) && parsedRetryCount >= 0 ? parsedRetryCount : 2;
const parsedRetryDelay = Number.parseInt(process.env.EMAIL_RETRY_DELAY_MS ?? "5000", 10);
const emailRetryDelayMs = Number.isFinite(parsedRetryDelay) && parsedRetryDelay >= 0 ? parsedRetryDelay : 5000;
const retryableErrorCodes = new Set(["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "EAI_AGAIN"]);

const sendEmailWithRetry = (mailOptions, attempt = 0) => {
  transporter
    .sendMail(mailOptions)
    .then((info) => {
      console.log("Email sent successfully in background:", info.messageId);
    })
    .catch((err) => {
      const attemptNumber = attempt + 1;
      const shouldRetry =
        retryableErrorCodes.has(err?.code) && attempt < maxAdditionalEmailRetries;

      console.error("Background email send failed:", {
        message: err?.message || err,
        code: err?.code,
        command: err?.command,
        host: transporter.options.host,
        port: transporter.options.port,
        secure: transporter.options.secure,
        attempt: attemptNumber,
        maxAttempts: maxAdditionalEmailRetries + 1,
      });

      if (shouldRetry) {
        setTimeout(() => {
          sendEmailWithRetry(mailOptions, attempt + 1);
        }, emailRetryDelayMs);
      }
    });
};

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
  const normalizedAttachments = Array.isArray(attachments)
    ? attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || "application/pdf",
        encoding: a.encoding || "base64",
      }))
    : undefined;

  sendEmailWithRetry({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    text,
    html,
    attachments: normalizedAttachments,
  });
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`SMTP service listening on port ${port}`);
});