import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import usersRouter from "./routes/users.js";
import companiesRouter from "./routes/companies.js";
import documentsRouter from "./routes/documents.js";
import chatRouter from "./routes/chat.js";
import { CONFIG } from "./config/CONFIG.js";
import cors from "cors";
dotenv.config();

const app = express();


app.use(cors({
  origin: ["http://localhost:5173", "https://hr-rag.vercel.app"],
  credentials: true,
}));

app.use(express.json());
app.use("/api", usersRouter);
app.use("/api", companiesRouter);
app.use("/api", documentsRouter);
app.use("/api", chatRouter);

app.get("/", (req, res) => {
  res.send("ValTech HRBot API");
});

async function start() {
  const mongo = CONFIG.MONGO_URI as string;
  const port = Number(CONFIG.PORT) || 3000;
  if (!mongo) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }
  await mongoose.connect(mongo);
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});