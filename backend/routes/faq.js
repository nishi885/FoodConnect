const express = require('express');
const router = express.Router();

const fetchFn = (...args) => fetch(...args);

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60;

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

function normalizeQuestion(question) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getLocalAnswer(question) {
  const normalized = normalizeQuestion(question);
  if (cannedAnswers[normalized]) {
    return cannedAnswers[normalized];
  }

  if (
    normalized.includes('first donation') ||
    normalized.includes('make donation') ||
    normalized.includes('donate food') ||
    normalized.includes('start donating') ||
    normalized.includes('create donation')
  ) {
    return cannedAnswers['how do i donate?'];
  }

  if (
    normalized.includes('pickup') &&
    (normalized.includes('schedule') || normalized.includes('time') || normalized.includes('when'))
  ) {
    return cannedAnswers['can i schedule a pickup?'];
  }

  if (
    normalized.includes('sign up') ||
    normalized.includes('signup') ||
    normalized.includes('register') ||
    normalized.includes('create account')
  ) {
    return cannedAnswers['how do i sign up?'];
  }

  if (normalized.includes('status') || normalized.includes('statuses')) {
    return cannedAnswers['what do statuses mean?'];
  }

  if (normalized.includes('agent') && (normalized.includes('match') || normalized.includes('assign'))) {
    return cannedAnswers['how are agents matched to donations?'];
  }

  return null;
}

function getKnowledgeBaseText(role) {
  const common = [
    'FoodConnect connects surplus food donors with collection agents and admins so usable food can reach people in need.',
    'Donors create donation requests with food details, pickup address, quantity, and preferred timing.',
    'Admins approve or reject donations, assign agents, monitor statuses, and can reassign if needed.',
    'Agents can accept assigned pickups, reject if unavailable, and mark donations as collected after pickup.',
    'Donation statuses include Pending, Assigned, Accepted, Rejected, and Collected.'
  ];
  const roleTips = {
    donor: [
      'For donors, the Donate page is used to submit a new donation.',
      'Donors can track pending and previous donations from their dashboard.'
    ],
    agent: [
      'For agents, pending collections show assigned pickup work.',
      'Agents should accept only pickups they can complete and reject unavailable assignments quickly.'
    ],
    admin: [
      'For admins, pending donations are reviewed before assignment.',
      'Admins can view agent lists, donation history, and assignment workflows.'
    ],
    guest: [
      'Guests should sign up or log in to donate food or manage pickup work.'
    ]
  };

  return common.concat(roleTips[role] || roleTips.guest).join('\n');
}

function buildPrompt(question, role) {
  return [
    'You are the FoodConnect FAQ assistant.',
    'Answer only about this FoodConnect food donation management app.',
    'Keep the answer friendly, clear, and under 3 short sentences.',
    'If the question needs private account details, tell the user to log in or contact the admin.',
    '',
    `User role: ${role || 'guest'}`,
    'App facts:',
    getKnowledgeBaseText(role || 'guest'),
    '',
    `Question: ${question}`,
    'Answer:'
  ].join('\n');
}

