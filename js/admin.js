// ===================================================================
// admin.js — ADMIN (Firestore only, en vivo, sin localStorage)
// Mantiene flujo con prompt() para agregar/editar.
// ===================================================================

(() => {
  const $ = (s) => document.querySelector(s);
  const els = {
    products:   $("#adminProducts"),
    categories: $("#adminCategories"),
    hero:       $("#adminHero"),
    brandName:  $("#adminBrandName"),
    orders:     $("#adminOrders"),

    // Botones opcionales si existen en tu HTML
    btnAddProduct:  $("#btnAddProduct"),
    btnAddCategory: $("#btnAddCategory"),
    btnAddHero:     $("#btnAddHero"),
    btnEditBrand:   $("#btnEditBrand"),
  };

  const DB = window.DB;
  const {
    collection, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, onSnapshot, serverTimestamp
  } = window.FB;

  const money = (n) => `Bs ${Number(n || 0).toFixed(2)}`;
  const toast = (m) => { try { console.log(m); alert(m); } catch(_){} };

  // ---------------- Products ----------------
  async function addProductModal() {
    const name  = prompt("Nombre del producto:");
    const price = Number(prompt("Precio (Bs):"));
    const image = prompt("URL de la imagen (opcional):");
    const description = prompt("Descripción (opcional):");
    const category = prompt("Categoría (opcional):");
    if (!name || isNaN(price)) return toast("Datos inválidos.");

    await addDoc(collection(DB, "products"), {
      name, price, image: image || "", description: description || "",
      category: category || "", createdAt: serverTimestamp()
    });
    toast("Producto agregado.");
  }

  async function deleteProduct(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteDoc(doc(DB, "products", id));
    toast("Producto eliminado.");
  }

  async function editProduct(id) {
    const ref = doc(DB, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return toast("No existe el producto.");

    const p = snap.data();
    const name  = prompt("Nombre:", p.name || "");
    const price = Number(prompt("Precio (Bs):", p.price || 0));
    const image = prompt("URL imagen:", p.image || "");
    const description = prompt("Descripción:", p.description || "");
    const category = prompt("Categoría:", p.category || "");
    if (!name || isNaN(price)) return toast("Datos inválidos.");

    await updateDoc(ref, { name, price, image, description, category });
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
            <button onclick="editProduct('${p.id}')">Editar</button>
            <button onclick="deleteProduct('${p.id}')">Eliminar</button>
          </div>
        </div>
      </article>
    `).join("");
  }

  function listenProducts() {
    const qy = query(collection(DB, "products"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProducts(list);
    });
  }

  // ---------------- Categories ----------------
  async function addCategoryModal() {
    const name = prompt("Nombre de categoría:");
    if (!name) return;
    // usamos el nombre como ID (evita duplicados sencillos)
    await setDoc(doc(DB, "categories", name), { name });
    toast("Categoría agregada.");
  }

  async function deleteCategory(name) {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    await deleteDoc(doc(DB, "categories", name));
    toast("Categoría eliminada.");
  }

  function renderCategories(list) {
    if (!els.categories) return;
    els.categories.innerHTML = (list || []).map(n => `
      <li class="cat-item">
        <span>${n}</span>
        <button onclick="deleteCategory('${n}')">Eliminar</button>
      </li>
    `).join("");
  }

  function listenCategories() {
    onSnapshot(collection(DB, "categories"), snap => {
      const names = snap.docs.map(d => d.data().name);
      renderCategories(names);
    });
  }

  // ---------------- Hero (carrusel) ----------------
  async function addHeroModal() {
    const url = prompt("URL de la imagen (base64 o https):");
    if (!url) return;
    await addDoc(collection(DB, "hero"), { src: url, createdAt: serverTimestamp() });
    toast("Imagen agregada al hero.");
  }

  async function deleteHeroById(id) {
    if (!confirm("¿Eliminar esta imagen del hero?")) return;
    await deleteDoc(doc(DB, "hero", id));
    toast("Imagen eliminada.");
  }

  function renderHero(list) {
    if (!els.hero) return;
    els.hero.innerHTML = (list || []).map(h => `
      <div class="hero-item">
        <img src="${h.src}" alt="" />
        <button onclick="deleteHeroById('${h.id}')">Eliminar</button>
      </div>
    `).join("");
  }

  function listenHero() {
    const qy = query(collection(DB, "hero"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const imgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHero(imgs);
    });
  }

  // ---------------- Brand (marca) ----------------
  async function loadBrand() {
    const ref = doc(DB, "brand", "settings"); // doc fijo
    const snap = await getDoc(ref);
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
    await setDoc(doc(DB, "brand", "settings"), { name, phone, email, address });
    toast("Marca actualizada.");
    loadBrand();
  }

  // ---------------- Orders (en vivo) ----------------
  async function setOrderStatus(id, newStatus) {
    await updateDoc(doc(DB, "orders", id), { status: newStatus });
    toast(`Pedido marcado como: ${newStatus}`);
  }

  async function toggleOrderValid(id, currentValid) {
    await updateDoc(doc(DB, "orders", id), { valid: !currentValid });
  }

  async function deleteOrder(id) {
    if (!confirm("¿Eliminar este pedido?")) return;
    await deleteDoc(doc(DB, "orders", id));
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
          ${(o.items || []).map(i => `<li>${i.name} x${i.qty||1} — ${money((i.price||0)*(i.qty||1))}</li>`).join("")}
        </ul>
        <p class="total"><b>Total:</b> ${money(o.total)}</p>
        <div class="actions">
          <button onclick="setOrderStatus('${o.id}','pending')">Pendiente</button>
          <button onclick="setOrderStatus('${o.id}','paid')">Pagado</button>
          <button onclick="setOrderStatus('${o.id}','canceled')">Cancelado</button>
          <button onclick="toggleOrderValid('${o.id}', ${!!o.valid})">${o.valid ? 'Marcar no válido' : 'Marcar válido'}</button>
          <button onclick="deleteOrder('${o.id}')">Eliminar</button>
        </div>
      </article>
    `).join("");
  }

  function listenOrders() {
    const qy = query(collection(DB, "orders"), orderBy("createdAt", "desc"));
    onSnapshot(qy, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderOrders(list);
    });
  }

  // ---------------- Inicio ----------------
  window.addEventListener("DOMContentLoaded", () => {
    // Live
    listenProducts();
    listenCategories();
    listenHero();
    listenOrders();

    // Lectura puntual
    loadBrand();

    // Botones (si existen en tu HTML)
    if (els.btnAddProduct)  els.btnAddProduct.addEventListener("click", addProductModal);
    if (els.btnAddCategory) els.btnAddCategory.addEventListener("click", addCategoryModal);
    if (els.btnAddHero)     els.btnAddHero.addEventListener("click", addHeroModal);
    if (els.btnEditBrand)   els.btnEditBrand.addEventListener("click", editBrandModal);
  });

  // Exponer para botones/Consola
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
