import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import DocumentModel from "../models/Document.js";
import Groq from "groq-sdk";
import { hasCompanyPermission } from "./Documents.js";
import { embedText } from "../helpers/Embed.js";
function cosineSimilarity(a, b) {
    if (!a?.length || !b?.length || a.length !== b.length)
        return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0)
        return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function tokenize(text) {
    return (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}
function keywordScore(query, title, content) {
    const q = tokenize(query);
    const text = tokenize(`${title} ${content}`);
    if (!q.length || !text.length)
        return 0;
    const freq = {};
    for (const t of text)
        freq[t] = (freq[t] || 0) + 1;
    return q.reduce((acc, term) => acc + (freq[term] || 0), 0);
}
function extractSnippets(query, title, content, maxSnippets = 2) {
    const terms = Array.from(new Set(tokenize(query)));
    if (!content)
        return [title].filter(Boolean).slice(0, 1);
    const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 40);
    const scored = sentences.map((s) => ({ s, score: keywordScore(terms.join(' '), '', s) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSnippets)
        .map(x => x.s.length > 220 ? (x.s.slice(0, 200) + '…') : x.s);
    return scored.length ? scored : [sentences[0]?.slice(0, 200) + '…'].filter(Boolean);
}
async function rewriteQuery(query) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey)
        return [query]; // Fallback to original query if no API key
    try {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content: "You are a query rewriting assistant. Given a user's question, generate exactly 5 different ways to ask the same question using different words, phrasings, and synonyms. Each rewrite should be semantically equivalent but use different vocabulary. Return only the 5 queries, one per line, no numbering or bullets."
                },
                {
                    role: "user",
                    content: query
                }
            ],
            temperature: 0.7,
            max_tokens: 200
        });
        const rewrites = response.choices?.[0]?.message?.content
            ?.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 5) || [];
        return rewrites.length > 0 ? rewrites : [query];
    }
    catch (error) {
        console.warn('Query rewriting failed:', error);
        return [query]; // Fallback to original query
    }
}
// POST /api/chat
// body: { company: string, message: string }
export const chat = asyncHandler(async (req, res) => {
    const { company, message } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!company || !message)
        return res.status(400).json({ message: "company and message are required" });
    // Require read permission to query documents
    if (!hasCompanyPermission(authUser, company, 'read')) {
        return res.status(403).json({ message: "Forbidden" });
    }
    // Prepare streaming via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const write = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    const docs = await DocumentModel.find({ company: new mongoose.Types.ObjectId(String(company)) })
        .select('title content embedding updatedAt')
        .sort({ updatedAt: -1 })
        .limit(50);
    // Generate multiple query variations for better retrieval
    const queryVariations = await rewriteQuery(message);
    console.log('Query variations:', queryVariations);
    // Search with each query variation and combine results
    const allScores = new Map();
    for (const query of queryVariations) {
        let qEmb = null;
        try {
            qEmb = await embedText(query);
        }
        catch { }
        const queryScores = docs.map((d) => {
            let score = 0;
            if (Array.isArray(d.embedding) && Array.isArray(qEmb)) {
                score = cosineSimilarity(qEmb, d.embedding);
            }
            else {
                score = keywordScore(query, d.title || '', d.content || '');
            }
            return { doc: d, score };
        });
        // Update max score for each document across all query variations
        for (const { doc, score } of queryScores) {
            const docId = String(doc._id);
            const existing = allScores.get(docId);
            if (!existing || score > existing.maxScore) {
                allScores.set(docId, { doc, maxScore: score });
            }
        }
    }
    // Convert to array and sort by max score
    const scored = Array.from(allScores.values())
        .sort((a, b) => b.maxScore - a.maxScore)
        .slice(0, 3);
    // Build a RAG prompt
    const contextBlocks = scored.map(({ doc }) => {
        const snippets = extractSnippets(message, doc.title || '', doc.content || '', 3);
        return `Title: ${doc.title}\nSnippets:\n- ${snippets.join('\n- ')}`;
    }).join('\n\n');
    const system = `You are a helpful HR assistant for ValTech. Answer the user clearly using ONLY the provided context. If the answer isn't in context, say you couldn't find it. Format with short paragraphs and bullet lists where appropriate.`;
    const userMsg = `Question: ${message}\n\nContext:\n${contextBlocks}`;
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        // Fallback to local formatting if no key
        write({ chunk: `You asked: "${message}"\n\nBased on documents:` });
        for (const { doc } of scored) {
            const snippets = extractSnippets(message, doc.title || '', doc.content || '', 2);
            const lines = [`- ${doc.title}:`, ...snippets.map(s => `  - ${s}`)];
            write({ chunk: lines.join('\n') });
        }
        write({ done: true, references: scored.map(x => ({ _id: x.doc._id, title: x.doc.title })) });
        return res.end();
    }
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg }
        ],
        temperature: 0.2,
        max_tokens: 800,
        top_p: 1,
        stream: true,
    });
    for await (const chunk of stream) {
        const delta = chunk?.choices?.[0]?.delta?.content || "";
        if (delta)
            write({ chunk: delta });
    }
    write({ done: true, references: scored.map(x => ({ _id: x.doc._id, title: x.doc.title })) });
    res.end();
});
