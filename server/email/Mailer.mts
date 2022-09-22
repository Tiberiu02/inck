import _fs from "fs";
const fs = _fs.promises;
import AWS from "aws-sdk";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function loadRegistrationTemplate() {
  const template = await fs.readFile("server/email/templates/invitation.html");
  return template.toString();
}

async function loadPasswordResetTemplate() {
  const template = await fs.readFile("server/email/templates/password-recovery.html");
  return template.toString();
}

async function loadPasswordConfirmationTemplate() {
  const template = await fs.readFile("server/email/templates/password-recovery-confirmation.html");
  return template.toString();
}

function fillTemplate(html?: string, data?: { [id: string]: string }) {
  if (!html) {
    throw Error("No html string provided");
  }

  if (!data) {
    throw Error("No data to fill the template was provided");
  }

  const filledTemplate = html.replace(/\{\{(.+?)\}\}/g, (_, g) => {
    g = g.trim();
    if (!data[g]) {
      throw Error(`Index ${g} not present in template`);
    }
    return data[g];
  });

  return filledTemplate;
}

async function sendEmail(recipient: string, subject: string, htmlBody: string) {
  try {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      // @ts-expect-error
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME, // generated ethereal user
        pass: process.env.EMAIL_PASSWORD, // generated ethereal password
      },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Inck!" <noreply@inck.io>', // sender address
      to: recipient, // list of receivers
      subject: subject, // Subject line
      html: htmlBody, // html body
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  } catch (e) {
    console.error(e);
  }
}

export async function sendRegistrationEmail(recipient: string, firstName: string, lastName: string) {
  const template = await loadRegistrationTemplate();
  const confirmationURL = "https://inck.io/auth";
  const html = fillTemplate(template, { firstName, lastName, confirmationURL });

  await sendEmail(recipient, "Welcome to Inck!", html);
}

export async function sendPasswordRecoveryEmail(
  recipient: string,
  firstName: string,
  lastName: string,
  resetURL: string
) {
  const template = await loadPasswordResetTemplate();
  const html = fillTemplate(template, { firstName, lastName, resetURL });

  await sendEmail(recipient, "Inck: password reset request", html);
}

export async function sendPasswordConfirmationEmail(recipient: string, firstName: string, lastName: string) {
  const template = await loadPasswordConfirmationTemplate();
  const html = fillTemplate(template, { firstName, lastName, targetURL: "https://inck.io/auth" });

  await sendEmail(recipient, "Inck: password reset confirmation", html);
}
