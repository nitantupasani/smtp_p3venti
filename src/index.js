const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({ limit: '20mb' }));
app.use(cors());

// --- Nodemailer Transporter Configuration ---
// This now uses your Render environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST, // Changed from EMAIL_HOST
  port: process.env.BREVO_PORT, // Changed from EMAIL_PORT
  secure: process.env.BREVO_PORT == 465,
  auth: {
    user: process.env.BREVO_USER, // Changed from EMAIL_USER
    pass: process.env.BREVO_SMTP_KEY, // Changed from EMAIL_PASS
  },
});

app.post('/send', async (req, res) => {
  try {
    const { to, subject, text, html, attachments } = req.body || {};

    if (!to) {
      return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
    }

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: subject || 'Your PARAAT Scan Results!',
      text: text || 'It works!',
      html: html || `<p>${text || 'It works!'}</p>`,
      attachments: attachments,
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});