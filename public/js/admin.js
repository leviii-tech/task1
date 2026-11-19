/**
 * ShopNova - Admin Management Controller
 */

const AdminManager = {
  products: [],
  orders: [],
  categories: [],

  async init() {
    if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
      this.renderAccessDenied();
      return;
    }

    await this.loadCategories();
    await this.loadStatsAndData();
    this.bindEvents();
  },

  renderAccessDenied() {
    const main = document.getElementById('adminMainContainer');
    if (!main) return;

    main.innerHTML = `
      <div style="max-width:560px; margin: 80px auto; text-align:center; background:#fff; padding:48px 32px; border-radius:var(--radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
        <i class="bi bi-shield-lock" style="font-size:3.5rem; color:var(--primary); margin-bottom:16px; display:inline-block;"></i>
        <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:12px; color:var(--secondary);">Admin Access Required</h2>
        <p style="color:var(--text-muted); margin-bottom:24px; line-height:1.6;">You must be signed in with an administrative account to view and manage inventory, orders, and sales reports.</p>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <button class="btn btn-primary" onclick="Auth.demoLogin('admin').then(() => window.location.reload())">
            <i class="bi bi-key-fill"></i> Log In as Store Admin Demo
          </button>
          <a href="/login.html" class="btn btn-outline">Standard Login</a>
        </div>
      </div>
    `;
  },

  async loadCategories() {
    try {
      const res = await API.get('/api/products/categories');
      if (res.success && res.categories) {
        this.categories = res.categories;
        const catSelect = document.getElementById('newProductCategory');
        if (catSelect) {
          catSelect.innerHTML = res.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('Error loading categories:', e);
    }
  },

  async loadStatsAndData() {
    try {
      const [prodRes, orderRes] = await Promise.all([
        API.get('/api/products', { limit: 50 }),
        API.get('/api/orders/admin/all')
      ]);

      if (prodRes.success) {
        this.products = prodRes.products;
        this.renderProductsTable();
      }

      if (orderRes.success) {
        this.orders = orderRes.orders;
        this.renderOrdersTable();
      }

      this.renderMetrics();
    } catch (err) {
      showToast('Error loading admin dashboard data: ' + err.message, 'error');
    }
  },

  renderMetrics() {
    const totalOrders = this.orders.length;
    const totalRevenue = this.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalProducts = this.products.length;
    const lowStockCount = this.products.filter(p => p.stock <= 10).length;

    const revEl = document.getElementById('statRevenue');
    const ordersEl = document.getElementById('statOrders');
    const prodsEl = document.getElementById('statProducts');
    const stockEl = document.getElementById('statLowStock');

    if (revEl) revEl.textContent = `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (ordersEl) ordersEl.textContent = totalOrders;
    if (prodsEl) prodsEl.textContent = totalProducts;
    if (stockEl) stockEl.textContent = lowStockCount;
  },

  renderOrdersTable() {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    if (this.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">No orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.orders.map(order => `
      <tr>
        <td><strong>${order.order_number}</strong></td>
        <td>
          <div style="font-weight:600;">${order.customer_name}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${order.customer_email}</div>
        </td>
        <td style="font-size:0.85rem;">${new Date(order.created_at).toLocaleDateString()}</td>
        <td>${(order.items || []).length} items</td>
        <td style="font-weight:700; color:var(--primary);">$${order.total_amount.toFixed(2)}</td>
        <td>
          <select class="form-control" style="padding:4px 8px; font-size:0.82rem; font-weight:600; width:130px;" onchange="AdminManager.updateOrderStatus(${order.id}, this.value)">
            <option value="Pending" ${order.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Processing" ${order.order_status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${order.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${order.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${order.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <a href="/order-success.html?orderNumber=${order.order_number}" target="_blank" class="btn btn-outline btn-sm" title="View Order Receipt">
            <i class="bi bi-eye"></i>
          </a>
        </td>
      </tr>
    `).join('');
  },

  renderProductsTable() {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    if (this.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">No products in catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.products.map(p => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.image_url}" style="width:40px; height:40px; border-radius:var(--radius-sm); object-fit:cover;">
            <div>
              <div style="font-weight:600; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${p.brand || 'NovaStore'}</div>
            </div>
          </div>
        </td>
        <td><span class="product-category" style="font-size:0.8rem;">${p.category_name}</span></td>
        <td style="font-weight:700;">$${p.price.toFixed(2)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="number" min="0" value="${p.stock}" style="width:64px; padding:4px 6px; border:1px solid var(--border-color); border-radius:var(--radius-sm);" onchange="AdminManager.updateStock(${p.id}, this.value)">
            ${p.stock <= 10 ? '<span style="color:var(--danger); font-size:0.75rem;" title="Low Stock"><i class="bi bi-exclamation-triangle-fill"></i></span>' : ''}
          </div>
        </td>
        <td>
          <span style="font-size:0.85rem; font-weight:600;">⭐ ${p.rating} (${p.review_count})</span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--border-color);" onclick="AdminManager.deleteProduct(${p.id}, '${p.title.replace(/'/g, "\\'")}')" title="Delete Product">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const res = await API.put(`/api/orders/admin/${orderId}/status`, { order_status: newStatus });
      if (res.success) {
        showToast(res.message, 'success');
        // Update local memory
        const order = this.orders.find(o => o.id === orderId);
        if (order) order.order_status = newStatus;
      }
    } catch (err) {
      showToast(err.message || 'Failed to update order status.', 'error');
    }
  },

  async updateStock(productId, newStock) {
    const stockVal = parseInt(newStock);
    if (isNaN(stockVal) || stockVal < 0) {
      showToast('Please enter a valid stock quantity.', 'warning');
      return;
    }

    try {
      const res = await API.put(`/api/products/${productId}`, { stock: stockVal });
      if (res.success) {
        showToast(`Stock updated to ${stockVal}`, 'success');
        const prod = this.products.find(p => p.id === productId);
        if (prod) prod.stock = stockVal;
        this.renderMetrics();
      }
    } catch (err) {
      showToast(err.message || 'Error updating stock.', 'error');
    }
  },

  async deleteProduct(productId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await API.delete(`/api/products/${productId}`);
      if (res.success) {
        showToast(res.message, 'success');
        this.products = this.products.filter(p => p.id !== productId);
        this.renderProductsTable();
        this.renderMetrics();
      }
    } catch (err) {
      showToast(err.message || 'Error deleting product.', 'error');
    }
  },

  openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) modal.classList.add('active');
  },

  closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) modal.classList.remove('active');
  },

  bindEvents() {
    const form = document.getElementById('newProductForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newProductTitle').value.trim();
        const category_id = parseInt(document.getElementById('newProductCategory').value);
        const price = parseFloat(document.getElementById('newProductPrice').value);
        const original_price = parseFloat(document.getElementById('newProductOrigPrice').value) || null;
        const brand = document.getElementById('newProductBrand').value.trim();
        const stock = parseInt(document.getElementById('newProductStock').value) || 20;
        const image_url = document.getElementById('newProductImage').value.trim();
        const description = document.getElementById('newProductDescription').value.trim();
        const featured = document.getElementById('newProductFeatured').checked;

        if (!title || !price || !category_id || !image_url || !description) {
          showToast('Please fill in all mandatory product fields.', 'warning');
          return;
        }

        try {
          const res = await API.post('/api/products', {
            title, category_id, price, original_price, brand, stock, image_url, description, featured
          });

          if (res.success) {
            showToast('New product added to catalog!', 'success');
            form.reset();
            this.closeAddProductModal();
            this.loadStatsAndData();
          }
        } catch (err) {
          showToast(err.message || 'Failed to create product.', 'error');
        }
      });
    }
  }
};
