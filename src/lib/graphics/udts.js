/**
 * Perspective Graphics UDTs
 * Tag-based representation of Ignition Perspective components
 *
 * Maps to Ignition types but stored as minified tag structures
 */

// Base Component UDT - all graphics inherit from this
export const ComponentUDT = {
  name: 'Component',
  description: 'Base Perspective component',
  members: {
    T: { type: 'String', default: '' },           // type (minified)
    P: { type: 'JSON', default: '{}' },           // props
    S: { type: 'JSON', default: '{}' },           // style
    M: { type: 'JSON', default: '{}' },           // meta (name, visible, etc)
    X: { type: 'JSON', default: '{}' },           // position
    C: { type: 'Array', default: '[]' },          // children
    E: { type: 'JSON', default: '{}' },           // events
    U: { type: 'JSON', default: '{}' }            // custom properties
  }
};

// View UDT - root container for a Perspective view
export const ViewUDT = {
  name: 'View',
  extends: 'Component',
  description: 'Perspective View root',
  members: {
    ID: { type: 'String', default: '' },
    Path: { type: 'String', default: '' },        // view path (e.g., "Main/Dashboard")
    Params: { type: 'JSON', default: '{}' },      // view parameters
    Root: { type: 'Component', default: null },   // root component
    Resources: { type: 'JSON', default: '{}' },   // scripts, styles
    Permissions: { type: 'JSON', default: '{}' }
  }
};

// Container types
export const ContainerUDT = {
  name: 'Container',
  extends: 'Component',
  description: 'Layout container',
  types: {
    flex: 'ia.container.flex',
    coord: 'ia.container.coord',
    col: 'ia.container.column',
    row: 'ia.container.row',
    tab: 'ia.container.tab',
    split: 'ia.container.split'
  }
};

// Input component types
export const InputUDT = {
  name: 'Input',
  extends: 'Component',
  description: 'Input components',
  types: {
    tf: 'ia.input.text-field',
    ta: 'ia.input.text-area',
    num: 'ia.input.numeric-entry',
    dd: 'ia.input.dropdown',
    cb: 'ia.input.checkbox',
    rb: 'ia.input.radio',
    tog: 'ia.input.toggle',
    dt: 'ia.input.datetime-picker',
    sl: 'ia.input.slider',
    file: 'ia.input.file-upload'
  }
};

// Display component types
export const DisplayUDT = {
  name: 'Display',
  extends: 'Component',
  description: 'Display components',
  types: {
    lbl: 'ia.display.label',
    img: 'ia.display.image',
    icon: 'ia.display.icon',
    md: 'ia.display.markdown',
    html: 'ia.display.html',
    pdf: 'ia.display.pdf-viewer',
    prog: 'ia.display.progress-bar',
    led: 'ia.display.led-display',
    gauge: 'ia.chart.gauge'
  }
};

// Chart component types
export const ChartUDT = {
  name: 'Chart',
  extends: 'Component',
  description: 'Chart/Graph components',
  types: {
    xy: 'ia.chart.xy-chart',
    pie: 'ia.chart.pie-chart',
    bar: 'ia.chart.bar-chart',
    ts: 'ia.chart.time-series',
    spark: 'ia.display.sparkline'
  }
};

// Table component types
export const TableUDT = {
  name: 'Table',
  extends: 'Component',
  description: 'Table/Grid components',
  types: {
    tbl: 'ia.display.table',
    pwr: 'ia.display.power-table',
    tree: 'ia.display.tree'
  }
};

// Navigation component types
export const NavUDT = {
  name: 'Nav',
  extends: 'Component',
  description: 'Navigation components',
  types: {
    btn: 'ia.navigation.button',
    link: 'ia.navigation.link',
    menu: 'ia.navigation.menu',
    tab: 'ia.navigation.tab-strip',
    bread: 'ia.navigation.breadcrumb'
  }
};

