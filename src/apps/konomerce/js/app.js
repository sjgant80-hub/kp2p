/**
 * Konomerce - Main Application
 * E-Commerce Suite with Tag-based Architecture
 */

import { $, $$, formatCurrency, formatDate, events, debounce } from './utils.js';
import { UDTs } from './udts.js';
import * as gw from './gateway.js';

// State
let activeTab = 'dashboard';
let activeProvider = 'store';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupProviders();
  setupEventHandlers();
  setupGatewayEvents();
  loadSavedConfig();
  updateUI();
});

// Tab switching
function setupTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      $(`tab-${activeTab}`).classList.add('active');

      updateUI();
    });
  });
}

// Provider switching
function setupProviders() {
  $$('.provider-item').forEach(item => {
    item.addEventListener('click', () => {
      $$('.provider-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      activeProvider = item.dataset.provider;
      updateTagTree();
    });
  });
}

// Event handlers
function setupEventHandlers() {
  // Connect button
  $('connectBtn').addEventListener('click', showConnectModal);

  // Add product
  $('addProductBtn')?.addEventListener('click', () => showProductModal());

  // Add customer
  $('addCustomerBtn')?.addEventListener('click', () => showCustomerModal());

  // New order
  $('newOrderBtn')?.addEventListener('click', () => showOrderModal());

  // Search handlers
  $('productSearch')?.addEventListener('input', debounce(filterProducts, 300));
  $('customerSearch')?.addEventListener('input', debounce(filterCustomers, 300));

  // Order filter
  $('orderFilter')?.addEventListener('change', filterOrders);
}

// Gateway events
function setupGatewayEvents() {
  events.on('connected', () => {
    $('gatewayStatus').textContent = 'Gateway: Online';
    $('gatewayStatus').className = 'status-badge connected';
    $('connectBtn').textContent = 'Disconnect';
    $('connectionInfo').textContent = `Connected to ${gw.gateway.owner}/${gw.gateway.repo}`;
    updateUI();
  });

  events.on('disconnected', () => {
    $('gatewayStatus').textContent = 'Gateway: Offline';
    $('gatewayStatus').className = 'status-badge disconnected';
    $('connectBtn').textContent = 'Connect';
    $('connectionInfo').textContent = 'Disconnected';
  });

  events.on('sync', ({ time }) => {
    $('lastSync').textContent = `Last sync: ${time.toLocaleTimeString()}`;
  });

  events.on('update', () => {
    updateUI();
  });
}

// Load saved config
function loadSavedConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('konomerce-config') || '{}');
    if (saved.owner && saved.repo) {
      // Auto-connect if config exists
      // gw.connect(saved); // Uncomment to auto-connect
    }
  } catch (e) {
    // Ignore
  }
}

// Update all UI
function updateUI() {
  updateDashboard();
  updateProducts();
  updateOrders();
  updateCustomers();
  updateTagTree();
  updateLiveTags();
  updateProviderCounts();
}

