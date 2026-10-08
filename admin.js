const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginBtn = document.getElementById('loginBtn');
const API_BASE = (
  window.__API_URL__ ||
  document.querySelector('meta[name="api-url"]')?.content ||
  'http://localhost:3000'
).replace(/\/$/, '');

function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, options);
}
const logoutBtn = document.getElementById('logoutBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginMessage = document.getElementById('loginMessage');
const formMessage = document.getElementById('formMessage');
const productForm = document.getElementById('productForm');
const productsAdminList = document.getElementById('productsAdminList');
const adminUsername = document.getElementById('adminUsername');
const resetFormBtn = document.getElementById('resetFormBtn');

const state = {
  editingId: null
};

function showAlert(element, type, message) {
  element.className = `alert ${type}`;
  element.textContent = message;
}

function clearAlert(element) {
  element.className = 'alert';
  element.textContent = '';
}

function setAdminView(isLoggedIn) {
  loginScreen.classList.toggle('hidden', isLoggedIn);
  adminScreen.classList.toggle('hidden', !isLoggedIn);
}

async function checkSession() {
  try {
    const response = await apiFetch('/api/admin/me');
    if (!response.ok) {
      setAdminView(false);
      return;
    }

    const data = await response.json();
    adminUsername.textContent = data.username;
    setAdminView(true);
    loadProductsAdmin();
  } catch (error) {
    setAdminView(false);
  }
}

async function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showAlert(loginMessage, 'error', 'Usuario y contraseña son obligatorios.');
    return;
  }

  try {
    const response = await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión.');
    }

    adminUsername.textContent = data.username;
    clearAlert(loginMessage);
    usernameInput.value = '';
    passwordInput.value = '';
    setAdminView(true);
    loadProductsAdmin();
  } catch (error) {
    showAlert(loginMessage, 'error', error.message);
  }
}

async function logout() {
  try {
    await apiFetch('/api/logout', { method: 'POST' });
    resetForm();
    setAdminView(false);
  } catch (error) {
    console.error(error);
  }
}

function resetForm() {
  state.editingId = null;
  productForm.reset();
  clearAlert(formMessage);
  const submitButton = productForm.querySelector('button[type="submit"]');
  submitButton.textContent = 'Guardar equipo';
}

function fillForm(product) {
  state.editingId = product.id;
  document.getElementById('name').value = product.name || '';
  document.getElementById('model').value = product.model || '';
  document.getElementById('color').value = product.color || '';
  document.getElementById('memory').value = product.memory || '';
  document.getElementById('condition').value = product.condition || '';
  document.getElementById('price').value = product.price || 0;
  document.getElementById('stock').value = product.stock || 0;
  document.getElementById('battery').value = product.battery ?? 80;
  document.getElementById('status').value = product.status || 'Disponible';
  document.getElementById('image').value = product.image || '';

  const submitButton = productForm.querySelector('button[type="submit"]');
  submitButton.textContent = 'Actualizar equipo';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadProductsAdmin() {
  try {
    const response = await apiFetch('/api/admin/products');
    const products = await response.json();

    if (!products.length) {
      productsAdminList.innerHTML = '<div class="empty-state">Todavía no hay equipos en el listado.</div>';
      return;
    }

    productsAdminList.innerHTML = products
      .map(
        (product) => `
          <div class="admin-product">
            <div class="admin-product-header">
              <h3>${product.name} ${product.model}</h3>
              <span class="status-pill ${product.status === 'Disponible' ? 'available' : product.status === 'En revisión' ? 'review' : 'empty'}">${product.status}</span>
            </div>
            <div class="product-specs">
              <span>${product.color}</span>
              <span>${product.memory}</span>
              <span>${product.condition}</span>
              <span>Stock: ${product.stock}</span>
            </div>
            <div class="product-footer">
              <div class="price">${Number(product.price || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              <div class="button-row">
                <button type="button" class="secondary" data-action="edit" data-id="${product.id}">Editar</button>
                <button type="button" class="danger" data-action="delete" data-id="${product.id}">Eliminar</button>
              </div>
            </div>
          </div>
        `
      )
      .join('');

    productsAdminList.querySelectorAll('[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const product = products.find((item) => item.id === button.dataset.id);
        if (product) fillForm(product);
      });
    });

    productsAdminList.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const confirmed = confirm('¿Seguro que quieres eliminar este equipo?');
        if (!confirmed) return;

        try {
          const response = await apiFetch(`/api/admin/products/${button.dataset.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('No se pudo eliminar el producto.');
          }

          showAlert(formMessage, 'success', 'Equipo eliminado correctamente.');
          loadProductsAdmin();
        } catch (error) {
          showAlert(formMessage, 'error', error.message);
        }
      });
    });
  } catch (error) {
    productsAdminList.innerHTML = '<div class="empty-state">No se pudo cargar el inventario del admin.</div>';
  }
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(productForm);
  const payload = {
    name: formData.get('name'),
    model: formData.get('model'),
    color: formData.get('color'),
    memory: formData.get('memory'),
    condition: formData.get('condition'),
    price: Number(formData.get('price')) || 0,
    stock: Number(formData.get('stock')) || 0,
    battery: Number(formData.get('battery')) || 80,
    status: formData.get('status'),
    image: formData.get('image')
  };

  try {
    const url = state.editingId ? `/api/admin/products/${state.editingId}` : '/api/admin/products';
    const method = state.editingId ? 'PUT' : 'POST';

    const response = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar el equipo.');
    }

    showAlert(formMessage, 'success', state.editingId ? 'Equipo actualizado correctamente.' : 'Equipo añadido correctamente.');
    resetForm();
    loadProductsAdmin();
  } catch (error) {
    showAlert(formMessage, 'error', error.message);
  }
});

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
resetFormBtn.addEventListener('click', resetForm);

passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});

checkSession();
