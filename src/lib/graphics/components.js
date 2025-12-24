/**
 * Perspective Component Library
 * Pre-built component patterns as minified tags
 */

import { g, G, action, view } from './builder.js';

/**
 * Layout patterns
 */
export const Layout = {
  // Full page with header, content, footer
  page: (header, content, footer) =>
    g('flex').flex('column').size('100%', '100%')
      .add(
        g('flex').name('header').grow(0).add(header),
        g('flex').name('content').grow(1).style({ O: 'auto' }).add(content),
        footer && g('flex').name('footer').grow(0).add(footer)
      ),

  // Sidebar layout
  sidebar: (sidebar, main, sidebarWidth = '250px') =>
    g('flex').flex('row').size('100%', '100%')
      .add(
        g('flex').name('sidebar').basis(sidebarWidth).shrink(0).add(sidebar),
        g('flex').name('main').grow(1).add(main)
      ),

  // Card grid
  grid: (cards, columns = 3, gap = '16px') =>
    g('flex').flex('row', 'flex-start', 'flex-start').style({ FW: 'wrap', G: gap })
      .add(...cards.map(card =>
        g('flex').basis(`calc(${100 / columns}% - ${gap})`).add(card)
      )),

  // Centered content
  center: (content) =>
    g('flex').flex('column', 'center', 'center').size('100%', '100%')
      .add(content),

  // Scrollable list
  list: (items) =>
    g('scroll').size('100%', '100%')
      .add(g('flex').flex('column').gap(8).add(...items))
};

/**
 * Common UI components
 */
export const UI = {
  // Card with title and content
  card: (title, content, opts = {}) =>
    g('card')
      .style({
        BG: opts.bg || '#ffffff',
        BR: opts.radius || '8px',
        BS: opts.shadow || '0 2px 4px rgba(0,0,0,0.1)',
        P: opts.padding || '16px'
      })
      .add(
        title && G.label(title).font(18, 'bold').margin('0 0 12px 0'),
        content
      ),

  // Button with action
  button: (text, onClick, opts = {}) =>
    G.button(text)
      .style({
        BG: opts.primary ? '#0066cc' : '#f0f0f0',
        C: opts.primary ? '#ffffff' : '#333333',
        BR: '4px',
        P: '8px 16px',
        CUR: 'pointer'
      })
      .on('onClick', onClick),

  // Form field with label
  field: (label, input, opts = {}) =>
    g('flex').flex('column').gap(4)
      .add(
        G.label(label).font(14, '500'),
        input,
        opts.hint && G.label(opts.hint).font(12).color('#666')
      ),

  // Badge/chip
  badge: (text, color = '#0066cc') =>
    g('flex').flex('row', 'center', 'center')
      .style({ BG: color, C: '#fff', BR: '12px', P: '2px 8px', FS: '12px' })
      .add(G.label(text)),

  // Avatar
  avatar: (src, size = 40) =>
    G.image(src)
      .size(size, size)
      .style({ BR: '50%', O: 'hidden' }),

  // Loading spinner
  spinner: () =>
    g('icon').props({ path: 'material/sync', color: '#0066cc' })
      .style({ animation: 'spin 1s linear infinite' }),

  // Empty state
  empty: (message, icon = 'material/inbox') =>
    g('flex').flex('column', 'center', 'center').padding(32).gap(16)
      .add(
        g('icon').props({ path: icon, color: '#999' }).size(48),
        G.label(message).color('#666').style({ TA: 'center' })
      ),

  // Alert/notification
  alert: (message, type = 'info') => {
    const colors = {
      info: { bg: '#e3f2fd', border: '#2196f3', color: '#1565c0' },
      success: { bg: '#e8f5e9', border: '#4caf50', color: '#2e7d32' },
      warning: { bg: '#fff3e0', border: '#ff9800', color: '#e65100' },
      error: { bg: '#ffebee', border: '#f44336', color: '#c62828' }
    };
    const c = colors[type] || colors.info;
    return g('flex').flex('row', 'flex-start', 'center').gap(8)
      .style({ BG: c.bg, B: `1px solid ${c.border}`, BR: '4px', P: '12px' })
      .add(G.label(message).color(c.color));
  },

  // Modal wrapper
  modal: (title, content, actions) =>
    g('flex').flex('column').size('400px', 'auto')
      .style({ BG: '#fff', BR: '8px', BS: '0 4px 20px rgba(0,0,0,0.3)' })
      .add(
        // Header
        g('flex').flex('row', 'space-between', 'center').padding('16px')
          .style({ B: '0 0 1px 0 solid #eee' })
          .add(G.label(title).font(18, 'bold')),
        // Content
        g('flex').padding(16).add(content),
        // Actions
        g('flex').flex('row', 'flex-end').gap(8).padding('16px')
          .style({ B: '1px 0 0 0 solid #eee' })
          .add(...actions)
      )
};

