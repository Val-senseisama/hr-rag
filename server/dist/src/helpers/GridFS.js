"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64 = uploadBase64;
exports.openDownloadStream = openDownloadStream;
exports.deleteFile = deleteFile;
const mongodb_1 = require("mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
function getBucket() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        throw new Error("Mongo connection not ready");
    return new mongoose_1.default.mongo.GridFSBucket(db, { bucketName: "uploads" });
}
async function uploadBase64(filename, base64, contentType) {
    const buffer = Buffer.from(base64, "base64");
    const bucket = getBucket();
    return await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, { contentType });
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.on("error", reject);
        uploadStream.end(buffer);
    });
}
function openDownloadStream(fileId) {
    const bucket = getBucket();
    const id = typeof fileId === "string" ? new mongodb_1.ObjectId(fileId) : fileId;
    return bucket.openDownloadStream(id);
}
async function deleteFile(fileId) {
    const bucket = getBucket();
    const id = typeof fileId === "string" ? new mongodb_1.ObjectId(fileId) : fileId;
    await bucket.delete(id);
}