// Update dashboard
function updateDashboard() {
  const stats = gw.getStats();

  $('statProducts').textContent = stats.products;
  $('statOrders').textContent = stats.orders;
  $('statCustomers').textContent = stats.customers;

  // Calculate revenue
  const orders = gw.getEntities('orders');
  const revenue = orders.reduce((sum, o) => sum + (o.Total || 0), 0);
  $('statRevenue').textContent = formatCurrency(revenue);

  // Recent orders
  const recentOrders = orders.slice(-5).reverse();
  $('recentOrders').innerHTML = recentOrders.length ? recentOrders.map(o => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
      <span>${o._id}</span>
      <span class="badge badge-${getStatusBadge(o.Status)}">${o.Status}</span>
      <span>${formatCurrency(o.Total || 0)}</span>
    </div>
  `).join('') : '<div class="empty-state">No orders yet</div>';

  // Low stock alerts
  const inventory = gw.getEntities('inventory');
  const lowStock = inventory.filter(i => (i.Available || 0) < (i.ReorderPoint || 10));
  $('lowStockAlerts').innerHTML = lowStock.length ? lowStock.map(i => `
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
      <span>${i.ProductSKU}</span>
      <span class="badge badge-warning">${i.Available || 0} left</span>
    </div>
  `).join('') : '<div class="empty-state">No alerts</div>';
}

// Update products table
function updateProducts() {
  const products = gw.getEntities('store');

  $('productsBody').innerHTML = products.length ? products.map(p => `
    <div class="table-row">
      <div class="col-sku">${p.SKU || p._id}</div>
      <div class="col-name">${p.Name || 'Unnamed'}</div>
      <div class="col-price">${formatCurrency(p.Price || 0)}</div>
      <div class="col-stock">${getInventoryQty(p.SKU || p._id)}</div>
      <div class="col-status">
        <span class="badge ${p.Active ? 'badge-success' : 'badge-neutral'}">
          ${p.Active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div class="col-actions">
        <button class="action-btn" onclick="editProduct('${p._id}')">✏️</button>
        <button class="action-btn" onclick="deleteProduct('${p._id}')">🗑️</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state">No products. Connect gateway to sync.</div>';
}

// Get inventory quantity for a product
function getInventoryQty(sku) {
  const inv = gw.getEntities('inventory').find(i => i.ProductSKU === sku);
  return inv ? (inv.Available || 0) : '-';
}

// Update orders table
function updateOrders() {
  let orders = gw.getEntities('orders');
  const filter = $('orderFilter')?.value;

  if (filter && filter !== 'all') {
    orders = orders.filter(o => o.Status === filter);
  }

  $('ordersBody').innerHTML = orders.length ? orders.map(o => `
    <div class="table-row">
      <div class="col-id">${o._id}</div>
      <div class="col-customer">${getCustomerName(o.CustomerID)}</div>
      <div class="col-items">${o.ItemCount || 0}</div>
      <div class="col-total">${formatCurrency(o.Total || 0)}</div>
      <div class="col-status">
        <span class="badge badge-${getStatusBadge(o.Status)}">${o.Status || 'pending'}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn" onclick="viewOrder('${o._id}')">👁️</button>
        <button class="action-btn" onclick="editOrder('${o._id}')">✏️</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state">No orders yet</div>';
}

// Get customer name
function getCustomerName(id) {
  const cust = gw.getEntity('customers', id);
  return cust ? `${cust.FirstName || ''} ${cust.LastName || ''}`.trim() || cust.Email : id;
}

// Get status badge class
function getStatusBadge(status) {
  const map = {
    pending: 'neutral',
    processing: 'info',
    shipped: 'warning',
    completed: 'success',
    cancelled: 'danger'
  };
  return map[status] || 'neutral';
}

// Update customers table
function updateCustomers() {
  const customers = gw.getEntities('customers');

  $('customersBody').innerHTML = customers.length ? customers.map(c => `
    <div class="table-row">
      <div class="col-id">${c._id}</div>
      <div class="col-name">${c.FirstName || ''} ${c.LastName || ''}</div>
      <div class="col-email">${c.Email || ''}</div>
      <div class="col-orders">${c.TotalOrders || 0}</div>
      <div class="col-spent">${formatCurrency(c.TotalSpent || 0)}</div>
      <div class="col-actions">
        <button class="action-btn" onclick="editCustomer('${c._id}')">✏️</button>
        <button class="action-btn" onclick="deleteCustomer('${c._id}')">🗑️</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state">No customers yet</div>';
}

// Update tag tree
function updateTagTree() {
  const provider = gw.providers[activeProvider];
  if (!provider) return;

  const tree = {};

  // Build tree structure
  for (const [path] of provider.tags) {
    const parts = path.split('/');
    let node = tree;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }

  // Render tree
  function renderNode(node, prefix = '') {
    let html = '';
    for (const [key, children] of Object.entries(node)) {
      const path = prefix ? `${prefix}/${key}` : key;
      const hasChildren = Object.keys(children).length > 0;
      html += `
        <div class="tag-node ${hasChildren ? 'folder' : ''}" data-path="${path}">
          ${hasChildren ? '📁' : '🏷️'} ${key}
        </div>
        ${hasChildren ? `<div class="tag-children">${renderNode(children, path)}</div>` : ''}
      `;
    }
    return html;
  }

  $('tagTree').innerHTML = renderNode(tree) || '<div class="empty-state">No tags</div>';

  // Add click handlers
  $$('.tag-node').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      $$('.tag-node').forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      showTagDetails(activeProvider, node.dataset.path);
    });
  });
}

