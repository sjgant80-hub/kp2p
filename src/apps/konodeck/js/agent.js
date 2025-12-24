/**
 * KonoDeck - Slide Agent
 * Structured output agent for deck generation
 */

// Slide schema for structured responses
export const SlideSchema = {
  type: 'object',
  properties: {
    style: {
      type: 'string',
      enum: ['hero', 'bullets', 'comparison', 'stats', 'quote', 'cta']
    },
    title: { type: 'string' },
    content: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } }
      ]
    },
    // For comparison slides
    bad: { type: 'array', items: { type: 'string' } },
    good: { type: 'array', items: { type: 'string' } },
    // For stats slides
    stats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' }
        }
      }
    },
    // For CTA
    button: { type: 'string' }
  },
  required: ['style', 'title']
};

// Deck schema
export const DeckSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    audience: { type: 'string' },
    slides: { type: 'array', items: SlideSchema }
  }
};

// System prompt for structured deck generation
const SYSTEM_PROMPT = `You are KonoDeck, an anti-SaaS presentation generator. You create compelling pitch decks for KP2P - a peer-to-peer, local-first software movement.

BRAND VOICE:
- Tagline: "NO SAAS UP YOUR ASS"
- Irreverent, anti-corporate, empowering
- Emojis: 🚂🥲🥰 are our brand marks
- Focus: Data ownership, no subscriptions, offline-first, freedom

ALWAYS respond with valid JSON matching this schema:
{
  "action": "generate" | "adjust" | "regenerate",
  "slides": [
    {
      "style": "hero" | "bullets" | "comparison" | "stats" | "quote" | "cta",
      "title": "string",
      "content": "string" | ["bullet1", "bullet2"],
      "bad": ["for comparison - SaaS downsides"],
      "good": ["for comparison - P2P benefits"],
      "stats": [{"value": "100%", "label": "Data Ownership"}],
      "button": "CTA button text"
    }
  ],
  "message": "Brief message to user about what was generated/changed"
}

SLIDE TYPES:
- hero: Big title + subtitle, gradient background
- bullets: Title + bullet points (3-5 items)
- comparison: Side-by-side SaaS vs P2P
- stats: 3 big numbers with labels
- quote: Customer quote or manifesto statement
- cta: Call to action with button

STANDARD DECK FLOW:
1. Hero: Hook/Title
2. Problem: Pain points (bullets)
3. Comparison: SaaS vs P2P
4. Solution: What we offer (bullets)
5. Demo/Proof: This runs locally!
6. Stats: Impact numbers
7. CTA: Join the movement

Customize based on audience:
- Developers: Technical freedom, no API limits, self-host
- Executives: Cost savings, data sovereignty, no vendor lock-in
- Investors: Market opportunity, community growth, disruption potential`;

// Agent class
export class SlideAgent {
  constructor(engine = null) {
    this.engine = engine;
    this.context = {
      audience: null,
      industry: null,
      painPoints: [],
      features: []
    };
  }

  // Set the LLM engine
  setEngine(engine) {
    this.engine = engine;
  }

  // Detect context from user input
  detectContext(input) {
    const lower = input.toLowerCase();

    // Audience detection
    if (lower.includes('developer') || lower.includes('engineer') || lower.includes('tech')) {
      this.context.audience = 'developers';
    } else if (lower.includes('executive') || lower.includes('ceo') || lower.includes('cto') || lower.includes('business')) {
      this.context.audience = 'executives';
    } else if (lower.includes('investor') || lower.includes('vc') || lower.includes('funding')) {
      this.context.audience = 'investors';
    } else if (lower.includes('startup') || lower.includes('founder')) {
      this.context.audience = 'founders';
    }

    // Industry detection
    const industries = ['healthcare', 'finance', 'education', 'retail', 'manufacturing', 'saas', 'enterprise'];
    for (const ind of industries) {
      if (lower.includes(ind)) {
        this.context.industry = ind;
        break;
      }
    }

    return this.context;
  }

  // Generate deck with LLM
  async generate(userInput = '') {
    this.detectContext(userInput);

    const prompt = userInput
      ? `Generate a complete KP2P pitch deck for: ${userInput}`
      : `Generate a complete KP2P anti-SaaS pitch deck. Audience: ${this.context.audience || 'general tech audience'}`;

    if (this.engine) {
      return await this.callLLM(prompt);
    } else {
      return this.generateFromTemplates();
    }
  }

  // Adjust specific slide
  async adjust(slideIndex, instruction) {
    const prompt = `Adjust slide ${slideIndex + 1}: ${instruction}. Return ONLY the modified slide as JSON.`;

    if (this.engine) {
      return await this.callLLM(prompt, 'adjust');
    } else {
      return this.adjustFromTemplate(slideIndex, instruction);
    }
  }

  // Regenerate slide with changes
  async regenerate(slideIndex, changes = {}) {
    const prompt = `Regenerate slide ${slideIndex + 1} with a fresh take. ${
      changes.style ? `Use style: ${changes.style}.` : ''
    } ${changes.focus ? `Focus on: ${changes.focus}.` : ''} Return ONLY the new slide as JSON.`;

    if (this.engine) {
      return await this.callLLM(prompt, 'regenerate');
    } else {
      return this.regenerateFromTemplate(slideIndex, changes);
    }
  }

