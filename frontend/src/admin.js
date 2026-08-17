const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('adminToken');
let currentProductType = '';
let editingProductId = null; // null = mode tambah, ada id = mode edit

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showDashboard();
  } else {
    document.getElementById('loginSection').style.display = 'flex';
  }

  // Login
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

  // Navigation
  document.getElementById('navDashboard').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('Dashboard'); });
  document.getElementById('navLaptop').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('Laptop', 'Data Laptop'); });
  document.getElementById('navPC').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('PC', 'Data PC'); });
  document.getElementById('navSSD').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('SSD & RAM', 'Data SSD & RAM'); });
  document.getElementById('navCCTV').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('CCTV', 'Data CCTV'); });
  document.getElementById('navEmployees').addEventListener('click', (e) => { e.preventDefault(); setActiveNav(e.target.closest('a')); switchView('Employees', 'Data Karyawan'); });
  document.getElementById('navLogout').addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // ── Hamburger menu (mobile) ──────────────────────────────
  const hamburgerBtn   = document.getElementById('hamburgerBtn');
  const sidebar        = document.querySelector('.admin-sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('mobile-open');
    sidebarOverlay.classList.add('active');
  }
  function closeSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebarOverlay.classList.remove('active');
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', (e) => {
    e.stopPropagation(); // cegah klik menembus ke elemen di bawah
    closeSidebar();
  });

  // Tutup sidebar otomatis saat klik menu nav di mobile
  document.querySelectorAll('.admin-sidebar nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // Product modal
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
  document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  document.getElementById('productImageFile').addEventListener('change', previewImage);

  // Employee modal
  document.getElementById('addEmployeeBtn').addEventListener('click', () => openEmployeeModal(null));
  document.getElementById('closeEmployeeModal').addEventListener('click', closeEmployeeModal);
  document.getElementById('employeeForm').addEventListener('submit', saveEmployee);

  // Print
  document.getElementById('printProductsBtn').addEventListener('click', () => {
    document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('printTitleProducts').innerText = `Laporan Data ${currentProductType}`;
    window.print();
  });
  document.getElementById('printEmployeesBtn').addEventListener('click', () => {
    document.getElementById('printDateEmp').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    window.print();
  });

  // Close modal on outside click
  document.getElementById('productModal').addEventListener('click', e => { if (e.target === document.getElementById('productModal')) closeProductModal(); });
  document.getElementById('employeeModal').addEventListener('click', e => { if (e.target === document.getElementById('employeeModal')) closeEmployeeModal(); });
});

function setActiveNav(el) {
  document.querySelectorAll('.admin-sidebar nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  if (!username || !password) {
    document.getElementById('loginError').innerText = 'Username dan password wajib diisi.';
    return;
  }
  document.getElementById('loginBtn').innerText = 'Memproses...';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      showDashboard();
    } else {
      document.getElementById('loginError').innerText = data.error || 'Username atau password salah.';
    }
  } catch (error) {
    document.getElementById('loginError').innerText = 'Gagal terhubung ke server.';
  } finally {
    document.getElementById('loginBtn').innerText = 'Masuk';
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  token = null;
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('loginSection').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'grid';
  setActiveNav(document.getElementById('navDashboard'));
  switchView('Dashboard', 'Dashboard');
}

function switchView(type, title) {
  document.getElementById('pageTitle').innerText = title || type;
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewProducts').style.display = 'none';
  document.getElementById('viewEmployees').style.display = 'none';

  if (type === 'Dashboard') {
    document.getElementById('viewDashboard').style.display = 'block';
    loadStats();
  } else if (type === 'Employees') {
    document.getElementById('viewEmployees').style.display = 'block';
    loadEmployees();
  } else {
    currentProductType = type;
    document.getElementById('productTableTitle').innerText = `Data ${type}`;
    document.getElementById('viewProducts').style.display = 'block';
    setupProductTable(type);
    loadProducts(type);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_URL}/admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return logout();
    const data = await res.json();
    document.getElementById('statProducts').innerText = data.totalProducts ?? '-';
    document.getElementById('statEmployees').innerText = data.totalEmployees ?? '-';
    document.getElementById('statLaptop').innerText = data.laptops ?? '-';
    document.getElementById('statPC').innerText = data.pcs ?? '-';
    document.getElementById('statSSD').innerText = data.ssdRam ?? '-';
    document.getElementById('statCCTV').innerText = data.cctv ?? '-';
  } catch (e) { console.error('Load stats error', e); }
}

function setupProductTable(type) {
  const header = document.getElementById('productsTableHeader');
  let h = `<th>No</th><th>Foto</th><th>Nama Produk</th>`;
  if (type === 'Laptop') h += `<th>Kategori</th><th>Spesifikasi</th>`;
  h += `<th>Keunggulan</th><th>Harga</th><th class="no-print">Aksi</th>`;
  header.innerHTML = h;
}