// Show tag details
function showTagDetails(provider, path) {
  const tag = gw.readTag(provider, path);

  if (!tag) {
    $('tagDetails').innerHTML = '<div class="empty-state">Folder selected</div>';
    return;
  }

  $('tagDetails').innerHTML = `
    <div class="tag-detail-row">
      <div class="tag-detail-label">Path</div>
      <div class="tag-detail-value">${path}</div>
    </div>
    <div class="tag-detail-row">
      <div class="tag-detail-label">Value</div>
      <div class="tag-detail-value">${JSON.stringify(tag.value)}</div>
    </div>
    <div class="tag-detail-row">
      <div class="tag-detail-label">Quality</div>
      <div class="tag-detail-value">${tag.quality}</div>
    </div>
    <div class="tag-detail-row">
      <div class="tag-detail-label">Timestamp</div>
      <div class="tag-detail-value">${tag.timestamp}</div>
    </div>
    <div class="tag-detail-row">
      <div class="tag-detail-label">Source</div>
      <div class="tag-detail-value">${tag.source}</div>
    </div>
  `;
}

// Update live tags panel
function updateLiveTags() {
  const allTags = [];

  for (const [key, provider] of Object.entries(gw.providers)) {
    for (const [path, data] of provider.tags) {
      allTags.push({ provider: key, path, data });
    }
  }

  $('liveTagCount').textContent = allTags.length;

  $('liveTags').innerHTML = allTags.slice(-50).reverse().map(t => {
    const value = typeof t.data.value === 'string' ? t.data.value : JSON.stringify(t.data.value);
    const truncValue = value.length > 15 ? value.substring(0, 15) + '...' : value;
    return `
      <div class="live-tag">
        <span class="live-tag-path" title="${t.provider}/${t.path}">${t.path.split('/').pop()}</span>
        <span class="live-tag-value">${truncValue}</span>
      </div>
    `;
  }).join('');
}

// Update provider counts
function updateProviderCounts() {
  $('storeCount').textContent = gw.providers.store.tags.size;
  $('inventoryCount').textContent = gw.providers.inventory.tags.size;
  $('ordersCount').textContent = gw.providers.orders.tags.size;
  $('customersCount').textContent = gw.providers.customers.tags.size;
}

// Filter functions
function filterProducts() {
  const search = $('productSearch').value.toLowerCase();
  const rows = $$('#productsBody .table-row');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(search) ? '' : 'none';
  });
}

function filterCustomers() {
  const search = $('customerSearch').value.toLowerCase();
  const rows = $$('#customersBody .table-row');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(search) ? '' : 'none';
  });
}

function filterOrders() {
  updateOrders();
}

