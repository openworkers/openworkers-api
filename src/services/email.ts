import { createTransport, type Transporter } from 'nodemailer';

import { smtp, appUrl } from '../config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!smtp.host) {
    return null;
  }

  if (!transporter) {
    transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user && smtp.pass ? {
        user: smtp.user,
        pass: smtp.pass
      } : undefined
    });
  }

  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!smtp.host;
}

export async function sendSetPasswordEmail(email: string, token: string): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Email] Set password link for ${email}: ${appUrl}/sign-in/set-password?token=${token}`);
    return true;
  }

  try {
    await transport.sendMail({
      from: smtp.from,
      to: email,
      subject: 'Complete your OpenWorkers registration',
      text: `Welcome to OpenWorkers!

Click the link below to set your password and complete your registration:

${appUrl}/sign-in/set-password?token=${token}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    a.button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to OpenWorkers!</h1>
    <p>Click the button below to set your password and complete your registration.</p>
    <p><a href="${appUrl}/sign-in/set-password?token=${token}" class="button">Set Password</a></p>
    <p class="footer">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  </div>
</body>
</html>`
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send set password email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[Email] Password reset link for ${email}: ${appUrl}/sign-in/reset-password?token=${token}`);
    return true;
  }

  try {
    await transport.sendMail({
      from: smtp.from,
      to: email,
      subject: 'Reset your OpenWorkers password',
      text: `You requested a password reset for your OpenWorkers account.

Click the link below to reset your password:

${appUrl}/sign-in/reset-password?token=${token}

This link expires in 1 hour.

If you didn't request this, you can ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    a.button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset your password</h1>
    <p>You requested a password reset for your OpenWorkers account.</p>
    <p><a href="${appUrl}/sign-in/reset-password?token=${token}" class="button">Reset Password</a></p>
    <p class="footer">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  </div>
</body>
</html>`
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    return false;
  }
}
