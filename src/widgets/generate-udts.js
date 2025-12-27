#!/usr/bin/env node
/**
 * UDT Instance Generator
 * Reads all widget HTML files and generates corresponding UDT JSON instances
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const widgetsDir = __dirname;
const udtDir = path.join(widgetsDir, 'udt');

// Ensure udt directory exists
if (!fs.existsSync(udtDir)) {
  fs.mkdirSync(udtDir, { recursive: true });
}

// Category mappings based on widget type
const categoryMap = {
  // Industrial
  'kisa': { category: 'industrial', subcategory: 'automation', badge: 'IIoT' },
  'kopc': { category: 'industrial', subcategory: 'communication', badge: 'IIoT' },
  'kudt': { category: 'industrial', subcategory: 'data-types', badge: 'IIoT' },
  'ksql': { category: 'industrial', subcategory: 'database', badge: 'IIoT' },
  'kqtt': { category: 'industrial', subcategory: 'messaging', badge: 'IIoT' },
  'khmi': { category: 'industrial', subcategory: 'interface', badge: 'IIoT' },
  'kplc': { category: 'industrial', subcategory: 'automation', badge: 'IIoT' },
  'ktag': { category: 'industrial', subcategory: 'data', badge: 'IIoT' },

  // LLM
  'femto-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'pico-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'nano-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'micro-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'centi-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'deci-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'unity-llm': { category: 'llm', subcategory: 'inference', badge: 'AI' },
  'evgpu': { category: 'llm', subcategory: 'compute', badge: 'AI' },
  'llm-explorer': { category: 'llm', subcategory: 'visualization', badge: 'AI' },
  'llm-nlp-explorer': { category: 'llm', subcategory: 'visualization', badge: 'AI' },

  // AI
  'ai-chat': { category: 'ai', subcategory: 'chat', badge: 'AI' },
  'ai-comm': { category: 'ai', subcategory: 'communication', badge: 'AI' },
  'ai-comm-v2': { category: 'ai', subcategory: 'communication', badge: 'AI' },
  'ai-comm-v3': { category: 'ai', subcategory: 'communication', badge: 'AI' },
  'ai-fighter': { category: 'ai', subcategory: 'gaming', badge: 'AI' },
  'claude-code': { category: 'ai', subcategory: 'coding', badge: 'AI' },
  'claude-bridge': { category: 'ai', subcategory: 'bridge', badge: 'AI' },
  'widget-agent': { category: 'ai', subcategory: 'agent', badge: 'AI' },
  'konomi-kode': { category: 'ai', subcategory: 'coding', badge: 'AI' },

  // P2P
  'p2p-mesh': { category: 'utility', subcategory: 'networking', badge: 'P2P' },
  'p2p-bridge': { category: 'utility', subcategory: 'networking', badge: 'P2P' },
  'p2p-bridge-v2': { category: 'utility', subcategory: 'networking', badge: 'P2P' },
  'webtorrent-tracker': { category: 'utility', subcategory: 'networking', badge: 'P2P' },
  'presence': { category: 'utility', subcategory: 'networking', badge: 'P2P' },

  // Sales/CRM
  'crm': { category: 'sales', subcategory: 'crm', badge: 'NEW' },
  'checkout': { category: 'sales', subcategory: 'payments', badge: 'NEW' },
  'invoices': { category: 'sales', subcategory: 'billing', badge: 'NEW' },
  'waitlist': { category: 'sales', subcategory: 'leads', badge: 'NEW' },
  'donate': { category: 'sales', subcategory: 'payments', badge: 'NEW' },
  'kmarket': { category: 'sales', subcategory: 'marketplace', badge: 'NEW' },
  'kold': { category: 'sales', subcategory: 'outreach', badge: 'NEW' },
  'kloser': { category: 'sales', subcategory: 'deals', badge: 'NEW' },
  'kprospekt': { category: 'sales', subcategory: 'prospecting', badge: 'NEW' },

  // Productivity
  'calendar': { category: 'productivity', subcategory: 'scheduling', badge: 'NEW' },
  'kanban': { category: 'productivity', subcategory: 'project-management', badge: 'NEW' },
  'pomodoro': { category: 'productivity', subcategory: 'time-management', badge: 'NEW' },
  'timer': { category: 'productivity', subcategory: 'time-management', badge: 'NEW' },
  'kron': { category: 'productivity', subcategory: 'scheduling', badge: 'NEW' },
  'roadmap': { category: 'productivity', subcategory: 'planning', badge: 'NEW' },
  'bookmarks': { category: 'productivity', subcategory: 'organization', badge: 'NEW' },

  // Communication
  'chat': { category: 'productivity', subcategory: 'messaging', badge: 'P2P' },
  'comments': { category: 'productivity', subcategory: 'collaboration', badge: 'NEW' },
  'support': { category: 'productivity', subcategory: 'customer-service', badge: 'NEW' },
  'notifications': { category: 'productivity', subcategory: 'alerts', badge: 'NEW' },
  'feedback': { category: 'productivity', subcategory: 'customer-service', badge: 'NEW' },
  'testimonials': { category: 'productivity', subcategory: 'social-proof', badge: 'NEW' },
  'konnect': { category: 'productivity', subcategory: 'messaging', badge: 'P2P' },
  'email': { category: 'productivity', subcategory: 'communication', badge: 'NEW' },
  'sms': { category: 'productivity', subcategory: 'communication', badge: 'NEW' },
  'voice-memo': { category: 'productivity', subcategory: 'communication', badge: 'NEW' },
  'vcard': { category: 'productivity', subcategory: 'networking', badge: 'NEW' },

  // Lifestyle
  'weather': { category: 'utility', subcategory: 'information', badge: 'NEW' },
  'habits': { category: 'productivity', subcategory: 'tracking', badge: 'NEW' },
  'world-clock': { category: 'utility', subcategory: 'time', badge: 'NEW' },
  'stickies': { category: 'productivity', subcategory: 'notes', badge: 'NEW' },
  'mood': { category: 'productivity', subcategory: 'tracking', badge: 'NEW' },

  // Tools
  'terminal': { category: 'tool', subcategory: 'development', badge: 'NEW' },
  'cli': { category: 'tool', subcategory: 'development', badge: 'NEW' },
  'mcp': { category: 'tool', subcategory: 'development', badge: 'AI' },
  'snippets': { category: 'tool', subcategory: 'development', badge: 'NEW' },
  'git': { category: 'tool', subcategory: 'version-control', badge: 'AI' },
  'comfyui': { category: 'tool', subcategory: 'ai-workflow', badge: 'AI' },
  'perspektive': { category: 'tool', subcategory: 'data-analysis', badge: 'NEW' },
  'koil': { category: 'tool', subcategory: 'data-pipeline', badge: 'NEW' },
  'k3-os': { category: 'tool', subcategory: 'kubernetes', badge: 'NEW' },
  'kode': { category: 'tool', subcategory: 'development', badge: 'AI' },
  'ktest': { category: 'tool', subcategory: 'testing', badge: 'NEW' },
  'kci': { category: 'tool', subcategory: 'ci-cd', badge: 'NEW' },
  'kpipe': { category: 'tool', subcategory: 'ci-cd', badge: 'NEW' },
  'kflow': { category: 'tool', subcategory: 'automation', badge: 'NEW' },

  // Utility
  'qrcode': { category: 'utility', subcategory: 'generator', badge: 'NEW' },
  'password': { category: 'utility', subcategory: 'security', badge: 'NEW' },
  'json': { category: 'utility', subcategory: 'formatter', badge: 'NEW' },
  'regex': { category: 'utility', subcategory: 'testing', badge: 'NEW' },
  'markdown': { category: 'utility', subcategory: 'editor', badge: 'NEW' },
  'color': { category: 'utility', subcategory: 'design', badge: 'NEW' },
  'krypt': { category: 'utility', subcategory: 'security', badge: 'NEW' },
  'konvert': { category: 'utility', subcategory: 'converter', badge: 'NEW' },
  'kompare': { category: 'utility', subcategory: 'diff', badge: 'NEW' },
  'krawl': { category: 'utility', subcategory: 'web-scraping', badge: 'NEW' },
  'kualify': { category: 'utility', subcategory: 'validation', badge: 'NEW' },
  'iframe': { category: 'utility', subcategory: 'embedding', badge: 'NEW' },
  'kframe': { category: 'utility', subcategory: 'embedding', badge: 'NEW' },
  'kontainer': { category: 'utility', subcategory: 'container', badge: 'NEW' },

  // Content
  'wiki': { category: 'productivity', subcategory: 'documentation', badge: 'NEW' },
  'docs': { category: 'productivity', subcategory: 'documentation', badge: 'NEW' },
  'faq': { category: 'productivity', subcategory: 'documentation', badge: 'NEW' },
  'changelog': { category: 'productivity', subcategory: 'documentation', badge: 'NEW' },

  // Data
  'analytics': { category: 'productivity', subcategory: 'analytics', badge: 'NEW' },
  'database': { category: 'tool', subcategory: 'database', badge: 'NEW' },
  'files': { category: 'productivity', subcategory: 'storage', badge: 'NEW' },
  'form': { category: 'utility', subcategory: 'data-collection', badge: 'NEW' },
  'polls': { category: 'utility', subcategory: 'data-collection', badge: 'NEW' },

  // Media
  'video': { category: 'productivity', subcategory: 'media', badge: 'NEW' },
  'whiteboard': { category: 'productivity', subcategory: 'collaboration', badge: 'NEW' },
  'flow': { category: 'tool', subcategory: 'workflow', badge: 'NEW' },

  // Entertainment
  'mahjong': { category: 'entertainment', subcategory: 'games', badge: 'NEW' },
  'trivia': { category: 'entertainment', subcategory: 'games', badge: 'NEW' },
  'sisyphus': { category: 'entertainment', subcategory: 'games', badge: 'NEW' },
  'lyrics': { category: 'entertainment', subcategory: 'music', badge: 'NEW' },
  'tales150': { category: 'entertainment', subcategory: 'stories', badge: 'NEW' },

  // Visualization
  'block-array': { category: 'visualization', subcategory: '3d', badge: 'NEW' },
  'cube': { category: 'visualization', subcategory: '3d', badge: 'NEW' },

  // Auth/Security
  'auth': { category: 'utility', subcategory: 'authentication', badge: 'NEW' },
  'crypto-wallet': { category: 'utility', subcategory: 'web3', badge: 'WEB3' },
  'links': { category: 'utility', subcategory: 'shortener', badge: 'NEW' },
  'status': { category: 'utility', subcategory: 'monitoring', badge: 'NEW' },

  // Platform
  'os-desktop': { category: 'tool', subcategory: 'platform', badge: 'NEW' },
  'phone': { category: 'tool', subcategory: 'communication', badge: 'P2P' },
  'phone-v2': { category: 'tool', subcategory: 'communication', badge: 'P2P' },
  'elleen': { category: 'ai', subcategory: 'assistant', badge: 'AI' },
  'usc': { category: 'tool', subcategory: 'platform', badge: 'NEW' },
  'widget-container': { category: 'utility', subcategory: 'container', badge: 'NEW' },

  // K-suite additions
  'kopilot': { category: 'ai', subcategory: 'assistant', badge: 'AI' },
  'kopilot-pro': { category: 'ai', subcategory: 'assistant', badge: 'PRO' },
  'kards': { category: 'productivity', subcategory: 'flashcards', badge: 'NEW' },

  // Health
  'eds-awareness': { category: 'awareness', subcategory: 'health', badge: 'NEW' },

  // Index
  'index': { category: 'utility', subcategory: 'launcher', badge: 'NEW' },

  // HR & People
  'employee-directory': { category: 'hr', subcategory: 'directory', badge: 'ENT' },
  'org-chart': { category: 'hr', subcategory: 'organization', badge: 'ENT' },
  'onboarding': { category: 'hr', subcategory: 'hiring', badge: 'ENT' },
  'timesheet': { category: 'hr', subcategory: 'time-tracking', badge: 'ENT' },
  'pto-tracker': { category: 'hr', subcategory: 'time-off', badge: 'ENT' },
  'expense-report': { category: 'hr', subcategory: 'expenses', badge: 'ENT' },
  'performance-review': { category: 'hr', subcategory: 'reviews', badge: 'ENT' },
  'goals-okr': { category: 'hr', subcategory: 'goals', badge: 'ENT' },
  'kudos': { category: 'hr', subcategory: 'recognition', badge: 'ENT' },
  'applicant-tracker': { category: 'hr', subcategory: 'recruiting', badge: 'ENT' },
  'training-lms': { category: 'hr', subcategory: 'learning', badge: 'ENT' },
  'time-clock': { category: 'hr', subcategory: 'attendance', badge: 'ENT' },
  'leave-calendar': { category: 'hr', subcategory: 'scheduling', badge: 'ENT' },
  'job-board': { category: 'hr', subcategory: 'recruiting', badge: 'ENT' },

  // Finance & Accounting
  'general-ledger': { category: 'finance', subcategory: 'accounting', badge: 'ENT' },
  'budget-tracker': { category: 'finance', subcategory: 'budgeting', badge: 'ENT' },
  'accounts-payable': { category: 'finance', subcategory: 'payables', badge: 'ENT' },

  // Customer Service
  'ticket-system': { category: 'service', subcategory: 'helpdesk', badge: 'ENT' },

  // Marketing
  'email-campaign': { category: 'marketing', subcategory: 'email', badge: 'ENT' },

  // Legal
  'contract-vault': { category: 'legal', subcategory: 'contracts', badge: 'ENT' },

  // Retail
  'pos-terminal': { category: 'retail', subcategory: 'pos', badge: 'ENT' },

  // Healthcare
  'patient-portal': { category: 'healthcare', subcategory: 'patient', badge: 'ENT' },

  // Education
  'course-catalog': { category: 'education', subcategory: 'courses', badge: 'ENT' },

  // Events
  'event-builder': { category: 'events', subcategory: 'management', badge: 'ENT' },

  // Additional Finance
  'accounts-receivable': { category: 'finance', subcategory: 'receivables', badge: 'ENT' },
  'payroll': { category: 'finance', subcategory: 'payroll', badge: 'ENT' },
  'expense-reimbursement': { category: 'finance', subcategory: 'expenses', badge: 'ENT' },

  // Additional Service
  'knowledge-base': { category: 'service', subcategory: 'documentation', badge: 'ENT' },
  'sla-tracker': { category: 'service', subcategory: 'sla', badge: 'ENT' },

  // Additional Marketing
  'social-scheduler': { category: 'marketing', subcategory: 'social', badge: 'ENT' },
  'landing-page': { category: 'marketing', subcategory: 'web', badge: 'ENT' },

  // Additional Legal
  'e-signature': { category: 'legal', subcategory: 'signatures', badge: 'ENT' },
  'compliance-tracker': { category: 'legal', subcategory: 'compliance', badge: 'ENT' },

  // Real Estate
  'property-listing': { category: 'realestate', subcategory: 'listings', badge: 'ENT' },

  // Hospitality
  'reservation': { category: 'hospitality', subcategory: 'reservations', badge: 'ENT' },

  // Transport
  'fleet-tracker': { category: 'transport', subcategory: 'fleet', badge: 'ENT' },

  // Government
  'permit-portal': { category: 'government', subcategory: 'permits', badge: 'ENT' },

  // Nonprofit
  'donor-management': { category: 'nonprofit', subcategory: 'donors', badge: 'ENT' },

  // Construction
  'project-tracker': { category: 'construction', subcategory: 'projects', badge: 'ENT' },

  // Energy
  'meter-reading': { category: 'energy', subcategory: 'utilities', badge: 'ENT' },
  'solar-monitor': { category: 'energy', subcategory: 'renewable', badge: 'ENT' },

  // Agriculture
  'crop-tracker': { category: 'agriculture', subcategory: 'crops', badge: 'ENT' },
  'livestock-manager': { category: 'agriculture', subcategory: 'livestock', badge: 'ENT' },

  // Media
  'content-calendar': { category: 'media', subcategory: 'planning', badge: 'ENT' },

  // Sports
  'team-roster': { category: 'sports', subcategory: 'teams', badge: 'ENT' },

  // Science
  'lab-notebook': { category: 'science', subcategory: 'research', badge: 'ENT' },

  // Insurance
  'claims-tracker': { category: 'insurance', subcategory: 'claims', badge: 'ENT' },
  'policy-manager': { category: 'insurance', subcategory: 'policies', badge: 'ENT' },

  // Logistics
  'shipment-tracker': { category: 'logistics', subcategory: 'shipping', badge: 'ENT' },
  'warehouse-manager': { category: 'logistics', subcategory: 'inventory', badge: 'ENT' },

  // Manufacturing
  'production-scheduler': { category: 'manufacturing', subcategory: 'production', badge: 'ENT' },
  'quality-control': { category: 'manufacturing', subcategory: 'quality', badge: 'ENT' },

  // Automotive
  'vehicle-inventory': { category: 'automotive', subcategory: 'inventory', badge: 'ENT' },
  'service-appointments': { category: 'automotive', subcategory: 'service', badge: 'ENT' },

  // Telecom
  'network-monitor': { category: 'telecom', subcategory: 'network', badge: 'ENT' },
  'subscriber-management': { category: 'telecom', subcategory: 'subscribers', badge: 'ENT' },

  // Aviation
  'flight-scheduler': { category: 'aviation', subcategory: 'scheduling', badge: 'ENT' },
  'aircraft-maintenance': { category: 'aviation', subcategory: 'maintenance', badge: 'ENT' },

  // Mining
  'equipment-tracker': { category: 'mining', subcategory: 'equipment', badge: 'ENT' },
  'production-report': { category: 'mining', subcategory: 'production', badge: 'ENT' },

  // Pharma
  'drug-inventory': { category: 'pharma', subcategory: 'inventory', badge: 'ENT' },
  'clinical-trials': { category: 'pharma', subcategory: 'trials', badge: 'ENT' },

  // Banking
  'loan-manager': { category: 'banking', subcategory: 'loans', badge: 'ENT' },
  'account-management': { category: 'banking', subcategory: 'accounts', badge: 'ENT' },

  // Security
  'access-control': { category: 'security', subcategory: 'access', badge: 'ENT' },
  'incident-reporter': { category: 'security', subcategory: 'incidents', badge: 'ENT' },

  // Food
  'recipe-management': { category: 'food', subcategory: 'recipes', badge: 'ENT' },
  'food-safety': { category: 'food', subcategory: 'compliance', badge: 'ENT' },

  // Chemical
  'material-safety': { category: 'chemical', subcategory: 'safety', badge: 'ENT' },
  'batch-tracking': { category: 'chemical', subcategory: 'production', badge: 'ENT' },

  // Textile
  'fabric-inventory': { category: 'textile', subcategory: 'inventory', badge: 'ENT' },
  'order-tracker': { category: 'textile', subcategory: 'orders', badge: 'ENT' },

  // Furniture
  'design-catalog': { category: 'furniture', subcategory: 'catalog', badge: 'ENT' },
  'custom-orders': { category: 'furniture', subcategory: 'orders', badge: 'ENT' },

  // Printing
  'print-queue': { category: 'printing', subcategory: 'queue', badge: 'ENT' },
  'job-estimator': { category: 'printing', subcategory: 'estimating', badge: 'ENT' },

  // Gaming
  'tournament-bracket': { category: 'gaming', subcategory: 'tournaments', badge: 'ENT' },
  'player-stats': { category: 'gaming', subcategory: 'analytics', badge: 'ENT' },

  // Beauty
  'appointment-book': { category: 'beauty', subcategory: 'scheduling', badge: 'ENT' },
  'product-catalog': { category: 'beauty', subcategory: 'inventory', badge: 'ENT' },

  // Pet
  'pet-records': { category: 'pet', subcategory: 'records', badge: 'ENT' },
  'grooming-schedule': { category: 'pet', subcategory: 'scheduling', badge: 'ENT' },

  // Jewelry
  'inventory-tracker': { category: 'jewelry', subcategory: 'inventory', badge: 'ENT' },
  'repair-orders': { category: 'jewelry', subcategory: 'repairs', badge: 'ENT' },

  // Wine
  'cellar-inventory': { category: 'wine', subcategory: 'inventory', badge: 'ENT' },
  'tasting-notes': { category: 'wine', subcategory: 'notes', badge: 'ENT' },

  // Music
  'studio-booking': { category: 'music', subcategory: 'scheduling', badge: 'ENT' },
  'lesson-scheduler': { category: 'music', subcategory: 'education', badge: 'ENT' },

  // Photography
  'session-planner': { category: 'photography', subcategory: 'scheduling', badge: 'ENT' },
  'gallery-manager': { category: 'photography', subcategory: 'galleries', badge: 'ENT' },

  // Fitness
  'class-schedule': { category: 'fitness', subcategory: 'scheduling', badge: 'ENT' },
  'member-tracker': { category: 'fitness', subcategory: 'membership', badge: 'ENT' },

  // Dental
  'patient-scheduler': { category: 'dental', subcategory: 'scheduling', badge: 'ENT' },
  'treatment-plan': { category: 'dental', subcategory: 'treatment', badge: 'ENT' },

  // Veterinary
  'clinic-scheduler': { category: 'veterinary', subcategory: 'scheduling', badge: 'ENT' },
  'vaccination-tracker': { category: 'veterinary', subcategory: 'health', badge: 'ENT' },

  // Catering
  'menu-planner': { category: 'catering', subcategory: 'menus', badge: 'ENT' },
  'event-orders': { category: 'catering', subcategory: 'orders', badge: 'ENT' },

  // Landscaping
  'project-estimator': { category: 'landscaping', subcategory: 'estimating', badge: 'ENT' },
  'maintenance-schedule': { category: 'landscaping', subcategory: 'scheduling', badge: 'ENT' },

  // Plumbing
  'service-calls': { category: 'plumbing', subcategory: 'service', badge: 'ENT' },
  'parts-inventory': { category: 'plumbing', subcategory: 'inventory', badge: 'ENT' },

  // HVAC
  'service-tickets': { category: 'hvac', subcategory: 'service', badge: 'ENT' },
  'equipment-maintenance': { category: 'hvac', subcategory: 'maintenance', badge: 'ENT' },

  // Cleaning
  'schedule-manager': { category: 'cleaning', subcategory: 'scheduling', badge: 'ENT' },
  'client-contracts': { category: 'cleaning', subcategory: 'contracts', badge: 'ENT' },

  // Electrical
  'service-requests': { category: 'electrical', subcategory: 'service', badge: 'ENT' },
  'circuit-diagrams': { category: 'electrical', subcategory: 'documentation', badge: 'ENT' },

  // Roofing
  'inspection-report': { category: 'roofing', subcategory: 'inspection', badge: 'ENT' },
  'job-scheduler': { category: 'roofing', subcategory: 'scheduling', badge: 'ENT' },

  // Flooring
  'material-estimator': { category: 'flooring', subcategory: 'estimating', badge: 'ENT' },
  'installation-tracker': { category: 'flooring', subcategory: 'installation', badge: 'ENT' },

  // Painting
  'color-quotes': { category: 'painting', subcategory: 'quotes', badge: 'ENT' },
  'project-manager': { category: 'painting', subcategory: 'projects', badge: 'ENT' },

  // Moving
  'move-estimator': { category: 'moving', subcategory: 'estimating', badge: 'ENT' },
  'inventory-checklist': { category: 'moving', subcategory: 'inventory', badge: 'ENT' },

  // Pool
  'maintenance-log': { category: 'pool', subcategory: 'maintenance', badge: 'ENT' },
  'chemical-tracker': { category: 'pool', subcategory: 'chemicals', badge: 'ENT' },

  // Pest
  'service-schedule': { category: 'pest', subcategory: 'scheduling', badge: 'ENT' },
  'inspection-form': { category: 'pest', subcategory: 'inspection', badge: 'ENT' },

  // Appliance
  'repair-tickets': { category: 'appliance', subcategory: 'repairs', badge: 'ENT' },
  'warranty-tracker': { category: 'appliance', subcategory: 'warranties', badge: 'ENT' },

  // Window
  'cleaning-schedule': { category: 'window', subcategory: 'scheduling', badge: 'ENT' },
  'quote-builder': { category: 'window', subcategory: 'quotes', badge: 'ENT' },

  // Locksmith
  'service-jobs': { category: 'locksmith', subcategory: 'service', badge: 'ENT' },
  'key-inventory': { category: 'locksmith', subcategory: 'inventory', badge: 'ENT' },

  // Taxi
  'dispatch-board': { category: 'taxi', subcategory: 'dispatch', badge: 'ENT' },
  'fare-calculator': { category: 'taxi', subcategory: 'billing', badge: 'ENT' },

  // Daycare
  'child-checkin': { category: 'daycare', subcategory: 'attendance', badge: 'ENT' },
  'daily-report': { category: 'daycare', subcategory: 'reporting', badge: 'ENT' },

  // Yoga
  'class-scheduler': { category: 'yoga', subcategory: 'scheduling', badge: 'ENT' },
  'member-passes': { category: 'yoga', subcategory: 'membership', badge: 'ENT' },

  // Bakery
  'order-queue': { category: 'bakery', subcategory: 'orders', badge: 'ENT' },
  'recipe-book': { category: 'bakery', subcategory: 'recipes', badge: 'ENT' },

  // Florist
  'arrangement-builder': { category: 'florist', subcategory: 'design', badge: 'ENT' },
  'delivery-tracker': { category: 'florist', subcategory: 'delivery', badge: 'ENT' },

  // Tutoring
  'student-roster': { category: 'tutoring', subcategory: 'students', badge: 'ENT' },
  'session-tracker': { category: 'tutoring', subcategory: 'sessions', badge: 'ENT' },

  // Spa
  'treatment-menu': { category: 'spa', subcategory: 'treatments', badge: 'ENT' },
  'booking-calendar': { category: 'spa', subcategory: 'scheduling', badge: 'ENT' },

  // Brewery
  'batch-tracker': { category: 'brewery', subcategory: 'production', badge: 'ENT' },
  'taproom-sales': { category: 'brewery', subcategory: 'sales', badge: 'ENT' },

  // Carwash
  'queue-manager': { category: 'carwash', subcategory: 'queue', badge: 'ENT' },
  'membership-cards': { category: 'carwash', subcategory: 'membership', badge: 'ENT' },

  // Laundry
  'laundry-order-tracker': { category: 'laundry', subcategory: 'orders', badge: 'ENT' },
  'machine-status': { category: 'laundry', subcategory: 'equipment', badge: 'ENT' },

  // Coffee
  'drink-menu': { category: 'coffee', subcategory: 'menu', badge: 'ENT' },
  'order-terminal': { category: 'coffee', subcategory: 'pos', badge: 'ENT' },

  // Gym
  'workout-tracker': { category: 'gym', subcategory: 'workouts', badge: 'ENT' },
  'member-checkin': { category: 'gym', subcategory: 'attendance', badge: 'ENT' },

  // Tattoo
  'design-gallery': { category: 'tattoo', subcategory: 'portfolio', badge: 'ENT' },
  'tattoo-appointments': { category: 'tattoo', subcategory: 'scheduling', badge: 'ENT' },

  // Escape
  'room-scheduler': { category: 'escape', subcategory: 'scheduling', badge: 'ENT' },
  'game-master': { category: 'escape', subcategory: 'control', badge: 'ENT' },

  // Arcade
  'token-sales': { category: 'arcade', subcategory: 'sales', badge: 'ENT' },
  'prize-counter': { category: 'arcade', subcategory: 'prizes', badge: 'ENT' },

  // Notary
  'signing-scheduler': { category: 'notary', subcategory: 'scheduling', badge: 'ENT' },
  'document-log': { category: 'notary', subcategory: 'records', badge: 'ENT' },

  // Driving
  'lesson-planner': { category: 'driving', subcategory: 'scheduling', badge: 'ENT' },
  'student-progress': { category: 'driving', subcategory: 'tracking', badge: 'ENT' },

  // Marina
  'slip-manager': { category: 'marina', subcategory: 'slips', badge: 'ENT' },
  'fuel-dock': { category: 'marina', subcategory: 'fuel', badge: 'ENT' },

  // Storage
  'unit-manager': { category: 'storage', subcategory: 'units', badge: 'ENT' },
  'access-log': { category: 'storage', subcategory: 'security', badge: 'ENT' },

  // Vending
  'machine-monitor': { category: 'vending', subcategory: 'monitoring', badge: 'ENT' },
  'route-planner': { category: 'vending', subcategory: 'logistics', badge: 'ENT' },

  // Rental
  'equipment-rental': { category: 'rental', subcategory: 'equipment', badge: 'ENT' },
  'party-supplies': { category: 'rental', subcategory: 'party', badge: 'ENT' },

  // Courier
  'delivery-dispatch': { category: 'courier', subcategory: 'dispatch', badge: 'ENT' },
  'package-tracker': { category: 'courier', subcategory: 'tracking', badge: 'ENT' },

  // Optometry
  'eye-exam': { category: 'optometry', subcategory: 'exams', badge: 'ENT' },
  'glasses-inventory': { category: 'optometry', subcategory: 'inventory', badge: 'ENT' },

  // Chiro
  'appointment-scheduler': { category: 'chiro', subcategory: 'scheduling', badge: 'ENT' },
  'treatment-tracker': { category: 'chiro', subcategory: 'treatment', badge: 'ENT' },

  // Photobooth
  'event-bookings': { category: 'photobooth', subcategory: 'bookings', badge: 'ENT' },
  'photo-gallery': { category: 'photobooth', subcategory: 'gallery', badge: 'ENT' },

  // Acupuncture
  'treatment-scheduler': { category: 'acupuncture', subcategory: 'scheduling', badge: 'ENT' },
  'patient-intake': { category: 'acupuncture', subcategory: 'intake', badge: 'ENT' },

  // DJ
  'event-calendar': { category: 'dj', subcategory: 'scheduling', badge: 'ENT' },
  'music-library': { category: 'dj', subcategory: 'library', badge: 'ENT' },

  // Tailor
  'alterations-tracker': { category: 'tailor', subcategory: 'orders', badge: 'ENT' },
  'measurements': { category: 'tailor', subcategory: 'clients', badge: 'ENT' },

  // Accounting
  'client-ledger': { category: 'accounting', subcategory: 'ledger', badge: 'ENT' },
  'tax-documents': { category: 'accounting', subcategory: 'taxes', badge: 'ENT' },

  // Nursery
  'plant-inventory': { category: 'nursery', subcategory: 'inventory', badge: 'ENT' },
  'care-schedule': { category: 'nursery', subcategory: 'care', badge: 'ENT' },

  // Massage
  'massage-appointments': { category: 'massage', subcategory: 'scheduling', badge: 'ENT' },
  'client-notes': { category: 'massage', subcategory: 'records', badge: 'ENT' },

  // Martial Arts
  'class-roster': { category: 'martial', subcategory: 'students', badge: 'ENT' },
  'belt-tracker': { category: 'martial', subcategory: 'progression', badge: 'ENT' },

  // Skating
  'session-scheduler': { category: 'skating', subcategory: 'scheduling', badge: 'ENT' },
  'skate-rental': { category: 'skating', subcategory: 'rentals', badge: 'ENT' },

  // Bowling
  'lane-manager': { category: 'bowling', subcategory: 'lanes', badge: 'ENT' },
  'league-scores': { category: 'bowling', subcategory: 'leagues', badge: 'ENT' },

  // Archery
  'range-booking': { category: 'archery', subcategory: 'booking', badge: 'ENT' },
  'equipment-checkout': { category: 'archery', subcategory: 'rentals', badge: 'ENT' },

  // Climbing
  'route-tracker': { category: 'climbing', subcategory: 'routes', badge: 'ENT' },
  'climbing-passes': { category: 'climbing', subcategory: 'membership', badge: 'ENT' },

  // Diving
  'certification-tracker': { category: 'diving', subcategory: 'certs', badge: 'ENT' },
  'dive-log': { category: 'diving', subcategory: 'logbook', badge: 'ENT' },

  // Sailing
  'boat-reservations': { category: 'sailing', subcategory: 'rentals', badge: 'ENT' },
  'sailing-lessons': { category: 'sailing', subcategory: 'lessons', badge: 'ENT' },

  // Kayak
  'rental-fleet': { category: 'kayak', subcategory: 'rentals', badge: 'ENT' },
  'tour-scheduler': { category: 'kayak', subcategory: 'tours', badge: 'ENT' },

  // Surf
  'lesson-bookings': { category: 'surf', subcategory: 'lessons', badge: 'ENT' },
  'board-rentals': { category: 'surf', subcategory: 'rentals', badge: 'ENT' },

  // Golf
  'tee-times': { category: 'golf', subcategory: 'scheduling', badge: 'ENT' },
  'scorecard': { category: 'golf', subcategory: 'scoring', badge: 'ENT' },

  // Tennis
  'court-booking': { category: 'tennis', subcategory: 'scheduling', badge: 'ENT' },
  'match-tracker': { category: 'tennis', subcategory: 'matches', badge: 'ENT' },

  // Equestrian
  'stable-manager': { category: 'equestrian', subcategory: 'stables', badge: 'ENT' },
  'riding-lessons': { category: 'equestrian', subcategory: 'lessons', badge: 'ENT' },

  // Fishing
  'catch-log': { category: 'fishing', subcategory: 'logging', badge: 'ENT' },
  'trip-planner': { category: 'fishing', subcategory: 'planning', badge: 'ENT' },

  // Camping
  'campsite-finder': { category: 'camping', subcategory: 'booking', badge: 'ENT' },
  'gear-checklist': { category: 'camping', subcategory: 'gear', badge: 'ENT' },
};

// Default fallback values
function getCategory(id) {
  return categoryMap[id] || { category: 'utility', subcategory: 'general', badge: 'NEW' };
}

// Extract embedded metadata from HTML
function extractMeta(html) {
  const metaMatch = html.match(/<script\s+type="application\/json"\s+id="widget-meta">\s*([\s\S]*?)\s*<\/script>/);
  if (metaMatch) {
    try {
      return JSON.parse(metaMatch[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Extract info from HTML comments
function extractFromComments(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const commentMatch = html.match(/<!--\s*\n?([\s\S]*?)\n?-->/);

  let name = titleMatch ? titleMatch[1].trim() : null;
  let desc = null;
  let kills = [];

  if (commentMatch) {
    const comment = commentMatch[1];
    const lines = comment.split('\n').map(l => l.trim());

    // First line is usually the name
    if (lines[0] && lines[0].match(/^[A-Z]/)) {
      const parts = lines[0].split(' - ');
      if (!name) name = parts[0];
      if (parts[1]) desc = parts[1];
    }

    // Find kills line
    const killsLine = lines.find(l => l.toLowerCase().startsWith('kills:'));
    if (killsLine) {
      kills = killsLine.replace(/^kills:\s*/i, '').split(',').map(k => k.trim());
    }

    // Second line is usually the description
    if (!desc && lines[1]) {
      desc = lines[1];
    }
  }

  return { name, desc, kills };
}

