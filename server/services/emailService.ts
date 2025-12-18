import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'email-smtp.ap-south-1.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

const FROM_EMAIL = 'noreply@skillshots.in';
const FROM_NAME = 'SkillShots';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
    console.log('[EmailService] Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || 'https://skillshots.in'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 40px 30px; text-align: center; background-color: #0f172a;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SkillShots</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px;">Password Reset Request</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hi ${userName},
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 10px;">
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; text-align: center; background-color: #f8fafc;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated message from SkillShots. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your SkillShots Password',
    html,
  });
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  temporaryPassword: string,
  organizationName?: string
): Promise<boolean> {
  const loginUrl = `${process.env.APP_URL || 'https://skillshots.in'}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 40px 30px; text-align: center; background-color: #0f172a;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SkillShots</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px;">Welcome to SkillShots!</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hi ${userName},
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Your account has been created${organizationName ? ` for ${organizationName}` : ''}. Here are your login credentials:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <p style="color: #1e293b; font-size: 14px; margin: 0 0 10px;">
                    <strong>Email:</strong> ${email}
                  </p>
                  <p style="color: #1e293b; font-size: 14px; margin: 0;">
                    <strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${temporaryPassword}</code>
                  </p>
                </td>
              </tr>
            </table>
            <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              <strong>Important:</strong> Please change your password after your first login for security.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center; padding: 30px 0;">
                  <a href="${loginUrl}" style="display: inline-block; padding: 14px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                    Login to SkillShots
                  </a>
                </td>
              </tr>
            </table>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
              If you have any questions, please contact your administrator.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; text-align: center; background-color: #f8fafc;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated message from SkillShots. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to SkillShots - Your Account Details',
    html,
  });
}

export async function sendPasswordChangedEmail(
  email: string,
  userName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 40px 30px; text-align: center; background-color: #0f172a;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SkillShots</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px;">Password Changed Successfully</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hi ${userName},
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Your password has been successfully changed. If you made this change, no further action is required.
            </p>
            <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              <strong>If you did not change your password</strong>, please contact your administrator immediately as your account may have been compromised.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; text-align: center; background-color: #f8fafc;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated message from SkillShots. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your SkillShots Password Has Been Changed',
    html,
  });
}
