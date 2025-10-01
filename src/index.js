import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();

// Allow big base64 PDFs
app.use(express.json({ limit: "20mb" }));

// CORS (set your real frontend origin)
app.use(
  cors({
    origin: [
      "https://<your-frontend>.onrender.com",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["POST", "OPTIONS", "GET"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Health
app.get("/", (_req, res) => res.type("text/plain").send("OK"));

// Gmail SMTP transporter (App Password required)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,          // 465 = SSL
  secure: true,       // must be true for 465
  auth: {
    user: process.env.EMAIL_USER,          // your Gmail address
    pass: process.env.EMAIL_PASS   // 16-char App Password
  },
  pool: true,
  maxConnections: 3,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

// Preflight
app.options("/send", (_req, res) => res.sendStatus(204));

// Send endpoint
app.post("/send", async (req, res) => {
  try {
    const { to, subject, text, html, body, attachments } = req.body;

    // Frontend may send text/html/body; normalize
    const finalText = text || body || "";
    const finalHtml =
      html || (finalText ? `<p>${finalText.replace(/\n/g, "<br/>")}</p>` : undefined);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.GMAIL_USER,
      to,
      subject,
      text: finalText,
      html: finalHtml,
      attachments: (attachments || []).map((a) => ({
        filename: a.filename,
        content: a.content,             // base64 string
        contentType: a.contentType || "application/pdf",
        encoding: a.encoding || "base64"
      }))
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Email send failed:", err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || "send failed" });
  }
});

// Start
app.listen(process.env.PORT || 3001, () => {
  console.log("Email service listening");
});