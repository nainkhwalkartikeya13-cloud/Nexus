import { Resend } from "resend";
import { env } from "./env";
import nodemailer from "nodemailer";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const smtpTransporter = env.SMTP_HOST && env.SMTP_USER ? nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT || "587", 10),
  secure: parseInt(env.SMTP_PORT || "587", 10) === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false // Often needed for various SMTP providers
  }
}) : null;

async function sendEmail(to: string, subject: string, html: string) {
  if (resend) {
    await resend.emails.send({
      from: env.SMTP_FROM || "TeamFlow <hello@teamflow.app>",
      to,
      subject,
      html,
    });
  } else if (smtpTransporter) {
    await smtpTransporter.sendMail({
      from: env.SMTP_FROM || "TeamFlow <hello@teamflow.app>",
      to,
      subject,
      html,
    });
  } else {
    console.warn("No email provider configured (RESEND_API_KEY or SMTP_USER). Skipping email sent to", to);
  }
}

function getBaseEmailTemplate(content: string, ctaHtml: string = "") {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background-color: #080810; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f1f5f9; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #0f0f1a; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
        
        <h2 style="color: #6366f1; margin-top: 0; font-weight: 800; font-size: 24px; letter-spacing: -0.04em;">TeamFlow</h2>
        
        <div style="margin: 24px 0; line-height: 1.6; color: #94a3b8; font-size: 16px;">
          ${content}
        </div>

        ${ctaHtml}

        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 32px 0;" />
        
        <footer style="color: #64748b; font-size: 14px; text-align: center;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} TeamFlow. All rights reserved.</p>
        </footer>
      </div>
    </body>
    </html>
  `;
}

interface SendInviteParams {
  to: string;
  inviterName: string;
  orgName: string;
  inviteUrl: string;
  role: string;
}

export async function sendInviteEmail({ to, inviterName, orgName, inviteUrl, role }: SendInviteParams) {

  const content = `
    <h3 style="color: #f1f5f9; margin-bottom: 8px;">You've been invited!</h3>
    <p style="margin-top: 0;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on TeamFlow as a ${role.toLowerCase()}.</p>
    <p>Collaborate, track, and ship faster with your team—all in one place.</p>
  `;

  const cta = `
    <div style="margin-top: 32px; text-align: center;">
      <a href="${inviteUrl}" style="background: linear-gradient(135deg, #6366f1, #a78bfa); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;">Accept Invitation</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, cta);

  await sendEmail(to, `Join ${orgName} on TeamFlow`, html);
}

interface SendWelcomeParams {
  to: string;
  name: string;
  orgName: string;
}

export async function sendWelcomeEmail({ to, name, orgName }: SendWelcomeParams) {

  const content = `
    <h3 style="color: #f1f5f9; margin-bottom: 8px;">Welcome to TeamFlow, ${name}!</h3>
    <p style="margin-top: 0;">Your organization <strong>${orgName}</strong> is ready to go.</p>
    <p>Here's a quick tip to get started: Invite your team members or create your first project directly from the dashboard.</p>
  `;

  const cta = `
    <div style="margin-top: 32px; text-align: center;">
      <a href="${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #6366f1, #a78bfa); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;">Go to Dashboard</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, cta);

  await sendEmail(to, "Welcome to TeamFlow!", html);
}
