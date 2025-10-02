// Load environment variables
// Note: In production, these should be set by the deployment platform

export const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,
    PAGINATION_LIMIT: Number(process.env.PAGINATION_LIMIT) || 30,
}