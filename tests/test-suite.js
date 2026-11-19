const assert = require('assert');
const http = require('http');
const app = require('../server');

const PORT = 3099;
let server;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Starting ShopNova E-Commerce Automated Test Suite...\n');

  server = app.listen(PORT);
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  try {
    // 1. Products API
    await test('GET /api/products returns seeded product catalog', async () => {
      const res = await fetch(`${BASE_URL}/api/products`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.products.length > 0, 'Products list should not be empty');
      assert.ok(data.pagination.total >= 12, 'Should have at least 12 seeded products');
    });

    await test('GET /api/products/categories returns categories with counts', async () => {
      const res = await fetch(`${BASE_URL}/api/products/categories`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.categories.length >= 4, 'Should have at least 4 categories');
      assert.ok(data.categories[0].product_count > 0, 'Category should have product count');
    });

    await test('GET /api/products?search=headphones returns filtered result', async () => {
      const res = await fetch(`${BASE_URL}/api/products?search=headphones`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.products.length >= 1);
      assert.ok(data.products[0].title.toLowerCase().includes('headphones'));
    });

    await test('GET /api/products/featured returns featured items', async () => {
      const res = await fetch(`${BASE_URL}/api/products/featured`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.products.length > 0);
      assert.strictEqual(data.products[0].featured, 1);
    });

    // 2. Single Product Details & Reviews
    let sampleProduct;
    await test('GET /api/products/:id returns detailed product with reviews', async () => {
      const listRes = await fetch(`${BASE_URL}/api/products`);
      const listData = await listRes.json();
      sampleProduct = listData.products[0];

      const res = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.product.id, sampleProduct.id);
      assert.ok(Array.isArray(data.product.reviews), 'Product should include reviews array');
      assert.ok(typeof data.product.specs === 'object', 'Product should have parsed specs object');
    });

    await test('POST /api/products/:id/reviews adds customer review & updates rating', async () => {
      const res = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 5,
          comment: 'Outstanding quality and super fast delivery!',
          user_name: 'Test Reviewer'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify review persisted
      const detailRes = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}`);
      const detailData = await detailRes.json();
      const lastReview = detailData.product.reviews[0];
      assert.strictEqual(lastReview.author_name, 'Test Reviewer');
      assert.strictEqual(lastReview.rating, 5);
    });

    // 3. User Authentication
    let customerToken;
    let adminToken;
    const testEmail = `tester_${Date.now()}@example.com`;

    await test('POST /api/auth/register creates a new user', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sarah Connor',
          email: testEmail,
          password: 'securepassword123',
          phone: '+1 555-4321',
          address: '101 Cyber Way',
          city: 'Los Angeles',
          postal_code: '90001',
          country: 'United States'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token, 'Should return JWT token');
      assert.strictEqual(data.user.email, testEmail);
      customerToken = data.token;
    });

    await test('POST /api/auth/login logs in with registered credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'securepassword123'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
    });

    await test('POST /api/auth/demo-login logs in as admin', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'admin');
      adminToken = data.token;
    });

    await test('GET /api/auth/me returns current authenticated profile', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.email, testEmail);
    });

    // 4. Cart & Promo Codes
    await test('POST /api/cart/apply-promo validates SAVE10 coupon', async () => {
      const res = await fetch(`${BASE_URL}/api/cart/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'SAVE10', subtotal: 100.00 })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.code, 'SAVE10');
      assert.strictEqual(data.discount, 10);
    });

    await test('POST /api/cart/apply-promo rejects invalid coupon', async () => {
      const res = await fetch(`${BASE_URL}/api/cart/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'NONEXISTENT99', subtotal: 100.00 })
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // 5. Order Processing & Checkout
    let createdOrderNumber;
    let initialStock;

    await test('POST /api/orders processes order, validates stock & creates order records', async () => {
      initialStock = sampleProduct.stock;

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customer_name: 'Sarah Connor',
          customer_email: testEmail,
          customer_phone: '+1 555-4321',
          shipping_address: '101 Cyber Way',
          shipping_city: 'Los Angeles',
          shipping_postal_code: '90001',
          shipping_country: 'United States',
          payment_method: 'Credit / Debit Card',
          shipping_method: 'standard',
          promo_code: 'SAVE10',
          items: [
            { product_id: sampleProduct.id, quantity: 2 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orderNumber.startsWith('ORD-'));
      assert.ok(data.order.items.length === 1);
      assert.strictEqual(data.order.items[0].quantity, 2);
      createdOrderNumber = data.orderNumber;

      // Verify stock was decremented in database
      const checkProd = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}`);
      const checkData = await checkProd.json();
      assert.strictEqual(checkData.product.stock, initialStock - 2);
    });

    await test('GET /api/orders/my-orders retrieves user order history', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length >= 1);
      assert.strictEqual(data.orders[0].order_number, createdOrderNumber);
    });

    await test('GET /api/orders/:orderNumber retrieves single order for invoice', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${createdOrderNumber}`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.order_number, createdOrderNumber);
      assert.strictEqual(data.order.order_status, 'Processing');
    });

    // 6. Admin API
    await test('GET /api/orders/admin/all returns all customer orders for admin', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/all`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length >= 1);
    });

    let adminCreatedProductId;
    await test('POST /api/products creates new product (admin only)', async () => {
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Quantum Ergonomic Vertical Mouse',
          category_id: 1,
          price: 69.99,
          original_price: 89.99,
          brand: 'QuantumTech',
          stock: 30,
          featured: 1,
          image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
          description: 'Designed by orthopedists to prevent repetitive strain injury and carpal tunnel syndrome.'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.product.id);
      adminCreatedProductId = data.product.id;
    });

    await test('PUT /api/products/:id updates stock (admin only)', async () => {
      const res = await fetch(`${BASE_URL}/api/products/${adminCreatedProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ stock: 55 })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.product.stock, 55);
    });

    await test('PUT /api/orders/admin/:id/status updates order status (admin only)', async () => {
      // Find created order id
      const ordersRes = await fetch(`${BASE_URL}/api/orders/admin/all`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const ordersData = await ordersRes.json();
      const targetOrder = ordersData.orders.find(o => o.order_number === createdOrderNumber);

      const res = await fetch(`${BASE_URL}/api/orders/admin/${targetOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ order_status: 'Shipped' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify change in customer order view
      const getRes = await fetch(`${BASE_URL}/api/orders/${createdOrderNumber}`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      const getData = await getRes.json();
      assert.strictEqual(getData.order.order_status, 'Shipped');
    });

    await test('DELETE /api/products/:id deletes product (admin only)', async () => {
      const res = await fetch(`${BASE_URL}/api/products/${adminCreatedProductId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
