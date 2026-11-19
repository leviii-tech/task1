const express = require('express');
const router = express.Router();
const { query, get, run, transaction } = require('../config/database');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Get all categories with product counts
router.get('/categories', (req, res) => {
  try {
    const categories = query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Could not fetch categories.' });
  }
});

// Get featured products
router.get('/featured', (req, res) => {
  try {
    const products = query(`
      SELECT * FROM products WHERE featured = 1 ORDER BY rating DESC LIMIT 6
    `);
    const formatted = products.map(p => ({
      ...p,
      additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
      specs: p.specs ? JSON.parse(p.specs) : {}
    }));
    res.json({ success: true, products: formatted });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ success: false, message: 'Could not fetch featured products.' });
  }
});

// Get products with search, category filtering, price filtering, sorting, and pagination
router.get('/', (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = 'featured',
      page = 1,
      limit = 12
    } = req.query;

    let sql = 'SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search filter
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchCondition = ' AND (p.title LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
      sql += searchCondition;
      countSql += searchCondition;
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Category filter
    if (category && category !== 'all') {
      const catCondition = ' AND (c.slug = ? OR c.name = ?)';
      sql += catCondition;
      countSql += catCondition;
      params.push(category, category);
      countParams.push(category, category);
    }

    // Min price
    if (minPrice && !isNaN(minPrice)) {
      sql += ' AND p.price >= ?';
      countSql += ' AND p.price >= ?';
      params.push(parseFloat(minPrice));
      countParams.push(parseFloat(minPrice));
    }

    // Max price
    if (maxPrice && !isNaN(maxPrice)) {
      sql += ' AND p.price <= ?';
      countSql += ' AND p.price <= ?';
      params.push(parseFloat(maxPrice));
      countParams.push(parseFloat(maxPrice));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        sql += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY p.price DESC';
        break;
      case 'rating':
        sql += ' ORDER BY p.rating DESC, p.review_count DESC';
        break;
      case 'newest':
        sql += ' ORDER BY p.created_at DESC';
        break;
      case 'title':
        sql += ' ORDER BY p.title ASC';
        break;
      case 'featured':
      default:
        sql += ' ORDER BY p.featured DESC, p.rating DESC';
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const totalCount = get(countSql, countParams).total;
    const products = query(sql, params);

    const formatted = products.map(p => ({
      ...p,
      additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
      specs: p.specs ? JSON.parse(p.specs) : {}
    }));

    res.json({
      success: true,
      products: formatted,
      pagination: {
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error querying products:', error);
    res.status(500).json({ success: false, message: 'Error retrieving products.' });
  }
});

// Get single product by id or slug
router.get('/:idOrSlug', (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let product;

    if (!isNaN(idOrSlug)) {
      product = get('SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [parseInt(idOrSlug)]);
    } else {
      product = get('SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE p.slug = ?', [idOrSlug]);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Fetch product reviews
    const reviews = query(`
      SELECT r.*, COALESCE(u.name, r.user_name) as author_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [product.id]);

    const formattedProduct = {
      ...product,
      additional_images: product.additional_images ? JSON.parse(product.additional_images) : [],
      specs: product.specs ? JSON.parse(product.specs) : {},
      reviews
    };

    res.json({ success: true, product: formattedProduct });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ success: false, message: 'Error fetching product details.' });
  }
});

// Get related products
router.get('/:id/related', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const current = get('SELECT category_id FROM products WHERE id = ?', [productId]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const related = query(`
      SELECT * FROM products
      WHERE category_id = ? AND id != ?
      ORDER BY rating DESC
      LIMIT 4
    `, [current.category_id, productId]);

    res.json({
      success: true,
      products: related.map(p => ({
        ...p,
        additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
        specs: p.specs ? JSON.parse(p.specs) : {}
      }))
    });
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({ success: false, message: 'Error fetching related products.' });
  }
});

// Add a review for a product
router.post('/:id/reviews', optionalAuth, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rating, comment, user_name } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'A rating between 1 and 5 is required.' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Review comment cannot be empty.' });
    }

    const product = get('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const reviewerName = req.user ? req.user.name : (user_name && user_name.trim() ? user_name.trim() : 'Verified Customer');
    const userId = req.user ? req.user.id : null;

    transaction(() => {
      run(`
        INSERT INTO reviews (product_id, user_id, user_name, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `, [productId, userId, reviewerName, parseInt(rating), comment.trim()]);

      // Recalculate average rating
      const stats = get(`
        SELECT COUNT(*) as count, AVG(rating) as avg_rating
        FROM reviews
        WHERE product_id = ?
      `, [productId]);

      run(`
        UPDATE products
        SET rating = ?, review_count = ?
        WHERE id = ?
      `, [Number(stats.avg_rating.toFixed(1)), stats.count, productId]);
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!'
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Could not post review.' });
  }
});

// Admin: Add new product
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      title,
      description,
      price,
      original_price,
      category_id,
      brand,
      image_url,
      additional_images,
      stock = 20,
      featured = 0,
      specs
    } = req.body;

    if (!title || !description || !price || !category_id || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, price, category, and image URL are required.'
      });
    }

    const category = get('SELECT id, name FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Selected category does not exist.' });
    }

    // Slug generation
    let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (get('SELECT id FROM products WHERE slug = ?', [slug])) {
      slug = `${baseSlug}-${counter++}`;
    }

    const result = run(`
      INSERT INTO products (
        title, slug, description, price, original_price,
        category_id, category_name, brand, image_url, additional_images,
        stock, featured, specs, rating, review_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0)
    `, [
      title.trim(),
      slug,
      description.trim(),
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      category.id,
      category.name,
      brand ? brand.trim() : 'NovaStore',
      image_url.trim(),
      additional_images ? (typeof additional_images === 'string' ? additional_images : JSON.stringify(additional_images)) : '[]',
      parseInt(stock) || 20,
      featured ? 1 : 0,
      specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : '{}'
    ]);

    const created = get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      product: created
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// Admin: Update product
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const existing = get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const {
      title,
      description,
      price,
      original_price,
      category_id,
      brand,
      image_url,
      stock,
      featured
    } = req.body;

    let catName = existing.category_name;
    let catId = existing.category_id;
    if (category_id && category_id !== existing.category_id) {
      const cat = get('SELECT id, name FROM categories WHERE id = ?', [category_id]);
      if (cat) {
        catId = cat.id;
        catName = cat.name;
      }
    }

    run(`
      UPDATE products
      SET title = ?, description = ?, price = ?, original_price = ?,
          category_id = ?, category_name = ?, brand = ?, image_url = ?,
          stock = ?, featured = ?
      WHERE id = ?
    `, [
      title ? title.trim() : existing.title,
      description ? description.trim() : existing.description,
      price !== undefined ? parseFloat(price) : existing.price,
      original_price !== undefined ? parseFloat(original_price) : existing.original_price,
      catId,
      catName,
      brand ? brand.trim() : existing.brand,
      image_url ? image_url.trim() : existing.image_url,
      stock !== undefined ? parseInt(stock) : existing.stock,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      productId
    ]);

    const updated = get('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// Admin: Delete product
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const existing = get('SELECT id FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    run('DELETE FROM products WHERE id = ?', [productId]);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;
