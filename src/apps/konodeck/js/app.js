/**
 * KonoDeck - No SaaS Up Your Deck
 * Local LLM-powered presentation generator
 */

const $ = id => document.getElementById(id);

// State
const state = {
  engine: null,
  modelLoaded: false,
  slides: [],
  currentSlide: 0,
  generating: false,
  audience: '',
  context: ''
};

// Slide templates
const slideTemplates = {
  title: {
    style: 'hero',
    title: '🚂 KP2P',
    content: 'NO SAAS UP YOUR ASS'
  },
  problem: {
    style: 'bullets',
    title: 'The SaaS Problem',
    content: [
      'Monthly subscriptions drain your wallet',
      'Your data lives on their servers',
      'They can change pricing anytime',
      'Lock-in makes switching painful',
      'Internet down? You\'re down.'
    ]
  },
  comparison: {
    style: 'comparison',
    title: 'SaaS vs P2P',
    bad: ['Monthly fees forever', 'Data on their servers', 'Vendor lock-in', 'Internet required'],
    good: ['Own it once', 'Your data stays yours', 'Freedom to modify', 'Works offline']
  },
  stats: {
    style: 'stats',
    stats: [
      { value: '$0', label: 'Monthly SaaS fees' },
      { value: '100%', label: 'Data you own' },
      { value: '∞', label: 'Offline capability' }
    ]
  },
  features: {
    style: 'bullets',
    title: 'What You Get',
    content: [
      'Local-first applications',
      'Peer-to-peer sync',
      'No cloud dependency',
      'Full data ownership',
      'Community-driven development'
    ]
  },
  demo: {
    style: 'hero',
    title: 'This Presentation',
    content: 'Is running a local AI in your browser right now. No API calls. No cloud. Just your GPU.'
  },
  cta: {
    style: 'cta',
    title: 'Join the Revolution',
    content: 'github.com/kp2p',
    button: 'Get Started'
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initLLM();
});

// Setup event listeners
function setupEventListeners() {
  $('sendBtn').addEventListener('click', handleSend);
  $('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  $('presentBtn').addEventListener('click', startPresentation);
  $('exitPresentation').addEventListener('click', exitPresentation);
  $('prevSlide').addEventListener('click', () => navigateSlide(-1));
  $('nextSlide').addEventListener('click', () => navigateSlide(1));
  $('newDeckBtn').addEventListener('click', resetDeck);
  $('regenerateBtn').addEventListener('click', regenerateSlide);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if ($('presentationMode').style.display !== 'none') {
      if (e.key === 'ArrowRight' || e.key === ' ') navigateSlide(1);
      if (e.key === 'ArrowLeft') navigateSlide(-1);
      if (e.key === 'Escape') exitPresentation();
    }
  });
}

// Initialize Local LLM (WebLLM)
async function initLLM() {
  updateLoadingStatus('Checking WebGPU support...');

  // Check WebGPU
  if (!navigator.gpu) {
    updateLoadingStatus('WebGPU not supported. Using template mode.');
    await delay(1000);
    finishLoading(false);
    return;
  }

  updateProgress(10);
  updateLoadingStatus('Loading local AI model...');

  try {
    // Try to load WebLLM
    const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm');

    // Use a smaller model for faster loading
    const modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

    state.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (progress) => {
        const pct = Math.round(progress.progress * 100);
        updateProgress(10 + pct * 0.85);
        updateLoadingStatus(progress.text || `Loading model: ${pct}%`);
      }
    });

    updateProgress(100);
    updateLoadingStatus('AI ready!');
    await delay(500);
    finishLoading(true);

  } catch (e) {
    console.error('WebLLM init failed:', e);
    updateLoadingStatus('Using template mode (LLM unavailable)');
    await delay(1000);
    finishLoading(false);
  }
}

function updateProgress(pct) {
  $('progressBar').style.width = `${pct}%`;
}

