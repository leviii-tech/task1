/**
 * ShopNova - Shopping Cart Service & UI Controller
 */
const Cart = {
  STORAGE_KEY: 'shopnova_cart_items',
  PROMO_KEY: 'shopnova_cart_promo',

  getItems() {
    try {
      const items = localStorage.getItem(this.STORAGE_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      return [];
    }
  },

  setItems(items) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
    this.renderDrawer();
    const cartPageContainer = document.getElementById('cartPageContainer');
    if (cartPageContainer) {
      this.renderCartPage();
    }
  },

  getItemCount() {
    const items = this.getItems();
    return items.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (parseFloat(item.price) * (parseInt(item.quantity) || 1)), 0);
  },

  getPromo() {
    try {
      const p = localStorage.getItem(this.PROMO_KEY);
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  },

  setPromo(promo) {
    if (promo) {
      localStorage.setItem(this.PROMO_KEY, JSON.stringify(promo));
    } else {
      localStorage.removeItem(this.PROMO_KEY);
    }
    this.renderDrawer();
    if (document.getElementById('cartPageContainer')) {
      this.renderCartPage();
    }
  },

  removePromo() {
    this.setPromo(null);
    if (typeof showToast === 'function') {
      showToast('Promo code removed', 'info');
    }
  },

  addItem(product, quantity = 1, openDrawer = true) {
    const items = this.getItems();
    const productId = product.id || product.product_id;
    const existingIndex = items.findIndex(i => (i.id === productId || i.product_id === productId));

    const qtyToAdd = Math.max(1, parseInt(quantity) || 1);
    const maxStock = product.stock !== undefined ? product.stock : 99;

    if (existingIndex > -1) {
      const currentQty = items[existingIndex].quantity || 1;
      const newQty = Math.min(currentQty + qtyToAdd, maxStock);
      items[existingIndex].quantity = newQty;
    } else {
      items.push({
        id: productId,
        product_id: productId,
        title: product.title,
        price: parseFloat(product.price),
        image_url: product.image_url,
        stock: maxStock,
        category_name: product.category_name,
        slug: product.slug,
        quantity: Math.min(qtyToAdd, maxStock)
      });
    }

    this.setItems(items);

    if (typeof showToast === 'function') {
      showToast(`Added "${product.title}" to your cart!`, 'success');
    }

    if (openDrawer) {
      this.openDrawer();
    }

    this.syncWithServer();
  },

  updateQty(productId, newQty) {
    const items = this.getItems();
    const index = items.findIndex(i => (i.id === productId || i.product_id === productId));
    if (index > -1) {
      const parsedQty = parseInt(newQty);
      if (parsedQty <= 0) {
        this.removeItem(productId);
        return;
      }
      const maxStock = items[index].stock || 99;
      items[index].quantity = Math.min(parsedQty, maxStock);
      this.setItems(items);
      this.syncWithServer();
    }
  },

  removeItem(productId) {
    let items = this.getItems();
    const removedItem = items.find(i => (i.id === productId || i.product_id === productId));
    items = items.filter(i => (i.id !== productId && i.product_id !== productId));
    this.setItems(items);
    if (removedItem && typeof showToast === 'function') {
      showToast(`Removed "${removedItem.title}" from cart.`, 'info');
    }
    this.syncWithServer();
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PROMO_KEY);
    this.updateBadge();
    this.renderDrawer();
    if (document.getElementById('cartPageContainer')) {
      this.renderCartPage();
    }
  },

  async applyPromo(code) {
    if (!code || !code.trim()) {
      throw new Error('Please enter a coupon code.');
    }
    const subtotal = this.getSubtotal();
    const res = await API.post('/api/cart/apply-promo', { code: code.trim(), subtotal });
    if (res.success) {
      this.setPromo({
        code: res.code,
        discount: res.discount,
        description: res.description
      });
      return res;
    } else {
      throw new Error(res.message || 'Invalid promo code');
    }
  },

  async syncWithServer() {
    if (window.Auth && Auth.isLoggedIn && Auth.isLoggedIn()) {
      try {
        const items = this.getItems();
        await API.post('/api/cart/sync', { items });
      } catch (err) {
        console.warn('Cart sync warning:', err);
      }
    }
  },

  updateBadge() {
    const count = this.getItemCount();
    const badges = document.querySelectorAll('.cart-counter-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    });
  },

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer && backdrop) {
      drawer.classList.add('active');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.renderDrawer();
    }
  },

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  renderDrawer() {
    const itemsList = document.getElementById('cartDrawerItems');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const totalEl = document.getElementById('cartDrawerTotal');
    const shippingEl = document.getElementById('cartDrawerShipping');
    const discountRow = document.getElementById('cartDrawerDiscountRow');
    const discountVal = document.getElementById('cartDrawerDiscountVal');
    const checkoutBtn = document.getElementById('cartDrawerCheckoutBtn');
    const freeShippingProgress = document.getElementById('freeShippingProgress');
    const freeShippingText = document.getElementById('freeShippingText');

    if (!itemsList) return;

    const items = this.getItems();
    const subtotal = this.getSubtotal();
    const promo = this.getPromo();

    // Free Shipping calculation ($50 threshold)
    const threshold = 50.00;
    if (freeShippingProgress && freeShippingText) {
      if (subtotal >= threshold) {
        freeShippingProgress.style.width = '100%';
        freeShippingText.innerHTML = `🎉 <strong>Congratulations!</strong> You qualify for FREE Standard Delivery!`;
      } else {
        const diff = threshold - subtotal;
        const pct = Math.min(100, (subtotal / threshold) * 100);
        freeShippingProgress.style.width = `${pct}%`;
        freeShippingText.innerHTML = `Add <strong>$${diff.toFixed(2)}</strong> more to unlock <strong>FREE Shipping!</strong>`;
      }
    }

    if (items.length === 0) {
      itemsList.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon"><i class="bi bi-cart-x"></i></div>
          <h4 style="font-weight:700; margin-bottom:8px; color:var(--secondary);">Your cart is empty</h4>
          <p style="font-size:0.88rem; margin-bottom:20px;">Explore our catalog and discover high-grade products for your daily lifestyle.</p>
          <button class="btn btn-primary btn-sm" onclick="Cart.closeDrawer()">Start Shopping</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      if (shippingEl) shippingEl.textContent = '$0.00';
      if (discountRow) discountRow.style.display = 'none';
      if (checkoutBtn) {
        checkoutBtn.setAttribute('disabled', 'true');
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.pointerEvents = 'none';
      }
      return;
    }

    if (checkoutBtn) {
      checkoutBtn.removeAttribute('disabled');
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.pointerEvents = 'auto';
    }

    let discount = 0;
    if (promo && promo.discount) {
      discount = Math.min(subtotal, parseFloat(promo.discount));
      if (discountRow && discountVal) {
        discountRow.style.display = 'flex';
        discountVal.textContent = `-$${discount.toFixed(2)}`;
      }
    } else if (discountRow) {
      discountRow.style.display = 'none';
    }

    const shipping = subtotal >= threshold ? 0 : 4.99;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number((taxable * 0.08).toFixed(2));
    const total = Number((taxable + shipping + tax).toFixed(2));

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    itemsList.innerHTML = items.map(item => `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.title}" class="cart-item-thumb">
        <div class="cart-item-info">
          <h5 class="cart-item-title"><a href="/product.html?id=${item.id || item.product_id}" onclick="Cart.closeDrawer()">${item.title}</a></h5>
          <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>
          <div class="cart-qty-control">
            <button class="qty-btn" onclick="Cart.updateQty(${item.id || item.product_id}, ${(item.quantity || 1) - 1})">-</button>
            <span class="qty-val">${item.quantity || 1}</span>
            <button class="qty-btn" onclick="Cart.updateQty(${item.id || item.product_id}, ${(item.quantity || 1) + 1})">+</button>
          </div>
        </div>
        <button class="cart-item-remove-btn" title="Remove Item" onclick="Cart.removeItem(${item.id || item.product_id})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');
  },

  renderCartPage() {
    const container = document.getElementById('cartPageContainer');
    if (!container) return;

    const items = this.getItems();
    const subtotal = this.getSubtotal();
    const promo = this.getPromo();

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
          <div style="font-size:4rem; color:var(--text-light); margin-bottom:16px;"><i class="bi bi-cart3"></i></div>
          <h3 style="font-size:1.6rem; font-weight:800; margin-bottom:10px;">Your Shopping Cart is Empty</h3>
          <p style="color:var(--text-muted); margin-bottom:24px;">Looks like you haven't added anything yet. Explore our top-tier catalog!</p>
          <a href="/index.html" class="btn btn-primary"><i class="bi bi-arrow-left"></i> Continue Shopping</a>
        </div>
      `;
      return;
    }

    let discount = 0;
    if (promo && promo.discount) {
      discount = Math.min(subtotal, parseFloat(promo.discount));
    }
    const shipping = subtotal >= 50 ? 0 : 4.99;
    const tax = Number((Math.max(0, subtotal - discount) * 0.08).toFixed(2));
    const total = Number((Math.max(0, subtotal - discount) + shipping + tax).toFixed(2));

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:32px; align-items:start;">
        <div style="background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color); padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:16px; margin-bottom:20px;">
            <h3 style="font-size:1.25rem; font-weight:700;">Cart Items (${this.getItemCount()})</h3>
            <button class="btn btn-outline btn-sm" onclick="Cart.clear()" style="color:var(--danger);"><i class="bi bi-trash"></i> Clear Cart</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${items.map(item => `
              <div style="display:flex; gap:16px; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:20px;">
                <img src="${item.image_url}" style="width:84px; height:84px; object-fit:cover; border-radius:var(--radius-md);">
                <div style="flex:1;">
                  <a href="/product.html?id=${item.id || item.product_id}" style="font-weight:700; color:var(--secondary); font-size:1rem;">${item.title}</a>
                  <div style="color:var(--text-muted); font-size:0.85rem; margin-top:2px;">Category: ${item.category_name || 'General'}</div>
                  <div style="font-weight:700; color:var(--primary); font-size:1.1rem; margin-top:6px;">$${parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="cart-qty-control" style="background:#fff; border:1px solid var(--border-color);">
                    <button class="qty-btn" onclick="Cart.updateQty(${item.id || item.product_id}, ${(item.quantity || 1) - 1})">-</button>
                    <span class="qty-val">${item.quantity || 1}</span>
                    <button class="qty-btn" onclick="Cart.updateQty(${item.id || item.product_id}, ${(item.quantity || 1) + 1})">+</button>
                  </div>
                  <div style="font-weight:800; font-size:1.1rem; width:80px; text-align:right;">
                    $${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
                  </div>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger); border:none;" onclick="Cart.removeItem(${item.id || item.product_id})">
                    <i class="bi bi-x-circle-fill" style="font-size:1.2rem;"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Summary Column -->
        <div style="background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color); padding:24px;">
          <h4 style="font-size:1.15rem; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">Order Summary</h4>
          
          <div style="margin-bottom:20px;">
            <label class="form-label" style="font-size:0.85rem;">Have a Promo Code?</label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="cartPagePromoInput" class="form-control" placeholder="e.g. SAVE10, WELCOME20" value="${promo ? promo.code : ''}" style="text-transform:uppercase;">
              <button class="btn btn-outline btn-sm" onclick="Cart.handlePagePromoApply()">Apply</button>
            </div>
            ${promo ? `
              <div style="margin-top:8px; font-size:0.82rem; color:var(--success); display:flex; justify-content:space-between; align-items:center;">
                <span><i class="bi bi-check-circle"></i> ${promo.description}</span>
                <a href="javascript:void(0)" onclick="Cart.removePromo()" style="color:var(--danger); font-size:0.75rem;">Remove</a>
              </div>
            ` : `
              <div style="margin-top:6px; font-size:0.78rem; color:var(--text-muted);">
                💡 Try coupons: <strong>SAVE10</strong> or <strong>WELCOME20</strong>
              </div>
            `}
          </div>

          <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-muted); font-size:0.92rem;">
            <span>Subtotal</span>
            <span style="font-weight:600; color:var(--text-main);">$${subtotal.toFixed(2)}</span>
          </div>

          ${discount > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--success); font-size:0.92rem;">
              <span>Discount (${promo.code})</span>
              <span style="font-weight:600;">-$${discount.toFixed(2)}</span>
            </div>
          ` : ''}

          <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:var(--text-muted); font-size:0.92rem;">
            <span>Estimated Shipping</span>
            <span style="font-weight:600; color:var(--text-main);">${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
          </div>

          <div style="display:flex; justify-content:space-between; margin-bottom:14px; color:var(--text-muted); font-size:0.92rem;">
            <span>Estimated Sales Tax (8%)</span>
            <span style="font-weight:600; color:var(--text-main);">$${tax.toFixed(2)}</span>
          </div>

          <div style="border-top:1px dashed var(--border-color); padding-top:14px; margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:1.15rem; font-weight:800;">Total</span>
            <span style="font-size:1.5rem; font-weight:800; color:var(--primary);">$${total.toFixed(2)}</span>
          </div>

          <a href="/checkout.html" class="btn btn-primary btn-block btn-lg" style="margin-top:24px;">
            Proceed to Checkout <i class="bi bi-arrow-right"></i>
          </a>
        </div>
      </div>
    `;
  },

  async handlePagePromoApply() {
    const input = document.getElementById('cartPagePromoInput');
    if (!input || !input.value.trim()) {
      showToast('Please enter a coupon code.', 'warning');
      return;
    }
    try {
      const res = await this.applyPromo(input.value.trim());
      showToast(res.message, 'success');
      this.renderCartPage();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