// Embedding components
export const EmbedUDT = {
  name: 'Embed',
  extends: 'Component',
  description: 'Embedding components',
  types: {
    view: 'ia.display.view',
    popup: 'ia.display.popup',
    dock: 'ia.container.docked',
    iframe: 'ia.display.iframe'
  }
};

// Style UDT - CSS-like styling as tags
export const StyleUDT = {
  name: 'Style',
  description: 'Component styling',
  members: {
    // Layout
    D: { type: 'String', default: '' },           // display
    W: { type: 'String', default: '' },           // width
    H: { type: 'String', default: '' },           // height
    P: { type: 'String', default: '' },           // padding
    M: { type: 'String', default: '' },           // margin
    // Flex
    FD: { type: 'String', default: '' },          // flexDirection
    JC: { type: 'String', default: '' },          // justifyContent
    AI: { type: 'String', default: '' },          // alignItems
    FW: { type: 'String', default: '' },          // flexWrap
    G: { type: 'String', default: '' },           // gap
    // Colors
    BG: { type: 'String', default: '' },          // backgroundColor
    C: { type: 'String', default: '' },           // color
    BC: { type: 'String', default: '' },          // borderColor
    // Border
    B: { type: 'String', default: '' },           // border
    BR: { type: 'String', default: '' },          // borderRadius
    BS: { type: 'String', default: '' },          // boxShadow
    // Text
    FS: { type: 'String', default: '' },          // fontSize
    FW: { type: 'String', default: '' },          // fontWeight
    FF: { type: 'String', default: '' },          // fontFamily
    TA: { type: 'String', default: '' },          // textAlign
    // Other
    O: { type: 'String', default: '' },           // overflow
    OP: { type: 'Float4', default: 1 },           // opacity
    CUR: { type: 'String', default: '' },         // cursor
    TR: { type: 'String', default: '' }           // transition
  }
};

// Binding UDT - tag bindings
export const BindingUDT = {
  name: 'Binding',
  description: 'Property binding',
  members: {
    Type: { type: 'String', default: 'tag' },     // tag | expr | prop | query
    Path: { type: 'String', default: '' },        // tag path or expression
    Mode: { type: 'String', default: 'r' },       // r | rw | w
    Poll: { type: 'Int4', default: 0 },           // polling rate ms (0 = subscription)
    Fallback: { type: 'String', default: '' },    // fallback value
    Transform: { type: 'String', default: '' }    // transform expression
  }
};

// Event UDT - component events
export const EventUDT = {
  name: 'Event',
  description: 'Component event handler',
  members: {
    Type: { type: 'String', default: 'onClick' },
    Actions: { type: 'Array', default: '[]' },    // action chain
    Enabled: { type: 'Boolean', default: true }
  }
};

// Action types for events
export const ActionUDT = {
  name: 'Action',
  description: 'Event action',
  types: {
    nav: 'perspective/navigate',
    popup: 'perspective/open-popup',
    dock: 'perspective/open-dock',
    close: 'perspective/close-popup',
    write: 'perspective/write-to-tag',
    script: 'perspective/run-script',
    msg: 'perspective/send-message',
    refresh: 'perspective/refresh-binding',
    download: 'perspective/download',
    print: 'perspective/print',
    alter: 'perspective/alter-logging'
  },
  members: {
    Type: { type: 'String', default: '' },
    Config: { type: 'JSON', default: '{}' }
  }
};

// Position UDT - coordinate positioning
export const PositionUDT = {
  name: 'Position',
  description: 'Component positioning',
  members: {
    Basis: { type: 'String', default: 'auto' },   // flex basis
    Grow: { type: 'Int4', default: 0 },           // flex grow
    Shrink: { type: 'Int4', default: 1 },         // flex shrink
    // For coordinate containers
    X: { type: 'Int4', default: 0 },
    Y: { type: 'Int4', default: 0 },
    W: { type: 'Int4', default: 100 },
    H: { type: 'Int4', default: 100 },
    Z: { type: 'Int4', default: 0 }
  }
};

