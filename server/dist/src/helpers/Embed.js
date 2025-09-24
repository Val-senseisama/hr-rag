"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedder = getEmbedder;
exports.embedText = embedText;
const transformers_1 = require("@xenova/transformers");
transformers_1.env.allowLocalModels = false;
let embedder;
async function getEmbedder() {
    if (!embedder) {
        embedder = await (0, transformers_1.pipeline)("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}
async function embedText(text) {
    const e = await getEmbedder();
    const output = await e(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
}