/**
 * Data display components
 */
export const Data = {
  // Key-value display
  keyValue: (label, value) =>
    g('flex').flex('row', 'space-between', 'center')
      .add(
        G.label(label).color('#666'),
        G.label(String(value)).font(null, 'bold')
      ),

  // Stat card
  stat: (label, value, icon, trend) =>
    g('flex').flex('column').padding(16).gap(8)
      .style({ BG: '#fff', BR: '8px', BS: '0 2px 4px rgba(0,0,0,0.1)' })
      .add(
        g('flex').flex('row', 'space-between', 'center')
          .add(
            G.label(label).color('#666').font(14),
            icon && g('icon').props({ path: icon, color: '#999' })
          ),
        G.label(String(value)).font(28, 'bold'),
        trend && g('flex').flex('row', 'flex-start', 'center').gap(4)
          .add(
            g('icon').props({
              path: trend > 0 ? 'material/trending_up' : 'material/trending_down',
              color: trend > 0 ? '#4caf50' : '#f44336'
            }).size(16),
            G.label(`${Math.abs(trend)}%`).color(trend > 0 ? '#4caf50' : '#f44336').font(12)
          )
      ),

  // Progress with label
  progressBar: (value, label, max = 100) =>
    g('flex').flex('column').gap(4)
      .add(
        g('flex').flex('row', 'space-between')
          .add(
            G.label(label),
            G.label(`${value}/${max}`)
          ),
        G.progress(value / max * 100).style({ H: '8px', BR: '4px' })
      ),

  // Status indicator
  status: (label, active) =>
    g('flex').flex('row', 'flex-start', 'center').gap(8)
      .add(
        g('flex').size(8, 8).style({ BR: '50%', BG: active ? '#4caf50' : '#999' }),
        G.label(label)
      ),

  // Timeline item
  timelineItem: (time, title, description) =>
    g('flex').flex('row').gap(16)
      .add(
        g('flex').flex('column', 'flex-start', 'center').shrink(0)
          .add(
            g('flex').size(12, 12).style({ BR: '50%', BG: '#0066cc' }),
            g('flex').size(2, '100%').style({ BG: '#ddd' })
          ),
        g('flex').flex('column').gap(4).grow(1)
          .add(
            G.label(time).font(12).color('#666'),
            G.label(title).font(14, 'bold'),
            description && G.label(description).color('#666')
          )
      )
};

/**
 * Form components
 */
export const Form = {
  // Complete form
  form: (fields, submitLabel = 'Submit', onSubmit) =>
    g('flex').flex('column').gap(16)
      .add(
        ...fields,
        g('flex').flex('row', 'flex-end').gap(8)
          .add(
            UI.button('Cancel', action().message('form:cancel')),
            UI.button(submitLabel, onSubmit, { primary: true })
          )
      ),

  // Text input with validation
  textInput: (name, label, opts = {}) =>
    UI.field(label,
      G.textField(label)
        .name(name)
        .props({
          placeholder: opts.placeholder,
          required: opts.required
        })
    ),

  // Select dropdown
  select: (name, label, options, opts = {}) =>
    UI.field(label,
      G.dropdown(options.map(o => typeof o === 'string' ? { label: o, value: o } : o))
        .name(name)
    ),

  // Checkbox group
  checkboxGroup: (name, label, options) =>
    g('flex').flex('column').gap(8)
      .add(
        G.label(label).font(14, '500'),
        g('flex').flex('column').gap(4)
          .add(...options.map(opt =>
            G.checkbox(typeof opt === 'string' ? opt : opt.label)
              .name(`${name}_${opt.value || opt}`)
          ))
      ),

  // Search input
  search: (placeholder = 'Search...', onSearch) =>
    g('flex').flex('row', 'flex-start', 'center').gap(8)
      .style({ BG: '#f5f5f5', BR: '4px', P: '8px 12px' })
      .add(
        g('icon').props({ path: 'material/search', color: '#666' }).size(20),
        G.textField('').props({ placeholder, border: 'none', background: 'transparent' })
          .grow(1)
          .on('onKeyUp', onSearch)
      )
};

