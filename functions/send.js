import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function handler(event) {
    // We only need to handle the POST request now.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { to, subject, html, attachments } = body;

        if (!to) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing 'to' address" }) };
        }

        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to, subject, html, attachments,
        });

        return { statusCode: 202, body: JSON.stringify({ message: 'Accepted' }) };
    } catch (error) {
        console.error('Email send failed:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email.' }) };
    }
}