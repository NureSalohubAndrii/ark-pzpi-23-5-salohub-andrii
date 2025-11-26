import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export async function sendVerificationEmail(
  email: string,
  code: string,
  isPasswordReset: boolean = false
): Promise<void> {
  try {
    const subject = isPasswordReset
      ? 'Password Reset Code - Vehicle History System'
      : 'Email Verification Code - Vehicle History System';

    const html = isPasswordReset
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below to reset it:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #777; font-size: 12px;">Vehicle History Tracking System</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Vehicle History System!</h2>
          <p>Thank you for registering. Please verify your email address using the code below:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #777; font-size: 12px;">Vehicle History Tracking System</p>
        </div>
      `;

    await transporter.sendMail({
      from: `"Car History Security" <${process.env.BREVO_FROM}>`,
      to: email,
      subject,
      html,
    });

    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
