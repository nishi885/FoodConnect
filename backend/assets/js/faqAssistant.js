document.addEventListener('DOMContentLoaded', function () {
  const container = document.getElementById('faq-assistant');
  if (!container) return;

  const role = (container.getAttribute('data-role') || 'guest').toLowerCase();
  const toggle = document.getElementById('faq-toggle');
  const panel = document.getElementById('faq-panel');
  const closeBtn = document.getElementById('faq-close');
  const suggestionsEl = document.getElementById('faq-suggestions');
  const chatEl = document.getElementById('faq-chat');
  const input = document.getElementById('faq-input');
  const send = document.getElementById('faq-send');

  const suggestionsMap = {
    guest: [
      'What is FoodConnect?',
      'How do I sign up?',
      'What do statuses mean?'
    ],
    donor: [
      'How do I donate?',
      'Can I schedule a pickup?',
      'What does Assigned mean?',
      'What does Accepted mean?',
      'What does Collected mean?',
      'How long until pickup?',
      'Can I cancel or reschedule my donation?'
    ],
    agent: [
      'How do I accept an assignment?',
      'What if I cannot pick up?',
      'What does Collected mean?',
      'How are agents matched to donations?',
      'How do I mark a donation as collected?'
    ],
    admin: [
      'How do I assign agents?',
      'How do I monitor collections?',
      'What happens when an agent rejects an assignment?',
      'Can I reassign a donation?'
    ]
  };

  const answers = {
    'What is FoodConnect?': 'FoodConnect matches surplus food donations with collectors and organizations to reduce waste and feed people in need.',
    'How do I sign up?': 'Use the signup page to create an account as a donor, agent, or admin, get verification email.Enter OTP and you are registered.',
    'What do statuses mean?': 'Assigned: an agent was assigned. Accepted: agent confirmed. Rejected: system declined. Collected: pickup completed. Pending: awaiting action.',
    'How do I donate?': 'Go to the Donate page, fill out details, and choose pickup preferences.',
    'Can I schedule a pickup?': 'Yes — provide preferred times when creating the donation and the system will try to match an agent.',
    'What does Assigned mean?': 'An agent has been assigned to pick up the donation; they may still need to accept.',
    'What does Accepted mean?': 'The assigned agent confirmed they will pick up the donation.',
    'What does Rejected mean?': 'The assigned agent declined the assignment; the system or an admin can reassign another agent.',
    'What does Collected mean?': 'The agent marked the donation as picked up and completed the collection process.',
    'How long until pickup?': 'Pickup time depends on agent availability and distance; admins/agents usually update estimated times in the dashboard.',
    'Can I cancel or reschedule my donation?': 'Yes — edit or cancel the donation from your dashboard if the UI provides that option, or contact support if not.',
    'How do I accept an assignment?': 'Open the assignment from your dashboard and click Accept to confirm pickup.',
    "What if I cannot pick up?": 'Click Reject on the assignment so it can be reassigned to another agent; notify admins if needed.',
    'How are agents matched to donations?': 'Agents are matched based on proximity, availability, and load; admins can also assign manually.',
    'How do I mark a donation as collected?': 'In your agent dashboard open the assignment and click the Collected/Complete button after pickup.',
    'How do I assign agents?': 'From the admin dashboard you can manually assign agents or use the auto-matcher.',
    'How do I monitor collections?': 'Use the admin dashboard to view statuses and recent notifications.',
    'What happens when an agent rejects an assignment?': 'The system attempts to reassign to another agent; admins can also manually reassign.'
  };

  function showPanel() {
    panel.style.display = 'flex';
    panel.setAttribute('aria-hidden', 'false');
    input.focus();
  }
  function hidePanel() {
    panel.style.display = 'none';
    panel.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', () => {
    if (panel.style.display === 'flex') hidePanel(); else showPanel();
  });
  closeBtn.addEventListener('click', hidePanel);

  // populate suggestions based on role
  const list = suggestionsMap[role] || suggestionsMap['guest'];
  list.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'faq-suggestion';
    btn.textContent = q;
    btn.addEventListener('click', () => sendQuestion(q));
    suggestionsEl.appendChild(btn);
  });

  function appendMessage(cls, text) {
    const row = document.createElement('div');
    row.className = 'faq-row';
    const b = document.createElement('div');
    b.className = 'faq-bubble ' + cls;
    b.textContent = text;
    row.appendChild(b);
    chatEl.appendChild(row);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function sendQuestion(q) {
    appendMessage('user', q);
    // simulate answer
    setTimeout(() => {
      const ans = answers[q] || 'Sorry, I don\'t have a canned answer for that. Please contact support or try another question.';
      appendMessage('bot', ans);
    }, 350);
  }

  send.addEventListener('click', () => {
    const q = input.value && input.value.trim();
    if (!q) return;
    input.value = '';
    sendQuestion(q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      send.click();
    }
  });
});
