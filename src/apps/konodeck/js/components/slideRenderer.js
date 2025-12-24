/**
 * KonoDeck - Slide Renderer Component
 */

// Render a single slide to HTML
export function renderSlide(slide) {
  switch (slide.style) {
    case 'hero':
      return `
        <div class="slide hero">
          <div class="slide-title">${slide.title}</div>
          <div class="slide-content">${slide.content || ''}</div>
        </div>
      `;

    case 'bullets':
      const bullets = Array.isArray(slide.content)
        ? slide.content.map(b => `<li>${b}</li>`).join('')
        : `<li>${slide.content}</li>`;
      return `
        <div class="slide bullets">
          <div class="slide-title">${slide.title}</div>
          <ul class="slide-content">${bullets}</ul>
        </div>
      `;

    case 'comparison':
      return `
        <div class="slide comparison">
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
        <div class="slide stats">
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

    case 'quote':
      return `
        <div class="slide quote">
          <div class="slide-content">"${slide.content}"</div>
          ${slide.author ? `<div class="slide-author">— ${slide.author}</div>` : ''}
        </div>
      `;

    case 'cta':
      return `
        <div class="slide cta">
          <div class="slide-title">${slide.title}</div>
          <div class="slide-content">${slide.content || ''}</div>
          <div class="cta-button">${slide.button || 'Get Started'}</div>
        </div>
      `;

    default:
      return `
        <div class="slide bullets">
          <div class="slide-title">${slide.title || 'Untitled'}</div>
          <div class="slide-content">${slide.content || ''}</div>
        </div>
      `;
  }
}

// Format slide content for editing
export function formatForEdit(slide) {
  if (Array.isArray(slide.content)) {
    return slide.content.join('\n');
  } else if (slide.stats) {
    return slide.stats.map(s => `${s.value} ${s.label}`).join('\n');
  } else if (slide.bad && slide.good) {
    return [...slide.bad, '---', ...slide.good].join('\n');
  }
  return slide.content || '';
}

// Parse edited content back to slide format
export function parseFromEdit(style, title, content) {
  const slide = { style, title };

  if (style === 'bullets') {
    slide.content = content.split('\n').filter(l => l.trim());
  } else if (style === 'stats') {
    const lines = content.split('\n').filter(l => l.trim());
    slide.stats = lines.map(l => {
      const [value, ...rest] = l.split(' ');
      return { value, label: rest.join(' ') };
    });
  } else if (style === 'comparison') {
    const lines = content.split('\n').filter(l => l.trim() && l !== '---');
    const mid = Math.floor(lines.length / 2);
    slide.bad = lines.slice(0, mid);
    slide.good = lines.slice(mid);
  } else {
    slide.content = content;
  }

  return slide;
}
