// Tunable constants for the retrieval relevance gate, answer cache, input
// validation, and rate limiting. Values marked "NEEDS YOUR OWN TESTING" are
// reasonable starting points, not calibrated numbers — they were chosen
// without live API access and should be adjusted once you can observe real
// retrieval results.

// --- Retrieval / relevance gate ---
// pgvector's `<=>` cosine distance ranges 0-2: 0 = identical direction,
// 1 = orthogonal/unrelated, 2 = opposite direction. Retrieval widens the
// search to CANDIDATE_POOL_SIZE, drops anything past the distance threshold,
// then caps what's left to FINAL_TOP_N before it's handed to the LLM.
export const CANDIDATE_POOL_SIZE = 10;
export const FINAL_TOP_N = 5;
// Calibrated against the live knowledge base (41 chunks): a genuinely
// relevant question ("How do levboots work?") clustered at 0.29-0.31
// distance; unrelated questions ("chocolate chip cookie recipe", "capital
// of France") clustered at 0.54-0.57. 0.45 sits in the middle of that gap
// with margin on both sides. Re-check this if the knowledge base content
// changes substantially or you see it misfire on your own testing — lower
// = stricter (more "I do not know"), higher = more lenient (more recall,
// more risk of borderline context reaching the LLM).
export const SIMILARITY_DISTANCE_THRESHOLD = 0.45;

// --- Answer cache (in-process, cleared on restart) ---
export const ANSWER_CACHE_MAX_SIZE = 200;

// --- Input validation ---
export const MAX_QUESTION_LENGTH = 2000; // characters

// --- Rate limiting (per source IP) ---
// NEEDS YOUR OWN TESTING: tune to your expected traffic.
export const ASK_RATE_LIMIT = { windowMs: 60_000, max: 20 };
// /load_data re-ingests everything and is unauthenticated, so it gets a much
// stricter allowance than /ask.
export const LOAD_DATA_RATE_LIMIT = { windowMs: 5 * 60_000, max: 2 };
