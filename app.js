const productContainer = document.getElementById('products');
const totalProducts = document.getElementById('total-products');
const API_BASE = (
  window.__API_URL__ ||
  document.querySelector('meta[name="api-url"]')?.content ||
  'http://localhost:3000'
).replace(/\/$/, '');

function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('disponible')) return 'available';
  if (normalized.includes('revisión') || normalized.includes('revision')) return 'review';
  return 'empty';
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
      const price = Number(product.price || 0).toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR'
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
          </div>
        </article>
      `;
    })
    .join('');
}

async function loadProducts() {
  try {
    const response = await apiFetch('/api/products');
    const products = await response.json();
    renderProducts(products);
  } catch (error) {
    productContainer.innerHTML = '<div class="empty-state">No se pudo cargar el inventario.</div>';
  }
}

loadProducts();
