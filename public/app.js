const productContainer = document.getElementById('products');
const totalProducts = document.getElementById('total-products');
const modelFilter = document.getElementById('modelFilter');
const memoryFilter = document.getElementById('memoryFilter');
const batteryFilter = document.getElementById('batteryFilter');
const metaApiUrl = document.querySelector('meta[name="api-url"]')?.content;
const API_BASE = (
  window.__API_URL__ ||
  (metaApiUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(metaApiUrl) ? metaApiUrl : '') ||
  window.location.origin
).replace(/\/$/, '');

const state = {
  allProducts: []
};

function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('disponible')) return 'available';
  if (normalized.includes('revisión') || normalized.includes('revision')) return 'review';
  return 'empty';
}

function parseModelRank(model = '') {
  const text = String(model).toLowerCase();
  const generation = Number((text.match(/\d+/) || [0])[0]);
  let subtype = 1;

  if (text.includes('mini')) subtype = 0;
  else if (text.includes('pro max')) subtype = 3;
  else if (text.includes('pro')) subtype = 2;

  return generation * 10 + subtype;
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    const order = parseModelRank(a.model) - parseModelRank(b.model);
    if (order !== 0) return order;
    return Number(a.price || 0) - Number(b.price || 0);
  });
}

function getVisibleProducts() {
  if (!Array.isArray(state.allProducts) || !state.allProducts.length) {
    return [];
  }

  const selectedModel = modelFilter ? modelFilter.value : 'all';
  const selectedMemory = memoryFilter ? memoryFilter.value : 'all';
  const selectedBattery = batteryFilter ? batteryFilter.value : 'all';

  return sortProducts(
    state.allProducts.filter((product) => {
      const productModel = String(product.model || '').trim();
      const productMemory = String(product.memory || '').trim();
      const battery = Number(product.battery ?? 80);
      const batteryValue = Number.isFinite(battery) ? battery : 80;

      const modelMatch = selectedModel === 'all' || !productModel || productModel.toLowerCase() === selectedModel.toLowerCase();
      const memoryMatch = selectedMemory === 'all' || !productMemory || productMemory === selectedMemory;
      let batteryMatch = true;

      if (selectedBattery !== 'all') {
        batteryMatch = batteryValue >= Number(selectedBattery);
      }

      return modelMatch && memoryMatch && batteryMatch;
    })
  );
}

function populateFilterOptions(products) {
  if (!Array.isArray(products)) return;

  const modelValues = [...new Set(products.map((product) => product.model).filter(Boolean))].sort((a, b) => parseModelRank(a) - parseModelRank(b));
  const memoryValues = [...new Set(products.map((product) => product.memory).filter(Boolean))].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (modelFilter) {
    modelFilter.innerHTML = '<option value="all">Todos</option>' + modelValues.map((model) => `<option value="${model}">${model}</option>`).join('');
  }

  if (memoryFilter) {
    memoryFilter.innerHTML = '<option value="all">Todas</option>' + memoryValues.map((memory) => `<option value="${memory}">${memory}</option>`).join('');
  }
}

function renderProducts(products) {
  if (!products.length) {
    productContainer.innerHTML = '<div class="empty-state">No hay equipos en este momento.</div>';
    totalProducts.textContent = '0';
    return;
  }

  totalProducts.textContent = String(products.filter((item) => Number(item.stock) > 0).length);

  productContainer.innerHTML = products
    .map((product) => {
      const status = product.status || 'Disponible';
      const battery = Math.min(100, Math.max(0, Number(product.battery ?? 80)));
      const batteryColor = battery <= 20 ? 'low' : battery <= 60 ? 'mid' : 'high';
      const price = Number(product.price || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      });

      return `
        <article class="product-card">
          <img class="product-image" src="${product.image}" alt="${product.name}" />
          <div class="product-body">
            <div class="product-top">
              <h3 class="product-name">${product.name}</h3>
              <span class="status-pill ${statusClass(status)}">${status}</span>
            </div>
            <p class="product-meta">${product.model} · ${product.color}</p>
            <div class="product-specs">
              <span>${product.memory}</span>
              <span>${product.condition}</span>
              <span>Stock: ${product.stock}</span>
            </div>
            <div class="product-footer">
              <div class="price">${price}</div>
            </div>
            <div class="battery-section">
              <div class="battery-header">
                <span>Batería</span>
                <strong>${battery}%</strong>
              </div>
              <div class="battery-track">
                <span class="battery-fill ${batteryColor}" style="width: ${battery}%"></span>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function applyFilters() {
  renderProducts(getVisibleProducts());
}

async function loadProducts() {
  try {
    const response = await apiFetch('/api/products');
    const products = await response.json();
    state.allProducts = sortProducts(products);
    populateFilterOptions(state.allProducts);
    applyFilters();
  } catch (error) {
    productContainer.innerHTML = '<div class="empty-state">No se pudo cargar el inventario.</div>';
  }
}

[modelFilter, memoryFilter, batteryFilter].filter(Boolean).forEach((element) => {
  element.addEventListener('change', applyFilters);
});

loadProducts();
