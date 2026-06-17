const express = require('express');
const router = express.Router();
const fetch = global.fetch;

// simple in-memory cache with TTL
const cache = new Map(); // key -> { answer, source, expires }
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCached(key, answer, source) {
  cache.set(key, { answer, source, expires: Date.now() + CACHE_TTL_MS });
}

// canned answers fallback (kept small; mirrors frontend defaults)
const cannedAnswers = {
  'what is foodconnect?': 'FoodConnect matches surplus food donations with collectors and organizations to reduce waste and feed people in need.',
  'how do i sign up?': 'Use the signup page to create an account as a donor, agent, or admin; verify via email to complete registration.',
  'how do i donate?': 'Go to the Donate page, fill out details, and choose pickup preferences.',
  'can i schedule a pickup?': 'Yes — provide preferred times when creating the donation and the system will try to match an agent.',
  'how are agents matched to donations?': 'Agents are matched based on proximity, availability, and load; admins can also assign manually.'
};

// POST /api/faq
// body: { question: string, role?: string }
router.post('/api/faq', async (req, res) => {
  try {
    const { question, role } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required' });

    // Prefer Hugging Face Inference if key present
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    const hfModel = process.env.HUGGINGFACE_MODEL || 'gpt2';

    const cacheKey = `${role||'guest'}::${question.trim().toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ answer: cached.answer, source: cached.source });
    }

    if (hfKey) {
      try {
        const url = `https://api-inference.huggingface.co/models/${hfModel}`;
        const body = { inputs: question, options: { wait_for_model: true }, parameters: { max_new_tokens: 150 } };
        const resp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error('HuggingFace error:', resp.status, text);
          // fallback to canned answer if available
          const fallback = cannedAnswers[question.trim().toLowerCase()];
          if (fallback) {
            setCached(cacheKey, fallback, 'canned');
            return res.json({ answer: fallback, source: 'canned' });
          }
          return res.status(500).json({ error: 'HuggingFace inference failed' });
        }
        const data = await resp.json();
      // HF may return [{generated_text: '...'}] or {error: '...'} depending on model
      let answer = '';
      if (Array.isArray(data) && data.length && data[0].generated_text) answer = data[0].generated_text;
      else if (data.generated_text) answer = data.generated_text;
      else if (typeof data === 'string') answer = data;
      else if (Array.isArray(data) && data.length && typeof data[0] === 'string') answer = data[0];

        const final = (answer || '').trim();
        if (final) setCached(cacheKey, final, 'llm');
        return res.json({ answer: final, source: 'llm' });
      } catch (hfErr) {
        console.error('HuggingFace fetch failed', hfErr?.message || hfErr);
        const fallback = cannedAnswers[question.trim().toLowerCase()];
        if (fallback) {
          setCached(cacheKey, fallback, 'canned');
          return res.json({ answer: fallback, source: 'canned' });
        }
        return res.status(500).json({ error: 'HuggingFace request failed' });
      }
    }

    // Fallback to OpenAI if configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'LLM not configured (set HUGGINGFACE_API_KEY or OPENAI_API_KEY)' });
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = `You are FoodConnect assistant. Answer user questions concisely and helpfully. Keep responses short (1-3 sentences) and avoid hallucination. If the question requires account-specific details, ask the user to sign in or contact support.`;
    const roleHint = role ? `User role: ${role}. Use that context when it's relevant.` : '';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: roleHint },
      { role: 'user', content: question }
    ];

    try {
      const completion = await client.chat.completions.create({ model: 'gpt-3.5-turbo', messages, max_tokens: 300 });
      const answer = completion?.choices?.[0]?.message?.content || '';
      const final = (answer || '').trim();
      if (final) setCached(cacheKey, final, 'llm');
      return res.json({ answer: final, source: 'llm' });
    } catch (e) {
      console.error('OpenAI fallback error:', e?.message || e);
      const fallback = cannedAnswers[question.trim().toLowerCase()];
      if (fallback) {
        setCached(cacheKey, fallback, 'canned');
        return res.json({ answer: fallback, source: 'canned' });
      }
      return res.status(500).json({ error: 'Failed to generate answer' });
    }
  } catch (err) {
    console.error('FAQ LLM error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

module.exports = router;
