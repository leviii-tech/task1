const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'store.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for performance and data integrity
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      phone TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      country TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      category_name TEXT NOT NULL,
      brand TEXT,
      image_url TEXT NOT NULL,
      additional_images TEXT,
      rating REAL DEFAULT 4.5,
      review_count INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 25,
      featured INTEGER DEFAULT 0,
      specs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      shipping_country TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'Paid',
      order_status TEXT DEFAULT 'Processing',
      promo_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_title TEXT NOT NULL,
      product_image TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      min_order_amount REAL DEFAULT 0,
      description TEXT,
      active INTEGER DEFAULT 1
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('admin123', salt);
    const demoPasswordHash = bcrypt.hashSync('password123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, address, city, postal_code, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'Store Admin',
      'admin@shopnova.com',
      adminPasswordHash,
      'admin',
      '+1 (555) 019-2834',
      '100 Market St, Suite 400',
      'San Francisco',
      '94105',
      'United States'
    );

    insertUser.run(
      'John Doe',
      'john@example.com',
      demoPasswordHash,
      'customer',
      '+1 (555) 234-5678',
      '742 Evergreen Terrace',
      'Springfield',
      '97477',
      'United States'
    );
  }

  const promoCount = db.prepare('SELECT COUNT(*) as count FROM promo_codes').get().count;
  if (promoCount === 0) {
    const insertPromo = db.prepare(`
      INSERT INTO promo_codes (code, discount_percent, discount_amount, min_order_amount, description, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPromo.run('SAVE10', 10, 0, 0, '10% off entire order', 1);
    insertPromo.run('WELCOME20', 20, 0, 50, '20% off orders over $50', 1);
    insertPromo.run('FREESHIP', 0, 15, 30, '$15 instant shipping credit', 1);
  }

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (name, slug, icon, description)
      VALUES (?, ?, ?, ?)
    `);
    insertCat.run('Electronics & Gadgets', 'electronics', 'bi-laptop', 'Cutting-edge tech, personal audio, and daily productivity essentials.');
    insertCat.run('Audio & Wearables', 'audio-wearables', 'bi-headphones', 'Immersive spatial audio, studio-grade monitors, and fitness trackers.');
    insertCat.run('Fashion & Lifestyle', 'fashion', 'bi-handbag', 'Timeless wardrobe staples, waterproof carry goods, and accessories.');
    insertCat.run('Home & Workspace', 'home-living', 'bi-lamp', 'Modern ergonomic furniture, ambient lighting, and artisan living goods.');
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const categoriesList = db.prepare('SELECT id, name, slug FROM categories').all();
    const catMap = {};
    for (const cat of categoriesList) {
      catMap[cat.slug] = { id: cat.id, name: cat.name };
    }

    const insertProduct = db.prepare(`
      INSERT INTO products (
        title, slug, description, price, original_price,
        category_id, category_name, brand, image_url, additional_images,
        rating, review_count, stock, featured, specs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const productsToSeed = [
      {
        title: 'Aura Pro Active Noise-Cancelling Headphones',
        slug: 'aura-pro-anc-headphones',
        description: 'Immerse yourself in rich, high-fidelity acoustics. Featuring hybrid 40mm titanium drivers, 45 hours of battery life with ultra-fast charging, customizable spatial EQ, and plush memory foam earcups for all-day listening sessions.',
        price: 199.99,
        original_price: 249.99,
        category: 'audio-wearables',
        brand: 'SoundAura',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.8,
        review_count: 64,
        stock: 18,
        featured: 1,
        specs: JSON.stringify({
          'Battery Life': 'Up to 45 Hours',
          'Connectivity': 'Bluetooth 5.3 & 3.5mm Aux',
          'Noise Cancellation': 'Hybrid ANC (-38dB)',
          'Weight': '250g',
          'Warranty': '2 Years International'
        })
      },
      {
        title: 'Horizon Ultralight 15.6" Retina Laptop',
        slug: 'horizon-ultralight-laptop',
        description: 'Engineered for developers, creators, and professionals on the move. Powered by an efficient 12-core processor, 32GB LPDDR5 RAM, 1TB NVMe Gen4 SSD, and a color-calibrated 120Hz 4K anti-glare display housed in aero-grade milled aluminum.',
        price: 1199.00,
        original_price: 1399.00,
        category: 'electronics',
        brand: 'HorizonTech',
        image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.9,
        review_count: 42,
        stock: 12,
        featured: 1,
        specs: JSON.stringify({
          'Processor': 'Octa-Core 3.8GHz Turbo',
          'RAM': '32GB LPDDR5',
          'Storage': '1TB NVMe SSD',
          'Display': '15.6" 4K OLED 120Hz',
          'Weight': '1.35 kg'
        })
      },
      {
        title: 'Vanguard Chrono Swiss Movement Watch',
        slug: 'vanguard-chrono-watch',
        description: 'Exquisite craftsmanship meets modern utility. Features a scratch-resistant sapphire crystal lens, surgical-grade 316L stainless steel case, genuine Tuscan vegetable-tanned leather strap, and 50m water resistance.',
        price: 245.00,
        original_price: 320.00,
        category: 'fashion',
        brand: 'Vanguard',
        image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.7,
        review_count: 38,
        stock: 15,
        featured: 1,
        specs: JSON.stringify({
          'Movement': 'Swiss Quartz Chronograph',
          'Case Diameter': '41mm',
          'Water Resistance': '5 ATM / 50m',
          'Strap Material': 'Italian Full-Grain Leather'
        })
      },
      {
        title: 'BaristaCraft Pro Dual-Boiler Espresso Machine',
        slug: 'baristacraft-pro-espresso',
        description: 'Master coffee shop quality lattes and rich single-origin espresso at home. Dual PID temperature control, commercial 58mm portafilter, 15-bar Italian pump, and micro-foam steam wand for precision latte art.',
        price: 489.00,
        original_price: 579.00,
        category: 'home-living',
        brand: 'BaristaCraft',
        image_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.9,
        review_count: 51,
        stock: 8,
        featured: 1,
        specs: JSON.stringify({
          'Pump Pressure': '15 Bar Italian ULKA',
          'Water Tank': '2.2L Removable',
          'Heating System': 'Dual PID Thermoblock',
          'Portafilter': '58mm Solid Stainless'
        })
      },
      {
        title: 'ErgoWave Precision Wireless Mechanical Keyboard',
        slug: 'ergowave-mechanical-keyboard',
        description: 'Crafted for tactile pleasure and rapid typing. Hot-swappable custom lubricated switches, gasket mount design with sound-dampening silicone, per-key RGB backlighting, and seamless multi-device Bluetooth/2.4GHz switching.',
        price: 139.50,
        original_price: 169.00,
        category: 'electronics',
        brand: 'KeyNova',
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.6,
        review_count: 29,
        stock: 22,
        featured: 0,
        specs: JSON.stringify({
          'Switches': 'Custom Pre-lubed Linear Red',
          'Layout': '75% Compact (84 Keys)',
          'Battery': '4000mAh (Up to 200 hrs)',
          'Connectivity': 'Bluetooth 5.1 / 2.4G / Type-C'
        })
      },
      {
        title: 'PulseSync GPS Multisport Smartwatch',
        slug: 'pulsesync-gps-smartwatch',
        description: 'Track your fitness, VO2 Max, heart rate variability, sleep stages, and navigation. 1.4" AMOLED display with sapphire crystal, 14-day battery endurance, and 100+ workout modes.',
        price: 179.99,
        original_price: 219.99,
        category: 'audio-wearables',
        brand: 'PulseSync',
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.7,
        review_count: 53,
        stock: 30,
        featured: 1,
        specs: JSON.stringify({
          'Battery Life': 'Up to 14 Days',
          'Display': '1.4" AMOLED 454x454',
          'Waterproof': '50M / 5 ATM',
          'Sensors': 'Optical HR, SpO2, Barometer, GPS'
        })
      },
      {
        title: 'Nordic Minimalist Waterproof Commuter Backpack',
        slug: 'nordic-commuter-backpack',
        description: 'Sleek weatherproof pack tailored for urban life and international travel. Dedicated padded 16" laptop sleeve, hidden anti-theft passport pocket, ergonomic air-mesh back panel, and magnetic Fidlock buckles.',
        price: 89.99,
        original_price: 120.00,
        category: 'fashion',
        brand: 'Nordik',
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.8,
        review_count: 77,
        stock: 25,
        featured: 0,
        specs: JSON.stringify({
          'Capacity': '22 Liters',
          'Material': 'Weatherproof 900D Recycled Nylon',
          'Laptop Sleeve': 'Fits up to 16.2" MacBook',
          'Weight': '820g'
        })
      },
      {
        title: 'Lumiere Scandinavian Ambient Table Lamp',
        slug: 'lumiere-ambient-table-lamp',
        description: 'Cast a warm, tranquil glow across your bedroom or home office. Crafted with matte ceramic and frosted mouth-blown opal glass. Features 3-step stepless touch dimming and warm 2700K LED filament.',
        price: 64.00,
        original_price: 79.99,
        category: 'home-living',
        brand: 'Lumiere Studio',
        image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.5,
        review_count: 21,
        stock: 19,
        featured: 0,
        specs: JSON.stringify({
          'Color Temp': '2700K Warm Amber',
          'Dimming': 'Touch Capacitive 3-Level',
          'Base': 'Handcrafted Natural Ceramic',
          'Cord': 'Braided Textile 1.8m'
        })
      },
      {
        title: 'SonicBlast 360 Rugged Waterproof Speaker',
        slug: 'sonicblast-360-speaker',
        description: 'Take thunderous bass and crystal highs everywhere. IP67 dustproof and submersible waterproof, 24 hours of playback, built-in power bank to recharge your phone, and PartyCast pairing up to 100 units.',
        price: 79.99,
        original_price: 99.99,
        category: 'audio-wearables',
        brand: 'SoundAura',
        image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.6,
        review_count: 45,
        stock: 35,
        featured: 0,
        specs: JSON.stringify({
          'Waterproof Rating': 'IP67 Submersible',
          'Battery Life': '24 Hours',
          'Output Power': '30W RMS',
          'Charge Out': 'USB-A 5V/2A Power Bank'
        })
      },
      {
        title: 'ApexCapture 4K Cinematic Action Camera',
        slug: 'apexcapture-4k-action-camera',
        description: 'Record stunning 4K 60fps video with 6-axis hyper-smooth gyro stabilization. Features dual color touchscreens, 155-degree ultra-wide lens, 10m waterproof naked body, and voice control.',
        price: 219.00,
        original_price: 279.00,
        category: 'electronics',
        brand: 'LumixGo',
        image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.7,
        review_count: 36,
        stock: 14,
        featured: 0,
        specs: JSON.stringify({
          'Video Resolution': '4K @ 60fps, 1080p @ 240fps',
          'Photo': '20MP RAW & JPEG',
          'Stabilization': 'HyperSmooth 3.0',
          'Waterproof': '10m without housing'
        })
      },
      {
        title: 'Titanium Polarized Aviator Sunglasses',
        slug: 'titanium-polarized-aviators',
        description: 'Ultralight, shatterproof, and effortless elegance. Japanese titanium frame weighing only 18 grams with anti-reflective UV400 polarized gradient lenses that eliminate glare while preserving true color fidelity.',
        price: 74.99,
        original_price: 99.00,
        category: 'fashion',
        brand: 'Solis Eyewear',
        image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.8,
        review_count: 19,
        stock: 40,
        featured: 0,
        specs: JSON.stringify({
          'Frame': 'Pure Beta Titanium',
          'Lens': 'CR-39 Polarized UV400',
          'Weight': '18.4 grams',
          'Includes': 'Leather Hard Case & Microfiber Cloth'
        })
      },
      {
        title: 'ErgoPro High-Density Mesh Task Chair',
        slug: 'ergopro-mesh-task-chair',
        description: 'Say goodbye to back fatigue during long sessions. Dynamic responsive lumbar support, 4D adjustable armrests, breathable Korean elastic mesh, and 135-degree smooth recline with synchro-tilt lock.',
        price: 289.00,
        original_price: 369.00,
        category: 'home-living',
        brand: 'SteelWork',
        image_url: 'https://images.unsplash.com/photo-1580481077145-21d7bfa5d9eb?w=800&auto=format&fit=crop&q=80',
        additional_images: JSON.stringify([
          'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&auto=format&fit=crop&q=80'
        ]),
        rating: 4.9,
        review_count: 67,
        stock: 11,
        featured: 1,
        specs: JSON.stringify({
          'Max Load': '330 lbs / 150 kg',
          'Mesh': 'Breathable Tensile Fiber',
          'Armrests': '4-Directional Cushioned',
          'Certification': 'BIFMA & ANSI Tested'
        })
      }
    ];

    for (const p of productsToSeed) {
      const cat = catMap[p.category];
      insertProduct.run(
        p.title,
        p.slug,
        p.description,
        p.price,
        p.original_price,
        cat ? cat.id : 1,
        cat ? cat.name : 'General',
        p.brand,
        p.image_url,
        p.additional_images,
        p.rating,
        p.review_count,
        p.stock,
        p.featured,
        p.specs
      );
    }
  }

  // Seed sample reviews
  const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
  if (reviewCount === 0) {
    const products = db.prepare('SELECT id, title FROM products LIMIT 4').all();
    const insertReview = db.prepare(`
      INSERT INTO reviews (product_id, user_id, user_name, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `);

    if (products.length > 0) {
      insertReview.run(products[0].id, 2, 'Alex Carter', 5, 'The soundstage on these headphones is jaw-dropping! ANC blocks out subway noise easily.');
      insertReview.run(products[0].id, null, 'Elena Rostova', 4, 'Very comfortable fit even with glasses. Battery lasted over a week with daily commute use.');
    }
    if (products.length > 1) {
      insertReview.run(products[1].id, 2, 'John Doe', 5, 'Unmatched build quality. Fast compiles and the OLED screen is gorgeous.');
    }
    if (products.length > 3) {
      insertReview.run(products[3].id, null, 'Marcus Brody', 5, 'My morning espresso ritual is completely transformed. Heats up in 30 seconds!');
    }
  }

  // Seed sample order for John Doe
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (orderCount === 0) {
    const john = db.prepare("SELECT id, name, email FROM users WHERE email = 'john@example.com'").get();
    const productAura = db.prepare('SELECT * FROM products LIMIT 1').get();

    if (john && productAura) {
      const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const subtotal = productAura.price;
      const discount = 19.99;
      const shipping = 0.00;
      const tax = (subtotal - discount) * 0.08;
      const total = Number((subtotal - discount + shipping + tax).toFixed(2));

      const insertOrder = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, shipping_postal_code, shipping_country,
          subtotal, discount, shipping_fee, tax, total_amount, payment_method,
          payment_status, order_status, promo_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = insertOrder.run(
        orderNumber,
        john.id,
        john.name,
        john.email,
        '+1 (555) 234-5678',
        '742 Evergreen Terrace',
        'Springfield',
        '97477',
        'United States',
        subtotal,
        discount,
        shipping,
        Number(tax.toFixed(2)),
        total,
        'Credit / Debit Card',
        'Paid',
        'Delivered',
        'SAVE10'
      );

      const orderId = orderResult.lastInsertRowid;
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_title, product_image, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        productAura.id,
        productAura.title,
        productAura.image_url,
        productAura.price,
        1,
        productAura.price
      );
    }
  }
}

// Helper methods for queries
module.exports = {
  db,
  initDatabase,
  query: (sql, params = []) => db.prepare(sql).all(...params),
  get: (sql, params = []) => db.prepare(sql).get(...params),
  run: (sql, params = []) => db.prepare(sql).run(...params),
  exec: (sql) => db.exec(sql),
  transaction: (fn) => {
    db.exec('BEGIN TRANSACTION');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
};
