import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
export async function sendMail({ to, subject, username, message }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.FROM_EMAIL || "valizevbigie@gmail.com";
    const smtpPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL || smtpUser || "valizevbigie@gmail.com";
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        // Transport not configured; skip sending to avoid runtime crashes in dev
        return { success: false, message: "SMTP not configured" };
    }
    const transporter = nodemailer.createTransport(smtpHost && smtpPort
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
    const templatePath = path.resolve(process.cwd(), "templates", "email.html");
    const template = fs.readFileSync(templatePath, "utf8");
    // Ensure placeholders inside the message body are also resolved
    const resolvedMessage = (message || "").replace(/\[username\]/g, username);
    const html = template
        .replace(/\[username\]/g, username)
        .replace(/\[message\]/g, resolvedMessage);
    await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
    });
    return { success: true };
}
