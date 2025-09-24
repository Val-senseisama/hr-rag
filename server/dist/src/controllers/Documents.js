"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadDocumentFile = exports.deleteDocument = exports.updateDocument = exports.listCompanyDocuments = exports.createDocument = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const Document_js_1 = __importDefault(require("../models/Document.js"));
const Embed_js_1 = require("../helpers/Embed.js");
const GridFS_1 = require("../helpers/GridFS");
function hasCompanyPermission(user, companyId, action) {
    // roles per company (if user.role is array of company-scoped roles)
    const companyObjectId = new mongoose_1.default.Types.ObjectId(String(companyId));
    const roles = Array.isArray(user.role) ? user.role : [];
    const entry = roles.find((r) => String(r.company) === String(companyObjectId));
    if (!entry)
        return false;
    const value = entry[action];
    return typeof value === "number" && value > 0;
}
// POST /api/documents (text content or base64 file)
exports.createDocument = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, content, company, fileBase64, filename, contentType } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!title || !company)
        return res.status(400).json({ message: "title and company are required" });
    if (!hasCompanyPermission(authUser, company, "write")) {
        return res.status(403).json({ message: "Forbidden" });
    }
    let embedding = undefined;
    let fileId = undefined;
    if (content && typeof content === "string") {
        embedding = await (0, Embed_js_1.embedText)(content);
    }
    if (fileBase64 && typeof fileBase64 === "string") {
        const storedId = await (0, GridFS_1.uploadBase64)(filename || `${Date.now()}.bin`, fileBase64, contentType);
        fileId = storedId;
    }
    const created = await Document_js_1.default.create({
        title,
        content: content,
        fileId,
        company: new mongoose_1.default.Types.ObjectId(String(company)),
        createdBy: new mongoose_1.default.Types.ObjectId(String(authUser._id || authUser.id)),
        embedding,
    });
    return res.status(201).json({ message: "Document created", document: created });
});
// GET /api/companies/:companyId/documents
exports.listCompanyDocuments = (0, express_async_handler_1.default)(async (req, res) => {
    const { companyId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '0')))) || (Number(process.env.PAGINATION_LIMIT) || 30);
    const skip = (page - 1) * limit;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!hasCompanyPermission(authUser, companyId, "read")) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const [items, total] = await Promise.all([
        Document_js_1.default.find({ company: companyId }).select("-embedding").skip(skip).limit(limit).sort({ updatedAt: -1 }),
        Document_js_1.default.countDocuments({ company: companyId })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return res.status(200).json({ documents: items, meta: { page, limit, total, totalPages } });
});
// PATCH /api/documents/:id
exports.updateDocument = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    const existing = await Document_js_1.default.findById(id);
    if (!existing)
        return res.status(404).json({ message: "Document not found" });
    if (!hasCompanyPermission(authUser, existing.company, "update")) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const update = {};
    if (title)
        update.title = title;
    if (typeof content === "string") {
        update.content = content;
        update.embedding = await (0, Embed_js_1.embedText)(content);
    }
    const updated = await Document_js_1.default.findByIdAndUpdate(id, update, { new: true });
    return res.status(200).json({ message: "Document updated", document: updated });
});
// DELETE /api/documents/:id
exports.deleteDocument = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    const existing = await Document_js_1.default.findById(id);
    if (!existing)
        return res.status(404).json({ message: "Document not found" });
    if (!hasCompanyPermission(authUser, existing.company, "delete")) {
        return res.status(403).json({ message: "Forbidden" });
    }
    if (existing.fileId) {
        await (0, GridFS_1.deleteFile)(existing.fileId);
    }
    await existing.deleteOne();
    return res.status(200).json({ message: "Document deleted" });
});
// GET /api/documents/:id/file
exports.downloadDocumentFile = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    const existing = await Document_js_1.default.findById(id);
    if (!existing || !existing.fileId)
        return res.status(404).json({ message: "File not found" });
    if (!hasCompanyPermission(authUser, existing.company, "read")) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const stream = (0, GridFS_1.openDownloadStream)(existing.fileId);
    stream.on("error", () => res.status(404).end());
    stream.pipe(res);
});
