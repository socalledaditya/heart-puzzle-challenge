import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendOtp(email, name, otp) {
  if (!transporter) {
    console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
    return { dev: !config.isProd };
  }
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `Your verification code: ${otp}`,
    text: `Hi ${name},\n\nYour Heart Puzzle Challenge verification code is ${otp}. It expires in 10 minutes.\n\nIf you did not register, ignore this email.`,
    html: `<p>Hi ${name},</p><p>Your <b>Heart Puzzle Challenge</b> verification code is</p><h2 style="letter-spacing:6px">${otp}</h2><p>It expires in 10 minutes.</p>`,
  });
  return { dev: false };
}
