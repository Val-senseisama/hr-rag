"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendMail({ to, subject, username, message }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.FROM_EMAIL || "valizevbigie@gmail.com";
    const smtpPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL || smtpUser || "valizevbigie@gmail.com";
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        // Transport not configured; skip sending to avoid runtime crashes in dev
        return { success: false, message: "SMTP not configured" };
    }
    const transporter = nodemailer_1.default.createTransport(smtpHost && smtpPort
        ? {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
        }
        : {
            service: "gmail",
            auth: { user: smtpUser, pass: smtpPass },
        });
    const templatePath = path_1.default.resolve(process.cwd(), "templates", "email.html");
    const template = fs_1.default.readFileSync(templatePath, "utf8");
    const html = template
        .replace(/\[username\]/g, username)
        .replace(/\[message\]/g, message);
    await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
    });
    return { success: true };
}