// Type shortcode lookup
export const TYPE_MAP = {
  // Containers
  flex: 'ia.container.flex',
  coord: 'ia.container.coord',
  col: 'ia.container.column',
  row: 'ia.container.row',
  tab: 'ia.container.tab',
  split: 'ia.container.split',
  dock: 'ia.container.docked',
  card: 'ia.container.card',
  scroll: 'ia.container.scroll',

  // Inputs
  tf: 'ia.input.text-field',
  ta: 'ia.input.text-area',
  num: 'ia.input.numeric-entry',
  dd: 'ia.input.dropdown',
  cb: 'ia.input.checkbox',
  rb: 'ia.input.radio',
  tog: 'ia.input.toggle',
  dt: 'ia.input.datetime-picker',
  sl: 'ia.input.slider',
  file: 'ia.input.file-upload',

  // Display
  lbl: 'ia.display.label',
  img: 'ia.display.image',
  icon: 'ia.display.icon',
  md: 'ia.display.markdown',
  html: 'ia.display.html',
  pdf: 'ia.display.pdf-viewer',
  prog: 'ia.display.progress-bar',
  led: 'ia.display.led-display',
  spark: 'ia.display.sparkline',
  video: 'ia.display.video',

  // Charts
  xy: 'ia.chart.xy-chart',
  pie: 'ia.chart.pie-chart',
  bar: 'ia.chart.bar-chart',
  ts: 'ia.chart.time-series',
  gauge: 'ia.chart.gauge',

  // Tables
  tbl: 'ia.display.table',
  pwr: 'ia.display.power-table',
  tree: 'ia.display.tree',

  // Navigation
  btn: 'ia.navigation.button',
  link: 'ia.navigation.link',
  menu: 'ia.navigation.menu',
  tabs: 'ia.navigation.tab-strip',
  bread: 'ia.navigation.breadcrumb',

  // Embedding
  view: 'ia.display.view',
  popup: 'ia.display.popup',
  iframe: 'ia.display.iframe'
};

// Reverse lookup (full type to short)
export const TYPE_REVERSE = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([k, v]) => [v, k])
);

// Style property shortcode lookup
export const STYLE_MAP = {
  D: 'display',
  W: 'width',
  H: 'height',
  P: 'padding',
  M: 'margin',
  FD: 'flexDirection',
  JC: 'justifyContent',
  AI: 'alignItems',
  FW: 'flexWrap',
  G: 'gap',
  BG: 'backgroundColor',
  C: 'color',
  BC: 'borderColor',
  B: 'border',
  BR: 'borderRadius',
  BS: 'boxShadow',
  FS: 'fontSize',
  FT: 'fontWeight',
  FF: 'fontFamily',
  TA: 'textAlign',
  O: 'overflow',
  OP: 'opacity',
  CUR: 'cursor',
  TR: 'transition',
  POS: 'position',
  T: 'top',
  L: 'left',
  R: 'right',
  BT: 'bottom',
  Z: 'zIndex',
  MH: 'minHeight',
  MW: 'minWidth',
  XH: 'maxHeight',
  XW: 'maxWidth'
};

// Reverse style lookup
export const STYLE_REVERSE = Object.fromEntries(
  Object.entries(STYLE_MAP).map(([k, v]) => [v, k])
);

// Export all UDTs
export const UDTs = {
  Component: ComponentUDT,
  View: ViewUDT,
  Container: ContainerUDT,
  Input: InputUDT,
  Display: DisplayUDT,
  Chart: ChartUDT,
  Table: TableUDT,
  Nav: NavUDT,
  Embed: EmbedUDT,
  Style: StyleUDT,
  Binding: BindingUDT,
  Event: EventUDT,
  Action: ActionUDT,
  Position: PositionUDT
};
