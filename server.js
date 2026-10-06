require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'iphone-store-data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

const DEFAULT_PRODUCTS = [
  {
    id: 'ip-1',
    name: 'iPhone 14',
    model: '14',
    color: 'Azul',
    memory: '128 GB',
    condition: 'Excelente',
    price: 699,
    stock: 3,
    battery: 92,
    status: 'Disponible',
    image: 'https://images.unsplash.com/photo-1672666635131-9d1d646ce21b?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ip-2',
    name: 'iPhone 13 Pro',
    model: '13 Pro',
    color: 'Grafito',
    memory: '256 GB',
    condition: 'Muy bueno',
    price: 849,
    stock: 2,
    battery: 88,
    status: 'Disponible',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ip-3',
    name: 'iPhone 12',
    model: '12',
    color: 'Blanco',
    memory: '64 GB',
    condition: 'Bueno',
    price: 499,
    stock: 0,
    battery: 71,
    status: 'Sin stock',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80'
  }
];

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      admin: {
        username: 'admin',
        passwordHash: hashPassword('admin123')
      },
      products: DEFAULT_PRODUCTS
    };

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function mergeProductsWithLocalOverrides(remoteProducts = [], localProducts = []) {
  const localById = new Map((localProducts || []).map((product) => [String(product.id), product]));
  const merged = [];

  const remoteList = Array.isArray(remoteProducts) ? remoteProducts : [];
  const localList = Array.isArray(localProducts) ? localProducts : [];

  for (const product of remoteList) {
    const normalizedRemote = normalizeProduct(product, product.id);
    const localProduct = localById.get(String(normalizedRemote.id));
    merged.push(localProduct ? {
      ...normalizedRemote,
      ...localProduct,
      id: normalizedRemote.id,
      name: localProduct.name || normalizedRemote.name,
      model: localProduct.model || normalizedRemote.model,
      color: localProduct.color || normalizedRemote.color,
      memory: localProduct.memory || normalizedRemote.memory,
      condition: localProduct.condition || normalizedRemote.condition,
      price: localProduct.price ?? normalizedRemote.price,
      stock: localProduct.stock ?? normalizedRemote.stock,
      battery: localProduct.battery ?? normalizedRemote.battery,
      status: localProduct.status || normalizedRemote.status,
      image: localProduct.image || normalizedRemote.image
    } : normalizedRemote);
  }

  for (const product of localList) {
    const productId = String(product.id);
    if (!remoteList.some((item) => String(item.id) === productId)) {
      merged.push(normalizeProduct(product, product.id));
    }
  }

  return merged;
}

async function syncLocalStoreFromSupabase() {
  if (!supabase) {
    return readStore();
  }

  try {
    const remoteProducts = await getProductsFromSupabase();
    const store = readStore();
    const localProducts = Array.isArray(store.products) ? store.products : [];

    if (!Array.isArray(remoteProducts) || !remoteProducts.length) {
      return store;
    }

    store.products = mergeProductsWithLocalOverrides(remoteProducts, localProducts);
    saveStore(store);
    return store;
  } catch (error) {
    console.warn('No se pudo sincronizar el stock local con Supabase:', error.message);
    return readStore();
  }
}

