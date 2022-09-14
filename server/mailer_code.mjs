import _fs from "fs"
const fs = _fs.promises
import AWS from "aws-sdk"
import dotenv from "dotenv";
import nodemailer from "nodemailer"

dotenv.config();

const SES_CONFIG = {
  accessKeyId: process.env.aws_email_access_key_id,
  secretAccessKey: process.env.aws_email_secret_access_key,
  region: 'eu-central-1',
};

const AWS_SES = new AWS.SES(SES_CONFIG);


async function loadRegistrationTemplate() {
  const template = await fs.readFile("server/email_templates/invitation.html")
  return template.toString()
}

async function loadPasswordResetTemplate() {
  const template = await fs.readFile("server/email_templates/password-recovery.html")
  return template.toString()
}

async function loadPasswordConfirmationTemplate() {
  const template = await fs.readFile("server/email_templates/password-recovery-confirmation.html")
  return template.toString()
}

function fillTemplate({ html, data = {} }) {
  if (!html) {
    throw Error("No html string provided")
  }

  if (!data) {
    throw Error("No data to fill the template was provided")
  }

  const filledTemplate = html.replace(/\{\{(.+?)\}\}/g, (_, g) => {
    g = g.trim()
    if (!data[g]) {
      throw Error(`Index ${g} not present in template`)
    }
    return data[g]
  })

  return filledTemplate
}

async function sendEmailAWS({ recipient, subject, htmlBody }) {
  const params = {
    Source: "noreply@inck.io",
    Destination: {
      ToAddresses: [
        recipient
      ],
    },
    ReplyToAddresses: [],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlBody,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      }
    },
  };

  try {
    return await AWS_SES.sendEmail(params).promise()
  } catch (err) {
    console.error(err)
  }
}

async function sendEmail({ recipient, subject, htmlBody }) {
  //console.log('sending email');
  //console.log(recipient, subject, htmlBody);

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
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
    //text: "Hello world?", // plain text body
    html: htmlBody, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

export async function sendRegistrationEmail(recipient, firstName, lastName) {
  const template = await loadRegistrationTemplate()
  const confirmationURL = "https://inck.io/auth"
  const html = fillTemplate({
    html: template,
    data: {
      firstName, lastName, confirmationURL
    }
  })

  await sendEmail({
    recipient,
    subject: "Welcome to Inck!",
    htmlBody: html
  })

}


export async function sendPasswordRecoveryEmail(recipient, firstName, lastName, resetURL) {
  const template = await loadPasswordResetTemplate()
  const html = fillTemplate({
    html: template,
    data: {
      firstName, lastName, resetURL
    }
  })

  await sendEmail({
    recipient,
    subject: "Inck: password reset request",
    htmlBody: html
  })
}


export async function sendPasswordConfirmationEmail(recipient, firstName, lastName) {
  const template = await loadPasswordConfirmationTemplate()
  const html = fillTemplate({
    html: template,
    data: {
      firstName,
      lastName,
      targetURL: "https://inck.io/auth"
    }
  })

  await sendEmail({
    recipient,
    subject: "Inck: password reset confirmation",
    htmlBody: html
  })
}