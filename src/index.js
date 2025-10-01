const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config(); // Make sure to load environment variables

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json({limit: '20mb'}));
app.use(cors());

// --- Nodemailer Transporter Configuration for Gmail ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465, // Correct port for Gmail with SSL
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // This should be your App Password
  },
});


app.post("/send", async (req, res) => {
  try {
    // The emailService.js file sends attachments, so we need to handle them here
    const { to, subject, text, html, attachments } = req.body || {};

    if (!to) {
      return res.status(400).json({ ok: false, error: "Missing 'to' email address" });
    }

    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: subject || "Your PARAAT Scan Results!",
      text: text, // The frontend sends html, so text might be undefined
      html: html,
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