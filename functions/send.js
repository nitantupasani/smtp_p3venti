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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }

    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const { to, subject, html, attachments } = body;

            if (!to) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing 'to' address" }) };
            }

            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to, subject, html, attachments,
            });

            return { statusCode: 202, headers, body: JSON.stringify({ message: 'Accepted' }) };
        } catch (error) {
            console.error('Email send failed:', error);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send email.' }) };
        }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
}