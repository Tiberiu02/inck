import { UserModel } from "./Models.mjs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
      return res.status(400).send({error: "missing fields"})
    
    if(!validateEmail(email))
        return res.status(400).send({error: "invalid email"})

    if (await UserModel.findOne({ email })) 
      return res.status(409).send({error: "user already exists"});

    const encryptedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password: encryptedPassword,
      registrationDate: new Date().toLocaleDateString("en-us", {timeZone: 'UTC'}),
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
    return res.status(400).send({error: "internal error"})
  }
}

export async function login(req, res){
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password))
      return res.status(400).send({error: "missing fields"});

    if (!validateEmail(email))
      return res.status(400).send({error: "invalid email"})

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

    return res.status(400).send({error: "invalid credentials"});

  } catch (err) {
    console.log(err);
    return res.status(400).send({error: "internal error"})
  }
}