/**
 * ShopNova - Global Utilities & UI Event Listeners
 */

// Toast notification helper
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-octagon-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="bi ${icons[type] || icons.info}"></i></div>
    <div class="toast-message">${message}</div>
    <button class="toast-close-btn" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Global Quick-View Modal Controller
async function openQuickView(productId) {
  let modalBackdrop = document.getElementById('quickViewModal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'quickViewModal';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.innerHTML = `
    <div class="modal-card" style="max-width:760px;">
      <button class="modal-close-btn" onclick="closeQuickView()"><i class="bi bi-x-lg"></i></button>
      <div id="quickViewContent" style="display:flex; justify-content:center; align-items:center; min-height:260px;">
        <div style="text-align:center; color:var(--text-muted);"><i class="bi bi-arrow-repeat" style="font-size:2rem; animation:spin 1s infinite linear;"></i><p style="margin-top:8px;">Loading product details...</p></div>
      </div>
    </div>
  `;
  modalBackdrop.classList.add('active');

  try {
    const res = await API.get(`/api/products/${productId}`);
    if (!res.success || !res.product) {
      throw new Error('Product not found.');
    }
    const p = res.product;
    const content = document.getElementById('quickViewContent');

    content.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:28px; width:100%;">
        <div>
          <img src="${p.image_url}" alt="${p.title}" style="width:100%; height:300px; object-fit:cover; border-radius:var(--radius-md);">
        </div>
        <div style="display:flex; flex-direction:column;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:4px;">${p.category_name}</div>
          <h3 style="font-size:1.35rem; font-weight:800; color:var(--secondary); margin-bottom:10px; line-height:1.3;">${p.title}</h3>
          
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:0.85rem;">
            <div class="stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</div>
            <span style="font-weight:600;">${p.rating}</span>
            <span style="color:var(--text-muted);">(${p.review_count} reviews)</span>
          </div>

          <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:14px;">
            <span style="font-size:1.6rem; font-weight:800; color:var(--primary);">$${p.price.toFixed(2)}</span>
            ${p.original_price ? `<span style="font-size:1rem; color:var(--text-muted); text-decoration:line-through;">$${p.original_price.toFixed(2)}</span>` : ''}
          </div>

          <p style="font-size:0.9rem; color:#475569; line-height:1.5; margin-bottom:18px; max-height:85px; overflow-y:auto;">
            ${p.description}
          </p>

          <div style="margin-top:auto; display:flex; gap:12px;">
            <button class="btn btn-primary btn-block" onclick="Cart.addItem({id:${p.id}, title:'${p.title.replace(/'/g, "\\'")}', price:${p.price}, image_url:'${p.image_url}', stock:${p.stock}, category_name:'${p.category_name}'}, 1, true); closeQuickView();">
              <i class="bi bi-bag-plus"></i> Add to Cart
            </button>
            <a href="/product.html?id=${p.id}" class="btn btn-outline" style="white-space:nowrap;">
              Full Details <i class="bi bi-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    const content = document.getElementById('quickViewContent');
    if (content) {
      content.innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message || 'Error loading product'}</div>`;
    }
  }
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Global search bar handling
function initSearchForms() {
  const forms = document.querySelectorAll('.nav-search-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.nav-search-input');
      if (input && input.value.trim()) {
        const query = encodeURIComponent(input.value.trim());
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
          if (window.ProductsManager && ProductsManager.applySearch) {
            ProductsManager.applySearch(input.value.trim());
            return;
          }
        }
        window.location.href = `/index.html?search=${query}#catalog`;
      }
    });
  });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  // Update navbar auth state
  if (window.Auth && Auth.updateNavbar) {
    Auth.updateNavbar();
    Auth.fetchCurrentProfile();
  }

  // Update cart badge & drawer
  if (window.Cart) {
    Cart.updateBadge();
    Cart.renderDrawer();
    const cartPageEl = document.getElementById('cartPageContainer');
    if (cartPageEl) {
      Cart.renderCartPage();
    }
  }

  // Setup search forms
  initSearchForms();

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickView();
      if (window.Cart && Cart.closeDrawer) {
        Cart.closeDrawer();
      }
    }
  });
});
