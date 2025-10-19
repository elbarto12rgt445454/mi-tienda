// =======================================================
// main.js — TIENDA (Firestore only, en vivo, sin localStorage)
// =======================================================

(() => {
  // Ajusta estos selectores a tu HTML. Si un elemento no existe, no rompe.
  const $  = (s) => document.querySelector(s);
  const els = {
    hero:        $("#hero"),
    brandName:   $("#brandName"),
    catFilter:   $("#categoryFilter"), // <select> opcional para filtrar
    products:    $("#products"),
    cartCount:   $("#cartCount"),
  };

  // Atajos Firestore desde el bloque global del HTML
  const DB = window.DB;
  const {
    collection, addDoc, doc, query, orderBy,
    onSnapshot, serverTimestamp
  } = window.FB;

  // Config (mantén tu número)
  const CFG = { whatsapp: "68650455", brandFallback: "Librería La Fórmula" };

  // Estado
  let PRODUCTS = [];
  let CATEGORIES = [];
  let HERO = [];
  let BRAND = {};
  let CART = [];

  // Utils
  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
  const toast = (m) => { try { console.log(m); alert(m); } catch(_){} };

  // Render
  function renderHero() {
    if (!els.hero) return;
    els.hero.innerHTML = (HERO || []).map(src =>
      `<div class="slide"><img src="${src}" alt=""></div>`
    ).join("");
  }

  function renderBrand() {
    if (els.brandName) els.brandName.textContent = BRAND?.name || CFG.brandFallback;
  }

  function renderCategoryFilter() {
    if (!els.catFilter) return;
    const opts = ["Todas", ...CATEGORIES];
    els.catFilter.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join("");
  }

  function renderProducts(list = PRODUCTS) {
    if (!els.products) return;
    els.products.innerHTML = list.map(p => `
      <article class="product-card">
        <div class="thumb"><img src="${p.image || ''}" alt="${p.name || ''}"></div>
        <div class="body">
          <h3>${p.name || ''}</h3>
          <p class="price">${money(p.price)}</p>
          ${p.description ? `<p class="desc">${p.description}</p>` : ""}
          <div class="meta">
            ${(p.category ? `<span class="tag">${p.category}</span>` : "")}
          </div>
          <button class="btn" onclick="addToCart('${p.id}')">Agregar</button>
        </div>
      </article>
    `).join("");
  }

  function applyCategoryFilter() {
    if (!els.catFilter) return renderProducts(PRODUCTS);
    const val = els.catFilter.value;
    if (!val || val === "Todas") return renderProducts(PRODUCTS);
    renderProducts(PRODUCTS.filter(p => (p.category || "") === val));
  }

  function updateCartCount() { if (els.cartCount) els.cartCount.textContent = String(CART.length); }

  // Carrito
  function addToCart(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    CART.push({ id: p.id, name: p.name, price: Number(p.price || 0), qty: 1 });
    updateCartCount();
    toast(`"${p.name}" agregado al carrito`);
  }

  async function checkout() {
    if (!CART.length) return toast("Tu carrito está vacío.");

    const total = CART.reduce((a, i) => a + (i.price * (i.qty || 1)), 0);
    const order = {
      createdAt: serverTimestamp(),
      items: CART.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty || 1 })),
      total,
      status: "pending",
      valid: false
    };

    await addDoc(collection(DB, "orders"), order);

    const lines = CART.map(i => `• ${i.name} x${i.qty || 1} - ${money(i.price * (i.qty || 1))}`).join("%0A");
    const msg = `Hola! Quiero comprar:%0A${lines}%0A%0ATotal: ${money(total)}`;
    window.open(`https://wa.me/591${CFG.whatsapp}?text=${msg}`, "_blank");

    CART = [];
    updateCartCount();
  }

  // Live listeners Firestore
  function listenProducts() {
    const qy = query(collection(DB, "products"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      applyCategoryFilter();
    });
  }

  function listenCategories() {
    onSnapshot(collection(DB, "categories"), snap => {
      CATEGORIES = snap.docs.map(d => d.data().name);
      renderCategoryFilter();
      applyCategoryFilter();
    });
  }

  function listenHero() {
    const qy = query(collection(DB, "hero"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      HERO = snap.docs.map(d => d.data().src);
      renderHero();
    });
  }

  function listenBrand() {
    onSnapshot(collection(DB, "brand"), snap => {
      BRAND = snap.empty ? {} : { id: snap.docs[0].id, ...snap.docs[0].data() };
      renderBrand();
    });
  }

  // Inicio
  window.addEventListener("DOMContentLoaded", () => {
    if (els.catFilter) els.catFilter.addEventListener("change", applyCategoryFilter);
    listenProducts();
    listenCategories();
    listenHero();
    listenBrand();
    updateCartCount();
  });

  // Exponer
  window.addToCart = addToCart;
  window.checkout = checkout;
})();
