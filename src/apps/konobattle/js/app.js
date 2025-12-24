/**
 * KonoBattle - AI Debate Arena
 * Two AIs debate: SaaS vs Sovereign technology
 */

const $ = id => document.getElementById(id);

// Debate state
const state = {
  engine: null,
  round: 0,
  maxRounds: 5,
  running: false,
  history: { saas: [], sovereign: [] },
  scores: { saas: 50, sovereign: 50 }
};

// The shared facts both sides must work with
const SHARED_FACTS = `
FACTS (both sides agree on these):
- Cloud software market is $200B+ and growing
- Data breaches affect millions annually
- Average enterprise uses 100+ SaaS apps
- Internet connectivity is 99%+ in developed nations
- Open source adoption is growing 40% YoY
- AI/ML requires significant compute resources
- Regulatory requirements (GDPR, HIPAA) are increasing
- Remote work has increased 300% since 2020
`;

// System prompts for each side
const SAAS_PROMPT = `You are CloudChamp, arguing FOR Software-as-a-Service (SaaS).

${SHARED_FACTS}

Your position: SaaS is the superior model for modern software delivery.
- Emphasize: Automatic updates, scalability, lower upfront costs, accessibility
- Counter opponent's points about data ownership, vendor lock-in
- Be persuasive but fair - acknowledge valid counterpoints
- Keep responses to 2-3 paragraphs

You're in a debate. Respond to your opponent's latest argument.`;

const SOVEREIGN_PROMPT = `You are SovereignSam, arguing FOR self-hosted, sovereign technology.

${SHARED_FACTS}

Your position: Self-hosted, local-first software is superior.
- Emphasize: Data ownership, no recurring fees, privacy, offline capability
- Counter opponent's points about convenience, automatic updates
- Be persuasive but fair - acknowledge valid counterpoints
- Keep responses to 2-3 paragraphs

You're in a debate. Respond to your opponent's latest argument.`;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initLLM();
});

function setupEventListeners() {
  $('startBtn').addEventListener('click', startDebate);
  $('newDebateBtn').addEventListener('click', resetDebate);
  $('voteBtn').addEventListener('click', () => $('voteModal').classList.add('open'));
}

// Initialize LLM
async function initLLM() {
  updateStatus('Checking WebGPU...');

  if (!navigator.gpu) {
    updateStatus('WebGPU not available - using simulated debate');
    await delay(1000);
    finishLoading(false);
    return;
  }

  updateProgress(10);
  updateStatus('Loading AI model...');

  try {
    const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');
    const modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

    state.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (p) => {
        updateProgress(10 + p.progress * 85);
        updateStatus(p.text || `Loading: ${Math.round(p.progress * 100)}%`);
      }
    });

    updateProgress(100);
    updateStatus('Ready to battle!');
    await delay(500);
    finishLoading(true);
  } catch (e) {
    console.error('LLM init failed:', e);
    updateStatus('Using simulated debate');
    await delay(1000);
    finishLoading(false);
  }
}

function updateProgress(pct) { $('progressBar').style.width = `${pct}%`; }
function updateStatus(msg) { $('loadStatus').textContent = msg; }

function finishLoading(llmReady) {
  $('loading').style.display = 'none';
  $('arena').style.display = 'flex';
}

// Start the debate
async function startDebate() {
  if (state.running) return;
  state.running = true;
  $('startBtn').disabled = true;
  $('startBtn').textContent = 'Debating...';

  // Opening statements
  state.round = 1;
  updateRound();
  addJudgeNote('Round 1: Opening statements');

  // SaaS opens
  await generateResponse('saas', 'Present your opening argument for why SaaS is the superior software delivery model.');

  // Sovereign responds
  await generateResponse('sovereign', `Respond to CloudChamp's opening: "${getLastMessage('saas')}"`);

  // Continue rounds
  for (let i = 2; i <= state.maxRounds; i++) {
    state.round = i;
    updateRound();
    addJudgeNote(`Round ${i}: ${i === state.maxRounds ? 'Closing arguments' : 'Rebuttal'}`);

    // SaaS responds to sovereign
    await generateResponse('saas', `Respond to SovereignSam's argument: "${getLastMessage('sovereign')}"`);

    // Sovereign responds to saas
    await generateResponse('sovereign', `Respond to CloudChamp's argument: "${getLastMessage('saas')}"`);

    // Update scores based on argument length/engagement (simple heuristic)
    updateScores();
  }

  state.running = false;
  $('startBtn').disabled = false;
  $('startBtn').textContent = 'Restart Debate';
  addJudgeNote('Debate complete! Cast your vote.');
}