function extractHuggingFaceAnswer(data, prompt) {
  let answer = '';

  if (data?.choices?.[0]?.message?.content) {
    answer = data.choices[0].message.content;
  } else if (Array.isArray(data) && data.length) {
    answer = data[0].generated_text || data[0].summary_text || data[0].answer || '';
  } else if (data && typeof data === 'object') {
    answer = data.generated_text || data.summary_text || data.answer || '';
  } else if (typeof data === 'string') {
    answer = data;
  }

  answer = String(answer || '').trim();
  if (prompt && answer.startsWith(prompt)) {
    answer = answer.slice(prompt.length).trim();
  }

  return answer
    .replace(/^answer:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const cannedAnswers = {
  'what is foodconnect?': 'FoodConnect matches surplus food donations with collectors and organizations to reduce waste and feed people in need.',
  'how do i sign up?': 'Use the signup page to create an account as a donor, agent, or admin; verify via email to complete registration.',
  'how do i donate?': 'Go to the Donate page, fill out details, and choose pickup preferences.',
  'can i schedule a pickup?': 'Yes, provide preferred times when creating the donation and the system will try to match an agent.',
  'what do statuses mean?': 'Pending means the donation is waiting for review. Assigned means an agent was selected, Accepted means the agent confirmed, Rejected means it needs another action, and Collected means pickup is complete.',
  'what does assigned mean?': 'Assigned means an agent has been selected for the donation, but the pickup may still need the agent to accept it.',
  'what does accepted mean?': 'Accepted means the assigned agent confirmed they will collect the donation.',
  'what does rejected mean?': 'Rejected means the current assignment or request was declined, so an admin or the system can take the next action.',
  'what does collected mean?': 'Collected means the agent has picked up the donation and completed the collection process.',
  'how long until pickup?': 'Pickup timing depends on agent availability, distance, and the preferred time shared by the donor.',
  'can i cancel or reschedule my donation?': 'If the donation has not already been collected, check your dashboard for available actions or contact the admin for help.',
  'how do i accept an assignment?': 'Open the assigned collection from your agent dashboard and choose Accept to confirm that you can pick it up.',
  'what if i cannot pick up?': 'Reject the assignment from your dashboard as soon as possible so an admin can assign another agent.',
  'how are agents matched to donations?': 'Agents are matched based on proximity, availability, and workload; admins can also assign manually.',
  'how do i mark a donation as collected?': 'Open the accepted assignment in your agent dashboard and mark it as collected after pickup is complete.',
  'how do i assign agents?': 'From the admin dashboard, open a pending or approved donation and assign an available agent.',
  'how do i monitor collections?': 'Use the admin dashboard and donation history pages to track statuses, assignments, and completed collections.',
  'what happens when an agent rejects an assignment?': 'The donation can be reassigned to another available agent by the admin or matching workflow.',
  'can i reassign a donation?': 'Yes, admins can reassign a donation when the current agent rejects it or cannot complete the pickup.'
};

router.post('/api/faq', async (req, res) => {
  try {
    const { question, role } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const normalizedRole = String(role || 'guest').toLowerCase();
    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${normalizedRole}::${normalizedQuestion}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ answer: cached.answer, source: cached.source });
    }

    const localAnswer = getLocalAnswer(question);
    if (localAnswer) {
      setCached(cacheKey, localAnswer, 'knowledge-base');
      return res.json({ answer: localAnswer, source: 'knowledge-base' });
    }

    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_TOKEN;
    const hfModel = process.env.HUGGINGFACE_MODEL || process.env.HF_MODEL || 'google/flan-t5-base';
    let hfError = null;

    if (hfKey) {
      try {
        const prompt = buildPrompt(question.trim(), normalizedRole);
        const baseUrl = (process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1/chat/completions').replace(/\/$/, '');
        const isChatEndpoint = baseUrl.endsWith('/chat/completions');
        const modelPath = hfModel.split('/').map(encodeURIComponent).join('/');
        const url = isChatEndpoint ? baseUrl : `${baseUrl}/${modelPath}`;
        const body = isChatEndpoint
          ? {
              model: hfModel,
              messages: [
                { role: 'system', content: 'You are the FoodConnect FAQ assistant. Keep answers friendly, accurate, and under 3 short sentences.' },
                { role: 'user', content: prompt }
              ],
              max_tokens: 120,
              temperature: 0.4
            }
          : {
              inputs: prompt,
              options: { wait_for_model: true },
              parameters: {
                max_new_tokens: 120,
                return_full_text: false,
                temperature: 0.4
              }
            };

        const resp = await fetchFn(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const text = await resp.text();
          hfError = `HuggingFace error ${resp.status}: ${text}`;
          console.error(hfError);
        } else {
          const data = await resp.json();
          const final = extractHuggingFaceAnswer(data, prompt);

          if (final) {
            setCached(cacheKey, final, 'huggingface');
            return res.json({ answer: final, source: 'huggingface' });
          }

          hfError = 'HuggingFace returned an empty answer';
          console.error(hfError);
        }
      } catch (hfErr) {
        hfError = hfErr?.message || String(hfErr);
        console.error('HuggingFace fetch failed:', hfError);
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      const fallback = hfError
        ? 'I could not connect to Hugging Face right now. FoodConnect can still help with donation requests, agent assignments, pickup tracking, and collection history.'
        : 'FoodConnect can help with donation requests, agent assignments, pickup tracking, and collection history. For account-specific details, log in or contact the admin.';
      return res.json({ answer: fallback, source: 'fallback' });
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = 'You are FoodConnect assistant. Answer user questions concisely and helpfully. Keep responses short and avoid hallucination. If the question requires account-specific details, ask the user to sign in or contact support.';
    const roleHint = normalizedRole ? `User role: ${normalizedRole}. Use that context when relevant.` : '';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: roleHint },
      { role: 'user', content: question }
    ];

    try {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 300
      });
      const final = (completion?.choices?.[0]?.message?.content || '').trim();
      if (final) {
        setCached(cacheKey, final, 'ai');
      }
      return res.json({ answer: final || 'I could not generate an answer right now.', source: final ? 'ai' : 'fallback' });
    } catch (e) {
      console.error('OpenAI fallback error:', e?.message || e);
      const fallback = 'I could not generate an AI answer right now. Please use the dashboard pages for donation, assignment, and collection help.';
      return res.json({ answer: fallback, source: 'fallback' });
    }
  } catch (err) {
    console.error('FAQ LLM error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

module.exports = router;
