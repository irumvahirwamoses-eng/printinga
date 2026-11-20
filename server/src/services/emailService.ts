import nodemailer from 'nodemailer';
import { env } from '../config';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export function isEmailConfigured() {
  return getTransporter() !== null;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const tx = getTransporter();
  if (!tx || !to) return false;
  await tx.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'SchoolPrint — Password Reset',
    text: `A password reset was requested for your SchoolPrint account.\n\nOpen this link within 1 hour to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`,
    html: `<p>A password reset was requested for your SchoolPrint account.</p><p>Open this link within 1 hour to choose a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this message.</p>`,
  });
  return true;
}