// Show connect modal
function showConnectModal() {
  if (gw.gateway.connected) {
    gw.disconnect();
    return;
  }

  const saved = JSON.parse(localStorage.getItem('konomerce-config') || '{}');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>🔌 Connect Gateway</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px;">
          Connect to a GitHub repository to store your e-commerce data.
        </p>
        <div class="form-group">
          <label>Repository Owner</label>
          <input type="text" id="cfg-owner" value="${saved.owner || ''}" placeholder="username">
        </div>
        <div class="form-group">
          <label>Repository Name</label>
          <input type="text" id="cfg-repo" value="${saved.repo || ''}" placeholder="my-repo">
        </div>
        <div class="form-group">
          <label>Personal Access Token</label>
          <input type="password" id="cfg-token" value="${saved.token || ''}" placeholder="ghp_xxxx">
          <small style="color: var(--text-dim);">
            Needs repo scope. <a href="https://github.com/settings/tokens/new" target="_blank" style="color: var(--primary);">Create token</a>
          </small>
        </div>
        <div class="form-group">
          <label>Poll Interval (ms)</label>
          <input type="number" id="cfg-poll" value="${saved.pollInterval || 5000}" min="1000">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn" id="createDemoBtn">Create Demo Data</button>
        <button class="btn btn-primary" id="doConnectBtn">Connect</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $('doConnectBtn').onclick = async () => {
    const config = {
      owner: $('cfg-owner').value.trim(),
      repo: $('cfg-repo').value.trim(),
      token: $('cfg-token').value.trim(),
      pollInterval: parseInt($('cfg-poll').value) || 5000
    };

    if (!config.owner || !config.repo) {
      alert('Owner and repo are required');
      return;
    }

    try {
      await gw.connect(config);
      localStorage.setItem('konomerce-config', JSON.stringify(config));
      modal.remove();
    } catch (e) {
      alert(`Connection failed: ${e.message}`);
    }
  };

  $('createDemoBtn').onclick = async () => {
    if (!gw.gateway.connected) {
      alert('Connect first to create demo data');
      return;
    }
    await gw.createDemoData();
    updateUI();
    alert('Demo data created!');
  };
}

