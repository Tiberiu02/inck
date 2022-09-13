import _fs from "fs"
const fs = _fs.promises
import AWS from "aws-sdk"
import dotenv from "dotenv";
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

async function sendEmail({ recipient, subject, htmlBody }) {
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
    subject: "You have successfully registered",
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
    subject: "Inck password reset request",
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
    subject: "Inck password reset confirmation",
    htmlBody: html
  })
}