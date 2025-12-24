/**
 * KonoDeck - Template Loader
 */

// Template cache
const templates = new Map();

// Load a template by ID
export async function loadTemplate(id) {
  if (templates.has(id)) {
    return templates.get(id);
  }

  try {
    const resp = await fetch(`./js/templates/${id}.json`);
    if (!resp.ok) throw new Error(`Template not found: ${id}`);

    const template = await resp.json();
    templates.set(id, template);
    return template;
  } catch (e) {
    console.error(`Failed to load template: ${id}`, e);
    return null;
  }
}

// Get all available template IDs
export function getTemplateIds() {
  return ['general', 'developers', 'executives', 'investors'];
}

// Get template metadata (without loading full slides)
export function getTemplateList() {
  return [
    { id: 'general', name: 'General Audience', icon: '👥' },
    { id: 'developers', name: 'Developers', icon: '👨‍💻' },
    { id: 'executives', name: 'Executives', icon: '👔' },
    { id: 'investors', name: 'Investors', icon: '💰' }
  ];
}

// Clone slides from template (deep copy)
export async function getSlidesFromTemplate(id) {
  const template = await loadTemplate(id);
  if (!template) return null;

  return JSON.parse(JSON.stringify(template.slides));
}

// Save custom template to localStorage
export function saveCustomTemplate(name, slides) {
  const customs = JSON.parse(localStorage.getItem('konodeck-templates') || '{}');
  const id = `custom-${Date.now()}`;

  customs[id] = {
    id,
    name,
    description: 'Custom saved deck',
    slides,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem('konodeck-templates', JSON.stringify(customs));
  return id;
}

// Get saved custom templates
export function getCustomTemplates() {
  const customs = JSON.parse(localStorage.getItem('konodeck-templates') || '{}');
  return Object.values(customs);
}

// Delete custom template
export function deleteCustomTemplate(id) {
  const customs = JSON.parse(localStorage.getItem('konodeck-templates') || '{}');
  delete customs[id];
  localStorage.setItem('konodeck-templates', JSON.stringify(customs));
}
