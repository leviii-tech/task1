/**
 * ShopNova - Product Catalog & Filtering Manager
 */

const ProductsManager = {
  state: {
    category: 'all',
    search: '',
    minPrice: '',
    maxPrice: '',
    sort: 'featured',
    page: 1,
    limit: 8
  },

  init() {
    // Read URL search params if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('search')) {
      this.state.search = urlParams.get('search');
      const searchInputs = document.querySelectorAll('.nav-search-input');
      searchInputs.forEach(i => i.value = this.state.search);
    }
    if (urlParams.get('category')) {
      this.state.category = urlParams.get('category');
    }

    this.loadCategories();
    this.loadFeatured();
    this.loadProducts();
    this.bindEvents();
  },

  bindEvents() {
    // Sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sort = e.target.value;
        this.state.page = 1;
        this.loadProducts();
      });
    }

    // Price filter form
    const priceForm = document.getElementById('priceFilterForm');
    if (priceForm) {
      priceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const minVal = document.getElementById('minPriceInput').value;
        const maxVal = document.getElementById('maxPriceInput').value;
        this.state.minPrice = minVal;
        this.state.maxPrice = maxVal;
        this.state.page = 1;
        this.loadProducts();
      });
    }

    // Reset filters
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  },

  applySearch(query) {
    this.state.search = query;
    this.state.page = 1;
    this.loadProducts();
  },

  setCategory(slug) {
    this.state.category = slug;
    this.state.page = 1;

    // Update active class on chips
    document.querySelectorAll('.cat-chip').forEach(chip => {
      if (chip.getAttribute('data-slug') === slug) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Update radio in sidebar
    const radio = document.querySelector(`input[name="categoryFilter"][value="${slug}"]`);
    if (radio) radio.checked = true;

    this.loadProducts();
  },

  resetFilters() {
    this.state.category = 'all';
    this.state.search = '';
    this.state.minPrice = '';
    this.state.maxPrice = '';
    this.state.sort = 'featured';
    this.state.page = 1;

    const minInput = document.getElementById('minPriceInput');
    const maxInput = document.getElementById('maxPriceInput');
    const searchInputs = document.querySelectorAll('.nav-search-input');
    const sortSelect = document.getElementById('sortSelect');

    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    searchInputs.forEach(i => i.value = '');
    if (sortSelect) sortSelect.value = 'featured';

    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('.cat-chip[data-slug="all"]');
    if (allChip) allChip.classList.add('active');

    const allRadio = document.querySelector('input[name="categoryFilter"][value="all"]');
    if (allRadio) allRadio.checked = true;

    this.loadProducts();
  },

  async loadCategories() {
    try {
      const res = await API.get('/api/products/categories');
      if (res.success && res.categories) {
        this.renderCategoryChips(res.categories);
        this.renderSidebarCategories(res.categories);
      }
    } catch (err) {
      console.warn('Error fetching categories:', err);
    }
  },

  renderCategoryChips(categories) {
    const container = document.getElementById('categoryChipsContainer');
    if (!container) return;

    let html = `
      <button class="cat-chip ${this.state.category === 'all' ? 'active' : ''}" data-slug="all" onclick="ProductsManager.setCategory('all')">
        <i class="bi bi-grid-fill"></i> All Items
      </button>
    `;

    categories.forEach(cat => {
      const isActive = this.state.category === cat.slug;
      html += `
        <button class="cat-chip ${isActive ? 'active' : ''}" data-slug="${cat.slug}" onclick="ProductsManager.setCategory('${cat.slug}')">
          <i class="bi ${cat.icon || 'bi-tag'}"></i> ${cat.name} (${cat.product_count})
        </button>
      `;
    });

    container.innerHTML = html;
  },

  renderSidebarCategories(categories) {
    const list = document.getElementById('sidebarCategoryList');
    if (!list) return;

    let totalProducts = categories.reduce((sum, c) => sum + c.product_count, 0);

    let html = `
      <li class="filter-item">
        <label>
          <span>
            <input type="radio" name="categoryFilter" value="all" ${this.state.category === 'all' ? 'checked' : ''} onchange="ProductsManager.setCategory('all')">
            All Categories
          </span>
          <span style="font-size:0.78rem; color:var(--text-light);">${totalProducts}</span>
        </label>
      </li>
    `;

    categories.forEach(cat => {
      html += `
        <li class="filter-item">
          <label>
            <span>
              <input type="radio" name="categoryFilter" value="${cat.slug}" ${this.state.category === cat.slug ? 'checked' : ''} onchange="ProductsManager.setCategory('${cat.slug}')">
              ${cat.name}
            </span>
            <span style="font-size:0.78rem; color:var(--text-light);">${cat.product_count}</span>
          </label>
        </li>
      `;
    });

    list.innerHTML = html;
  },

  async loadFeatured() {
    const container = document.getElementById('featuredProductsContainer');
    if (!container) return;

    try {
      const res = await API.get('/api/products/featured');
      if (res.success && res.products && res.products.length > 0) {
        container.innerHTML = res.products.slice(0, 4).map(p => this.renderProductCard(p)).join('');
      }
    } catch (err) {
      console.warn('Error loading featured:', err);
    }
  },

  async loadProducts() {
    const grid = document.getElementById('productsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    const paginationEl = document.getElementById('paginationControls');

    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 48px 0; color:var(--text-muted);">
        <i class="bi bi-arrow-repeat" style="font-size:2.5rem; display:inline-block; animation:spin 1s infinite linear;"></i>
        <p style="margin-top:12px; font-weight:500;">Loading fresh inventory...</p>
      </div>
    `;

    try {
      const res = await API.get('/api/products', {
        category: this.state.category,
        search: this.state.search,
        minPrice: this.state.minPrice,
        maxPrice: this.state.maxPrice,
        sort: this.state.sort,
        page: this.state.page,
        limit: this.state.limit
      });

      if (res.success) {
        if (resultsCountEl) {
          resultsCountEl.innerHTML = `Showing <strong>${res.products.length}</strong> of <strong>${res.pagination.total}</strong> products`;
        }

        if (res.products.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 60px 20px; background:#fff; border-radius:var(--radius-lg); border:1px solid var(--border-color);">
              <i class="bi bi-search" style="font-size:3rem; color:var(--text-light); margin-bottom:12px; display:inline-block;"></i>
              <h3 style="font-size:1.35rem; font-weight:700; color:var(--secondary); margin-bottom:8px;">No products match your criteria</h3>
              <p style="color:var(--text-muted); margin-bottom:20px; font-size:0.92rem;">Try adjusting your search terms, price filters, or category choice.</p>
              <button class="btn btn-outline btn-sm" onclick="ProductsManager.resetFilters()">Reset All Filters</button>
            </div>
          `;
          if (paginationEl) paginationEl.innerHTML = '';
          return;
        }

        grid.innerHTML = res.products.map(p => this.renderProductCard(p)).join('');
        this.renderPagination(res.pagination);
      }
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column:1 / -1; text-align:center; padding:40px; color:var(--danger);">
          <p>Failed to load products. ${err.message}</p>
          <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="ProductsManager.loadProducts()">Retry</button>
        </div>
      `;
    }
  },

  renderProductCard(p) {
    const discountPercent = p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : null;

    const starsHtml = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));

    return `
      <div class="product-card">
        <div class="product-thumb-wrap">
          ${discountPercent ? `<span class="badge-discount">-${discountPercent}% OFF</span>` : ''}
          ${p.featured ? `<span class="badge-featured">⭐ Popular</span>` : ''}
          <a href="/product.html?id=${p.id}">
            <img src="${p.image_url}" alt="${p.title}" class="product-thumb" loading="lazy">
          </a>
          <button class="quick-view-overlay-btn" onclick="openQuickView(${p.id})">
            <i class="bi bi-eye"></i> Quick View
          </button>
        </div>
        <div class="product-details">
          <div class="product-meta">
            <span class="product-category">${p.category_name}</span>
            <span class="product-brand">${p.brand || 'NovaStore'}</span>
          </div>
          <h4 class="product-title">
            <a href="/product.html?id=${p.id}">${p.title}</a>
          </h4>
          <div class="product-rating">
            <span class="stars">${starsHtml}</span>
            <span style="font-weight:600; font-size:0.8rem; margin-left:3px;">${p.rating}</span>
            <span class="rating-count">(${p.review_count})</span>
          </div>
          <div class="product-price-row">
            <span class="current-price">$${p.price.toFixed(2)}</span>
            ${p.original_price ? `<span class="original-price">$${p.original_price.toFixed(2)}</span>` : ''}
          </div>
          <div class="product-card-footer">
            <button class="btn-add-cart" onclick="Cart.addItem({id:${p.id}, title:'${p.title.replace(/'/g, "\\'")}', price:${p.price}, image_url:'${p.image_url}', stock:${p.stock}, category_name:'${p.category_name}'}, 1, true)">
              <i class="bi bi-cart-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderPagination(pagination) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:36px;">`;

    // Previous
    html += `
      <button class="btn btn-outline btn-sm" ${pagination.currentPage === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="ProductsManager.changePage(${pagination.currentPage - 1})">
        <i class="bi bi-chevron-left"></i> Previous
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
      const isCurrent = i === pagination.currentPage;
      html += `
        <button class="btn ${isCurrent ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="ProductsManager.changePage(${i})">
          ${i}
        </button>
      `;
    }

    // Next
    html += `
      <button class="btn btn-outline btn-sm" ${pagination.currentPage === pagination.totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} onclick="ProductsManager.changePage(${pagination.currentPage + 1})">
        Next <i class="bi bi-chevron-right"></i>
      </button>
    `;

    html += `</div>`;
    container.innerHTML = html;
  },

  changePage(pageNum) {
    this.state.page = pageNum;
    this.loadProducts();
    const catalogAnchor = document.getElementById('catalog');
    if (catalogAnchor) {
      catalogAnchor.scrollIntoView({ behavior: 'smooth' });
    }
  }
};