/**
 * Navigation components
 */
export const Nav = {
  // Top navigation bar
  navbar: (brand, items, actions) =>
    g('flex').flex('row', 'space-between', 'center').padding('0 16px')
      .style({ H: '56px', BG: '#fff', BS: '0 2px 4px rgba(0,0,0,0.1)' })
      .add(
        // Brand
        g('flex').flex('row', 'flex-start', 'center').gap(8)
          .add(brand),
        // Nav items
        g('flex').flex('row', 'center', 'center').gap(24)
          .add(...items),
        // Actions
        g('flex').flex('row', 'flex-end', 'center').gap(8)
          .add(...actions)
      ),

  // Nav link
  navLink: (text, path, active = false) =>
    G.link(text, path)
      .style({
        C: active ? '#0066cc' : '#333',
        FW: active ? 'bold' : 'normal',
        textDecoration: 'none'
      }),

  // Sidebar menu
  sideMenu: (items) =>
    g('flex').flex('column').size('100%')
      .add(...items.map(item =>
        g('flex').flex('row', 'flex-start', 'center').gap(12).padding('12px 16px')
          .style({ CUR: 'pointer', BG: item.active ? '#e3f2fd' : 'transparent' })
          .on('onClick', action().page(item.path))
          .add(
            item.icon && g('icon').props({ path: item.icon, color: item.active ? '#0066cc' : '#666' }),
            G.label(item.text).color(item.active ? '#0066cc' : '#333')
          )
      )),

  // Breadcrumb
  breadcrumb: (items) =>
    g('flex').flex('row', 'flex-start', 'center').gap(8)
      .add(...items.flatMap((item, i) => [
        i > 0 && G.label('/').color('#999'),
        i === items.length - 1
          ? G.label(item.text).color('#333')
          : G.link(item.text, item.path).color('#0066cc')
      ].filter(Boolean))),

  // Tabs
  tabs: (items, activeIndex = 0) =>
    g('flex').flex('row').style({ B: '0 0 2px 0 solid #ddd' })
      .add(...items.map((item, i) =>
        g('flex').flex('row', 'center', 'center').padding('12px 24px')
          .style({
            CUR: 'pointer',
            C: i === activeIndex ? '#0066cc' : '#666',
            B: i === activeIndex ? '0 0 2px 0 solid #0066cc' : 'none',
            M: '0 0 -2px 0'
          })
          .on('onClick', action().message('tab:change', { index: i }))
          .add(G.label(item))
      ))
};

/**
 * Chart wrappers
 */
export const Charts = {
  // Line/Area chart
  line: (data, xKey, yKeys, opts = {}) =>
    G.xyChart()
      .props({
        dataSources: [{ data, name: 'main' }],
        series: yKeys.map((key, i) => ({
          name: key,
          type: opts.area ? 'area' : 'line',
          xKey,
          yKey: key,
          color: opts.colors?.[i]
        }))
      })
      .size('100%', opts.height || '300px'),

  // Bar chart
  bar: (data, categoryKey, valueKey, opts = {}) =>
    G.barChart()
      .props({
        data,
        categoryKey,
        valueKey,
        orientation: opts.horizontal ? 'horizontal' : 'vertical'
      })
      .size('100%', opts.height || '300px'),

  // Pie chart
  pie: (data, labelKey, valueKey, opts = {}) =>
    G.pieChart()
      .props({
        data,
        labelKey,
        valueKey,
        donut: opts.donut || false
      })
      .size(opts.size || '300px'),

  // Gauge
  gauge: (value, min = 0, max = 100, opts = {}) =>
    G.gauge(value)
      .props({
        min,
        max,
        ranges: opts.ranges || [
          { from: min, to: max * 0.5, color: '#4caf50' },
          { from: max * 0.5, to: max * 0.8, color: '#ff9800' },
          { from: max * 0.8, to: max, color: '#f44336' }
        ]
      })
      .size(opts.size || '200px')
};

