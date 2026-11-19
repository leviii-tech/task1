/**
 * ShopNova - Product Detail Page Controller
 */

const ProductDetail = {
  product: null,
  quantity: 1,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const idOrSlug = urlParams.get('id') || urlParams.get('slug');

    if (!idOrSlug) {
      this.renderError('No product selected. Please browse our catalog.');
      return;
    }

    try {
      const res = await API.get(`/api/products/${idOrSlug}`);
      if (!res.success || !res.product) {
        throw new Error('Product not found.');
      }

      this.product = res.product;
      this.render();
      this.loadRelatedProducts(this.product.id);
      this.bindEvents();
    } catch (err) {
      this.renderError(err.message || 'Could not load product details.');
    }
  },

  render() {
    const p = this.product;

    // Page title
    document.title = `${p.title} - ShopNova Store`;

    // Breadcrumbs
    const breadcrumbCat = document.getElementById('breadcrumbCategory');
    const breadcrumbProd = document.getElementById('breadcrumbProduct');
    if (breadcrumbCat) breadcrumbCat.textContent = p.category_name;
    if (breadcrumbProd) breadcrumbProd.textContent = p.title;

    // Main Image & Gallery
    const mainImg = document.getElementById('mainDetailImage');
    const thumbsContainer = document.getElementById('galleryThumbsContainer');

    if (mainImg) mainImg.src = p.image_url;

    if (thumbsContainer) {
      const allImages = [p.image_url, ...(p.additional_images || [])];
      thumbsContainer.innerHTML = allImages.map((imgUrl, idx) => `
        <img src="${imgUrl}" alt="${p.title}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="ProductDetail.switchImage('${imgUrl}', this)">
      `).join('');
    }

    // Product Info Panel
    const catEl = document.getElementById('detailCategory');
    const brandEl = document.getElementById('detailBrand');
    const titleEl = document.getElementById('detailTitle');
    const priceEl = document.getElementById('detailPrice');
    const origPriceEl = document.getElementById('detailOriginalPrice');
    const savingsEl = document.getElementById('detailSavings');
    const ratingStarsEl = document.getElementById('detailStars');
    const ratingScoreEl = document.getElementById('detailScore');
    const reviewCountEl = document.getElementById('detailReviewCount');
    const stockEl = document.getElementById('detailStockBadge');
    const descEl = document.getElementById('detailDescription');
    const specsTable = document.getElementById('detailSpecsTable');

    if (catEl) catEl.textContent = p.category_name;
    if (brandEl) brandEl.textContent = p.brand || 'NovaStore';
    if (titleEl) titleEl.textContent = p.title;
    if (priceEl) priceEl.textContent = `$${p.price.toFixed(2)}`;

    if (p.original_price && p.original_price > p.price) {
      if (origPriceEl) {
        origPriceEl.textContent = `$${p.original_price.toFixed(2)}`;
        origPriceEl.style.display = 'inline';
      }
      if (savingsEl) {
        const saveAmt = (p.original_price - p.price).toFixed(2);
        savingsEl.textContent = `Save $${saveAmt} (${Math.round((p.original_price - p.price) / p.original_price * 100)}%)`;
        savingsEl.style.display = 'inline-block';
      }
    } else {
      if (origPriceEl) origPriceEl.style.display = 'none';
      if (savingsEl) savingsEl.style.display = 'none';
    }

    const stars = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
    if (ratingStarsEl) ratingStarsEl.textContent = stars;
    if (ratingScoreEl) ratingScoreEl.textContent = p.rating.toFixed(1);
    if (reviewCountEl) reviewCountEl.textContent = `(${p.review_count} customer reviews)`;

    if (stockEl) {
      if (p.stock > 10) {
        stockEl.className = 'product-info-stock stock-in';
        stockEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> In Stock (${p.stock} units available)`;
      } else if (p.stock > 0) {
        stockEl.className = 'product-info-stock stock-low';
        stockEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Low Stock (Only ${p.stock} remaining!)`;
      } else {
        stockEl.className = 'product-info-stock stock-out';
        stockEl.innerHTML = `<i class="bi bi-x-circle-fill"></i> Out of Stock`;
      }
    }

    if (descEl) descEl.textContent = p.description;

    // Tech Specs
    if (specsTable && p.specs && Object.keys(p.specs).length > 0) {
      specsTable.innerHTML = Object.entries(p.specs).map(([key, val]) => `
        <tr>
          <th>${key}</th>
          <td>${val}</td>
        </tr>
      `).join('');
    } else if (specsTable) {
      specsTable.innerHTML = `
        <tr><th>Brand</th><td>${p.brand || 'ShopNova Certified'}</td></tr>
        <tr><th>Category</th><td>${p.category_name}</td></tr>
        <tr><th>Condition</th><td>Brand New, Factory Sealed</td></tr>
        <tr><th>Warranty</th><td>1 Year Manufacturer Warranty</td></tr>
      `;
    }

    // Reviews Section
    this.renderReviews(p.reviews || []);
  },

  switchImage(imgUrl, thumbEl) {
    const mainImg = document.getElementById('mainDetailImage');
    if (mainImg) mainImg.src = imgUrl;

    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  },

  updateQuantity(delta) {
    const maxStock = this.product.stock || 99;
    const newQty = this.quantity + delta;
    if (newQty >= 1 && newQty <= maxStock) {
      this.quantity = newQty;
      const qtyEl = document.getElementById('detailQtyValue');
      if (qtyEl) qtyEl.textContent = this.quantity;
    }
  },

  addToCart(buyNow = false) {
    if (!this.product) return;
    if (this.product.stock <= 0) {
      showToast('This product is currently out of stock.', 'error');
      return;
    }

    Cart.addItem(this.product, this.quantity, !buyNow);

    if (buyNow) {
      window.location.href = '/checkout.html';
    }
  },

  renderReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    const countHeader = document.getElementById('reviewsHeaderCount');
    if (!container) return;

    if (countHeader) countHeader.textContent = reviews.length;

    if (reviews.length === 0) {
      container.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted); background:var(--bg-alt); border-radius:var(--radius-md);">
          <i class="bi bi-chat-square-text" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
          No reviews yet. Be the first to share your experience with this item!
        </div>
      `;
      return;
    }

    container.innerHTML = reviews.map(r => `
      <div style="border-bottom:1px solid var(--border-color); padding:16px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--secondary); font-size:0.95rem;">${r.author_name || r.user_name}</strong>
            <span style="font-size:0.75rem; background:var(--success-light); color:var(--success); padding:2px 6px; border-radius:var(--radius-full); font-weight:600;">Verified Buyer</span>
          </div>
          <span style="font-size:0.8rem; color:var(--text-light);">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <div class="stars" style="font-size:0.85rem; margin-bottom:6px;">
          ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
        </div>
        <p style="font-size:0.92rem; color:#334155; line-height:1.5;">${r.comment}</p>
      </div>
    `).join('');
  },

  async handleReviewSubmit(e) {
    e.preventDefault();
    const ratingInput = document.querySelector('input[name="reviewRating"]:checked');
    const commentInput = document.getElementById('reviewCommentInput');
    const nameInput = document.getElementById('reviewNameInput');

    if (!ratingInput) {
      showToast('Please select a star rating (1-5).', 'warning');
      return;
    }

    if (!commentInput || !commentInput.value.trim()) {
      showToast('Please enter your review comments.', 'warning');
      return;
    }

    try {
      const res = await API.post(`/api/products/${this.product.id}/reviews`, {
        rating: parseInt(ratingInput.value),
        comment: commentInput.value.trim(),
        user_name: nameInput ? nameInput.value.trim() : null
      });

      if (res.success) {
        showToast('Thank you! Your review has been published.', 'success');
        commentInput.value = '';
        // Reload details to refresh ratings
        this.init();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error');
    }
  },

  async loadRelatedProducts(productId) {
    const container = document.getElementById('relatedProductsGrid');
    if (!container) return;

    try {
      const res = await API.get(`/api/products/${productId}/related`);
      if (res.success && res.products && res.products.length > 0) {
        container.innerHTML = res.products.map(p => `
          <div class="product-card">
            <div class="product-thumb-wrap">
              <a href="/product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.title}" class="product-thumb"></a>
            </div>
            <div class="product-details">
              <span class="product-category" style="font-size:0.75rem;">${p.category_name}</span>
              <h5 class="product-title" style="font-size:0.92rem;"><a href="/product.html?id=${p.id}">${p.title}</a></h5>
              <div class="product-price-row">
                <span class="current-price" style="font-size:1.1rem;">$${p.price.toFixed(2)}</span>
              </div>
              <button class="btn-add-cart" style="padding:6px; font-size:0.82rem;" onclick="Cart.addItem({id:${p.id}, title:'${p.title.replace(/'/g, "\\'")}', price:${p.price}, image_url:'${p.image_url}', stock:${p.stock}, category_name:'${p.category_name}'}, 1, true)">
                Add to Cart
              </button>
            </div>
          </div>
        `).join('');
      } else {
        const wrap = document.getElementById('relatedSectionWrap');
        if (wrap) wrap.style.display = 'none';
      }
    } catch (e) {
      // Ignored
    }
  },

  bindEvents() {
    const reviewForm = document.getElementById('addReviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
    }
  },

  renderError(msg) {
    const wrap = document.querySelector('.product-detail-wrap');
    if (wrap) {
      wrap.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 80px 20px; background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
          <i class="bi bi-exclamation-circle" style="font-size:3.5rem; color:var(--danger); margin-bottom:16px; display:inline-block;"></i>
          <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:10px;">${msg}</h2>
          <p style="color:var(--text-muted); margin-bottom:24px;">The product may have been moved, removed, or is temporarily out of service.</p>
          <a href="/index.html" class="btn btn-primary"><i class="bi bi-arrow-left"></i> Return to Catalog</a>
        </div>
      `;
    }
  }
};