// Show product modal
function showProductModal(existing = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>${existing ? 'Edit' : 'Add'} Product</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>SKU</label>
            <input type="text" id="prod-sku" value="${existing?.SKU || ''}" ${existing ? 'readonly' : ''}>
          </div>
          <div class="form-group">
            <label>Category</label>
            <input type="text" id="prod-category" value="${existing?.Category || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="prod-name" value="${existing?.Name || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price</label>
            <input type="number" id="prod-price" value="${existing?.Price || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label>Compare Price</label>
            <input type="number" id="prod-compare" value="${existing?.ComparePrice || ''}" step="0.01">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="prod-desc" rows="3">${existing?.Description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="prod-active" ${existing?.Active !== false ? 'checked' : ''}> Active
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="saveProductBtn">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $('saveProductBtn').onclick = async () => {
    const product = {
      SKU: $('prod-sku').value.trim(),
      Name: $('prod-name').value.trim(),
      Category: $('prod-category').value.trim(),
      Price: parseFloat($('prod-price').value) || 0,
      ComparePrice: parseFloat($('prod-compare').value) || 0,
      Description: $('prod-desc').value.trim(),
      Active: $('prod-active').checked
    };

    if (!product.SKU || !product.Name) {
      alert('SKU and Name are required');
      return;
    }

    await gw.createEntity('store', 'Product', product);

    // Create inventory entry
    await gw.createEntity('inventory', 'Inventory', {
      ProductSKU: product.SKU,
      Quantity: 0,
      Available: 0,
      ReorderPoint: 10
    });

    updateUI();
    modal.remove();
  };
}

// Show customer modal
function showCustomerModal(existing = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>${existing ? 'Edit' : 'Add'} Customer</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" id="cust-fname" value="${existing?.FirstName || ''}">
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input type="text" id="cust-lname" value="${existing?.LastName || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="cust-email" value="${existing?.Email || ''}">
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="cust-phone" value="${existing?.Phone || ''}">
        </div>
        <div class="form-group">
          <label>Address</label>
          <input type="text" id="cust-address" value="${existing?.Address || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input type="text" id="cust-city" value="${existing?.City || ''}">
          </div>
          <div class="form-group">
            <label>State</label>
            <input type="text" id="cust-state" value="${existing?.State || ''}">
          </div>
          <div class="form-group">
            <label>Zip</label>
            <input type="text" id="cust-zip" value="${existing?.ZipCode || ''}">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="saveCustomerBtn">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $('saveCustomerBtn').onclick = async () => {
    const customer = {
      FirstName: $('cust-fname').value.trim(),
      LastName: $('cust-lname').value.trim(),
      Email: $('cust-email').value.trim(),
      Phone: $('cust-phone').value.trim(),
      Address: $('cust-address').value.trim(),
      City: $('cust-city').value.trim(),
      State: $('cust-state').value.trim(),
      ZipCode: $('cust-zip').value.trim()
    };

    if (!customer.Email) {
      alert('Email is required');
      return;
    }

    await gw.createEntity('customers', 'Customer', customer);
    updateUI();
    modal.remove();
  };
}

// Show order modal
function showOrderModal() {
  const customers = gw.getEntities('customers');
  const products = gw.getEntities('store');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <span>New Order</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Customer</label>
          <select id="order-customer">
            <option value="">Select customer...</option>
            ${customers.map(c => `<option value="${c._id}">${c.FirstName} ${c.LastName} (${c.Email})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Products</label>
          <div id="order-items"></div>
          <button class="btn btn-sm" id="addItemBtn">+ Add Item</button>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
          <strong>Total: <span id="order-total">$0.00</span></strong>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" id="saveOrderBtn">Create Order</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let items = [];

  function addItem() {
    const idx = items.length;
    items.push({ sku: '', qty: 1, price: 0 });

    const itemDiv = document.createElement('div');
    itemDiv.className = 'form-row';
    itemDiv.style.marginBottom = '8px';
    itemDiv.innerHTML = `
      <select class="item-product" data-idx="${idx}" style="flex: 2;">
        <option value="">Select product...</option>
        ${products.map(p => `<option value="${p.SKU || p._id}" data-price="${p.Price}">${p.Name} - ${formatCurrency(p.Price)}</option>`).join('')}
      </select>
      <input type="number" class="item-qty" data-idx="${idx}" value="1" min="1" style="width: 60px;">
      <button class="btn btn-sm" onclick="this.parentElement.remove(); updateOrderTotal();">×</button>
    `;

    $('order-items').appendChild(itemDiv);

    itemDiv.querySelector('.item-product').onchange = (e) => {
      const opt = e.target.selectedOptions[0];
      items[idx].sku = e.target.value;
      items[idx].price = parseFloat(opt.dataset.price) || 0;
      updateOrderTotal();
    };

    itemDiv.querySelector('.item-qty').onchange = (e) => {
      items[idx].qty = parseInt(e.target.value) || 1;
      updateOrderTotal();
    };
  }

  window.updateOrderTotal = function() {
    const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    $('order-total').textContent = formatCurrency(total);
  };

  $('addItemBtn').onclick = addItem;
  addItem(); // Add first item

  $('saveOrderBtn').onclick = async () => {
    const customerId = $('order-customer').value;
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    const validItems = items.filter(i => i.sku);
    if (validItems.length === 0) {
      alert('Please add at least one product');
      return;
    }

    const total = validItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

    await gw.createEntity('orders', 'Order', {
      CustomerID: customerId,
      Status: 'pending',
      ItemCount: validItems.length,
      Total: total
    });

    updateUI();
    modal.remove();
  };
}

// Global functions for inline handlers
window.editProduct = (id) => {
  const product = gw.getEntity('store', id);
  if (product) showProductModal(product);
};

window.deleteProduct = async (id) => {
  if (confirm('Delete this product?')) {
    await gw.deleteEntity('store', id);
    updateUI();
  }
};

window.editCustomer = (id) => {
  const customer = gw.getEntity('customers', id);
  if (customer) showCustomerModal(customer);
};

window.deleteCustomer = async (id) => {
  if (confirm('Delete this customer?')) {
    await gw.deleteEntity('customers', id);
    updateUI();
  }
};

window.viewOrder = (id) => {
  const order = gw.getEntity('orders', id);
  if (order) {
    alert(JSON.stringify(order, null, 2));
  }
};

window.editOrder = (id) => {
  // TODO: Order edit modal
  console.log('Edit order:', id);
};
