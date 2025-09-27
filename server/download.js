// download.js
import fs from "fs";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";
dotenv.config();

// ensure ./models exists
const cachePath = "./models";
if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath);
}

// tell transformers to cache here
process.env.TRANSFORMERS_CACHE = cachePath;

async function main() {
  console.log("Downloading Xenova/all-MiniLM-L12-v2 ...");

  // this will fetch model weights and cache them into ./models
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L12-v2");

  // quick test
  const sentences = [
    "That is a happy person",
    "That is a happy dog"
  ];

  const embeddings = await embedder(sentences, { pooling: "mean", normalize: true });
  console.log("Embeddings shape:", embeddings.dims); // e.g. [2, 384]
}

main();