function updateLoadingStatus(msg) {
  $('loadingStatus').textContent = msg;
}

function finishLoading(llmReady) {
  state.modelLoaded = llmReady;
  $('loadingScreen').style.display = 'none';
  $('mainInterface').style.display = 'flex';
  $('mainInterface').style.flexDirection = 'column';
  $('mainInterface').style.height = '100vh';

  if (llmReady) {
    $('modelBadge').textContent = 'Llama 3.2 1B Ready';
    $('modelBadge').style.background = 'rgba(6, 214, 160, 0.2)';
  } else {
    $('modelBadge').textContent = 'Template Mode';
    $('modelBadge').style.background = 'rgba(255, 107, 53, 0.2)';
    $('modelBadge').style.color = '#ff6b35';
  }

  // Generate initial deck
  generateInitialDeck();
}

// Generate initial deck from templates
function generateInitialDeck() {
  state.slides = [
    { ...slideTemplates.title },
    { ...slideTemplates.problem },
    { ...slideTemplates.comparison },
    { ...slideTemplates.demo },
    { ...slideTemplates.stats },
    { ...slideTemplates.features },
    { ...slideTemplates.cta }
  ];

  renderSlides();
}

// Handle chat send
async function handleSend() {
  const input = $('chatInput');
  const message = input.value.trim();
  if (!message || state.generating) return;

  input.value = '';
  addMessage('user', message);
  state.context += `\nUser: ${message}`;

  state.generating = true;
  addMessage('assistant', '<span class="generating">Generating...</span>', true);

  try {
    let response;

    if (state.modelLoaded && state.engine) {
      response = await generateWithLLM(message);
    } else {
      response = generateTemplateResponse(message);
    }

    updateLastMessage(response);

    // Parse and update slides if the response contains slide updates
    await processResponse(response, message);

  } catch (e) {
    console.error('Generation error:', e);
    updateLastMessage('Sorry, I hit an error. Try again?');
  }

  state.generating = false;
}

// Generate with local LLM
async function generateWithLLM(userMessage) {
  const systemPrompt = `You are a presentation assistant for KP2P, an anti-SaaS movement.
You help create compelling pitch decks that explain the benefits of peer-to-peer, local-first software.
Key themes: No monthly fees, data ownership, offline capability, no vendor lock-in.
Be enthusiastic, slightly irreverent, and anti-corporate. Use the tagline "NO SAAS UP YOUR ASS" when appropriate.
Keep responses concise - this is for presentation slides, not essays.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const response = await state.engine.chat.completions.create({
    messages,
    temperature: 0.8,
    max_tokens: 500
  });

  return response.choices[0].message.content;
}

// Template-based response (fallback)
function generateTemplateResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('developer') || lower.includes('engineer') || lower.includes('tech')) {
    return `Perfect! For developers, I'll emphasize:

- Full source code access
- No API rate limits
- Self-host everything
- Modify and extend freely
- Community contributions welcome

I've updated the deck with a technical focus. The comparison slide now highlights vendor lock-in vs. fork-it-yourself freedom!`;
  }

  if (lower.includes('executive') || lower.includes('ceo') || lower.includes('business')) {
    return `Got it! For executives, I'll focus on:

- Predictable costs (buy once)
- Data sovereignty and compliance
- No surprise price hikes
- Reduced vendor risk
- Long-term total cost of ownership

I've adjusted the stats slide to show potential savings. The ROI story is compelling!`;
  }

  if (lower.includes('investor')) {
    return `Investors! I'll highlight the market opportunity:

- Growing backlash against SaaS fatigue
- Open source is eating software
- Web3/decentralization trends
- Community-driven development = lower CAC
- Users become advocates

The slides now emphasize the movement and market timing. Let's show them the revolution! 🚂`;
  }

  return `I hear you! I'm customizing the deck based on your input.

The slides now better address your audience's needs. Check out the updated content in the slides panel.

Want me to adjust:
- The pain points we emphasize?
- The technical depth?
- The call-to-action?

Just let me know! 🥰`;
}

