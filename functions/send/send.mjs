import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// This loads your .env variables from the Netlify dashboard
dotenv.config();

// Create the email transporter once, so it can be reused
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // Port 587 uses STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const handler = async (event) => {
    // These are the CORS headers the browser needs to allow the request
    const headers = {
        'Access-Control-Allow-Origin': '*', // Allows requests from any origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // The browser sends a preflight OPTIONS request first. We must respond to it successfully.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
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
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing 'to' email address" }) };
            }

            // Send the email using the transporter
            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to,
                subject,
                html,
                attachments,
            });

            return {
                statusCode: 202, // Accepted
                headers,
                body: JSON.stringify({ message: 'Request accepted for processing.' }),
            };
        } catch (error) {
            console.error('Email send failed:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to send email.' }),
            };
        }
    }

    // Handle any other request types (like GET)
    return {
        statusCode: 405, // Method Not Allowed
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
};