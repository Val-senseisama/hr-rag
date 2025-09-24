"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.updateUser = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const User_js_1 = __importDefault(require("../models/User.js"));
const CreateContext_js_1 = require("../middleware/CreateContext.js");
const SendMail_js_1 = require("../helpers/SendMail.js");
const GenerateResetCode_js_1 = __importDefault(require("../helpers/GenerateResetCode.js"));
// POST /api/auth/register
exports.register = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email and password are required" });
    }
    const exists = await User_js_1.default.findOne({ email });
    if (exists) {
        return res.status(409).json({ message: "Email already in use" });
    }
    const saltRounds = 10;
    const hashed = await bcrypt_1.default.hash(password, saltRounds);
    const user = await User_js_1.default.create({ name, email, password: hashed, companies: [] });
    const access = await (0, CreateContext_js_1.setJwt)(user._id);
    const refresh = await (0, CreateContext_js_1.setRefreshJwt)(user._id);
    // Send welcome email
    await (0, SendMail_js_1.sendMail)({
        to: email,
        subject: "Welcome to ValTech HrBot",
        username: name,
        message: "Your account has been created successfully.",
    });
    return res.status(201).json({
        message: "Registered successfully",
        user: { id: user._id, name: user.name, email: user.email },
        tokens: { access: access.data, refresh: refresh.data },
    });
});
// POST /api/auth/login
exports.login = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
    }
    const user = await User_js_1.default.findOne({ email }).select("+password");
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const valid = await bcrypt_1.default.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const access = await (0, CreateContext_js_1.setJwt)(user._id);
    const refresh = await (0, CreateContext_js_1.setRefreshJwt)(user._id);
    return res.status(200).json({
        message: "Login successful",
        user: { id: user._id, name: user.name, email: user.email },
        tokens: { access: access.data, refresh: refresh.data },
    });
});
// PATCH /api/users/me
exports.updateUser = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?._id || req.user?.id; // from middleware
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { name, password } = req.body || {};
    const update = {};
    if (name)
        update.name = name;
    if (password) {
        const saltRounds = 10;
        update.password = await bcrypt_1.default.hash(password, saltRounds);
    }
    if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "No updates provided" });
    }
    const updated = await User_js_1.default.findByIdAndUpdate(userId, update, { new: true });
    if (!updated) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
        message: "Profile updated",
        user: { id: updated._id, name: updated.name, email: updated.email },
    });
});
// POST /api/auth/forgot-password
exports.forgotPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ message: "email is required" });
    }
    const user = await User_js_1.default.findOne({ email });
    if (!user) {
        // Don't reveal account existence
        return res.status(200).json({ message: "If the email exists, a reset link was sent" });
    }
    // Generate 6-character uppercase code and save with expiry (15 min)
    const code = (0, GenerateResetCode_js_1.default)();
    user.resetCode = code;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    await (0, SendMail_js_1.sendMail)({
        to: email,
        subject: "Your ValTech HrBot password reset code",
        username: user.name,
        message: `Use this code to reset your password: ${code}\nThis code expires in 15 minutes.`,
    });
    return res.status(200).json({ message: "If the email exists, a reset link was sent" });
});
// POST /api/auth/reset-password
exports.resetPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "email, code and newPassword are required" });
    }
    const user = await User_js_1.default.findOne({ email }).select("+password");
    if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const now = new Date();
    if (user.resetCode !== String(code).toUpperCase() || user.resetCodeExpiresAt < now) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    const saltRounds = 10;
    user.password = await bcrypt_1.default.hash(newPassword, saltRounds);
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    await user.save();
    return res.status(200).json({ message: "Password has been reset successfully" });
});