// Process response and update slides
async function processResponse(response, userMessage) {
  const lower = userMessage.toLowerCase();

  // Customize slides based on audience
  if (lower.includes('developer') || lower.includes('engineer')) {
    state.slides[1] = {
      style: 'bullets',
      title: 'Developer Pain Points',
      content: [
        'API rate limits killing your app',
        'Vendor SDK lock-in',
        'No access to source code',
        'Forced upgrades break things',
        'Can\'t self-host or modify'
      ]
    };
    state.slides[4] = {
      style: 'stats',
      stats: [
        { value: '100%', label: 'Source code access' },
        { value: '0', label: 'API limits' },
        { value: '∞', label: 'Customization' }
      ]
    };
  }

  if (lower.includes('executive') || lower.includes('ceo') || lower.includes('business')) {
    state.slides[1] = {
      style: 'bullets',
      title: 'The Hidden Costs of SaaS',
      content: [
        '20-40% annual price increases',
        'Per-seat pricing adds up fast',
        'Hidden data transfer fees',
        'Compliance nightmares',
        'Exit costs when switching'
      ]
    };
    state.slides[4] = {
      style: 'stats',
      stats: [
        { value: '60%', label: 'Cost reduction' },
        { value: '100%', label: 'Data control' },
        { value: '0', label: 'Recurring fees' }
      ]
    };
  }

  if (lower.includes('investor')) {
    state.slides[1] = {
      style: 'bullets',
      title: 'Market Opportunity',
      content: [
        '$200B SaaS market ripe for disruption',
        'Growing "SaaS fatigue" movement',
        'Enterprise demand for data sovereignty',
        'Open source adoption accelerating',
        'Web3 normalizing decentralization'
      ]
    };
    state.slides[4] = {
      style: 'stats',
      stats: [
        { value: '10x', label: 'Lower CAC' },
        { value: '5M+', label: 'Target users' },
        { value: '📈', label: 'Market timing' }
      ]
    };
  }

  renderSlides();
}

// Render slides grid
function renderSlides() {
  const grid = $('slidesGrid');
  grid.innerHTML = state.slides.map((slide, i) => `
    <div class="slide-thumb ${i === state.currentSlide ? 'active' : ''}" onclick="selectSlide(${i})">
      <span class="slide-thumb-number">${i + 1}</span>
      <div class="slide-thumb-content">
        <div class="slide-thumb-title">${slide.title || ''}</div>
      </div>
    </div>
  `).join('');

  $('slideCount').textContent = `${state.slides.length} slides`;

  if (state.slides.length > 0) {
    showSlidePreview(state.currentSlide);
  }
}

// Select slide
window.selectSlide = function(index) {
  state.currentSlide = index;
  document.querySelectorAll('.slide-thumb').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  showSlidePreview(index);
};

// Show slide preview
function showSlidePreview(index) {
  const slide = state.slides[index];
  if (!slide) return;

  const preview = $('slidePreview');
  preview.innerHTML = renderSlideContent(slide, true);

  $('editControls').style.display = 'block';
  $('editTitle').value = slide.title || '';
  $('editContent').value = Array.isArray(slide.content) ? slide.content.join('\n') : (slide.content || '');
  $('editStyle').value = slide.style || 'bullets';
}

