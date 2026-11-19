const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Validate and apply promo code
router.post('/apply-promo', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a promo code.' });
    }

    const orderSubtotal = parseFloat(subtotal) || 0;
    const promo = get('SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?) AND active = 1', [code.trim()]);

    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid or expired promotional code.' });
    }

    if (orderSubtotal < promo.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Promo code ${promo.code} requires a minimum order amount of $${promo.min_order_amount.toFixed(2)}.`
      });
    }

    let discount = 0;
    if (promo.discount_percent > 0) {
      discount = Number(((orderSubtotal * promo.discount_percent) / 100).toFixed(2));
    } else if (promo.discount_amount > 0) {
      discount = Math.min(orderSubtotal, promo.discount_amount);
    }

    res.json({
      success: true,
      code: promo.code,
      discount,
      description: promo.description,
      message: `Coupon "${promo.code}" applied! You saved $${discount.toFixed(2)}`
    });
  } catch (error) {
    console.error('Error applying promo code:', error);
    res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
  }
});

// Get user cart (if authenticated)
router.get('/', authenticateToken, (req, res) => {
  try {
    const items = query(`
      SELECT ci.id, ci.product_id, ci.quantity,
             p.title, p.price, p.image_url, p.stock, p.category_name, p.slug
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `, [req.user.id]);

    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve cart items.' });
  }
});

// Sync cart (merge guest items after login)
router.post('/sync', authenticateToken, (req, res) => {
  try {
    const { items = [] } = req.body;
    const userId = req.user.id;

    transaction(() => {
      for (const item of items) {
        const prod = get('SELECT id, stock FROM products WHERE id = ?', [item.product_id || item.id]);
        if (prod) {
          const qty = Math.min(Math.max(1, parseInt(item.quantity) || 1), prod.stock);
          run(`
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = ?
          `, [userId, prod.id, qty, qty]);
        }
      }
    });

    const updatedItems = query(`
      SELECT ci.id, ci.product_id, ci.quantity,
             p.title, p.price, p.image_url, p.stock, p.category_name, p.slug
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `, [userId]);

    res.json({ success: true, items: updatedItems });
  } catch (error) {
    console.error('Error syncing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to sync cart.' });
  }
});

// Clear cart
router.delete('/', authenticateToken, (req, res) => {
  try {
    run('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

module.exports = router;
