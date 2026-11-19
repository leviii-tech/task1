const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & Seeding
initDatabase();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);

// Clean URL Route Rewrites for HTML pages
const pages = ['product', 'cart', 'checkout', 'order-success', 'orders', 'login', 'register', 'profile', 'admin'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// Fallback to index.html for root or unknown GET requests
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 ShopNova E-Commerce Server is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📦 Database: SQLite initialized & verified`);
    console.log(`👤 Customer Demo: john@example.com / password123`);
    console.log(`🔑 Admin Demo:    admin@shopnova.com / admin123`);
    console.log(`====================================================`);
  });
}

module.exports = app;
