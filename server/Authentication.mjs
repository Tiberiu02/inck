import { PasswordResetModel, UserModel } from "./Models.mjs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getRelativePath } from './utils.mjs'
import crypto from "crypto"
import nodemailer from "nodemailer"

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.APP_PASSWORD
  }
});


export default async function sendEmail(recipient, content) {
  let mailOptions = {
    from: "inck.noreply@gmail.com", // sender address
    to: recipient, // list of receivers
    subject: "Inck password reset requested", // Subject line
    text: content, // plain text body
    //html: ""// html body
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log(err)
  }

}

function validateEmail(email) {
  return String(email)
    .trim()
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}


function validatePhoneNumber(phone) {
  return String(phone)
    .trim()
    .toLowerCase()
    .match(
      /^\+((?:9[679]|8[035789]|6[789]|5[90]|42|3[578]|2[1-689])|9[0-58]|8[1246]|6[0-6]|5[1-8]|4[013-9]|3[0-469]|2[70]|7|1)(?:\W*\d){0,13}\d$/
    )
}

/**
 * Potential errors w/ status:
 * 400: missing fields, invalid email
 * 409: user already exists
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export async function register(req, res) {
  try {

    let { firstName, lastName, email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password && firstName && lastName))
      return res.status(400).send({ error: "missing fields" })

    if (!validateEmail(email))
      return res.status(400).send({ error: "invalid email" })

    if (await UserModel.findOne({ email }))
      return res.status(409).send({ error: "user already exists" });

    const encryptedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password: encryptedPassword,
      registrationDate: new Date().toLocaleDateString("en-us", { timeZone: 'UTC' }),
      // TODO for prod: Set to false, request verification by email + phone
      activeAccount: true,
    });

    // Auth token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_TOKEN,
    );

    user.token = token;
    return res.status(201).send({ email, token });

  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "internal error" })
  }
}

export async function login(req, res) {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password))
      return res.status(400).send({ error: "missing fields" });

    if (!validateEmail(email))
      return res.status(400).send({ error: "invalid email" })

    const user = await UserModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_TOKEN,
      )

      return res.status(200).send({ email, token })
    }

    return res.status(400).send({ error: "invalid credentials" });

  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "internal error" })
  }
}

async function sendPasswordResetLinkEmail(targetEmail, resetLink) {
  const content = `Someone has requested a reset of your email. To proceed, visit the following link:\n
  ${resetLink}\n
  If you didn't request a password reset, please ignore this message.

  Best regards,
  the Inck team
  
  `
  sendEmail(targetEmail, content)
}

async function sendPasswordResetConfirmation(targetEmail) {
  const content = `Your email was successfully modified.\n
  If you didn't request a password reset, please change your password email immediately and request an inck password reset.

  Best regards,
  the Inck team
  `
  sendEmail(targetEmail, content)
}

function createPasswordResetToken() {
  return crypto.randomBytes(64).toString("hex")
}

function resetLinkFromToken(token, email, resetId) {
  const relativePath = `/reset-password?token=${token}&email=${email}`
  return getRelativePath(relativePath)
}

async function resetUserPassword(userEntry) {
  if (userEntry == undefined) {
    console.log("Invalid reset request")
    return
  }

  const oldToken = await PasswordResetModel.findOne({ userId: userEntry._id })

  if (oldToken != undefined) {
    await oldToken.deleteOne()
  }

  const newToken = createPasswordResetToken()
  const hash = await bcrypt.hash(newToken, Number(process.env.BCRYPT_SALT))
  PasswordResetModel.create({
    email: userEntry.email,
    userId: userEntry._id,
    resetToken: hash
  })
  // TODO: change resetID by something else
  const passwordResetLink = resetLinkFromToken(newToken, userEntry.email, 1)

  console.log("Password reset requested:")
  console.log(passwordResetLink)
  sendPasswordResetLinkEmail(userEntry.email, passwordResetLink)
}

export async function initializeResetPasswordUsingEmail(req, res) {
  try {
    const { email } = req.body
    const userEntry = await UserModel.findOne({ email: email })
    const result = resetUserPassword(userEntry)
    return res.status(201).send({ status: "success" })
  } catch (err) {
    console.log("Error during password reset:")
    console.log(err);
    res.status(400).send({ error: "Unable to reset password" })
  }
}

export async function initializeResetPasswordUsingToken(req, res) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    const userEntry = await UserModel.findOne({ _id: token.userId })
    const result = resetUserPassword(userEntry)
    return res.status(201).send({ status: "success" })
  } catch (err) {
    console.log("Error during password reset:")
    console.log(err);
    res.status(400).send({ error: "Unable to reset password" })
  }
}

export async function changePasswordEndpoint(req, res) {
  console.log("POLLED ENDPOINTS!!!!!")
  try {
    console.log("asdf")
    const { newPassword, resetToken, email } = req.body
    const passHash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT))

    const entry = await PasswordResetModel.findOne({
      email: email
    })
    const isPwValid = await bcrypt.compare(resetToken, entry.resetToken)

    if (!entry || !isPwValid) {
      console.log("Invalid reset token")
      return res.status(400).send({ error: "Unable to reset password (432)" })
    }

    await UserModel.updateOne({
      _id: entry.userId
    }, {
      password: passHash
    })

    await PasswordResetModel.deleteOne({
      email: email
    })

    res.status(201).send({ status: "success" })
    sendPasswordResetConfirmation(email)

  } catch (err) {
    console.log("Error while setting new password")
    console.log(err)
    res.status(400).send({ error: "Unable to reset password (662)" })
  }
}