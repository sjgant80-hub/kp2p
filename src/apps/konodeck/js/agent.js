/**
 * KonoDeck - Slide Agent (Simplified)
 * Uses external templates for deck generation
 */

import { getSlidesFromTemplate } from './templates/index.js';

const SYSTEM_PROMPT = `You are KonoDeck. BRAND: "NO SAAS UP YOUR ASS" | 🚂🥲🥰
Respond with JSON: {"slides": [{"style": "hero|bullets|comparison|stats|cta", "title": "", "content": ""}], "message": ""}`;

export class SlideAgent {
  constructor(engine = null) {
    this.engine = engine;
    this.context = { audience: null };
  }

  setEngine(engine) { this.engine = engine; }

  detectAudience(input) {
    const l = input.toLowerCase();
    if (l.match(/developer|engineer|code/)) this.context.audience = 'developers';
    else if (l.match(/executive|ceo|cto|business/)) this.context.audience = 'executives';
    else if (l.match(/investor|vc|fund/)) this.context.audience = 'investors';
    return this.context.audience;
  }

  async generate(userInput = '') {
    if (userInput) this.detectAudience(userInput);
    const templateId = this.context.audience || 'general';

    if (this.engine && userInput) {
      try { return await this.callLLM(userInput); }
      catch (e) { console.error('LLM failed:', e); }
    }

    const slides = await getSlidesFromTemplate(templateId);
    return { success: true, slides: slides || [], message: `Generated ${templateId} deck` };
  }

  async regenerate(slideIndex, options = {}) {
    const variations = [
      { style: 'hero', title: '🚂 The Future is Local', content: 'Your data. Your rules.' },
      { style: 'hero', title: '🔥 Break Free', content: 'No more monthly fees.' },
      { style: 'bullets', title: 'Why P2P Wins', content: ['No middleman', 'No fees', 'No tracking'] },
      { style: 'stats', stats: [{ value: '100%', label: 'Privacy' }, { value: '$0', label: 'Monthly' }] }
    ];
    const slide = variations[Math.floor(Math.random() * variations.length)];
    if (options.style) slide.style = options.style;
    return { success: true, slideIndex, slide, message: 'Regenerated' };
  }

  async callLLM(prompt) {
    const resp = await this.engine.chat.completions.create({
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      temperature: 0.7, max_tokens: 1500
    });
    return this.parseResponse(resp.choices[0].message.content);
  }

  parseResponse(content) {
    try {
      const match = content.match(/```json?\s*([\s\S]*?)\s*```/);
      const parsed = JSON.parse(match ? match[1] : content);
      return { success: true, slides: parsed.slides || [], message: parsed.message || 'Updated' };
    } catch (e) { return { success: false, slides: [], error: 'Parse failed' }; }
  }
}

export const slideAgent = new SlideAgent();
