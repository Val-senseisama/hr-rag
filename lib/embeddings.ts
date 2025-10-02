// Lightweight embedding + utilities without external heavy deps.
// This uses a character n-gram hashing trick to produce a stable vector.

// Vector dimension (keep modest for storage/compute)
const VECTOR_DIMENSION = 384;

function hashStringToInt32(input: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  h2 = (Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)) >>> 0;
  return (h2 & 0x1fffff) ^ (h1 & 0x1fffff);
}

export async function embedText(text: string): Promise<number[]> {
  const normalized = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return new Array(VECTOR_DIMENSION).fill(0);

  const vec = new Array<number>(VECTOR_DIMENSION).fill(0);
  // Use 3-gram hashing over words and characters
  const tokens = normalized.split(/[^a-z0-9]+/g).filter(Boolean);
  for (const tok of tokens) {
    for (let i = 0; i < tok.length; i++) {
      const tri = tok.slice(i, i + 3);
      if (tri.length < 1) continue;
      const h = hashStringToInt32(tri, i);
      const idx = h % VECTOR_DIMENSION;
      vec[idx] += 1;
    }
  }
  // Normalize to unit length
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function chunkText(text: string, maxLen = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  const sentences = (text || "").split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  let currentChunk = '';
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (testChunk.length <= maxLen) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        if (overlap > 0 && chunks.length > 0) {
          const prevChunk = chunks[chunks.length - 1];
          const overlapText = prevChunk.slice(-overlap);
          currentChunk = `${overlapText} ${sentence}`.trim();
        } else {
          currentChunk = sentence;
        }
      } else {
        if (sentence.length > maxLen) {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= maxLen) {
              wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = word;
            }
          }
          if (wordChunk) currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(chunk => chunk.trim().length > 0);
}

export function averageVectors(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0]?.length || 0;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i] || 0;
  }
  for (let i = 0; i < dim; i++) sum[i] = sum[i] / vectors.length;
  return sum;
}