// Get primary color from CSS
function extractColor(html) {
  const colorMatch = html.match(/--(?:primary|accent):\s*(#[0-9a-fA-F]{6})/);
  return colorMatch ? colorMatch[1] : '#6366f1';
}

// Generate UDT instance
function generateUDT(id, meta, html) {
  const catInfo = getCategory(id);
  const commentInfo = extractFromComments(html);
  const color = extractColor(html);

  // Use embedded meta if available, otherwise extract from comments
  const name = (meta && meta.name) || commentInfo.name || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const desc = (meta && meta.desc) || commentInfo.desc || `${name} widget`;
  const body = (meta && meta.body) || desc;
  const icon = (meta && meta.icon) || '📦';
  const price = (meta && typeof meta.price === 'number') ? meta.price : 0;
  const kills = (meta && meta.kills) || commentInfo.kills || [];
  const finalColor = (meta && meta.color) || color;
  const badge = (meta && meta.badge) || catInfo.badge;

  return {
    "$schema": "../WIDGET_UDT.json",
    "_meta": {
      "udtVersion": "1.0.0",
      "udtType": "Widget",
      "conformsTo": "ISA-95"
    },
    "identification": {
      "id": id,
      "name": name.toUpperCase(),
      "version": "1.0.0"
    },
    "classification": {
      "category": catInfo.category,
      "subcategory": catInfo.subcategory,
      "tags": [id, catInfo.category, catInfo.subcategory].filter(Boolean),
      "badge": badge,
      "isa95Level": 4
    },
    "presentation": {
      "icon": icon,
      "color": finalColor
    },
    "description": {
      "short": desc,
      "medium": body,
      "features": []
    },
    "commercial": {
      "price": price,
      "kills": kills,
      "license": "MIT"
    },
    "technical": {
      "runtime": "browser",
      "standalone": true,
      "offline": true,
      "p2pEnabled": catInfo.badge === 'P2P',
      "dependencies": [],
      "storage": {
        "localStorage": true,
        "indexedDB": false
      },
      "apis": []
    },
    "interface": {
      "globalName": id.split('-').map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)).join(''),
      "methods": [],
      "events": []
    },
    "lifecycle": {
      "status": "stable",
      "createdAt": "2024-01-01",
      "updatedAt": new Date().toISOString().split('T')[0],
      "author": "KISS MySaaS"
    },
    "relations": {}
  };
}

