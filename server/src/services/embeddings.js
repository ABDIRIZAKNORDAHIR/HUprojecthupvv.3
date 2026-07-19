/**
 * Athena embedding engine — local hashed semantic vectors + cosine similarity.
 * No external API required. Blends with lexical overlap for robust collision detection.
 */

const EMBED_DIM = 256;
const STOP = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one',
  'our', 'out', 'has', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who',
  'did', 'get', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with', 'from',
  'have', 'been', 'been', 'been', 'will', 'your', 'about', 'into', 'than', 'them', 'then',
  'these', 'what', 'when', 'where', 'which', 'while', 'project', 'system', 'using', 'based',
]);

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function hashToken(token) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Build a fixed-size embedding from text (TF-weighted hashed features + char n-grams). */
export function embedText(text) {
  const vec = new Float32Array(EMBED_DIM);
  const tokens = tokenize(text);
  if (!tokens.length) return vec;

  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

  for (const [token, count] of tf) {
    const weight = 1 + Math.log(count);
    const h = hashToken(token);
    const idx = h % EMBED_DIM;
    const sign = h & 1 ? 1 : -1;
    vec[idx] += sign * weight;

    // bigram boost for phrase semantics
    if (token.length >= 4) {
      for (let i = 0; i < token.length - 2; i++) {
        const gram = token.slice(i, i + 3);
        const gh = hashToken(gram);
        const gidx = gh % EMBED_DIM;
        const gsign = gh & 1 ? 1 : -1;
        vec[gidx] += gsign * 0.35 * weight;
      }
    }
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBED_DIM; i++) vec[i] /= norm;
  return vec;
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

function jaccardSimilarity(textA, textB) {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Hybrid similarity: 65% embedding cosine + 35% lexical Jaccard.
 * Returns 0..1
 */
export function semanticSimilarity(textA, textB) {
  const emb = cosineSimilarity(embedText(textA), embedText(textB));
  const jac = jaccardSimilarity(textA, textB);
  return Math.min(1, emb * 0.65 + jac * 0.35);
}
