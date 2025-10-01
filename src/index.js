import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create the transporter once, outside the handler, so it can be reused
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function handler(event, context) {
    // These are the CORS headers the browser needs.
    const headers = {
        'Access-Control-Allow-Origin': '*', // Or your specific frontend URL
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // The browser sends an OPTIONS request first to check permissions.
    // We must respond to it with the correct headers.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // 204 No Content
            headers,
            body: '',
        };
    }

    // This handles the actual POST request to send the email.
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const { to, subject, html, attachments } = body;

            if (!to) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ ok: false, error: "Missing 'to' email address" }),
                };
            }

            // Send the email
            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to,
                subject,
                html,
                attachments,
            });

            return {
                statusCode: 202, // 202 Accepted
                headers,
                body: JSON.stringify({ ok: true, message: 'Request accepted for processing.' }),
            };
        } catch (error) {
            console.error('Email send failed:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ ok: false, error: 'Failed to send email.' }),
            };
        }
    }

    // Handle any other request types
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
    };
}