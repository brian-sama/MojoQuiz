import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service
 * Handles sending OTPs and verification emails
 */

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const emailService = {
    async sendOTP(email: string, code: string) {
        const mailOptions = {
            from: `"MojoQuiz" <${process.env.SMTP_USER || 'noreply@mojoquiz.co.zw'}>`,
            to: email,
            subject: 'Your MojoQuiz Verification Code',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3b82f6;">MojoQuiz Verification</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 5px;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Sent by MojoQuiz - Your world-class engagement platform</p>
        </div>
      `,
        };

        if (!process.env.SMTP_USER) {
            console.log('--- EMAIL FALLBACK (SMTP NOT CONFIGURED) ---');
            console.log(`To: ${email}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Code: ${code}`);
            console.log('---------------------------------------------');
            return true;
        }

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send verification email');
        }
    },

    async sendPasswordReset(email: string, code: string) {
        const mailOptions = {
            from: `"MojoQuiz" <${process.env.SMTP_USER || 'noreply@mojoquiz.co.zw'}>`,
            to: email,
            subject: 'Reset your MojoQuiz password',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3b82f6;">MojoQuiz Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Use the code below to proceed:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 5px;">
            ${code}
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request this, your account is safe and you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Sent by MojoQuiz - Your world-class engagement platform</p>
        </div>
      `,
        };

        if (!process.env.SMTP_USER) {
            console.log('--- EMAIL FALLBACK (SMTP NOT CONFIGURED) ---');
            console.log(`To: ${email}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Code: ${code}`);
            console.log('---------------------------------------------');
            return true;
        }

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending password reset:', error);
            throw new Error('Failed to send password reset email');
        }
    }
};