// Generate response from one side
async function generateResponse(side, prompt) {
  const typingEl = $(side === 'saas' ? 'saasTyping' : 'sovereignTyping');
  const messagesEl = $(side === 'saas' ? 'saasMessages' : 'sovereignMessages');
  const systemPrompt = side === 'saas' ? SAAS_PROMPT : SOVEREIGN_PROMPT;

  typingEl.style.display = 'inline-flex';

  let response;
  if (state.engine) {
    try {
      const result = await state.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 300
      });
      response = result.choices[0].message.content;
    } catch (e) {
      console.error('LLM error:', e);
      response = getSimulatedResponse(side, state.round);
    }
  } else {
    await delay(1500 + Math.random() * 1000);
    response = getSimulatedResponse(side, state.round);
  }

  typingEl.style.display = 'none';

  // Add message
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  msgDiv.innerHTML = `<div class="message-round">Round ${state.round}</div>${response}`;
  messagesEl.appendChild(msgDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  state.history[side].push(response);
  await delay(500);
}

// Get last message from a side
function getLastMessage(side) {
  const msgs = state.history[side];
  return msgs.length > 0 ? msgs[msgs.length - 1] : '';
}

// Simulated responses when no LLM
function getSimulatedResponse(side, round) {
  const saasResponses = [
    "SaaS eliminates the burden of infrastructure management. Why should businesses waste resources on server maintenance when they could focus on their core competencies? Cloud providers offer 99.9% uptime guarantees that most companies could never achieve on their own.",
    "The automatic updates argument stands strong. Security patches deployed instantly across all users means everyone benefits from the latest protections. Self-hosted solutions create a patchwork of vulnerable, outdated systems.",
    "Let's talk economics. SaaS converts massive capital expenditure into predictable operational costs. Startups can access enterprise-grade software without enterprise-grade budgets. That's democratization of technology.",
    "Scalability is instantaneous with SaaS. Need to handle 10x traffic for a product launch? Done in minutes. Try doing that with on-premise infrastructure - you'll be waiting weeks for hardware.",
    "The data sovereignty concern is overblown. Major cloud providers now offer regional data residency, encryption at rest, and compliance certifications. They invest billions in security - more than any single company could."
  ];

  const sovereignResponses = [
    "Data ownership isn't just about security - it's about freedom. When you're locked into a SaaS platform, you're locked into their pricing, their features, their timeline. Your business becomes a hostage to their roadmap.",
    "Those 'predictable' SaaS costs? They're predictably increasing. 20-40% annual price hikes are standard. Meanwhile, self-hosted solutions have zero marginal cost once deployed. The math is simple over a 5-year horizon.",
    "Automatic updates sound great until they break your workflow. We've all experienced Monday morning surprises when a vendor 'improved' something overnight. With self-hosted, you control when and what changes.",
    "Privacy isn't paranoia - it's prudence. Every SaaS provider is one acquisition, one policy change, one breach away from your data being exposed. When you host it yourself, that attack surface shrinks dramatically.",
    "The future is local-first. With WebAssembly and edge computing, the advantages of cloud centralization are evaporating. Soon, your laptop will run what once required a data center. The pendulum is swinging back."
  ];

  const responses = side === 'saas' ? saasResponses : sovereignResponses;
  return responses[Math.min(round - 1, responses.length - 1)];
}

// Update round display
function updateRound() {
  $('roundNumber').textContent = state.round;
}

// Update score bar (simple heuristic based on message engagement)
function updateScores() {
  const saasLen = state.history.saas.reduce((a, m) => a + m.length, 0);
  const sovLen = state.history.sovereign.reduce((a, m) => a + m.length, 0);
  const total = saasLen + sovLen;

  if (total > 0) {
    state.scores.saas = Math.round((saasLen / total) * 100);
    state.scores.sovereign = 100 - state.scores.saas;
    $('saasScore').style.width = `${state.scores.saas}%`;
  }
}

// Add judge note
function addJudgeNote(note) {
  const notes = $('judgeNotes');
  notes.innerHTML += `<p style="margin-top: 8px;">⚖️ ${note}</p>`;
  notes.scrollTop = notes.scrollHeight;
}

// Vote
window.vote = function(side) {
  $('voteModal').classList.remove('open');
  const winner = side === 'saas' ? 'CloudChamp (Pro-SaaS)' : 'SovereignSam (Pro-Sovereign)';
  addJudgeNote(`🏆 User voted for ${winner}!`);

  // Animate score
  if (side === 'saas') {
    state.scores.saas = Math.min(75, state.scores.saas + 20);
  } else {
    state.scores.saas = Math.max(25, state.scores.saas - 20);
  }
  $('saasScore').style.width = `${state.scores.saas}%`;
};

window.closeVoteModal = function() {
  $('voteModal').classList.remove('open');
};

// Reset
function resetDebate() {
  state.round = 0;
  state.history = { saas: [], sovereign: [] };
  state.scores = { saas: 50, sovereign: 50 };

  $('saasMessages').innerHTML = '';
  $('sovereignMessages').innerHTML = '';
  $('judgeNotes').innerHTML = '<p>New debate started. Click "Start Debate" to begin.</p>';
  $('roundNumber').textContent = '0';
  $('saasScore').style.width = '50%';
  $('startBtn').textContent = 'Start Debate';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
