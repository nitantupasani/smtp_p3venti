import express from "express";
import cors from "cors";
// import your mailer & init transporter here

const app = express();

// IMPORTANT: allow big PDFs (adjust as needed)
app.use(express.json({ limit: "20mb" }));

app.use(cors({
  origin: [
    "https://smtp-p3venti.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// optional: keeps root from 404
app.get("/", (_req, res) => res.type("text/plain").send("OK"));

// preflight for CORS
app.options("/send", (_req, res) => res.sendStatus(204));

app.post("/send", (req, res) => {
  const payload = req.body;

  // respond immediately so the browser isn't held up by SMTP
  res.status(202).json({ ok: true });

  // send in the background
  setImmediate(async () => {
    try {
      // pick fields your mailer expects
      const { to, subject, text, html, body, attachments } = payload;

      // fallbacks (in case client only sent "body")
      const finalText = text || body || "";
      const finalHtml = html || (finalText ? `<p>${finalText.replace(/\n/g, "<br/>")}</p>` : undefined);

      // set aggressive, finite timeouts so it never hangs forever
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        text: finalText,
        html: finalHtml,
        attachments: (attachments || []).map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType || "application/pdf",
          encoding: a.encoding || "base64"
        })),
        // Nodemailer timeouts
        connectionTimeout: 10000,   // 10s to connect
        greetingTimeout: 10000,     // 10s for SMTP greeting
        socketTimeout: 20000        // 20s for data transfer
      });
      console.log("Email sent to", to);
    } catch (err) {
      console.error("Email send failed:", err?.message || err);
    }
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log("SMTP service listening");
});