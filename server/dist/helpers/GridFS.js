import { ObjectId } from "mongodb";
import mongoose from "mongoose";
function getBucket() {
    const db = mongoose.connection.db;
    if (!db)
        throw new Error("Mongo connection not ready");
    return new mongoose.mongo.GridFSBucket(db, { bucketName: "uploads" });
}
export async function uploadBase64(filename, base64, contentType) {
    const buffer = Buffer.from(base64, "base64");
    const bucket = getBucket();
    return await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, { contentType });
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.on("error", reject);
        uploadStream.end(buffer);
    });
}
export function openDownloadStream(fileId) {
    const bucket = getBucket();
    const id = typeof fileId === "string" ? new ObjectId(fileId) : fileId;
    return bucket.openDownloadStream(id);
}
export async function deleteFile(fileId) {
    const bucket = getBucket();
    const id = typeof fileId === "string" ? new ObjectId(fileId) : fileId;
    await bucket.delete(id);
}
