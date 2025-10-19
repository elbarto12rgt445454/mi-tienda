// ===================================================================
// admin.js — Admin (Firestore only, live, con fallback de init)
// Mantiene flujo con prompt() y conecta botones por id si existen.
// ===================================================================
(function () {
  // ---------------- Config ----------------
  const CFG = {
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
      console.log("[admin] Firebase detectado en HTML");
      return;
    }
    console.log("[admin] Inyectando Firebase (fallback)...");
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
      if (Date.now() > until) throw new Error("No se pudo inicializar Firebase en admin.js");
      await new Promise(r => setTimeout(r, 40));
    }
    console.log("[admin] Firebase listo (fallback).");
  }

  // ---------------- Selectores ----------------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    products:   $("#adminProducts"),
    categories: $("#adminCategories"),
    hero:       $("#adminHero"),
    brandName:  $("#adminBrandName"),
    orders:     $("#adminOrders"),

    btnAddProduct:  $("#btnAddProduct"),
    btnAddCategory: $("#btnAddCategory"),
    btnAddHero:     $("#btnAddHero"),
    btnEditBrand:   $("#btnEditBrand"),
  };

  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
  const log   = (...a) => console.log("[admin]", ...a);
  const toast = (m) => { try { alert(m); } catch(_){} };

  // ---------------- PRODUCTS ----------------
  async function addProductModal() {
    const name  = prompt("Nombre del producto:");
    const price = Number(prompt("Precio (Bs):"));
    const image = prompt("URL de la imagen (opcional):");
    const description = prompt("Descripción (opcional):");
    const category = prompt("Categoría (opcional):");
    if (!name || isNaN(price)) return toast("Datos inválidos.");

    const { collection, addDoc, serverTimestamp } = window.FB;
    await addDoc(collection(window.DB, "products"), {
      name, price, image: image || "", description: description || "",
      category: category || "", createdAt: serverTimestamp()
    });
    toast("Producto agregado.");
  }

  async function deleteProduct(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await window.FB.deleteDoc(window.FB.doc(window.DB, "products", id));
    toast("Producto eliminado.");
  }

  async function editProduct(id) {
    const ref = window.FB.doc(window.DB, "products", id);
    const snap = await window.FB.getDoc(ref);
    if (!snap.exists()) return toast("No existe el producto.");

    const p = snap.data();
    const name  = prompt("Nombre:", p.name || "");
    const price = Number(prompt("Precio (Bs):", p.price || 0));
    const image = prompt("URL imagen:", p.image || "");
    const description = prompt("Descripción:", p.description || "");
    const category = prompt("Categoría:", p.category || "");
    if (!name || isNaN(price)) return toast("Datos inválidos.");

    await window.FB.updateDoc(ref, { name, price, image, description, category });
    toast("Producto actualizado.");
  }

  function renderProducts(list) {
    if (!els.products) return;
    els.products.innerHTML = (list || []).map(p => `
      <article class="product-card">
        <img src="${p.image || ''}" alt="${p.name || ''}" />
        <div class="body">
          <h3>${p.name || ''}</h3>
          <p>${money(p.price)}</p>
          ${p.category ? `<span class="tag">${p.category}</span>` : ""}
          <div class="actions">
            <button data-edit="${p.id}">Editar</button>
            <button data-del="${p.id}">Eliminar</button>
          </div>
        </div>
      </article>
    `).join("");

    // Delegación de clicks
    els.products.querySelectorAll("[data-edit]").forEach(b =>
      b.addEventListener("click", e => editProduct(e.currentTarget.dataset.edit))
    );
    els.products.querySelectorAll("[data-del]").forEach(b =>
      b.addEventListener("click", e => deleteProduct(e.currentTarget.dataset.del))
    );
  }

  function listenProducts() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "products"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProducts(list);
      log("Productos:", list.length);
    });
  }

  // ---------------- CATEGORIES ----------------
  async function addCategoryModal() {
    const name = prompt("Nombre de categoría:");
    if (!name) return;
    await window.FB.setDoc(window.FB.doc(window.DB, "categories", name), { name });
    toast("Categoría agregada.");
  }

  async function deleteCategory(name) {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    await window.FB.deleteDoc(window.FB.doc(window.DB, "categories", name));
    toast("Categoría eliminada.");
  }

  function renderCategories(list) {
    if (!els.categories) return;
    els.categories.innerHTML = (list || []).map(n => `
      <li class="cat-item">
        <span>${n}</span>
        <button data-delcat="${n}">Eliminar</button>
      </li>
    `).join("");

    els.categories.querySelectorAll("[data-delcat]").forEach(b =>
      b.addEventListener("click", e => deleteCategory(e.currentTarget.dataset.delcat))
    );
  }

  function listenCategories() {
    const { collection, onSnapshot } = window.FB;
    onSnapshot(collection(window.DB, "categories"), snap => {
      const names = snap.docs.map(d => d.data().name);
      renderCategories(names);
      log("Categorías:", names.length);
    });
  }

  // ---------------- HERO ----------------
  async function addHeroModal() {
    const url = prompt("URL de la imagen (base64 o https):");
    if (!url) return;
    await window.FB.addDoc(window.FB.collection(window.DB, "hero"),
      { src: url, createdAt: window.FB.serverTimestamp() });
    toast("Imagen agregada al hero.");
  }

  async function deleteHeroById(id) {
    if (!confirm("¿Eliminar esta imagen del hero?")) return;
    await window.FB.deleteDoc(window.FB.doc(window.DB, "hero", id));
    toast("Imagen eliminada.");
  }

  function renderHero(list) {
    if (!els.hero) return;
    els.hero.innerHTML = (list || []).map(h => `
      <div class="hero-item">
        <img src="${h.src}" alt="" />
        <button data-delhero="${h.id}">Eliminar</button>
      </div>
    `).join("");

    els.hero.querySelectorAll("[data-delhero]").forEach(b =>
      b.addEventListener("click", e => deleteHeroById(e.currentTarget.dataset.delhero))
    );
  }

  function listenHero() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "hero"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const imgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHero(imgs);
      log("Hero imgs:", imgs.length);
    });
  }

  // ---------------- BRAND ----------------
  async function loadBrand() {
    const ref = window.FB.doc(window.DB, "brand", "settings");
    const snap = await window.FB.getDoc(ref);
    if (snap.exists() && els.brandName) {
      const data = snap.data();
      els.brandName.textContent = data.name || "";
    }
  }

  async function editBrandModal() {
    const name = prompt("Nombre de la marca:");
    const phone = prompt("Teléfono (WhatsApp):");
    const email = prompt("Email:");
    const address = prompt("Dirección:");
    await window.FB.setDoc(window.FB.doc(window.DB, "brand", "settings"), { name, phone, email, address });
    toast("Marca actualizada.");
    loadBrand();
  }

  // ---------------- ORDERS ----------------
  async function setOrderStatus(id, newStatus) {
    await window.FB.updateDoc(window.FB.doc(window.DB, "orders", id), { status: newStatus });
    toast(`Pedido marcado como: ${newStatus}`);
  }

  async function toggleOrderValid(id, currentValid) {
    await window.FB.updateDoc(window.FB.doc(window.DB, "orders", id), { valid: !currentValid });
  }

  async function deleteOrder(id) {
    if (!confirm("¿Eliminar este pedido?")) return;
    await window.FB.deleteDoc(window.FB.doc(window.DB, "orders", id));
    toast("Pedido eliminado.");
  }

  function renderOrders(list) {
    if (!els.orders) return;
    els.orders.innerHTML = (list || []).map(o => `
      <article class="order">
        <header>
          <b>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : "—"}</b>
          <span class="status ${o.status || 'pending'}">${o.status || 'pending'}</span>
          <span class="valid">${o.valid ? '✔️ válido' : '❌ no válido'}</span>
        </header>
        <ul class="items">
          ${(o.items || []).map(i => `<li>${i.name} x${i.qty||1} — Bs ${Number((i.price||0)*(i.qty||1)).toFixed(2)}</li>`).join("")}
        </ul>
        <p class="total"><b>Total:</b> Bs ${Number(o.total || 0).toFixed(2)}</p>
        <div class="actions">
          <button data-op="status" data-id="${o.id}" data-val="pending">Pendiente</button>
          <button data-op="status" data-id="${o.id}" data-val="paid">Pagado</button>
          <button data-op="status" data-id="${o.id}" data-val="canceled">Cancelado</button>
          <button data-op="valid" data-id="${o.id}" data-val="${o.valid ? '1':'0'}">${o.valid ? 'Marcar no válido' : 'Marcar válido'}</button>
          <button data-op="delete" data-id="${o.id}">Eliminar</button>
        </div>
      </article>
    `).join("");

    // Delegación de clicks
    els.orders.querySelectorAll("[data-op]").forEach(b => {
      b.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const op = btn.dataset.op;
        const id = btn.dataset.id;
        if (op === "status") {
          await setOrderStatus(id, btn.dataset.val);
        } else if (op === "valid") {
          await toggleOrderValid(id, btn.dataset.val === "1");
        } else if (op === "delete") {
          await deleteOrder(id);
        }
      });
    });
  }

  function listenOrders() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "orders"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderOrders(list);
      log("Pedidos:", list.length);
    });
  }

  // ---------------- Init ----------------
  async function boot() {
    await ensureFirebase();

    listenProducts();
    listenCategories();
    listenHero();
    listenOrders();
    loadBrand();

    // Conectar botones si existen
    if (els.btnAddProduct)  els.btnAddProduct.addEventListener("click", addProductModal);
    if (els.btnAddCategory) els.btnAddCategory.addEventListener("click", addCategoryModal);
    if (els.btnAddHero)     els.btnAddHero.addEventListener("click", addHeroModal);
    if (els.btnEditBrand)   els.btnEditBrand.addEventListener("click", editBrandModal);

    console.log("[admin] UI inicializada");
  }

  // Listeners live (definidos arriba)
  function listenProducts() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "products"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProducts(list);
    });
  }
  function listenCategories() {
    const { collection, onSnapshot } = window.FB;
    onSnapshot(collection(window.DB, "categories"), snap => {
      const names = snap.docs.map(d => d.data().name);
      renderCategories(names);
    });
  }
  function listenHero() {
    const { collection, query, orderBy, onSnapshot } = window.FB;
    const qy = query(collection(window.DB, "hero"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const imgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHero(imgs);
    });
  }

  window.addEventListener("DOMContentLoaded", boot);

  // Exponer para consola / onclick
  window.addProductModal  = addProductModal;
  window.deleteProduct    = deleteProduct;
  window.editProduct      = editProduct;

  window.addCategoryModal = addCategoryModal;
  window.deleteCategory   = deleteCategory;

  window.addHeroModal     = addHeroModal;
  window.deleteHeroById   = deleteHeroById;

  window.editBrandModal   = editBrandModal;

  window.setOrderStatus   = setOrderStatus;
  window.toggleOrderValid = toggleOrderValid;
  window.deleteOrder      = deleteOrder;
})();
