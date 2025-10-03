import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import usersRouter from "./routes/users.js";
import companiesRouter from "./routes/companies.js";
import documentsRouter from "./routes/documents.js";
import chatRouter from "./routes/chat.js";
import { CONFIG } from "./config/CONFIG.js";
import cors from "cors";
import Redis from 'ioredis'
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
});

const app = express();

const WINDOW_SIZE_IN_SECONDS = Number(process.env.WINDOW_SIZE_IN_SECONDS) || 60;
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS) || 10;

app.use(async (req: any, res: any, next: any) => {
try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || req.ip; 
    const userId = req.user?.id ?? req.user?._id;
    const key = userId ? `rate_limit:user:${userId}` : `rate_limit:ip:${ip}`;
    
  

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, WINDOW_SIZE_IN_SECONDS);
    const results = await pipeline.exec();
    
    const current = results[0][1] as number;
    const remaining = Math.max(0, MAX_REQUESTS - current);
    

   
  
    if (current > MAX_REQUESTS) {
      return res.status(429).json({ error: "Too many requests", retryAfter: WINDOW_SIZE_IN_SECONDS });
    }
  
    next();
} catch (error) {
  console.error('Rate limit error', error);
  next();
}
});

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