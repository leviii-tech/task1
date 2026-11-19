/**
 * ShopNova - Order History & Order Confirmation Controller
 */

const OrdersManager = {
  // Handles order-success.html page
  async initSuccessPage() {
    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get('orderNumber');
    const orderId = params.get('orderId');
    const email = params.get('email');

    const identifier = orderNumber || orderId;
    if (!identifier) {
      window.location.href = '/index.html';
      return;
    }

    try {
      const queryParam = email ? `?email=${encodeURIComponent(email)}` : '';
      const res = await API.get(`/api/orders/${identifier}${queryParam}`);
      if (!res.success || !res.order) {
        throw new Error('Order not found.');
      }

      this.renderSuccessDetails(res.order);
    } catch (err) {
      const container = document.getElementById('orderSuccessContainer');
      if (container) {
        container.innerHTML = `
          <div style="text-align:center; padding: 60px 20px;">
            <i class="bi bi-exclamation-triangle" style="font-size:3rem; color:var(--warning);"></i>
            <h3 style="margin-top:12px;">Could not load order details</h3>
            <p style="color:var(--text-muted); margin-bottom:20px;">${err.message}</p>
            <a href="/index.html" class="btn btn-primary">Return to Store</a>
          </div>
        `;
      }
    }
  },

  renderSuccessDetails(order) {
    const numEl = document.getElementById('successOrderNumber');
    const dateEl = document.getElementById('successOrderDate');
    const customerEl = document.getElementById('successCustomerName');
    const emailEl = document.getElementById('successCustomerEmail');
    const addressEl = document.getElementById('successShippingAddress');
    const paymentEl = document.getElementById('successPaymentMethod');
    const totalEl = document.getElementById('successTotalAmount');
    const itemsTable = document.getElementById('successInvoiceItems');
    const subtotalEl = document.getElementById('successSubtotal');
    const discountEl = document.getElementById('successDiscount');
    const discountRow = document.getElementById('successDiscountRow');
    const shippingEl = document.getElementById('successShipping');
    const taxEl = document.getElementById('successTax');

    if (numEl) numEl.textContent = order.order_number;
    if (dateEl) dateEl.textContent = new Date(order.created_at).toLocaleString();
    if (customerEl) customerEl.textContent = order.customer_name;
    if (emailEl) emailEl.textContent = order.customer_email;
    if (addressEl) {
      addressEl.textContent = `${order.shipping_address}, ${order.shipping_city}, ${order.shipping_postal_code}, ${order.shipping_country}`;
    }
    if (paymentEl) paymentEl.textContent = order.payment_method;
    if (totalEl) totalEl.textContent = `$${order.total_amount.toFixed(2)}`;

    if (subtotalEl) subtotalEl.textContent = `$${order.subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = order.shipping_fee === 0 ? 'FREE' : `$${order.shipping_fee.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${order.tax.toFixed(2)}`;

    if (order.discount > 0 && discountRow && discountEl) {
      discountRow.style.display = 'table-row';
      discountEl.textContent = `-$${order.discount.toFixed(2)} (${order.promo_code || 'Promo'})`;
    }

    if (itemsTable && order.items) {
      itemsTable.innerHTML = order.items.map(item => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${item.product_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}" style="width:44px; height:44px; border-radius:var(--radius-sm); object-fit:cover;">
              <div>
                <strong>${item.product_title}</strong>
              </div>
            </div>
          </td>
          <td style="text-align:center;">$${item.price.toFixed(2)}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right; font-weight:700;">$${item.subtotal.toFixed(2)}</td>
        </tr>
      `).join('');
    }

    // Update Stepper
    this.updateTrackerStepper(order.order_status);
  },

  updateTrackerStepper(status = 'Processing') {
    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentIdx = steps.indexOf(status);

    steps.forEach((step, idx) => {
      const stepEl = document.getElementById(`trackerStep_${step}`);
      if (stepEl) {
        stepEl.classList.remove('completed', 'current');
        if (idx < currentIdx) {
          stepEl.classList.add('completed');
        } else if (idx === currentIdx) {
          stepEl.classList.add('current');
        }
      }
    });
  },

  // Handles orders.html page (User order history)
  async initOrdersPage() {
    const container = document.getElementById('ordersHistoryContainer');
    if (!container) return;

    if (!Auth.isLoggedIn()) {
      container.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
          <i class="bi bi-person-lock" style="font-size:3.5rem; color:var(--text-light); margin-bottom:12px; display:inline-block;"></i>
          <h3 style="font-size:1.5rem; font-weight:700; margin-bottom:8px;">Sign in to view your orders</h3>
          <p style="color:var(--text-muted); margin-bottom:24px;">Track your shipments, view invoices, and repeat previous orders.</p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <a href="/login.html" class="btn btn-primary">Sign In</a>
            <button class="btn btn-outline" onclick="Auth.demoLogin('customer').then(() => window.location.reload())">Demo Customer Login</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="text-align:center; padding:48px; color:var(--text-muted);">
        <i class="bi bi-arrow-repeat" style="font-size:2rem; animation:spin 1s infinite linear;"></i>
        <p style="margin-top:8px;">Loading your order history...</p>
      </div>
    `;

    try {
      const res = await API.get('/api/orders/my-orders');
      if (!res.success || !res.orders || res.orders.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding: 60px 20px; background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
            <i class="bi bi-box2" style="font-size:3.5rem; color:var(--text-light); margin-bottom:12px; display:inline-block;"></i>
            <h3 style="font-size:1.4rem; font-weight:700; margin-bottom:8px;">No orders found yet</h3>
            <p style="color:var(--text-muted); margin-bottom:24px;">You haven't placed any orders with this account yet.</p>
            <a href="/index.html" class="btn btn-primary">Start Shopping</a>
          </div>
        `;
        return;
      }

      container.innerHTML = res.orders.map(order => this.renderOrderCard(order)).join('');
    } catch (err) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--danger); background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
          <p>Error retrieving order history: ${err.message}</p>
        </div>
      `;
    }
  },

  renderOrderCard(order) {
    const statusClasses = {
      'Pending': 'badge-status processing',
      'Processing': 'badge-status processing',
      'Shipped': 'badge-status shipped',
      'Delivered': 'badge-status delivered',
      'Cancelled': 'badge-status cancelled'
    };

    return `
      <div style="background:#fff; border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:24px; margin-bottom:20px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:1px solid var(--border-color); padding-bottom:16px; margin-bottom:18px;">
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Order Number</span>
            <div style="font-size:1.15rem; font-weight:800; color:var(--secondary);">${order.order_number}</div>
          </div>
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Date Placed</span>
            <div style="font-size:0.92rem; font-weight:600; color:var(--text-main);">${new Date(order.created_at).toLocaleDateString()}</div>
          </div>
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Total Amount</span>
            <div style="font-size:1.15rem; font-weight:800; color:var(--primary);">$${order.total_amount.toFixed(2)}</div>
          </div>
          <div>
            <span class="${statusClasses[order.order_status] || 'badge-status processing'}">
              <i class="bi bi-circle-fill" style="font-size:0.5rem;"></i> ${order.order_status}
            </span>
          </div>
        </div>

        <!-- Items list -->
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
          ${(order.items || []).map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="${item.product_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}" style="width:52px; height:52px; border-radius:var(--radius-sm); object-fit:cover;">
                <div>
                  <div style="font-weight:600; font-size:0.95rem; color:var(--secondary);">${item.product_title}</div>
                  <div style="font-size:0.82rem; color:var(--text-muted);">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
                </div>
              </div>
              <div style="font-weight:700; font-size:0.95rem;">
                $${item.subtotal.toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-top:1px solid var(--border-color); padding-top:16px;">
          <div style="font-size:0.85rem; color:var(--text-muted);">
            <i class="bi bi-geo-alt"></i> Shipped to: <strong>${order.shipping_address}, ${order.shipping_city}</strong>
          </div>
          <a href="/order-success.html?orderNumber=${order.order_number}" class="btn btn-outline btn-sm">
            <i class="bi bi-receipt"></i> View Invoice & Tracking
          </a>
        </div>
      </div>
    `;
  }
};