/**
 * Industrial/SCADA components
 */
export const SCADA = {
  // Tank level
  tank: (level, label, opts = {}) =>
    g('flex').flex('column', 'flex-end', 'center').gap(8)
      .style({ position: 'relative' })
      .add(
        g('flex').size(opts.width || 80, opts.height || 150)
          .style({
            B: '2px solid #666',
            BR: '0 0 8px 8px',
            O: 'hidden',
            position: 'relative'
          })
          .add(
            g('flex').style({
              position: 'absolute',
              bottom: 0,
              W: '100%',
              H: `${level}%`,
              BG: opts.color || '#2196f3',
              transition: 'height 0.5s'
            })
          ),
        G.label(`${level}%`).font(14, 'bold'),
        label && G.label(label).color('#666')
      ),

  // Valve
  valve: (open, label) =>
    g('flex').flex('column', 'center', 'center').gap(4)
      .add(
        g('icon').props({
          path: open ? 'material/radio_button_checked' : 'material/block',
          color: open ? '#4caf50' : '#f44336'
        }).size(32),
        label && G.label(label).font(12)
      ),

  // Motor/Pump
  motor: (running, label, speed) =>
    g('flex').flex('column', 'center', 'center').gap(4)
      .style({ P: '8px', BG: running ? '#e8f5e9' : '#ffebee', BR: '8px' })
      .add(
        g('icon').props({
          path: 'material/settings',
          color: running ? '#4caf50' : '#f44336'
        })
          .size(40)
          .style({ animation: running ? 'spin 1s linear infinite' : 'none' }),
        label && G.label(label).font(12, 'bold'),
        speed !== undefined && G.label(`${speed} RPM`).font(10).color('#666')
      ),

  // Sensor reading
  sensor: (value, unit, label, opts = {}) =>
    g('flex').flex('column', 'center', 'center').gap(4)
      .style({ P: '12px', BG: '#f5f5f5', BR: '8px' })
      .add(
        label && G.label(label).font(12).color('#666'),
        g('flex').flex('row', 'center', 'baseline').gap(2)
          .add(
            G.label(String(value)).font(24, 'bold'),
            G.label(unit).font(14).color('#666')
          ),
        opts.trend !== undefined && g('flex').flex('row', 'center', 'center').gap(4)
          .add(
            g('icon').props({
              path: opts.trend > 0 ? 'material/arrow_upward' : 'material/arrow_downward',
              color: opts.trend > 0 ? (opts.invertTrend ? '#f44336' : '#4caf50') : (opts.invertTrend ? '#4caf50' : '#f44336')
            }).size(14),
            G.label(`${Math.abs(opts.trend)}%`).font(11)
          )
      ),

  // Alarm indicator
  alarm: (active, label, priority = 'low') => {
    const colors = { low: '#ff9800', medium: '#ff5722', high: '#f44336', critical: '#d32f2f' };
    return g('flex').flex('row', 'flex-start', 'center').gap(8)
      .style({
        P: '8px 12px',
        BG: active ? colors[priority] : '#e0e0e0',
        BR: '4px',
        animation: active && priority === 'critical' ? 'blink 0.5s infinite' : 'none'
      })
      .add(
        g('icon').props({
          path: active ? 'material/warning' : 'material/check_circle',
          color: active ? '#fff' : '#666'
        }),
        G.label(label).color(active ? '#fff' : '#666')
      );
  },

  // PID controller display
  pid: (pv, sp, output, label) =>
    g('flex').flex('column').gap(8).padding(12)
      .style({ BG: '#fff', B: '1px solid #ddd', BR: '8px' })
      .add(
        label && G.label(label).font(14, 'bold'),
        Data.keyValue('PV', pv.toFixed(2)),
        Data.keyValue('SP', sp.toFixed(2)),
        Data.keyValue('Output', `${output.toFixed(1)}%`),
        G.progress(output).style({ H: '8px', BR: '4px' })
      )
};

// Export all libraries
export const Components = {
  Layout,
  UI,
  Data,
  Form,
  Nav,
  Charts,
  SCADA
};
