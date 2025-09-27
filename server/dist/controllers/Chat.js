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
    // Create frequency map
    const freq = {};
    for (const t of text)
        freq[t] = (freq[t] || 0) + 1;
    // Add semantic keyword mappings for better matching
    const semanticMappings = {
        'work': ['work', 'working', 'job', 'employment', 'employee'],
        'home': ['home', 'remote', 'telecommute', 'telework'],
        'remote': ['remote', 'home', 'telecommute', 'telework', 'distance'],
        'allowed': ['allowed', 'permitted', 'eligible', 'can', 'may'],
        'often': ['often', 'frequently', 'frequency', 'times', 'days'],
        'from': ['from', 'at', 'in'],
        'so': ['so', 'if', 'when', 'then'],
        'how': ['how', 'what', 'when', 'where'],
        'am': ['am', 'is', 'are', 'can', 'may'],
        'i': ['i', 'you', 'employee', 'staff'],
        'resign': ['resign', 'resigning', 'resignation', 'quit', 'leave', 'exit', 'departure'],
        'notice': ['notice', 'notification', 'advance', 'warning', 'period'],
        'give': ['give', 'provide', 'submit', 'deliver', 'send'],
        'want': ['want', 'wish', 'desire', 'need', 'require'],
        'much': ['much', 'many', 'long', 'duration', 'time', 'period'],
        'need': ['need', 'require', 'must', 'should', 'have'],
        'if': ['if', 'when', 'should', 'in', 'case'],
        'do': ['do', 'does', 'did', 'will', 'can'],
        'to': ['to', 'for', 'in', 'order']
    };
    // Check for exact phrase matches first (highest priority)
    const exactPhraseMatch = content.toLowerCase().includes(query.toLowerCase());
    if (exactPhraseMatch) {
        console.log(`🎯 EXACT PHRASE MATCH FOUND for: "${query}"`);
        console.log(`📄 Document: "${title}"`);
        return 100; // Very high score for exact matches
    }
    // Check for partial phrase matches (substring of 5+ words)
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length >= 5) {
        const partialPhrase = queryWords.slice(0, 5).join(' ');
        const partialMatch = content.toLowerCase().includes(partialPhrase);
        if (partialMatch) {
            console.log(`Partial phrase match found: "${partialPhrase}"`);
            return 50; // High score for partial matches
        }
    }
    // Filter out common stop words that don't add semantic value
    const stopWords = new Set(['to', 'in', 'for', 'if', 'do', 'am', 'is', 'are', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'the', 'a', 'an', 'and', 'or', 'but', 'so', 'with', 'from', 'at', 'by', 'on', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
    let score = 0;
    const matches = [];
    for (const term of q) {
        // Skip very common words unless they're semantically important
        if (stopWords.has(term) && !['resign', 'notice', 'give', 'want', 'need', 'much', 'month', 'written', 'least', 'employees', 'resigning'].includes(term)) {
            continue;
        }
        // Direct match with higher weight for important terms
        const directMatch = freq[term] || 0;
        if (directMatch > 0) {
            const weight = ['resign', 'notice', 'give', 'want', 'need', 'much', 'work', 'home', 'remote', 'allowed', 'month', 'written', 'least', 'employees', 'resigning'].includes(term) ? 3 : 1;
            score += directMatch * weight;
            matches.push(`${term}(${directMatch})`);
        }
        // Semantic matches
        const synonyms = semanticMappings[term] || [];
        for (const synonym of synonyms) {
            const synonymMatch = freq[synonym] || 0;
            if (synonymMatch > 0) {
                const weight = ['resign', 'notice', 'give', 'want', 'need', 'much', 'work', 'home', 'remote', 'allowed', 'month', 'written', 'least', 'employees', 'resigning'].includes(term) ? 2.5 : 1;
                score += synonymMatch * weight;
                matches.push(`${synonym}(${synonymMatch})`);
            }
        }
    }
    // Debug logging for keyword matching
    if (score > 0) {
        console.log(`Keyword matches for "${query}":`, matches.join(', '), `Total score: ${score}`);
    }
    return score;
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
        return [query, query, query, query, query]; // Fallback to original query repeated 5 times
    try {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content: "You are a query rewriting assistant. Given a user's question, generate exactly 5 different ways to ask the same question using different words, phrasings, and synonyms. Each rewrite should be semantically equivalent but use different vocabulary. IMPORTANT: You must return exactly 5 queries, one per line, no numbering, no bullets, no extra text. Each line should be a complete question."
                },
                {
                    role: "user",
                    content: `Original question: "${query}"\n\nGenerate 5 different ways to ask this same question:`
                }
            ],
            temperature: 0.8,
            max_tokens: 300
        });
        const content = response.choices?.[0]?.message?.content || '';
        const rewrites = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.match(/^\d+[\.\)]/) && !line.startsWith('-') && !line.startsWith('•'))
            .slice(0, 5);
        // Ensure we have exactly 5 variations
        if (rewrites.length >= 5) {
            return rewrites.slice(0, 5);
        }
        else if (rewrites.length > 0) {
            // Pad with variations of the original query if we got fewer than 5
            const padded = [...rewrites];
            while (padded.length < 5) {
                padded.push(query);
            }
            return padded.slice(0, 5);
        }
        else {
            // Complete fallback
            return [query, query, query, query, query];
        }
    }
    catch (error) {
        console.warn('Query rewriting failed:', error);
        return [query, query, query, query, query]; // Fallback to original query repeated 5 times
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
    // Include the original query in the search (it's often the most precise)
    const allQueries = [message, ...queryVariations];
    console.log('All queries (original + variations):', allQueries);
    // Search with each query variation and combine results
    const allScores = new Map();
    for (const query of allQueries) {
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
    const allScored = Array.from(allScores.values())
        .sort((a, b) => b.maxScore - a.maxScore);
    // Log similarity scores for debugging
    console.log('Top similarity scores:', allScored.slice(0, 10).map(s => ({
        title: s.doc.title,
        score: s.maxScore.toFixed(3),
        hasEmbedding: !!s.doc.embedding?.length,
        isHighScore: s.maxScore >= 10
    })));
    // Apply similarity threshold (adjust based on your embedding model performance)
    const SIMILARITY_THRESHOLD = 0.15; // Lower threshold for semantic variations and weaker embeddings
    // For keyword scores (which can be much higher), use a different threshold
    const KEYWORD_THRESHOLD = 10; // Much lower threshold for keyword scores
    const filteredScored = allScored.filter(s => s.maxScore >= SIMILARITY_THRESHOLD || s.maxScore >= KEYWORD_THRESHOLD);
    console.log(`Filtered ${allScored.length} docs to ${filteredScored.length} above threshold (similarity: ${SIMILARITY_THRESHOLD}, keyword: ${KEYWORD_THRESHOLD})`);
    // Take top 10 for reranking, then select best 3
    const topK = 10;
    const rerankCandidates = filteredScored.length > 0 ? filteredScored : allScored;
    const topCandidates = rerankCandidates.slice(0, topK);
    // If we have very few candidates, include more from the original list
    const finalCandidates = topCandidates.length < 3 ? allScored.slice(0, Math.max(3, topCandidates.length)) : topCandidates;
    // Rerank using combined scoring: similarity + keyword match + recency
    const reranked = finalCandidates.map(({ doc, maxScore }) => {
        const keywordBoost = keywordScore(message, doc.title || '', doc.content || '');
        const recencyBoost = Math.max(0, 1 - (Date.now() - new Date(doc.updatedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)); // 30 days
        // Handle exact phrase matches (score >= 100) with special logic
        if (keywordBoost >= 100) {
            // For exact phrase matches, give them the highest possible score
            const combinedScore = 1.0 + (maxScore * 0.1); // Base 1.0 + small similarity boost
            console.log(`🎯 EXACT PHRASE in reranking: "${doc.title}" → combined score: ${combinedScore.toFixed(3)}`);
            return { doc, score: combinedScore, originalScore: maxScore, keywordBoost, recencyBoost, normalizedKeyword: 1.0 };
        }
        // Normalize keyword score to 0-1 range (assuming max possible is around 50)
        const normalizedKeyword = Math.min(keywordBoost / 50, 1);
        // Give more weight to similarity when it's decent, but boost with keywords when similarity is low
        const similarityWeight = maxScore > 0.2 ? 0.6 : 0.3;
        const keywordWeight = maxScore > 0.2 ? 0.3 : 0.6;
        const recencyWeight = 0.1;
        const combinedScore = maxScore * similarityWeight + normalizedKeyword * keywordWeight + recencyBoost * recencyWeight;
        return { doc, score: combinedScore, originalScore: maxScore, keywordBoost, recencyBoost, normalizedKeyword };
    }).sort((a, b) => b.score - a.score);
    console.log('Reranked scores:', reranked.slice(0, 5).map(r => ({
        title: r.doc.title,
        combined: r.score.toFixed(3),
        original: r.originalScore.toFixed(3),
        keyword: r.keywordBoost.toFixed(3),
        normalizedKeyword: r.normalizedKeyword.toFixed(3),
        recency: r.recencyBoost.toFixed(3)
    })));
    // Final selection: top 3 after reranking, but ensure we have at least some results
    const scored = reranked.length > 0 ? reranked.slice(0, 3) : allScored.slice(0, 3);
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
