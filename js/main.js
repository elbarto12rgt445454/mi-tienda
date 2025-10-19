// ===================================================================
// main.js — Cliente (Firestore only, live, con fallback de init)
// ===================================================================
(function () {
  // ---------------- Config ----------------
  const CFG = {
    whatsapp: "68650455", // se usa como 591 + número
    brandFallback: "Librería La Fórmula",
    firebaseConfig: {
      apiKey: "AIzaSyAJRPLeyfVFyVmshekqSONm4P9ssTxhfJA",
      authDomain: "mi-tienda-cc21e.firebaseapp.com",
      projectId: "mi-tienda-cc21e",
      storageBucket: "mi-tienda-cc21e.firebasestorage.app",
      messagingSenderId: "41230624909",
      appId: "1:41230624909:web:f66164de53f0ad84815ac4",
      measurementId: "G-KM2LP27PRP"
    }
  };

  // ------------- Firebase ensure (fallback) -------------
  async function ensureFirebase() {
    if (window.DB && window.FB) {
      console.log("[main] Firebase detectado en HTML");
      return;
    }
    console.log("[main] Inyectando Firebase (fallback)...");
    const code = `
      import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
      import {
        getFirestore, collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
        doc, query, orderBy, onSnapshot, serverTimestamp
      } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

      const app = initializeApp(${JSON.stringify(CFG.firebaseConfig)});
      window.DB = getFirestore(app);
      window.FB = { collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp };
    `;
    const s = document.createElement("script");
    s.type = "module";
    s.textContent = code;
    document.head.appendChild(s);

    const until = Date.now() + 5000;
    while (!(window.DB && window.FB)) {
      if (Date.now() > until) throw new Error("No se pudo inicializar Firebase en main.js");
      await new Promise(r => setTimeout(r, 40));
    }
    console.log("[main] Firebase listo (fallback).");
  }

  // ---------------- Estado / Selectores ----------------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    hero:        $("#hero"),
    brandName:   $("#brandName"),
    catFilter:   $("#categoryFilter"),
    products:    $("#products"),
    cartCount:   $("#cartCount"),
    checkoutBtn: $("#checkoutBtn") // si lo tienes en HTML
  };

  let PRODUCTS = [];
  let CATEGORIES = [];
  let HERO = [];
  let BRAND = {};
  let CART = [];

  // ---------------- Utilidades ----------------
  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
  const log   = (...a) => console.log("[main]", ...a);
  const toast = (m) => { try { alert(m); } catch(_){} };

  // ---------------- Render ----------------
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
          ${p.category ? `<span class="tag">${p.category}</span>` : ""}
          <button class="btn" data-add="${p.id}">Agregar</button>
        </div>
      </article>
    `).join("");
    // Delegación de clicks para "Agregar"
    els.products.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", (e) => addToCart(e.currentTarget.dataset.add));
    });
  }

  function applyCategoryFilter() {
    if (!els.catFilter) return renderProducts(PRODUCTS);
    const val = els.catFilter.value;
    if (!val || val === "Todas") return renderProducts(PRODUCTS);
    renderProducts(PRODUCTS.filter(p => (p.category || "") === val));
  }

  function updateCartCount() {
    if (els.cartCount) els.cartCount.textContent = String(CART.length);
  }

  // ---------------- Carrito / Checkout ----------------
  function addToCart(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    CART.push({ id: p.id, name: p.name, price: Number(p.price || 0), qty: 1 });
    updateCartCount();
    toast(`"${p.name}" agregado al carrito`);
  }

  async function checkout() {
    if (!CART.length) return toast("Tu carrito está vacío.");

    const { collection, addDoc, serverTimestamp } = window.FB;
    const total = CART.reduce((a, i) => a + (i.price * (i.qty || 1)), 0);
    const order = {
      createdAt: serverTimestamp(),
      items: CART.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty || 1 })),
      total,
      status: "pending",
      valid: false
    };
    await addDoc(collection(window.DB, "orders"), order);

    const lines = CART.map(i => `• ${i.name} x${i.qty || 1} - ${money(i.price * (i.qty || 1))}`).join("%0A");
    const msg = `Hola! Quiero comprar:%0A${lines}%0A%0ATotal: ${money(total)}`;
    window.open(`https://wa.me/591${CFG.whatsapp}?text=${msg}`, "_blank");

    CART = [];
    updateCartCount();
  }

  // ---------------- Listeners Firestore ----------------
  function listenProducts() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "products"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      log("Productos:", PRODUCTS.length);
      applyCategoryFilter();
    });
  }
  function listenCategories() {
    const { collection, onSnapshot } = window.FB;
    onSnapshot(collection(window.DB, "categories"), snap => {
      CATEGORIES = snap.docs.map(d => d.data().name);
      renderCategoryFilter();
      applyCategoryFilter();
    });
  }
  function listenHero() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "hero"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      HERO = snap.docs.map(d => d.data().src);
      renderHero();
    });
  }
  function listenBrand() {
    const { collection, onSnapshot } = window.FB;
    onSnapshot(collection(window.DB, "brand"), snap => {
      BRAND = snap.empty ? {} : { id: snap.docs[0].id, ...snap.docs[0].data() };
      renderBrand();
    });
  }

  // ---------------- Init ----------------
  async function boot() {
    await ensureFirebase();
    // Eventos UI
    if (els.catFilter) els.catFilter.addEventListener("change", applyCategoryFilter);
    if (els.checkoutBtn) els.checkoutBtn.addEventListener("click", checkout);
    // Live
    listenProducts();
    listenCategories();
    listenHero();
    listenBrand();
    updateCartCount();
    log("UI inicializada");
  }

  window.addEventListener("DOMContentLoaded", boot);

  // Exponer funciones (por si tu HTML usa onclick o pruebas por consola)
  window.addToCart = addToCart;
  window.checkout = checkout;
})();
