import nodemailer from "nodemailer";

import { Timer } from "../Timer";
import { logEvent } from "../logging/AppendAnalytics";

import dotenv from "dotenv";
import { EmailTemplates } from "./templates/TemplateLoader";
dotenv.config();

function fillTemplate(html: string, data: { [id: string]: string }) {
  function getValue(key: string) {
    if (!data[key]) {
      throw Error(`Index ${key} not present in template`);
    } else {
      return data[key];
    }
  }

  return html.replace(/\{\{(.+?)\}\}/g, (_, g) => getValue(g.trim()));
}

async function sendEmail(recipient: string, subject: string, htmlBody: string) {
  try {
    const timer = new Timer();
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
    logEvent("send_email", {
      recipient,
      subject,
      executionTime: timer.elapsed().toString(),
    });
  } catch (e) {
    console.error(e);
  }
}

export async function sendRegistrationEmail(recipient: string, firstName: string, lastName: string) {
  const confirmationURL = "https://inck.io/auth";
  const html = fillTemplate(EmailTemplates.Registration, { firstName, lastName, confirmationURL });

  await sendEmail(recipient, "Welcome to Inck!", html);
}

export async function sendPasswordRecoveryEmail(
  recipient: string,
  firstName: string,
  lastName: string,
  resetURL: string
) {
  const html = fillTemplate(EmailTemplates.PasswordReset, { firstName, lastName, resetURL });

  await sendEmail(recipient, "Inck: password reset request", html);
}

export async function sendPasswordConfirmationEmail(recipient: string, firstName: string, lastName: string) {
  const html = fillTemplate(EmailTemplates.PasswordResetConfirmation, {
    firstName,
    lastName,
    targetURL: "https://inck.io/auth",
  });

  await sendEmail(recipient, "Inck: password reset confirmation", html);
}
