"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT,
    PAGINATION_LIMIT: Number(process.env.PAGINATION_LIMIT) || 30,
};