async function loadProducts(type) {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="table-empty">⏳ Memuat data...</td></tr>`;
  try {
    const res = await fetch(`${API_URL}/products?type=${encodeURIComponent(type)}`);
    const products = await res.json();
    tbody.innerHTML = '';

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">📭 Belum ada data ${type}. Klik "+ Tambah Data" untuk menambahkan.</td></tr>`;
      return;
    }

    products.forEach((p, i) => {
      const imgCell = p.imageUrl
        ? `<img src="${p.imageUrl}" class="thumb" alt="${p.name}" onerror="this.style.display='none'">`
        : `<span style="font-size:1.5rem;">📦</span>`;

      let row = `<tr>
        <td>${i + 1}</td>
        <td>${imgCell}</td>
        <td><strong>${p.name}</strong></td>`;
      if (type === 'Laptop') {
        row += `<td>${p.laptopCategory ? `<span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:20px;font-size:0.78rem;font-weight:700;">${p.laptopCategory}</span>` : '-'}</td>`;
        row += `<td style="max-width:200px;font-size:0.8rem;white-space:pre-wrap;">${p.specs || '-'}</td>`;
      }
      row += `<td style="max-width:180px;font-size:0.82rem;">${p.advantages || '-'}</td>`;
      row += `<td style="white-space:nowrap;">${p.price ? `<strong>Rp ${p.price.toLocaleString('id-ID')}</strong>` : '<em style="color:var(--gray);">-</em>'}</td>`;
      row += `<td class="no-print" style="white-space:nowrap;">
        <button onclick="openEditProduct(${p.id})" class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;margin-right:4px;">✏️ Edit</button>
        <button onclick="deleteProduct(${p.id}, '${type}')" class="btn btn-danger" style="padding:4px 10px;font-size:0.8rem;">🗑️ Hapus</button>
      </td></tr>`;
      tbody.innerHTML += row;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">❌ Gagal memuat data.</td></tr>`;
  }
}

async function loadEmployees() {
  const tbody = document.getElementById('employeesTableBody');
  tbody.innerHTML = `<tr><td colspan="5" class="table-empty">⏳ Memuat data...</td></tr>`;
  try {
    const res = await fetch(`${API_URL}/admin/employees`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return logout();
    const employees = await res.json();
    tbody.innerHTML = '';

    if (!employees.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">📭 Belum ada data karyawan.</td></tr>`;
      return;
    }

    employees.forEach((e, i) => {
      tbody.innerHTML += `<tr>
        <td>${i + 1}</td>
        <td><strong>${e.name}</strong></td>
        <td>${e.position}</td>
        <td>${e.contact ? `<a href="https://wa.me/${e.contact.replace(/\D/g,'')}" target="_blank" style="color:var(--green);font-weight:600;">📱 ${e.contact}</a>` : '-'}</td>
        <td class="no-print" style="white-space:nowrap;">
          <button onclick="openEditEmployee(${e.id}, '${e.name}', '${e.position}', '${e.contact || ''}')" class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;margin-right:4px;">✏️ Edit</button>
          <button onclick="deleteEmployee(${e.id})" class="btn btn-danger" style="padding:4px 10px;font-size:0.8rem;">🗑️ Hapus</button>
        </td>
      </tr>`;
    });
  } catch (e) { console.error('Load employees error', e); }
}

// ===== IMAGE PREVIEW =====
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('imgPreview');
    preview.src = ev.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ===== PRODUCT MODAL (Tambah & Edit) =====
function openProductModal(product = null) {
  document.getElementById('productForm').reset();
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('productType').value = currentProductType;

  if (product) {
    // MODE EDIT
    editingProductId = product.id;
    document.getElementById('productModalTitle').innerText = `Edit ${currentProductType}`;
    document.getElementById('productFormSubmitBtn').innerText = '💾 Simpan Perubahan';

    document.getElementById('productName').value = product.name || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productDesc').value = product.description || '';
    document.getElementById('productAdv').value = product.advantages || '';

    if (product.imageUrl) {
      document.getElementById('imgPreview').src = product.imageUrl;
      document.getElementById('imgPreview').style.display = 'block';
      document.getElementById('currentImageUrl').value = product.imageUrl;
    }

    if (currentProductType === 'Laptop') {
      document.getElementById('laptopFields').style.display = 'block';
      document.getElementById('productLaptopCategory').value = product.laptopCategory || 'Pelajar';
      document.getElementById('productSpecs').value = product.specs || '';
    } else {
      document.getElementById('laptopFields').style.display = 'none';
    }
  } else {
    // MODE TAMBAH
    editingProductId = null;
    document.getElementById('currentImageUrl').value = '';
    document.getElementById('productModalTitle').innerText = `Tambah ${currentProductType}`;
    document.getElementById('productFormSubmitBtn').innerText = '💾 Simpan Data';
    document.getElementById('laptopFields').style.display = currentProductType === 'Laptop' ? 'block' : 'none';
  }

  document.getElementById('productModal').classList.add('open');
}

// Fetch product by id then open modal
window.openEditProduct = async function(id) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`);
    const product = await res.json();
    openProductModal(product);
  } catch {
    alert('Gagal memuat data produk.');
  }
};

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  editingProductId = null;
}

async function saveProduct(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('productFormSubmitBtn');
  submitBtn.innerText = '⏳ Menyimpan...';
  submitBtn.disabled = true;

  try {
    let imageUrl = document.getElementById('currentImageUrl').value || null;
    const fileInput = document.getElementById('productImageFile');

    // Upload gambar baru jika dipilih
    if (fileInput.files.length > 0) {
      document.getElementById('uploadProgress').style.display = 'block';
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);
      const uploadRes = await fetch(`${API_URL}/admin/products/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.imageUrl || imageUrl;
      document.getElementById('uploadProgress').style.display = 'none';
    }

    const type = document.getElementById('productType').value;
    const payload = {
      type,
      name: document.getElementById('productName').value,
      price: document.getElementById('productPrice').value || null,
      description: document.getElementById('productDesc').value,
      advantages: document.getElementById('productAdv').value,
      imageUrl
    };

    if (type === 'Laptop') {
      payload.laptopCategory = document.getElementById('productLaptopCategory').value;
      payload.specs = document.getElementById('productSpecs').value;
    }

    const method = editingProductId ? 'PUT' : 'POST';
    const url = editingProductId
      ? `${API_URL}/admin/products/${editingProductId}`
      : `${API_URL}/admin/products`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Gagal');
    closeProductModal();
    loadProducts(type);
  } catch (err) {
    alert('Gagal menyimpan data. Coba lagi.');
    console.error(err);
  } finally {
    submitBtn.innerText = editingProductId ? '💾 Simpan Perubahan' : '💾 Simpan Data';
    submitBtn.disabled = false;
  }
}