async function getProductsFromSupabase() {
  if (!supabase) return null;

  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function getProducts() {
  const store = readStore();

  try {
    const supabaseProducts = await getProductsFromSupabase();
    if (Array.isArray(supabaseProducts) && supabaseProducts.length > 0) {
      return mergeProductsWithLocalOverrides(supabaseProducts, Array.isArray(store.products) ? store.products : []);
    }
  } catch (error) {
    console.warn('Supabase unavailable, using local JSON:', error.message);
  }

  return Array.isArray(store.products) ? store.products : [];
}

async function supabaseSupportsBattery() {
  if (!supabase) return false;

  try {
    const products = await getProductsFromSupabase();
    return Array.isArray(products) && products.some((product) => Object.prototype.hasOwnProperty.call(product, 'battery'));
  } catch (error) {
    return false;
  }
}

function parseNumber(rawValue, fallback = 0) {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeProduct(product = {}, fallbackId = null) {
  const batteryValue = Number(product.battery ?? 80);
  return {
    id: product.id || fallbackId || `ip-${Date.now()}`,
    name: product.name || 'Sin nombre',
    model: product.model || 'Sin modelo',
    color: product.color || 'Sin color',
    memory: product.memory || 'Sin memoria',
    condition: product.condition || 'Bueno',
    price: parseNumber(product.price, 0),
    stock: parseNumber(product.stock, 0),
    battery: Number.isFinite(batteryValue) ? Math.min(100, Math.max(0, batteryValue)) : 80,
    status: product.status || (parseNumber(product.stock, 0) > 0 ? 'Disponible' : 'Sin stock'),
    image: product.image || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80'
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'iphone-store-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
  }

  next();
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar el catálogo.' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const store = readStore();
  const validUser = store.admin.username === username;
  const validPassword = store.admin.passwordHash === hashPassword(password);

  if (!validUser || !validPassword) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  req.session.user = { username: store.admin.username };
  res.json({ ok: true, username: store.admin.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ username: req.session.user.username });
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    if (supabase) {
      const syncedStore = await syncLocalStoreFromSupabase();
      return res.json(Array.isArray(syncedStore.products) ? syncedStore.products : []);
    }

    const store = readStore();
    return res.json(Array.isArray(store.products) ? store.products : []);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar el inventario del administrador.' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { name, model, color, memory, condition, price, stock, battery, status, image } = req.body || {};

  if (!name || !model) {
    return res.status(400).json({ error: 'El nombre y el modelo son obligatorios.' });
  }

  const product = normalizeProduct({
    id: `ip-${Date.now()}`,
    name,
    model,
    color,
    memory,
    condition,
    price,
    stock,
    battery,
    status,
    image
  });

  if (supabase && (await supabaseSupportsBattery())) {
    try {
      const { data, error } = await supabase.from('products').insert(product).select().single();
      if (error) throw error;
      return res.status(201).json(data || product);
    } catch (error) {
      console.warn('No se pudo guardar en Supabase, usando fallback local:', error.message);
    }
  }

  const store = readStore();
  store.products.unshift(product);
  saveStore(store);
  return res.status(201).json(product);
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, model, color, memory, condition, price, stock, battery, status, image } = req.body || {};

  let store = readStore();
  let productIndex = store.products.findIndex((item) => item.id === id);

  if (supabase && productIndex === -1) {
    store = await syncLocalStoreFromSupabase();
    productIndex = store.products.findIndex((item) => item.id === id);
  }

  if (supabase && productIndex !== -1 && (await supabaseSupportsBattery())) {
    try {
      const updatedProduct = normalizeProduct({
        id,
        name: name || store.products[productIndex]?.name,
        model: model || store.products[productIndex]?.model,
        color: color || store.products[productIndex]?.color,
        memory: memory || store.products[productIndex]?.memory,
        condition: condition || store.products[productIndex]?.condition,
        price: price ?? store.products[productIndex]?.price,
        stock: stock ?? store.products[productIndex]?.stock,
        battery: battery ?? store.products[productIndex]?.battery ?? 80,
        status: status || store.products[productIndex]?.status,
        image: image || store.products[productIndex]?.image
      }, id);

      const { data, error } = await supabase.from('products').update(updatedProduct).eq('id', id).select().single();
      if (error) throw error;
      await syncLocalStoreFromSupabase();
      return res.json(data || updatedProduct);
    } catch (error) {
      console.warn('No se pudo actualizar en Supabase, usando fallback local:', error.message);
    }
  }

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  const product = store.products[productIndex];
  store.products[productIndex] = {
    ...product,
    name: name || product.name,
    model: model || product.model,
    color: color || product.color,
    memory: memory || product.memory,
    condition: condition || product.condition,
    price: parseNumber(price, product.price),
    stock: parseNumber(stock, product.stock),
    battery: Number.isFinite(Number(battery)) ? Math.min(100, Math.max(0, Number(battery))) : (Number(product.battery ?? 80)),
    status: status || product.status,
    image: image || product.image
  };

  saveStore(store);
  res.json(store.products[productIndex]);
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  let store = readStore();
  let productIndex = store.products.findIndex((item) => item.id === id);

  if (supabase && productIndex === -1) {
    store = await syncLocalStoreFromSupabase();
    productIndex = store.products.findIndex((item) => item.id === id);
  }

  if (supabase && productIndex !== -1 && (await supabaseSupportsBattery())) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await syncLocalStoreFromSupabase();
      return res.json({ ok: true });
    } catch (error) {
      console.warn('No se pudo borrar en Supabase, usando fallback local:', error.message);
    }
  }

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  store.products = store.products.filter((item) => item.id !== id);
  saveStore(store);
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor arrancado en http://localhost:${PORT}`);
    console.log('Credenciales admin por defecto: admin / admin123');
  });
}

module.exports = app;