  // Call the LLM
  async callLLM(userPrompt, action = 'generate') {
    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      return this.parseResponse(content);

    } catch (e) {
      console.error('LLM call failed:', e);
      return this.generateFromTemplates();
    }
  }

  // Parse LLM response
  parseResponse(content) {
    try {
      // Extract JSON from response
      let json = content;

      // Handle markdown code blocks
      const jsonMatch = content.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        json = jsonMatch[1];
      }

      const parsed = JSON.parse(json);

      // Validate slides
      if (parsed.slides && Array.isArray(parsed.slides)) {
        parsed.slides = parsed.slides.map(slide => this.validateSlide(slide));
      }

      return {
        success: true,
        ...parsed
      };

    } catch (e) {
      console.error('Parse error:', e);
      return {
        success: false,
        error: 'Failed to parse response',
        fallback: this.generateFromTemplates()
      };
    }
  }

  // Validate slide structure
  validateSlide(slide) {
    const validStyles = ['hero', 'bullets', 'comparison', 'stats', 'quote', 'cta'];

    return {
      style: validStyles.includes(slide.style) ? slide.style : 'bullets',
      title: slide.title || 'Untitled',
      content: slide.content || '',
      bad: slide.bad || [],
      good: slide.good || [],
      stats: slide.stats || [],
      button: slide.button || 'Get Started'
    };
  }

  // Template-based generation (fallback)
  generateFromTemplates() {
    const audience = this.context.audience || 'general';

    const decks = {
      developers: [
        { style: 'hero', title: '🚂 KP2P', content: 'Code Free. Run Free. No SaaS BS.' },
        { style: 'bullets', title: 'Developer Pain Points', content: [
          'API rate limits throttling your app',
          'Vendor SDKs with breaking changes',
          'No source code access',
          'Forced migrations and deprecations',
          'Your users\' data on their servers'
        ]},
        { style: 'comparison', title: 'SaaS vs P2P',
          bad: ['API limits', 'Vendor lock-in', 'No source access', 'Their roadmap'],
          good: ['Unlimited local calls', 'Fork and modify', 'Full source code', 'Your roadmap']
        },
        { style: 'hero', title: 'This Deck Right Now', content: 'Running Llama locally in your browser. No API calls. No cloud. Your GPU.' },
        { style: 'stats', stats: [
          { value: '0', label: 'API calls needed' },
          { value: '100%', label: 'Source code access' },
          { value: '∞', label: 'Rate limit' }
        ]},
        { style: 'bullets', title: 'What You Get', content: [
          'Full source code - fork it, mod it',
          'Self-host everything',
          'P2P sync between instances',
          'Offline-first architecture',
          'Community-driven roadmap'
        ]},
        { style: 'cta', title: 'Join the Revolution', content: 'github.com/kp2p', button: 'Star the Repo' }
      ],

      executives: [
        { style: 'hero', title: '🚂 KP2P', content: 'Own Your Software. Own Your Data.' },
        { style: 'bullets', title: 'The Hidden Cost of SaaS', content: [
          '20-40% annual price increases',
          'Per-seat pricing at scale = budget killer',
          'Data egress fees add up',
          'Compliance nightmares with data residency',
          'Zero leverage in contract negotiations'
        ]},
        { style: 'comparison', title: 'SaaS vs Self-Sovereign',
          bad: ['Recurring fees forever', 'Data in their cloud', 'Vendor controls pricing', 'Exit costs'],
          good: ['One-time ownership', 'Data stays in-house', 'Predictable costs', 'No lock-in']
        },
        { style: 'stats', stats: [
          { value: '60%', label: 'Cost Reduction' },
          { value: '100%', label: 'Data Control' },
          { value: '0', label: 'Vendor Lock-in' }
        ]},
        { style: 'bullets', title: 'Enterprise Benefits', content: [
          'Complete data sovereignty',
          'Compliance-ready (GDPR, HIPAA, etc.)',
          'No surprise pricing changes',
          'Internal deployment = air-gapped security',
          'Perpetual license, not rental'
        ]},
        { style: 'cta', title: 'Take Control', content: 'Schedule a demo', button: 'Book a Call' }
      ],

      investors: [
        { style: 'hero', title: '🚂 KP2P', content: 'The Anti-SaaS Movement' },
        { style: 'bullets', title: 'Market Opportunity', content: [
          '$200B SaaS market ripe for disruption',
          'Growing "SaaS fatigue" - subscription exhaustion',
          'Enterprise demand for data sovereignty',
          'Open source adoption accelerating 40% YoY',
          'Web3 normalized decentralization'
        ]},
        { style: 'stats', stats: [
          { value: '10x', label: 'Lower CAC' },
          { value: '40%', label: 'Market Growth' },
          { value: '🚀', label: 'First Mover' }
        ]},
        { style: 'comparison', title: 'Business Model',
          bad: ['High CAC', 'Churn battles', 'Infrastructure costs', 'Support burden'],
          good: ['Community drives growth', 'No churn - they own it', 'Users host themselves', 'Community support']
        },
        { style: 'bullets', title: 'Traction', content: [
          'Growing developer community',
          'Open source contributions weekly',
          'Enterprise pilots in progress',
          'Zero customer acquisition cost',
          'Viral coefficient > 1'
        ]},
        { style: 'cta', title: 'Join the Round', content: 'Seed round open', button: 'Get the Deck' }
      ],

      general: [
        { style: 'hero', title: '🚂 KP2P', content: 'NO SAAS UP YOUR ASS' },
        { style: 'bullets', title: 'The SaaS Problem', content: [
          'Monthly subscriptions drain your wallet',
          'Your data lives on their servers',
          'They can change pricing anytime',
          'Lock-in makes switching painful',
          'Internet down? You\'re down.'
        ]},
        { style: 'comparison', title: 'SaaS vs P2P',
          bad: ['Monthly fees forever', 'Data on their servers', 'Vendor lock-in', 'Internet required'],
          good: ['Own it once', 'Your data stays yours', 'Freedom to modify', 'Works offline']
        },
        { style: 'hero', title: 'This Presentation', content: 'Is running a local AI in your browser right now. No API calls. No cloud. Just your GPU.' },
        { style: 'stats', stats: [
          { value: '$0', label: 'Monthly SaaS fees' },
          { value: '100%', label: 'Data you own' },
          { value: '∞', label: 'Offline capability' }
        ]},
        { style: 'bullets', title: 'What You Get', content: [
          'Local-first applications',
          'Peer-to-peer sync',
          'No cloud dependency',
          'Full data ownership',
          'Community-driven development'
        ]},
        { style: 'cta', title: 'Join the Revolution', content: 'github.com/kp2p', button: 'Get Started' }
      ]
    };

    return {
      success: true,
      action: 'generate',
      slides: decks[audience] || decks.general,
      message: `Generated ${audience} deck with ${(decks[audience] || decks.general).length} slides`
    };
  }

  // Adjust from template
  adjustFromTemplate(slideIndex, instruction) {
    const lower = instruction.toLowerCase();

    // Simple adjustments based on keywords
    let newSlide = null;

    if (lower.includes('more technical')) {
      newSlide = {
        style: 'bullets',
        title: 'Technical Architecture',
        content: [
          'WebRTC for peer-to-peer connections',
          'CRDTs for conflict-free sync',
          'IndexedDB for local persistence',
          'WebGPU for local AI inference',
          'Zero server infrastructure'
        ]
      };
    } else if (lower.includes('more stats') || lower.includes('numbers')) {
      newSlide = {
        style: 'stats',
        stats: [
          { value: '99.9%', label: 'Uptime (your machine)' },
          { value: '<10ms', label: 'Latency (local)' },
          { value: '0', label: 'Monthly cost' }
        ]
      };
    } else if (lower.includes('stronger') || lower.includes('bolder')) {
      newSlide = {
        style: 'hero',
        title: '🔥 ENOUGH.',
        content: 'Stop renting software. Start owning it.'
      };
    }

    return {
      success: true,
      action: 'adjust',
      slideIndex,
      slide: newSlide || { style: 'bullets', title: 'Adjusted Slide', content: ['Updated based on your feedback'] },
      message: 'Slide adjusted'
    };
  }

  // Regenerate from template
  regenerateFromTemplate(slideIndex, changes) {
    const styles = ['hero', 'bullets', 'comparison', 'stats', 'cta'];
    const style = changes.style || styles[Math.floor(Math.random() * styles.length)];

    const variations = {
      hero: [
        { title: '🚂 The Future is Local', content: 'Your data. Your rules. Your infrastructure.' },
        { title: '🔥 Break Free', content: 'From monthly fees. From vendor lock-in. From the cloud.' },
        { title: '💪 Take Back Control', content: 'P2P software that respects you.' }
      ],
      bullets: [
        { title: 'Why P2P Wins', content: ['No middleman', 'No monthly fees', 'No data harvesting', 'No internet required', 'No permission needed'] },
        { title: 'The Revolution', content: ['Own your tools', 'Control your data', 'Modify freely', 'Share directly', 'Work offline'] }
      ],
      stats: [
        { stats: [{ value: '100%', label: 'Privacy' }, { value: '0', label: 'Tracking' }, { value: '∞', label: 'Freedom' }] },
        { stats: [{ value: '$0/mo', label: 'Forever' }, { value: '1', label: 'Time Purchase' }, { value: '👑', label: 'You Own It' }] }
      ]
    };

    const options = variations[style] || variations.hero;
    const chosen = options[Math.floor(Math.random() * options.length)];

    return {
      success: true,
      action: 'regenerate',
      slideIndex,
      slide: { style, ...chosen },
      message: `Regenerated as ${style} slide`
    };
  }
}

// Singleton export
export const slideAgent = new SlideAgent();
