import express, { response } from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import cors from "cors";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 9000;

app.listen(PORT, () => console.log("listening to", PORT));

const MONGO_URL = process.env.MONGO_URL;

async function createConnection() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("connected");
    return client;
  } catch (err) {
    console.log(err);
  }
}
createConnection();

async function genpassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashpassword = await bcrypt.hash(password, salt);
  return hashpassword;
}

app.get("/",async(req,res)=>{
  res.send("Welcome to URL-shortener app,Kindly login");
})
app.post("/signup", async (req, res) => {
  console.log(req.body);
  
  const { username, password } = req.body;
  const hpassword =await genpassword(password);
  
  const client = await createConnection();
  console.log(hpassword);
  const user = await client
    .db("URL")
    .collection("users")
    .findOne({ username: username });
  if (user) res.status(405).send({ message: "You already exist with us" });
  else {
    const act_token = Activate({ username });
    if (act_token){
      await client
        .db("URL")
        .collection("users")
        .insertOne({ username: username, password: hpassword });
        res.status(205).send({message:"Activate your account"});
        console.log("here");
  }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const client = await createConnection();
  const user = await client
    .db("URL")
    .collection("users")
    .findOne({ username: username });
  var pass =await bcrypt.compare(user.password, password);
  
  console.log(pass);
  if (pass && user.active==="yes") {
    const token = jwt.sign(
      { username: user.username },
      process.env.url_token + user.username
    );
    res.send({ message: "success", token: token });
  } else res.status(401).send({ message: "error" });
});

app.post("/activate", async (req, res) => {
  const { username, token } = req.body;
  const pass = jwt.verify(token, process.env.token_activate + username);
  if (pass) {
    const client = await createConnection();
    const user = await client
      .db("URL")
      .collection("users")
      .updateOne({ username: username }, { $set: { active: "yes" } });
    res.status(200).send({ message: "activated" });
  } else {
    res.status(401).send({ message: "Incorrect activation link" });
  }
});
export async function Activate({ username }) {
  console.log(username);
  const token = jwt.sign(
    { username: username },
    process.env.token_activate + username
  );
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.user,
      pass: process.env.pass,
    },
  });

  const mailOptions = {
    from: "testing.00k@gmail.com",
    to: `${username}`,
    subject: `Activate your account`,
    text: "http://localhost:3000/activate/" + token +"/"+ username,
    replyTo: `test`,
  };
  transporter.sendMail(mailOptions, function (err, res) {
    if (err) {
      console.error("there was an error: ", err);
      return null;
    } else {
      console.log("here is the res: ", res);
      console.log("hellomf");
      return token;
    }
  });
  
}
