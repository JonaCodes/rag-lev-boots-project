import { ANSWER_CACHE_MAX_SIZE } from './ragConfig';

// In-process only (cleared on restart, not shared across instances) — this
// is a small exercise app, not a case that justifies a Redis dependency.
// Insertion order in a Map doubles as recency order, so a hand-rolled LRU
// just needs to re-insert on hit (move to the end) and evict the first key
// (the least-recently-used one) once over capacity.
const cache = new Map<string, string>();

export function normalizeCacheKey(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedAnswer(question: string): string | undefined {
  const key = normalizeCacheKey(question);
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit); // move to most-recently-used position
  }
  return hit;
}

export function setCachedAnswer(question: string, answer: string): void {
  const key = normalizeCacheKey(question);
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, answer);
  if (cache.size > ANSWER_CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
}
