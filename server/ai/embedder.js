// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Thin wrapper around Ollama /api/embed
'use strict'

const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434'
const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text'

/**
 * Returns a 768-dim float array for `text`, or null when Ollama is unavailable.
 * Never throws — callers can fire-and-forget.
 */
async function embed(text) {
  if (!text || !text.trim()) return null
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: EMBED_MODEL, input: String(text).slice(0, 4000) }),
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.embeddings?.[0] ?? null
  } catch {
    return null
  }
}

/** Cosine similarity of two equal-length float arrays. */
function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

module.exports = { embed, cosine }
