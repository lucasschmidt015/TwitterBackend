require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.USER_EMAIL_SERVER || '',
      pass: process.env.PASS_EMAIL_SERVER || '',
    },
  });

export async function sendEmailToken(email: string, token: string) {

  const fromAddress = process.env.USER_EMAIL_SERVER || '';

  try {
      await transporter.sendMail({
        to: email,
        from: `Twitter Copy ${fromAddress}`,
        subject: 'One time password',
        html: `Your one time password: ${token}`
      });
  } catch (e) {
      console.log('Error: ', e);
      return e;
  }
}