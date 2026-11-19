/**
 * ShopNova - Authentication & User State Service
 */
const Auth = {
  TOKEN_KEY: 'shopnova_token',
  USER_KEY: 'shopnova_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.updateNavbar();
    if (window.Cart && Cart.syncWithServer) {
      Cart.syncWithServer();
    }
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.updateNavbar();
  },

  async login(email, password) {
    const res = await API.post('/api/auth/login', { email, password });
    if (res.success) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async register(userData) {
    const res = await API.post('/api/auth/register', userData);
    if (res.success) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async demoLogin(role = 'customer') {
    const res = await API.post('/api/auth/demo-login', { role });
    if (res.success) {
      this.setSession(res.token, res.user);
    }
    return res;
  },

  async fetchCurrentProfile() {
    if (!this.getToken()) return null;
    try {
      const res = await API.get('/api/auth/me');
      if (res.success && res.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        return res.user;
      }
    } catch (err) {
      this.clearSession();
    }
    return null;
  },

  logout() {
    this.clearSession();
    if (typeof showToast === 'function') {
      showToast('You have been logged out.', 'info');
    }
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 400);
  },

  updateNavbar() {
    const container = document.getElementById('nav-auth-container');
    if (!container) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      const initials = (user.name || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      container.innerHTML = `
        <div class="nav-user-container">
          <button class="nav-user-btn" id="navUserToggle" onclick="Auth.toggleUserDropdown(event)">
            <div class="nav-user-avatar">${initials}</div>
            <span class="nav-user-name">${user.name}</span>
            <i class="bi bi-chevron-down" style="font-size:0.75rem;"></i>
          </button>
          <div class="user-dropdown-menu" id="navUserDropdown">
            <div style="padding: 8px 12px; font-size: 0.78rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color); margin-bottom: 4px;">
              Signed in as<br><strong style="color:var(--text-main); font-size:0.85rem;">${user.email}</strong>
            </div>
            ${user.role === 'admin' ? `
              <a href="/admin.html" class="user-dropdown-item">
                <i class="bi bi-shield-lock" style="color:var(--primary);"></i> Admin Dashboard
              </a>
            ` : ''}
            <a href="/orders.html" class="user-dropdown-item">
              <i class="bi bi-box-seam"></i> My Orders
            </a>
            <a href="/profile.html" class="user-dropdown-item">
              <i class="bi bi-person"></i> Account Settings
            </a>
            <div class="user-dropdown-divider"></div>
            <a href="javascript:void(0)" onclick="Auth.logout()" class="user-dropdown-item" style="color:var(--danger);">
              <i class="bi bi-box-arrow-right"></i> Sign Out
            </a>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
          <a href="/login.html" class="btn btn-outline btn-sm">Sign In</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
        </div>
      `;
    }
  },

  toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('navUserDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }
};

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('navUserDropdown');
  const toggle = document.getElementById('navUserToggle');
  if (dropdown && dropdown.classList.contains('show')) {
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  }
});
