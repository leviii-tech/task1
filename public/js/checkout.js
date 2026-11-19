/**
 * ShopNova - Checkout & Order Processing Controller
 */

const Checkout = {
  shippingMethod: 'standard',
  paymentMethod: 'Credit / Debit Card',

  init() {
    const items = Cart.getItems();
    if (items.length === 0) {
      window.location.href = '/cart.html';
      return;
    }

    this.prefillUserData();
    this.renderOrderSummary();
    this.bindEvents();
  },

  prefillUserData() {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      if (user) {
        const nameInput = document.getElementById('checkoutName');
        const emailInput = document.getElementById('checkoutEmail');
        const phoneInput = document.getElementById('checkoutPhone');
        const addressInput = document.getElementById('checkoutAddress');
        const cityInput = document.getElementById('checkoutCity');
        const zipInput = document.getElementById('checkoutZip');
        const countryInput = document.getElementById('checkoutCountry');

        if (nameInput && !nameInput.value) nameInput.value = user.name || '';
        if (emailInput && !emailInput.value) emailInput.value = user.email || '';
        if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
        if (addressInput && !addressInput.value) addressInput.value = user.address || '';
        if (cityInput && !cityInput.value) cityInput.value = user.city || '';
        if (zipInput && !zipInput.value) zipInput.value = user.postal_code || '';
        if (countryInput && !countryInput.value) countryInput.value = user.country || 'United States';
      }
    }
  },

  bindEvents() {
    // Shipping options
    const standardOpt = document.getElementById('shipMethodStandard');
    const expressOpt = document.getElementById('shipMethodExpress');

    if (standardOpt) {
      standardOpt.addEventListener('click', () => {
        this.shippingMethod = 'standard';
        standardOpt.classList.add('selected');
        if (expressOpt) expressOpt.classList.remove('selected');
        this.renderOrderSummary();
      });
    }

    if (expressOpt) {
      expressOpt.addEventListener('click', () => {
        this.shippingMethod = 'express';
        expressOpt.classList.add('selected');
        if (standardOpt) standardOpt.classList.remove('selected');
        this.renderOrderSummary();
      });
    }

    // Payment tab buttons
    const paymentBtns = document.querySelectorAll('.payment-tab-btn');
    paymentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        paymentBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.paymentMethod = btn.getAttribute('data-method');

        const cardDetails = document.getElementById('cardDetailsContainer');
        const codNotice = document.getElementById('codNoticeContainer');
        if (this.paymentMethod === 'Cash on Delivery') {
          if (cardDetails) cardDetails.style.display = 'none';
          if (codNotice) codNotice.style.display = 'block';
        } else {
          if (cardDetails) cardDetails.style.display = 'block';
          if (codNotice) codNotice.style.display = 'none';
        }
      });
    });

    // Credit Card formatting & Live simulator preview
    const cardNumberInput = document.getElementById('cardNumberInput');
    const cardSimNumber = document.getElementById('cardSimNumber');
    const cardNameInput = document.getElementById('cardNameInput');
    const cardSimName = document.getElementById('cardSimName');
    const cardExpiryInput = document.getElementById('cardExpiryInput');
    const cardSimExpiry = document.getElementById('cardSimExpiry');

    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 16);
        let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
        e.target.value = formatted;
        if (cardSimNumber) {
          cardSimNumber.textContent = formatted || '•••• •••• •••• ••••';
        }
      });
    }

    if (cardNameInput && cardSimName) {
      cardNameInput.addEventListener('input', (e) => {
        cardSimName.textContent = e.target.value.toUpperCase() || 'YOUR NAME';
      });
    }

    if (cardExpiryInput) {
      cardExpiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (val.length >= 2) {
          val = val.substring(0, 2) + '/' + val.substring(2);
        }
        e.target.value = val;
        if (cardSimExpiry) {
          cardSimExpiry.textContent = val || 'MM/YY';
        }
      });
    }

    // Checkout form submission
    const form = document.getElementById('checkoutForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmitOrder(e));
    }
  },

  renderOrderSummary() {
    const items = Cart.getItems();
    const subtotal = Cart.getSubtotal();
    const promo = Cart.getPromo();

    const itemsContainer = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const discountRow = document.getElementById('checkoutDiscountRow');
    const discountVal = document.getElementById('checkoutDiscountVal');
    const shippingEl = document.getElementById('checkoutShipping');
    const taxEl = document.getElementById('checkoutTax');
    const totalEl = document.getElementById('checkoutTotal');

    if (itemsContainer) {
      itemsContainer.innerHTML = items.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="position:relative;">
              <img src="${item.image_url}" style="width:48px; height:48px; border-radius:var(--radius-sm); object-fit:cover;">
              <span style="position:absolute; top:-6px; right:-6px; background:var(--primary); color:#fff; font-size:0.68rem; font-weight:700; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                ${item.quantity || 1}
              </span>
            </div>
            <div>
              <div style="font-size:0.86rem; font-weight:600; color:var(--secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${item.title}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted);">$${parseFloat(item.price).toFixed(2)} each</div>
            </div>
          </div>
          <div style="font-weight:700; font-size:0.9rem;">
            $${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
          </div>
        </div>
      `).join('');
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

    let shippingFee = 0;
    if (this.shippingMethod === 'express') {
      shippingFee = 14.99;
    } else {
      shippingFee = subtotal >= 50 ? 0 : 4.99;
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Number((taxableAmount * 0.08).toFixed(2));
    const total = Number((taxableAmount + shippingFee + tax).toFixed(2));

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  },

  async applyCheckoutPromo() {
    const input = document.getElementById('checkoutPromoInput');
    if (!input || !input.value.trim()) {
      showToast('Please enter a coupon code', 'warning');
      return;
    }
    try {
      const res = await Cart.applyPromo(input.value.trim());
      showToast(res.message, 'success');
      this.renderOrderSummary();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async handleSubmitOrder(e) {
    e.preventDefault();

    const name = document.getElementById('checkoutName').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const zip = document.getElementById('checkoutZip').value.trim();
    const country = document.getElementById('checkoutCountry').value.trim();

    if (!name || !email || !address || !city || !zip || !country) {
      showToast('Please complete all required shipping fields.', 'warning');
      return;
    }

    // If card payment, simulate minimal card number check
    if (this.paymentMethod === 'Credit / Debit Card') {
      const cardNum = document.getElementById('cardNumberInput').value.replace(/\s/g, '');
      const cardExp = document.getElementById('cardExpiryInput').value;
      const cardCvv = document.getElementById('cardCvvInput').value;

      if (!cardNum || cardNum.length < 15 || !cardExp || !cardCvv) {
        showToast('Please enter valid credit card payment details.', 'warning');
        return;
      }
    }

    const submitBtn = document.getElementById('placeOrderBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation:spin 1s infinite linear;"></i> Processing Secure Order...`;
    }

    try {
      const items = Cart.getItems().map(i => ({
        product_id: i.id || i.product_id,
        quantity: i.quantity || 1
      }));
      const promo = Cart.getPromo();

      const orderPayload = {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        shipping_address: address,
        shipping_city: city,
        shipping_postal_code: zip,
        shipping_country: country,
        payment_method: this.paymentMethod,
        shipping_method: this.shippingMethod,
        promo_code: promo ? promo.code : null,
        items
      };

      const res = await API.post('/api/orders', orderPayload);

      if (res.success && res.orderNumber) {
        Cart.clear();
        showToast('Order confirmed! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = `/order-success.html?orderNumber=${res.orderNumber}&orderId=${res.orderId}&email=${encodeURIComponent(email)}`;
        }, 600);
      } else {
        throw new Error(res.message || 'Failed to place order.');
      }
    } catch (err) {
      showToast(err.message || 'Error processing order.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Complete Order & Pay <i class="bi bi-shield-check"></i>`;
      }
    }
  }
};