// Directories to scan for widgets
const widgetDirs = [
  '', // root
  'comm',
  'productivity',
  'business',
  'dev',
  'industrial',
  'ai',
  'p2p',
  'games',
  'lifestyle',
  'utility',
  'data',
  // Enterprise categories
  'hr',
  'finance',
  'service',
  'marketing',
  'legal',
  'retail',
  'healthcare',
  'education',
  'events',
  'realestate',
  'hospitality',
  'transport',
  'energy',
  'agriculture',
  'construction',
  'nonprofit',
  'government',
  'media',
  'sports',
  'science',
  'insurance',
  'logistics',
  'manufacturing',
  'automotive',
  'telecom',
  'aviation',
  'mining',
  'pharma',
  'banking',
  'security',
  'food',
  'chemical',
  'textile',
  'furniture',
  'printing',
  'gaming',
  'beauty',
  'pet',
  'jewelry',
  'wine',
  'music',
  'photography',
  'fitness',
  'dental',
  'veterinary',
  'catering',
  'landscaping',
  'plumbing',
  'hvac',
  'cleaning',
  'electrical',
  'roofing',
  'flooring',
  'painting',
  'moving',
  'pool',
  'pest',
  'appliance',
  'window',
  'locksmith',
  'taxi',
  'daycare',
  'yoga',
  'bakery',
  'florist',
  'tutoring',
  'spa',
  'brewery',
  'carwash',
  'laundry',
  'coffee',
  'gym',
  'tattoo',
  'escape',
  'arcade',
  'notary',
  'driving',
  'marina',
  'storage',
  'vending',
  'rental',
  'courier',
  'optometry',
  'chiro',
  'photobooth',
  'acupuncture',
  'dj',
  'tailor',
  'accounting',
  'nursery',
  'massage',
  'martial',
  'skating',
  'bowling',
  'archery',
  'climbing',
  'diving',
  'sailing',
  'kayak',
  'surf',
  'golf',
  'tennis',
  'equestrian',
  'fishing',
  'camping'
];

// Process all widgets in all directories
let count = 0;

for (const dir of widgetDirs) {
  const scanDir = dir ? path.join(widgetsDir, dir) : widgetsDir;

  if (!fs.existsSync(scanDir)) continue;

  const files = fs.readdirSync(scanDir).filter(f => {
    if (!f.endsWith('.html')) return false;
    if (f === 'index.html') return false;
    // Only filter out literal directory listing pages, not widget names containing 'directory'
    if (f === 'directory.html' || f === 'widget-directory.html') return false;
    return true;
  });

  for (const file of files) {
    const id = file.replace('.html', '');
    const htmlPath = path.join(scanDir, file);
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const meta = extractMeta(html);
    const udt = generateUDT(id, meta, html);

    // Add directory info to UDT
    if (dir) {
      udt.classification.directory = dir;
    }

    const udtPath = path.join(udtDir, `${id}.udt.json`);
    fs.writeFileSync(udtPath, JSON.stringify(udt, null, 2));
    count++;
    console.log(`Generated: ${id}.udt.json${dir ? ` (${dir}/)` : ''}`);
  }
}

console.log(`\nTotal: ${count} UDT instances generated`);
