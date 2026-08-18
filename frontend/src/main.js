const API_URL = '/api';
const WA_NUMBER = '6281234567890';

/* ============ CUSTOM CURSOR ============ */
const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

let mouseX = 0, mouseY = 0;
let ringX = 0, ringY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});

function animateRing() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top  = ringY + 'px';
  requestAnimationFrame(animateRing);
}
animateRing();

// Cursor hover expand
document.addEventListener('mouseover', (e) => {
  if (e.target.matches('a, button, .cat-pill, .product-card, [role="button"]')) {
    document.body.classList.add('cursor-hover');
  }
});
document.addEventListener('mouseout', (e) => {
  if (e.target.matches('a, button, .cat-pill, .product-card, [role="button"]')) {
    document.body.classList.remove('cursor-hover');
  }
});

/* ============ PAGE INTRO REMOVE ============ */
const intro = document.getElementById('pageIntro');
if (intro) {
  intro.addEventListener('animationend', () => {
    intro.remove();
  });
}

/* ============ NAVBAR SCROLL EFFECT ============ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    navbar?.classList.add('scrolled');
  } else {
    navbar?.classList.remove('scrolled');
  }
});

/* ============ SEARCH ============ */
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const q = document.getElementById('searchInput').value.trim();
    loadProducts('', q);
  });

  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = document.getElementById('searchInput').value.trim();
      loadProducts('', q);
    }
  });

  // Modal close
  document.getElementById('modalBackdrop')?.addEventListener('click', closeModal);
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/* ============ LOAD PRODUCTS ============ */
window.loadProducts = async function(type = '', search = '') {
  // Update active category pill
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.classList.remove('active');
    const text = btn.innerText;
    if (!type && text.includes('Semua')) btn.classList.add('active');
    else if (type && text.includes(type)) btn.classList.add('active');
  });

  // Update section title
  const titleEl = document.getElementById('sectionTitle');
  if (titleEl) titleEl.textContent = type || 'Semua Produk';

  const grid = document.getElementById('productGrid');
  grid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Memuat produk...</p>
    </div>`;

  try {
    let url = `${API_URL}/products?`;
    if (type)   url += `type=${encodeURIComponent(type)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    const products = await res.json();
    grid.innerHTML = '';

    // Update count
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = products.length ? `${products.length} produk` : '';

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>📭</p>
          <p>Tidak ada produk yang ditemukan.</p>
        </div>`;
      return;
    }

    products.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.animationDelay = `${i * 0.06}s`;

      const imgHtml = p.imageUrl
        ? `<img class="product-card-img" src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'product-card-placeholder\\'>📦</div>'">`
        : `<div class="product-card-placeholder">📦</div>`;

      const priceHtml = p.price
        ? `<div class="product-card-price">Rp ${Number(p.price).toLocaleString('id-ID')}</div>`
        : `<div class="product-card-price-empty">Hubungi untuk harga</div>`;

      card.innerHTML = `
        <div class="product-card-img-wrap">
          ${imgHtml}
          ${p.type ? `<div class="product-type-chip">${p.type}</div>` : ''}
          <div class="product-hover-overlay">
            <span class="overlay-cta">👆 Lihat Detail</span>
          </div>
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${p.name}</div>
          ${priceHtml}
        </div>
      `;

      card.addEventListener('click', () => openModal(p));
      grid.appendChild(card);
    });

  } catch (e) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>❌</p>
        <p>Gagal memuat produk. Pastikan server berjalan.</p>
      </div>`;
    console.error(e);
  }
};

/* ============ PRODUCT MODAL ============ */
function openModal(p) {
  const modal   = document.getElementById('productModal');
  const body    = document.getElementById('modalBody');
  const waMsg   = encodeURIComponent(`Halo, saya ingin bertanya tentang produk *${p.name}*`);
  const waLink  = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

  const imgHtml = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'modal-img-placeholder\\'>📦</div>'">`
    : `<div class="modal-img-placeholder">📦</div>`;

  const priceHtml = p.price
    ? `<div class="modal-price">Rp ${Number(p.price).toLocaleString('id-ID')}</div>`
    : '';

  let extraHtml = '';

  if (p.description) {
    extraHtml += `
      <div class="modal-section-label">Deskripsi</div>
      <p class="modal-description">${p.description}</p>`;
  }

  if (p.laptopCategory || p.advantages) {
    extraHtml += `<div class="modal-divider"></div><div class="modal-badge-row">`;
    if (p.laptopCategory) extraHtml += `<span class="modal-badge">🏷️ ${p.laptopCategory}</span>`;
    if (p.advantages) {
      p.advantages.split(/[,\n]/).forEach(adv => {
        const a = adv.trim();
        if (a) extraHtml += `<span class="modal-badge">✅ ${a}</span>`;
      });
    }
    extraHtml += `</div>`;
  }

  if (p.specs) {
    extraHtml += `<div class="modal-divider"></div><div class="modal-section-label">Spesifikasi</div>`;
    extraHtml += `<div class="modal-specs-box">`;

    const specLines = p.specs.split(/[,\n|]/).map(s => s.trim()).filter(Boolean);
    specLines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        extraHtml += `
          <div class="modal-spec-row">
            <span class="modal-spec-key">${key}</span>
            <span class="modal-spec-val">${val}</span>
          </div>`;
      } else {
        extraHtml += `
          <div class="modal-spec-row">
            <span class="modal-spec-val">${line}</span>
          </div>`;
      }
    });

    extraHtml += `</div>`;
  }

  body.innerHTML = `
    <div class="modal-img-wrap">${imgHtml}</div>
    <div class="modal-body-content">
      ${p.type ? `<div class="modal-type-chip">${p.type}</div>` : ''}
      <h2 class="modal-product-name">${p.name}</h2>
      ${priceHtml}
      ${extraHtml}
      <div class="modal-divider"></div>
      <a href="${waLink}" target="_blank" class="modal-wa-btn">
        💬 Tanya / Beli via WhatsApp
      </a>
    </div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('productModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
