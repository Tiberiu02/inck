const { UserModel } = require("./models");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

/**
 * Potential errors w/ status:
 * 400: missing fields, invalid email
 * 409: user already exists
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function register(req, res) {
  try {
    const cookies = req.cookies
    console.log(cookies['authToken'])

    let { firstName, lastName, email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password && firstName && lastName))
      return res.status(400).send({error: "missing fields"})
    
    if(!validateEmail(email))
        return res.status(400).send({error: "invalid email"})

    if (await UserModel.findOne({ email })) 
      return res.status(409).send({error: "user already exists"});

    encryptedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
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
    res.status(201).send({ email, token });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "internal error"})
  }
}

async function login(req, res){
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    if (!(email && password))
      res.status(400).send({error: "missing fields"});

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
    res.status(400).send({error: "internal error"})
  }
}

module.exports = {
    register,
    login,
}