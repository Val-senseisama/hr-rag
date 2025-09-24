import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { CONFIG } from "../config/CONFIG.js";
const JWT_SECRET = CONFIG.JWT_SECRET;
const ACCESS_EXP = CONFIG.JWT_EXPIRES_IN || "15m";
const REFRESH_EXP = CONFIG.JWT_REFRESH_EXPIRES_IN || "7d";
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}
export const setJwt = async (id) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
            };
        }
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: 15 * 60 * 1000 });
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
export const setRefreshJwt = async (id) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
            };
        }
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: 30 * 24 * 60 * 60 * 1000 });
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
export const verifyJwt = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
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
export const verifyRefreshJwt = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
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
export const createContext = async (req, res, next) => {
    const token = req.headers["x-access-token"] || undefined;
    const refreshToken = req.headers["x-refresh-token"] || undefined;
    if (!token || !refreshToken) {
        console.log("Missing tokens:", { token: !!token, refreshToken: !!refreshToken });
        return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = await verifyJwt(token);
    const refreshDecoded = await verifyRefreshJwt(refreshToken);
    if (!decoded.success || !refreshDecoded.success) {
        console.log("Token verification failed");
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded.data;
    req.refreshUser = refreshDecoded.data;
    next();
};