// ===== EMPLOYEE MODAL (Tambah & Edit) =====
let editingEmployeeId = null;

function openEmployeeModal(emp = null) {
  document.getElementById('employeeForm').reset();

  if (emp) {
    editingEmployeeId = emp.id;
    document.getElementById('employeeModalTitle').innerText = 'Edit Data Karyawan';
    document.getElementById('employeeFormSubmitBtn').innerText = '💾 Simpan Perubahan';
    document.getElementById('empName').value = emp.name || '';
    document.getElementById('empPosition').value = emp.position || '';
    document.getElementById('empContact').value = emp.contact || '';
  } else {
    editingEmployeeId = null;
    document.getElementById('employeeModalTitle').innerText = 'Tambah Data Karyawan';
    document.getElementById('employeeFormSubmitBtn').innerText = '💾 Simpan Karyawan';
  }

  document.getElementById('employeeModal').classList.add('open');
}

window.openEditEmployee = function(id, name, position, contact) {
  openEmployeeModal({ id, name, position, contact });
};

function closeEmployeeModal() {
  document.getElementById('employeeModal').classList.remove('open');
  editingEmployeeId = null;
}

async function saveEmployee(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('employeeFormSubmitBtn');
  submitBtn.innerText = '⏳ Menyimpan...';
  submitBtn.disabled = true;

  try {
    const payload = {
      name: document.getElementById('empName').value,
      position: document.getElementById('empPosition').value,
      contact: document.getElementById('empContact').value
    };

    const method = editingEmployeeId ? 'PUT' : 'POST';
    const url = editingEmployeeId
      ? `${API_URL}/admin/employees/${editingEmployeeId}`
      : `${API_URL}/admin/employees`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    closeEmployeeModal();
    loadEmployees();
  } catch (err) {
    alert('Gagal menyimpan karyawan.');
  } finally {
    submitBtn.innerText = editingEmployeeId ? '💾 Simpan Perubahan' : '💾 Simpan Karyawan';
    submitBtn.disabled = false;
  }
}

// ===== DELETE =====
window.deleteProduct = async (id, type) => {
  if (!confirm(`Hapus produk ini dari Data ${type}?`)) return;
  try {
    await fetch(`${API_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadProducts(type);
  } catch { alert('Gagal menghapus produk.'); }
};

window.deleteEmployee = async (id) => {
  if (!confirm('Hapus data karyawan ini?')) return;
  try {
    await fetch(`${API_URL}/admin/employees/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadEmployees();
  } catch { alert('Gagal menghapus karyawan.'); }
};