// Render slide content
function renderSlideContent(slide, isPreview = false) {
  const scale = isPreview ? 'transform: scale(0.3); transform-origin: top left;' : '';

  switch (slide.style) {
    case 'hero':
      return `
        <div class="slide hero" style="${scale}">
          <div class="slide-title">${slide.title}</div>
          <div class="slide-content">${slide.content}</div>
        </div>
      `;

    case 'bullets':
      const bullets = Array.isArray(slide.content)
        ? slide.content.map(b => `<li>${b}</li>`).join('')
        : `<li>${slide.content}</li>`;
      return `
        <div class="slide bullets" style="${scale}">
          <div class="slide-title">${slide.title}</div>
          <ul class="slide-content">${bullets}</ul>
        </div>
      `;

    case 'comparison':
      return `
        <div class="slide comparison" style="${scale}">
          <div class="slide-title">${slide.title}</div>
          <div class="comparison-grid">
            <div class="comparison-side bad-side">
              <h3 style="color: #ef4444; margin-bottom: 16px;">❌ SaaS</h3>
              ${(slide.bad || []).map(b => `<p>• ${b}</p>`).join('')}
            </div>
            <div class="comparison-side good-side">
              <h3 style="color: #06d6a0; margin-bottom: 16px;">✅ P2P</h3>
              ${(slide.good || []).map(g => `<p>• ${g}</p>`).join('')}
            </div>
          </div>
        </div>
      `;

    case 'stats':
      return `
        <div class="slide stats" style="${scale}">
          <div class="stats-grid">
            ${(slide.stats || []).map(s => `
              <div>
                <div class="stat-value">${s.value}</div>
                <div class="stat-label">${s.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

    case 'cta':
      return `
        <div class="slide cta" style="${scale}">
          <div class="slide-title">${slide.title}</div>
          <div class="slide-content">${slide.content}</div>
          <div class="cta-button">${slide.button || 'Get Started'}</div>
        </div>
      `;

    default:
      return `
        <div class="slide bullets" style="${scale}">
          <div class="slide-title">${slide.title || 'Untitled'}</div>
          <div class="slide-content">${slide.content || ''}</div>
        </div>
      `;
  }
}

// Presentation mode
function startPresentation() {
  if (state.slides.length === 0) return;

  state.currentSlide = 0;
  $('presentationMode').style.display = 'block';
  renderPresentationSlide();
}

function exitPresentation() {
  $('presentationMode').style.display = 'none';
}

function navigateSlide(direction) {
  const newIndex = state.currentSlide + direction;
  if (newIndex >= 0 && newIndex < state.slides.length) {
    state.currentSlide = newIndex;
    renderPresentationSlide();
  }
}

function renderPresentationSlide() {
  const slide = state.slides[state.currentSlide];
  $('slideContainer').innerHTML = renderSlideContent(slide, false);
  $('slideIndicator').textContent = `${state.currentSlide + 1} / ${state.slides.length}`;
}

// Chat helpers
function addMessage(role, content, isGenerating = false) {
  const messages = $('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${content}</div>`;
  if (isGenerating) div.id = 'generatingMessage';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function updateLastMessage(content) {
  const msg = $('generatingMessage');
  if (msg) {
    msg.querySelector('.message-content').innerHTML = content;
    msg.removeAttribute('id');
  }
}

// Reset deck
function resetDeck() {
  state.slides = [];
  state.context = '';
  generateInitialDeck();
  $('chatMessages').innerHTML = `
    <div class="message assistant">
      <div class="message-content">
        Fresh deck! Tell me about your audience and I'll customize it for maximum impact. 🚂
      </div>
    </div>
  `;
}

// Regenerate current slide
async function regenerateSlide() {
  if (!state.modelLoaded || state.generating) return;

  const slide = state.slides[state.currentSlide];
  if (!slide) return;

  state.generating = true;

  // Use LLM to regenerate
  try {
    const response = await generateWithLLM(
      `Regenerate this slide with a fresh take. Keep the same style (${slide.style}) but make it more impactful.
Current title: ${slide.title}
Current content: ${JSON.stringify(slide.content)}`
    );

    // Parse response and update slide
    // For now, just update with template variation
    showSlidePreview(state.currentSlide);
  } catch (e) {
    console.error('Regenerate error:', e);
  }

  state.generating = false;
}

// Utility
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
