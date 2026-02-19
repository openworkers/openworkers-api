import { email, appUrl } from '../config';

interface ScalewayEmailRequest {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  subject: string;
  text: string;
  html: string;
  project_id: string;
}

async function sendWithScaleway(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!email.secretKey || !email.projectId) {
    console.error('[Email] Scaleway not configured (missing SCW_SECRET_KEY or SCW_PROJECT_ID)');
    return false;
  }

  const url = `https://api.scaleway.com/transactional-email/v1alpha1/regions/${email.region}/emails`;

  const body: ScalewayEmailRequest = {
    from: { email: email.from },
    to: [{ email: to }],
    subject,
    text,
    html,
    project_id: email.projectId
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Auth-Token': email.secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Email] Scaleway API error:', res.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return email.provider === 'scaleway' && !!email.secretKey && !!email.projectId;
}

export async function sendSetPasswordEmail(emailTo: string, token: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log(`[Email] Set password link for ${emailTo}: ${appUrl}/sign-in/set-password?token=${token}`);
    return true;
  }

  const subject = 'Complete your OpenWorkers registration';

  const text = `Welcome to OpenWorkers!

Click the link below to set your password and complete your registration:

${appUrl}/sign-in/set-password?token=${token}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.`;

  const html = `
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
</html>`;

  return sendWithScaleway(emailTo, subject, text, html);
}

export async function sendPasswordResetEmail(emailTo: string, token: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log(`[Email] Password reset link for ${emailTo}: ${appUrl}/sign-in/reset-password?token=${token}`);
    return true;
  }

  const subject = 'Reset your OpenWorkers password';

  const text = `You requested a password reset for your OpenWorkers account.

Click the link below to reset your password:

${appUrl}/sign-in/reset-password?token=${token}

This link expires in 1 hour.

If you didn't request this, you can ignore this email.`;

  const html = `
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
</html>`;

  return sendWithScaleway(emailTo, subject, text, html);
}
