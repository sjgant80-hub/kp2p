/**
 * KP2P Graphics Library
 * Tag-based Perspective graphics with minification
 *
 * Usage:
 *   import { g, G, view, Components } from './graphics/index.js';
 *
 *   // Build a simple view
 *   const myView = view('Main/Dashboard')
 *     .root(
 *       G.flex().flex('column').padding(16).gap(16)
 *         .add(
 *           G.label('Dashboard').font(24, 'bold'),
 *           Components.Data.stat('Users', 1234, 'material/people', 5.2),
 *           Components.UI.card('Recent Activity',
 *             G.flex().add(...items)
 *           )
 *         )
 *     );
 *
 *   // Export to Ignition JSON
 *   const ignitionJson = myView.toIgnition();
 *
 *   // Get minified tag structure
 *   const tagForm = myView.build();
 */

// UDTs and type mappings
export {
  UDTs,
  TYPE_MAP,
  TYPE_REVERSE,
  STYLE_MAP,
  STYLE_REVERSE,
  ComponentUDT,
  ViewUDT,
  ContainerUDT,
  InputUDT,
  DisplayUDT,
  ChartUDT,
  TableUDT,
  NavUDT,
  EmbedUDT,
  StyleUDT,
  BindingUDT,
  EventUDT,
  ActionUDT,
  PositionUDT
} from './udts.js';

// Builders
export {
  GBuilder,
  ActionBuilder,
  ViewBuilder,
  g,
  G,
  view,
  action,
  expandTag,
  minifyView
} from './builder.js';

// Exporter utilities
export {
  FORMAT,
  exportView,
  importView,
  calculateSavings,
  validateTag,
  cloneTag,
  mergeTags,
  findByType,
  findByName,
  transformTag,
  extractBindings,
  binding,
  generateTypes,
  compress,
  decompress,
  createViewBundle,
  parseViewBundle,
  diffTags
} from './exporter.js';

// Component library
export {
  Layout,
  UI,
  Data,
  Form,
  Nav,
  Charts,
  SCADA,
  Components
} from './components.js';

// Quick reference for type shortcuts
export const TypeRef = {
  containers: ['flex', 'col', 'row', 'coord', 'tab', 'split', 'card', 'scroll', 'dock'],
  inputs: ['tf', 'ta', 'num', 'dd', 'cb', 'rb', 'tog', 'dt', 'sl', 'file'],
  display: ['lbl', 'img', 'icon', 'md', 'html', 'pdf', 'prog', 'led', 'spark', 'video'],
  charts: ['xy', 'pie', 'bar', 'ts', 'gauge'],
  tables: ['tbl', 'pwr', 'tree'],
  nav: ['btn', 'link', 'menu', 'tabs', 'bread'],
  embed: ['view', 'popup', 'iframe']
};

// Quick reference for style shortcuts
export const StyleRef = {
  layout: { D: 'display', W: 'width', H: 'height', P: 'padding', M: 'margin' },
  flex: { FD: 'flexDirection', JC: 'justifyContent', AI: 'alignItems', FW: 'flexWrap', G: 'gap' },
  colors: { BG: 'backgroundColor', C: 'color', BC: 'borderColor' },
  border: { B: 'border', BR: 'borderRadius', BS: 'boxShadow' },
  text: { FS: 'fontSize', FT: 'fontWeight', FF: 'fontFamily', TA: 'textAlign' },
  other: { O: 'overflow', OP: 'opacity', CUR: 'cursor', TR: 'transition' }
};
