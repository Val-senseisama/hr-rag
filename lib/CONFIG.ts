// Load environment variables
// Note: In production, these should be set by the deployment platform
import dotenv from "dotenv";    
dotenv.config();
export const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,
    PAGINATION_LIMIT: Number(process.env.PAGINATION_LIMIT) || 30,
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    WINDOW_SIZE_IN_SECONDS: Number(process.env.WINDOW_SIZE_IN_SECONDS) || 60,
    MAX_REQUESTS: Number(process.env.MAX_REQUESTS) || 10,
}