import { PasswordResetModel, UserModel } from "../db/Models";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordConfirmationEmail, sendPasswordRecoveryEmail, sendRegistrationEmail } from "../email/Mailer";
import { Request, Response } from "express";
import { DBUser } from "../BackendInterfaces";
import { logEvent } from "../logging/AppendAnalytics";

function validateEmail(email: string) {
  return String(email)
    .trim()
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}

function validatePhoneNumber(phone: string) {
  return String(phone)
    .trim()
    .toLowerCase()
    .match(
      /^\+((?:9[679]|8[035789]|6[789]|5[90]|42|3[578]|2[1-689])|9[0-58]|8[1246]|6[0-6]|5[1-8]|4[013-9]|3[0-469]|2[70]|7|1)(?:\W*\d){0,13}\d$/
    );
}

export async function getAccountDetailsFromToken(req: Request, res: Response) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN as string) as JwtPayload;
    const userEntry: DBUser = await UserModel.findOne({ _id: token.userId });
    res.status(201).send({
      firstName: userEntry.firstName,
      lastName: userEntry.lastName,
      email: userEntry.email,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

/**
 * Potential errors w/ status:
 * 400: missing fields, invalid email
 * 409: user already exists
 * @param {*} req
 * @param {*} res
 * @returns
 */
export async function register(req: Request, res: Response) {
  try {
    let { firstName, lastName, email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password && firstName && lastName)) return res.status(400).send({ error: "missing fields" });

    if (!validateEmail(email)) return res.status(400).send({ error: "invalid email" });

    const emailDomain = email.split("@")[1];
    if (emailDomain !== "epfl.ch") {
      return res.status(400).send({ error: "sorry, only EPFL students are currently allowed" });
    }

    if (await UserModel.findOne({ email })) return res.status(409).send({ error: "user already exists" });

    const encryptedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password: encryptedPassword,
      registrationDate: new Date().toLocaleDateString("en-us", { timeZone: "UTC" }),
      // TODO for prod: Set to false, request verification by email + phone
      activeAccount: true,
    });

    // Auth token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_TOKEN as string
    );

    user.token = token;
    sendRegistrationEmail(email, firstName, lastName);
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress)?.toString() || "undefined";
    logEvent("user_registration", { email, ip, userId: user._id });
    return res.status(201).send({ email, token });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "internal error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password)) return res.status(400).send({ error: "missing fields" });

    if (!validateEmail(email)) return res.status(400).send({ error: "invalid email" });

    const user = await UserModel.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_TOKEN as string
      );
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress)?.toString() || "undefined";
      logEvent("user_login", { email, ip, userId: user._id });
      return res.status(200).send({ email, token });
    }

    return res.status(400).send({ error: "invalid credentials" });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "internal error" });
  }
}

function createPasswordResetToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function resetLinkFromToken(token: string, email: string, resetId: number): string {
  return `https://inck.io/reset-password?token=${token}&email=${email}`;
}

async function resetUserPassword(userEntry?: DBUser) {
  if (userEntry == undefined) {
    console.log("Invalid reset request");
    return;
  }

  const oldToken = await PasswordResetModel.findOne({ userId: userEntry._id });

  if (oldToken != undefined) {
    await oldToken.deleteOne();
  }

  const newToken = createPasswordResetToken();
  const hash = await bcrypt.hash(newToken, Number(process.env.BCRYPT_SALT));
  PasswordResetModel.create({
    email: userEntry.email,
    userId: userEntry._id,
    resetToken: hash,
  });
  // TODO: change resetID by something else
  const passwordResetLink = resetLinkFromToken(newToken, userEntry.email, 1);

  console.log("Password reset requested:");
  console.log(passwordResetLink);
  await sendPasswordRecoveryEmail(userEntry.email, userEntry.firstName, userEntry.lastName, passwordResetLink);
}

export async function initializeResetPasswordUsingEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const userEntry = await UserModel.findOne({ email: email });
    resetUserPassword(userEntry);
    return res.status(201).send({ status: "success" });
  } catch (err) {
    console.log("Error during password reset:");
    console.log(err);
    res.status(400).send({ error: "Unable to reset password" });
  }
}

export async function initializeResetPasswordUsingToken(req: Request, res: Response) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN as string) as JwtPayload;
    const userEntry = await UserModel.findOne({ _id: token.userId });
    resetUserPassword(userEntry);
    return res.status(201).send({ status: "success" });
  } catch (err) {
    console.log("Error during password reset:");
    console.log(err);
    res.status(400).send({ error: "Unable to reset password" });
  }
}

export async function changePasswordEndpoint(req: Request, res: Response) {
  try {
    const { newPassword, resetToken, email } = req.body;
    const passHash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_SALT));

    const entry = await PasswordResetModel.findOne({
      email: email,
    });
    const isPwValid = await bcrypt.compare(resetToken, entry.resetToken);

    if (!entry || !isPwValid) {
      console.log("Invalid reset token");
      return res.status(400).send({ error: "Unable to reset password (432)" });
    }

    const userEntry = await UserModel.findOneAndUpdate({ _id: entry.userId }, { password: passHash });

    await PasswordResetModel.deleteOne({ email: email });

    res.status(201).send({ status: "success" });
    await sendPasswordConfirmationEmail(userEntry.email, userEntry.firstName, userEntry.lastName);
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress)?.toString() || "undefined";
    logEvent("change_password", { email, ip, userId: entry.userId });
  } catch (err) {
    console.log("Error while setting new password");
    console.log(err);
    res.status(400).send({ error: "Unable to reset password (662)" });
  }
}
