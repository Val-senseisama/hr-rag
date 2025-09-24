import { pipeline, env } from "@xenova/transformers";
env.allowLocalModels = false;
let embedder;
export async function getEmbedder() {
    if (!embedder) {
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return embedder;
}
export async function embedText(text) {
    const e = await getEmbedder();
    const output = await e(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
}
