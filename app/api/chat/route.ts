import { NextRequest, NextResponse } from "next/server";
import Document from "@/models/Document";
import { requireAuth, canRead } from "@/lib/auth";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { embedText, cosineSimilarity } from "@/lib/embeddings";
export const runtime = 'nodejs';


function tokenize(text: string): string[] {
  return (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function keywordScore(query: string, title: string, content: string): number {
  const q = tokenize(query);
  const text = tokenize(`${title} ${content}`);
  if (!q.length || !text.length) return 0;
  
  // Create frequency map
  const freq: Record<string, number> = {};
  for (const t of text) freq[t] = (freq[t] || 0) + 1;
  
  // Add semantic keyword mappings for better matching
  const semanticMappings: Record<string, string[]> = {
    'work': ['work', 'working', 'job', 'employment', 'employee'],
    'home': ['home', 'remote', 'telecommute', 'telework'],
    'remote': ['remote', 'home', 'telecommute', 'telework', 'distance'],
    'allowed': ['allowed', 'permitted', 'eligible', 'can', 'may'],
    'often': ['often', 'frequently', 'frequency', 'times', 'days'],
    'resign': ['resign', 'resigning', 'resignation', 'quit', 'leave', 'exit', 'departure'],
    'notice': ['notice', 'notification', 'advance', 'warning', 'period'],
    'give': ['give', 'provide', 'submit', 'deliver', 'send'],
    'want': ['want', 'wish', 'desire', 'need', 'require'],
    'much': ['much', 'many', 'long', 'duration', 'time', 'period'],
    'need': ['need', 'require', 'must', 'should', 'have'],
  };
  
  // Check for exact phrase matches first (highest priority)
  const exactPhraseMatch = content.toLowerCase().includes(query.toLowerCase());
  if (exactPhraseMatch) {
    return 100; // Very high score for exact matches
  }
  
  // Filter out common stop words that don't add semantic value
  const stopWords = new Set(['to', 'in', 'for', 'if', 'do', 'am', 'is', 'are', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'the', 'a', 'an', 'and', 'or', 'but', 'so', 'with', 'from', 'at', 'by', 'on', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
  
  let score = 0;
  
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
    }
    
    // Semantic matches
    const synonyms = semanticMappings[term] || [];
    for (const synonym of synonyms) {
      const synonymMatch = freq[synonym] || 0;
      if (synonymMatch > 0) {
        const weight = ['resign', 'notice', 'give', 'want', 'need', 'much', 'work', 'home', 'remote', 'allowed', 'month', 'written', 'least', 'employees', 'resigning'].includes(term) ? 2.5 : 1;
        score += synonymMatch * weight;
      }
    }
  }
  
  return score;
}

function extractSnippets(query: string, title: string, content: string, maxSnippets = 2): string[] {
  if (!content) return [title].filter(Boolean).slice(0, 1);
  
  // First, check for exact phrase matches
  const exactPhraseMatch = content.toLowerCase().includes(query.toLowerCase());
  if (exactPhraseMatch) {
    // Find the sentence containing the exact phrase
    const sentences = content.split(/(?<=[.!?])\s+/);
    const exactSentence = sentences.find(s => s.toLowerCase().includes(query.toLowerCase()));
    if (exactSentence) {
      return [exactSentence.trim()];
    }
  }
  
  // Fallback to keyword-based snippet extraction
  const terms = Array.from(new Set(tokenize(query)));
  const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 40);
  const scored = sentences.map((s) => ({ s, score: keywordScore(terms.join(' '), '', s) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, maxSnippets)
    .map(x => x.s.length > 220 ? (x.s.slice(0, 200) + '…') : x.s);
  return scored.length ? scored : [sentences[0]?.slice(0, 200) + '…'].filter(Boolean as any);
}

async function rewriteQuery(query: string): Promise<string[]> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return [query, query, query, query, query]; // Fallback to original query repeated 5 times

  try {
    const { Groq } = await import('groq-sdk');
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
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.match(/^\d+[\.\)]/) && !line.startsWith('-') && !line.startsWith('•'))
      .slice(0, 5);

    // Ensure we have exactly 5 variations
    if (rewrites.length >= 5) {
      return rewrites.slice(0, 5);
    } else if (rewrites.length > 0) {
      // Pad with variations of the original query if we got fewer than 5
      const padded = [...rewrites];
      while (padded.length < 5) {
        padded.push(query);
      }
      return padded.slice(0, 5);
    } else {
      // Complete fallback
      return [query, query, query, query, query];
    }
  } catch (error) {
    console.warn('Query rewriting failed:', error);
    return [query, query, query, query, query]; // Fallback to original query repeated 5 times
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const user = requireAuth(req);
    const { company, message } = await req.json();

    if (!company || !message) {
      return NextResponse.json(
        { message: "company and message are required" },
        { status: 400 }
      );
    }

    // Require read permission to query documents
    if (!canRead(user, company)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const docs = await Document.find({ company: new mongoose.Types.ObjectId(String(company)) })
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
    const allScores = new Map<string, { doc: any, maxScore: number }>();

    for (const query of allQueries) {
      let qEmb: number[] | null = null;
      try { qEmb = await embedText(query); } catch {}

      const queryScores = docs.map((d: any) => {
        let score = 0;
        if (Array.isArray(d.embedding) && Array.isArray(qEmb)) {
          score = cosineSimilarity(qEmb as number[], d.embedding as number[]);
        } else {
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

    // Adaptive retrieval: thresholds/topK based on query length
    const qLen = (message || '').trim().split(/\s+/).filter(Boolean).length;
    const SIMILARITY_THRESHOLD = qLen <= 4 ? 0.12 : 0.18; // short queries → lower threshold
    const KEYWORD_THRESHOLD = qLen <= 4 ? 8 : 12; // short queries → lower keyword cutoff
    const filteredScored = allScored.filter(s => 
      s.maxScore >= SIMILARITY_THRESHOLD || s.maxScore >= KEYWORD_THRESHOLD
    );
    
    console.log(`Filtered ${allScored.length} docs to ${filteredScored.length} above threshold`);

    // Take top 10 for reranking, then select best 3
    const topK = qLen <= 4 ? 15 : 10; // short queries → search deeper
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
        const combinedScore = 1.0 + (maxScore * 0.1);
        return { doc, score: combinedScore, originalScore: maxScore, keywordBoost, recencyBoost, normalizedKeyword: 1.0 };
      }
      
      // Normalize keyword score to 0-1 range
      const normalizedKeyword = Math.min(keywordBoost / 50, 1);
      
      // Give more weight to similarity when it's decent, but boost with keywords when similarity is low
      const similarityWeight = maxScore > 0.2 ? 0.6 : 0.3;
      const keywordWeight = maxScore > 0.2 ? 0.3 : 0.6;
      const recencyWeight = 0.1;
      
      const combinedScore = maxScore * similarityWeight + normalizedKeyword * keywordWeight + recencyBoost * recencyWeight;
      
      return { doc, score: combinedScore, originalScore: maxScore, keywordBoost, recencyBoost, normalizedKeyword };
    }).sort((a, b) => b.score - a.score);

    // Final selection: top 3 after reranking
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
      // Fallback response without AI
      return NextResponse.json({
        message: `You asked: "${message}"\n\nBased on documents:\n${scored.map(({ doc }) => {
          const snippets = extractSnippets(message, doc.title || '', doc.content || '', 2);
          return `- ${doc.title}:\n  - ${snippets.join('\n  - ')}`;
        }).join('\n')}`,
        references: scored.map(x => ({ _id: x.doc._id, title: x.doc.title }))
      });
    }

    // TODO: Implement streaming response with Groq
    // For now, return a simple response
    return NextResponse.json({
      message: `You asked: "${message}"\n\nBased on documents:\n${scored.map(({ doc }) => {
        const snippets = extractSnippets(message, doc.title || '', doc.content || '', 2);
        return `- ${doc.title}:\n  - ${snippets.join('\n  - ')}`;
      }).join('\n')}`,
      references: scored.map(x => ({ _id: x.doc._id, title: x.doc.title }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.error("Chat error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
