import nodemailer from 'nodemailer';

const hasSmtp =
  process.env.SMTP_HOST ||
  (process.env.SMTP_USER && process.env.SMTP_PASS);

export function isSmtpConfigured(): boolean {
  return !!hasSmtp;
}

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  : null;

export async function sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
  if (!transporter) {
    console.log('[Email] No SMTP configured. Verification link:', verificationLink);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@meetingcopilot.app',
    to,
    subject: 'Verify your new email address',
    html: `
      <p>You requested to change your email address. Click the link below to verify:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>This link expires in 1 hour. If you didn't request this change, you can ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    throw err;
  }
}

export async function sendMeetingEmail(
  to: string[],
  replyTo: string,
  subject: string,
  body: string
): Promise<void> {
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@meetingcopilot.app',
    to,
    replyTo,
    subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[Email] Failed to send meeting email:', err);
    throw err;
  }
}
