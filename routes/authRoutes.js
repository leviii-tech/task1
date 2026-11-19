const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, run } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth');

// Register
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone, address, city, postal_code, country } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Check if user already exists
    const existingUser = get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = run(`
      INSERT INTO users (name, email, password, role, phone, address, city, postal_code, country)
      VALUES (?, ?, ?, 'customer', ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      postal_code ? postal_code.trim() : null,
      country ? country.trim() : null
    ]);

    const newUser = get('SELECT id, name, email, role, phone, address, city, postal_code, country, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed due to a server error.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      city: user.city,
      postal_code: user.postal_code,
      country: user.country,
      created_at: user.created_at
    };

    const token = generateToken(safeUser);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed due to a server error.' });
  }
});

// Demo Login Quick-Action
router.post('/demo-login', (req, res) => {
  try {
    const role = req.body.role === 'admin' ? 'admin' : 'customer';
    const email = role === 'admin' ? 'admin@shopnova.com' : 'john@example.com';

    const user = get('SELECT id, name, email, role, phone, address, city, postal_code, country, created_at FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo user not found.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Logged in as demo ${role}!`,
      token,
      user
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ success: false, message: 'Demo login error.' });
  }
});

// Get current profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, address, city, postal_code, country } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    run(`
      UPDATE users
      SET name = ?, phone = ?, address = ?, city = ?, postal_code = ?, country = ?
      WHERE id = ?
    `, [
      name.trim(),
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      postal_code ? postal_code.trim() : null,
      country ? country.trim() : null,
      req.user.id
    ]);

    const updatedUser = get('SELECT id, name, email, role, phone, address, city, postal_code, country, created_at FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

module.exports = router;
