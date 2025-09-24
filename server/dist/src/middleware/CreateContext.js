"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = exports.verifyRefreshJwt = exports.verifyJwt = exports.setRefreshJwt = exports.setJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const CONFIG_1 = require("../config/CONFIG");
const setJwt = async (id) => {
    try {
        const user = await User_1.default.findById(id);
        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
            };
        }
        const token = jsonwebtoken_1.default.sign({ ...user }, CONFIG_1.CONFIG.JWT_SECRET, { expiresIn: +CONFIG_1.CONFIG.JWT_EXPIRES_IN });
        return {
            success: true,
            message: "JWT set",
            data: token,
        };
    }
    catch (error) {
        throw new Error("Error setting JWT");
    }
};
exports.setJwt = setJwt;
const setRefreshJwt = async (id) => {
    try {
        const user = await User_1.default.findById(id);
        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
            };
        }
        const token = jsonwebtoken_1.default.sign({ ...user }, CONFIG_1.CONFIG.JWT_SECRET, { expiresIn: +CONFIG_1.CONFIG.JWT_REFRESH_EXPIRES_IN });
        return {
            success: true,
            message: "Refresh JWT set",
            data: token,
        };
    }
    catch (error) {
        throw new Error("Error setting Refresh JWT");
    }
};
exports.setRefreshJwt = setRefreshJwt;
const verifyJwt = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, CONFIG_1.CONFIG.JWT_SECRET);
        if (!decoded) {
            return {
                success: false,
                message: "Invalid token",
                data: null,
            };
        }
        return {
            success: true,
            message: "Token verified",
            data: decoded,
        };
    }
    catch (error) {
        return {
            success: false,
            message: "Error verifying token",
            data: null,
        };
    }
};
exports.verifyJwt = verifyJwt;
const verifyRefreshJwt = async (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, CONFIG_1.CONFIG.JWT_SECRET);
        if (!decoded) {
            return {
                success: false,
                message: "Invalid token",
                data: null,
            };
        }
        return {
            success: true,
            message: "Refresh token verified",
            data: decoded,
        };
    }
    catch (error) {
        return {
            success: false,
            message: "Error verifying refresh token",
            data: null,
        };
    }
};
exports.verifyRefreshJwt = verifyRefreshJwt;
const createContext = async (req, res, next) => {
    const token = req.headers["x-access-token"] || undefined;
    const refreshToken = req.headers["x-refresh-token"] || undefined;
    if (!token || !refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = await (0, exports.verifyJwt)(token);
    const refreshDecoded = await (0, exports.verifyRefreshJwt)(refreshToken);
    if (!decoded.success || !refreshDecoded.success) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded.data;
    req.refreshUser = refreshDecoded.data;
    next();
};
exports.createContext = createContext;
