const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../config/database');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Create new order (checkout processing)
router.post('/', optionalAuth, (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country,
      payment_method = 'Credit / Debit Card',
      shipping_method = 'standard',
      promo_code,
      items = []
    } = req.body;

    // Validation
    if (!customer_name || !customer_email || !shipping_address || !shipping_city || !shipping_postal_code || !shipping_country) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required shipping and contact information.'
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add items before placing an order.'
      });
    }

    // Verify products and calculate amounts safely on the server
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prodId = item.product_id || item.id;
      const qty = parseInt(item.quantity) || 1;

      if (qty <= 0) continue;

      const product = get('SELECT id, title, price, stock, image_url FROM products WHERE id = ?', [prodId]);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ID #${prodId} is no longer available.`
        });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Sorry! Only ${product.stock} units of "${product.title}" are in stock.`
        });
      }

      const itemSubtotal = product.price * qty;
      subtotal += itemSubtotal;
      validatedItems.push({
        product_id: product.id,
        product_title: product.title,
        product_image: product.image_url,
        price: product.price,
        quantity: qty,
        subtotal: itemSubtotal
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items found in order.' });
    }

    // Promo code discount calculation
    let discount = 0;
    let validPromoCode = null;
    if (promo_code && promo_code.trim()) {
      const promo = get('SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?) AND active = 1', [promo_code.trim()]);
      if (promo && subtotal >= promo.min_order_amount) {
        validPromoCode = promo.code;
        if (promo.discount_percent > 0) {
          discount = (subtotal * promo.discount_percent) / 100;
        } else if (promo.discount_amount > 0) {
          discount = Math.min(subtotal, promo.discount_amount);
        }
      }
    }

    // Shipping cost
    let shipping_fee = 0;
    if (shipping_method === 'express') {
      shipping_fee = 14.99;
    } else {
      // Standard shipping is free on orders over $50, else $4.99
      shipping_fee = subtotal >= 50 ? 0 : 4.99;
    }

    // Tax (8% estimated standard sales tax on taxable subtotal)
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Number((taxableAmount * 0.08).toFixed(2));
    const total_amount = Number((taxableAmount + shipping_fee + tax).toFixed(2));

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const userId = req.user ? req.user.id : null;

    // Database transaction to create order & update stocks
    const newOrderId = transaction(() => {
      const orderInsert = run(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, shipping_postal_code, shipping_country,
          subtotal, discount, shipping_fee, tax, total_amount, payment_method,
          payment_status, order_status, promo_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', 'Processing', ?)
      `, [
        orderNumber,
        userId,
        customer_name.trim(),
        customer_email.trim().toLowerCase(),
        customer_phone ? customer_phone.trim() : null,
        shipping_address.trim(),
        shipping_city.trim(),
        shipping_postal_code.trim(),
        shipping_country.trim(),
        Number(subtotal.toFixed(2)),
        Number(discount.toFixed(2)),
        shipping_fee,
        tax,
        total_amount,
        payment_method,
        validPromoCode
      ]);

      const orderId = orderInsert.lastInsertRowid;

      const itemInsert = run;
      for (const item of validatedItems) {
        run(`
          INSERT INTO order_items (order_id, product_id, product_title, product_image, price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          item.product_id,
          item.product_title,
          item.product_image,
          item.price,
          item.quantity,
          Number(item.subtotal.toFixed(2))
        ]);

        // Decrement stock
        run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      // If user is logged in, clear their database cart
      if (userId) {
        run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
      }

      return orderId;
    });

    const fullOrder = get('SELECT * FROM orders WHERE id = ?', [newOrderId]);
    fullOrder.items = query('SELECT * FROM order_items WHERE order_id = ?', [newOrderId]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderNumber,
      orderId: newOrderId,
      order: fullOrder
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Failed to process order. ' + error.message });
  }
});

// Get user orders (order history)
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = query(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    for (const order of orders) {
      order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve order history.' });
  }
});

// Get order details by ID or Order Number
router.get('/:idOrNumber', optionalAuth, (req, res) => {
  try {
    const { idOrNumber } = req.params;
    let order;

    if (!isNaN(idOrNumber)) {
      order = get('SELECT * FROM orders WHERE id = ?', [parseInt(idOrNumber)]);
    } else {
      order = get('SELECT * FROM orders WHERE order_number = ?', [idOrNumber]);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Auth check: allow if admin, owner, or if customer email matches query param/guest
    const isOwner = req.user && req.user.id === order.user_id;
    const isAdmin = req.user && req.user.role === 'admin';
    const emailMatch = req.query.email && req.query.email.toLowerCase() === order.customer_email.toLowerCase();

    // If order has no user_id (guest) or user is owner/admin or email supplied
    if (!isAdmin && order.user_id && !isOwner && !emailMatch) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this order.' });
    }

    order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error retrieving order:', error);
    res.status(500).json({ success: false, message: 'Error retrieving order.' });
  }
});

// Admin: Get all orders
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const orders = query(`
      SELECT o.*, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    for (const order of orders) {
      order.items = query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Admin order query error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders.' });
  }
});

// Admin: Update order status
router.put('/admin/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { order_status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status value.' });
    }

    const order = get('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    run('UPDATE orders SET order_status = ? WHERE id = ?', [order_status, orderId]);
    res.json({ success: true, message: `Order status updated to ${order_status}.` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

module.exports = router;
