// admin.js — Panel de administración con Firebase Firestore
import { db, APP_CONFIG } from './config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ========= Utilidades ========= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : ('id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const money = n => 'Bs ' + Number(n||0).toFixed(2);

/* ========= Elementos (coinciden con tu HTML) ========= */
// Login / panel
const loginSection = $("#loginSection");
const adminPanel   = $("#adminPanel");
const loginBtn     = $("#loginBtn");
const logoutBtn    = $("#logoutBtn");
const adminUserInp = $("#adminUser");
const adminPassInp = $("#adminPass");

// Sidebar / tabs
const tabs = $$(".menuBtn");
const sections = $$(".tabSection");

// KPIs y chart
const kpiProducts   = $("#kpiProducts");
const kpiCategories = $("#kpiCategories");
const kpiOrders     = $("#kpiOrders");
const kpiRevenue    = $("#kpiRevenue");
const chartCanvas   = $("#chartByCategory");

// Categorías
const addCategoryForm = $("#addCategoryForm");
const categoryName    = $("#categoryName");
const categoryList    = $("#categoryList");

// Productos
const addProductForm   = $("#addProductForm");
const productIdInp     = $("#productId");
const productNameInp   = $("#productName");
const productDescInp   = $("#productDescription");
const productCategory  = $("#productCategory");
const productPriceInp  = $("#productPrice");
const productDiscount  = $("#productDiscount");
const productQtyInp    = $("#productQuantity");
const productImageInp  = $("#productImage");
const adminProductList = $("#adminProductList");
const deleteProductBtn = $("#deleteProductBtn");
const resetFormBtn     = $("#resetForm");

// Carrusel
const addHeroForm = $("#addHeroForm");
const heroImage   = $("#heroImage");
const heroList    = $("#heroList");

// Marca
const brandForm     = $("#brandForm");
const brandNameInp  = $("#brandName");
const brandAddrInp  = $("#brandAddress");
const brandPhoneInp = $("#brandPhone");
const brandEmailInp = $("#brandEmail");
const brandLogoInp  = $("#brandLogo");
const saveBrandBtn  = $("#saveBrandBtn");
const resetBrandBtn = $("#resetBrandBtn");

// Pedidos
const ordersList = $("#ordersList");

// Backup
const exportBtn = $("#exportBtn");
const importBtn = $("#importBtn");
const importFile = $("#importFile");

/* ========= Estado ========= */
let CATS = [];   // [{id, nombre}]
let PRODS = [];  // [{id, name, description, category, price, discount, quantity, image, createdAt}]
let ORDERS = []; // [{id, items, total, valid, createdAt}]
let HERO = [];   // [{id, src, createdAt}]
let BRAND = null;

// Sesión simple (igual que tu implementación previa)
function showPanel() { loginSection.classList.add("hidden"); adminPanel.classList.remove("hidden"); }
function showLogin() { adminPanel.classList.add("hidden"); loginSection.classList.remove("hidden"); }

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const u = (adminUserInp.value||"").trim();
    const p = (adminPassInp.value||"").trim();
    if (u === "formula" && p === "andes") showPanel();
    else alert("Credenciales incorrectas");
  });
}
if (logoutBtn) logoutBtn.addEventListener("click", () => location.reload());

/* ========= Tabs ========= */
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove('bg-blue-800','text-white','shadow'));
    btn.classList.add('bg-blue-800','text-white','shadow');
    const t = btn.getAttribute('data-tab');
    sections.forEach(s => s.classList.add('hidden'));
    const section = document.getElementById('tab-'+t);
    if (section) section.classList.remove('hidden');
  });
});

/* ========= Firestore: suscripciones en vivo ========= */
// Categorías
onSnapshot(collection(db, "categorias"), snap => {
  CATS = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderCategories();
  fillCategorySelect();
  renderKPIs();
  drawChart();
});
// Productos
onSnapshot(collection(db, "productos"), snap => {
  PRODS = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderProducts();
  renderKPIs();
  drawChart();
});
// Pedidos
onSnapshot(collection(db, "pedidos"), snap => {
  ORDERS = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderOrders();
  renderKPIs();
  drawChart();
});
// Carrusel
onSnapshot(collection(db, "hero"), snap => {
  HERO = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderHeroList();
});
// Marca (como doc único con id "default")
onSnapshot(doc(db, "marca", "default"), snap => {
  BRAND = snap.exists() ? snap.data() : null;
  loadBrandToForm();
});

/* ========= Render KPIs & Chart ========= */
function renderKPIs(){
  kpiProducts.textContent   = PRODS.length;
  kpiCategories.textContent = CATS.length;
  kpiOrders.textContent     = ORDERS.length;
  const revenue = ORDERS.reduce((acc,o)=>acc + Number(o.total||0), 0);
  kpiRevenue.textContent    = money(revenue);
}
function drawChart(){
  if (!chartCanvas || !window.Chart) return; // si no está Chart.js, no dibujar
  const byMonth = Array(12).fill(0);
  const nowY = new Date().getFullYear();
  ORDERS.filter(o => o.valid === true).forEach(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || Date.now());
    if (d.getFullYear() === nowY) byMonth[d.getMonth()] += Number(o.total||0);
  });

  if (window.chartByCategory) window.chartByCategory.destroy();
  const ctx = chartCanvas.getContext('2d');
  window.chartByCategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
      datasets: [{ label:'Ventas validadas (Bs)', data: byMonth }]
    },
    options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
  });
}

/* ========= Categorías ========= */
function renderCategories(){
  categoryList.innerHTML = "";
  CATS.forEach(c => {
    const li = document.createElement('li');
    li.className = "flex justify-between items-center border rounded px-2 py-1";
    li.innerHTML = `
      <input class="flex-1 bg-transparent outline-none" value="${c.nombre}" data-id="${c.id}" />
      <button class="text-rose-600 hover:underline" data-del="${c.id}">Eliminar</button>
    `;
    // editar
    li.querySelector('input').addEventListener('change', async (e)=>{
      const val = (e.currentTarget.value||"").trim();
      if (!val) return;
      await updateDoc(doc(db, "categorias", c.id), { nombre: val });
    });
    // eliminar
    li.querySelector('button[data-del]').addEventListener('click', async ()=>{
      if (!confirm('¿Eliminar esta categoría?')) return;
      await deleteDoc(doc(db, "categorias", c.id));
      // mover productos de esta categoría a otra (si existe)
      if (CATS.length > 1) {
        const fallback = (CATS.find(x=>x.id!==c.id) || CATS[0])?.nombre;
        const snap = await getDocs(collection(db, "productos"));
        const tasks = snap.docs.map(async d => {
          const p = d.data();
          if (p.category === c.nombre) {
            await updateDoc(doc(db,"productos", d.id), { category: fallback });
          }
        });
        await Promise.all(tasks);
      }
    });
    categoryList.appendChild(li);
  });
}
function fillCategorySelect(){
  productCategory.innerHTML = "";
  CATS.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.nombre; opt.textContent = c.nombre;
    productCategory.appendChild(opt);
  });
}
if (addCategoryForm){
  addCategoryForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = (categoryName.value||"").trim();
    if (!name) return;
    await addDoc(collection(db, "categorias"), { nombre: name, createdAt: serverTimestamp() });
    categoryName.value = "";
  });
}

/* ========= Productos ========= */
function renderProducts(){
  adminProductList.innerHTML = "";
  const prods = [...PRODS].sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  prods.forEach(p=>{
    const discounted = p.discount && p.discount>0;
    const unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = "bg-white border p-3 rounded-xl shadow hover:shadow-md text-left";
    card.innerHTML = `
      <img src="${p.image||''}" class="w-full h-40 object-cover rounded">
      <h3 class="font-bold mt-2">${p.name}</h3>
      <p class="text-sm opacity-70">${p.category||''}</p>
      <p class="font-semibold">${
        discounted ? `<span class="line-through text-sm opacity-70">${money(p.price)}</span> ${money(unit)}`
                   : `${money(p.price)}`
      }</p>
      <div class="mt-1 text-xs">Stock: ${p.quantity ?? 0}</div>
      <div class="mt-2 text-xs bg-slate-100 px-2 py-0.5 rounded">ID: ${p.id?.slice?.(0,8)||'—'}…</div>
    `;
    card.addEventListener('click', ()=> fillFormForEdit(p));
    adminProductList.appendChild(card);
  });
}
function fillFormForEdit(p){
  if (deleteProductBtn){ deleteProductBtn.classList.remove('hidden'); deleteProductBtn.disabled=false; deleteProductBtn.dataset.id = p.id; }
  productIdInp.value    = p.id;
  productNameInp.value  = p.name||'';
  productDescInp.value  = p.description||'';
  productCategory.value = p.category||'';
  productPriceInp.value = p.price||0;
  productDiscount.value = p.discount||0;
  productQtyInp.value   = p.quantity||0;
  window.scrollTo({top:0, behavior:'smooth'});
}
if (deleteProductBtn){
  deleteProductBtn.addEventListener('click', async ()=>{
    const id = deleteProductBtn.dataset.id || productIdInp.value;
    if (!id) return alert('No hay producto seleccionado.');
    if (!confirm('¿Eliminar este producto?')) return;
    await deleteDoc(doc(db, "productos", id));
    addProductForm.reset(); productIdInp.value=''; productDiscount.value=0;
    deleteProductBtn.classList.add('hidden'); deleteProductBtn.disabled = true; deleteProductBtn.removeAttribute('data-id');
  });
}

if (addProductForm){
  addProductForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const id = productIdInp.value || null;
    const data = {
      name: (productNameInp.value||'').trim(),
      description: (productDescInp.value||'').trim(),
      category: productCategory.value,
      price: Number(productPriceInp.value||0),
      discount: Math.max(0, Math.min(100, Number(productDiscount.value||0))),
      quantity: Math.max(0, Number(productQtyInp.value||0)),
      createdAt: serverTimestamp()
    };
    const file = productImageInp.files[0];

    const finalize = async (imageData) => {
      if (imageData) data.image = imageData;
      if (id) { // update
        const prev = await getDoc(doc(db,"productos", id));
        if (prev.exists()) {
          const createdAt = prev.data().createdAt || serverTimestamp();
          await setDoc(doc(db,"productos", id), { ...data, createdAt }); // conservar createdAt
        } else {
          await setDoc(doc(db,"productos", id), data);
        }
      } else {
        await addDoc(collection(db,"productos"), data);
      }
      addProductForm.reset(); productIdInp.value=""; productDiscount.value=0;
      if (deleteProductBtn){ deleteProductBtn.classList.add('hidden'); deleteProductBtn.disabled = true; deleteProductBtn.removeAttribute('data-id'); }
    };

    if (file){
      const reader = new FileReader();
      reader.onload = () => finalize(reader.result);
      reader.readAsDataURL(file);
    } else {
      await finalize(null);
    }
  });
}
if (resetFormBtn){
  resetFormBtn.addEventListener("click", ()=>{
    addProductForm.reset(); productIdInp.value=""; productDiscount.value=0;
    if (deleteProductBtn){ deleteProductBtn.classList.add('hidden'); deleteProductBtn.disabled = true; deleteProductBtn.removeAttribute('data-id'); }
  });
}

/* ========= Carrusel (hero) ========= */
function renderHeroList(){
  heroList.innerHTML = "";
  HERO.forEach(h=>{
    const card = document.createElement('div');
    card.className = "relative";
    card.innerHTML = `
      <img src="${h.src}" class="w-full h-28 object-cover rounded border">
      <button data-del="${h.id}" class="absolute top-1 right-1 bg-rose-600 text-white text-xs px-2 py-0.5 rounded">Eliminar</button>
    `;
    card.querySelector('button').addEventListener('click', async ()=>{
      await deleteDoc(doc(db, "hero", h.id));
    });
    heroList.appendChild(card);
  });
}
if (addHeroForm){
  addHeroForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const file = heroImage.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await addDoc(collection(db, "hero"), { src: reader.result, createdAt: serverTimestamp() });
      addHeroForm.reset();
    };
    reader.readAsDataURL(file);
  });
}

/* ========= Marca ========= */
function loadBrandToForm(){
  const b = BRAND || APP_CONFIG.brandDefault || {};
  brandNameInp.value  = b.name || '';
  brandAddrInp.value  = b.address || '';
  brandPhoneInp.value = b.phone || '';
  brandEmailInp.value = b.email || '';
}
if (brandForm){
  brandForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const last = BRAND || {};
    const data = {
      name: brandNameInp.value || last.name || '',
      address: brandAddrInp.value || last.address || '',
      phone: brandPhoneInp.value || last.phone || '',
      email: brandEmailInp.value || last.email || '',
      logo: last.logo || null,
      updatedAt: serverTimestamp()
    };
    const file = brandLogoInp.files[0];
    if (file){
      const reader = new FileReader();
      reader.onload = async ()=> {
        data.logo = reader.result;
        await setDoc(doc(db,"marca","default"), data, { merge: true });
        alert('Marca guardada');
      };
      reader.readAsDataURL(file);
    } else {
      await setDoc(doc(db,"marca","default"), data, { merge: true });
      alert('Marca guardada');
    }
  });
}
if (resetBrandBtn){
  resetBrandBtn.addEventListener("click", async ()=>{
    await deleteDoc(doc(db,"marca","default"));
    loadBrandToForm();
  });
}

/* ========= Pedidos ========= */
function renderOrders(){
  ordersList.innerHTML = "";
  if (!ORDERS.length){
    ordersList.innerHTML = "<p class='opacity-70'>No hay pedidos aún.</p>";
    return;
  }
  // ordenar por fecha
  const list = [...ORDERS].sort((a,b)=>{
    const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt||0);
    const dbb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt||0);
    return dbb - da;
  });

  list.forEach(o=>{
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt||Date.now());
    const dateStr = d.toLocaleString();
    const itemsHtml = (o.items||[]).map(it=>{
      const p = PRODS.find(x=>x.id===it.id);
      const name = p?.name || it.id;
      const unit = p ? (p.discount>0 ? p.price*(1-p.discount/100) : p.price) : 0;
      return `• ${name} x ${it.qty} (${money(unit*it.qty)})`;
    }).join("<br>");

    const valid = o.valid === true;
    const card = document.createElement('div');
    card.className = "border rounded-xl p-3";
    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-semibold">Pedido ${String(o.id).slice(0,8)}…</div>
          <div class="text-sm opacity-70">${dateStr}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm ${valid?'text-emerald-600':'text-rose-600'}">${valid?'VALIDADO':'PENDIENTE'}</span>
          <button data-toggle="${o.id}" class="px-3 py-1 rounded ${valid?'bg-rose-600':'bg-emerald-600'} text-white">${valid?'Invalidar':'Validar'}</button>
          <button data-del="${o.id}" class="px-3 py-1 rounded bg-slate-500 text-white hover:bg-slate-600">Eliminar</button>
        </div>
      </div>
      <div class="mt-2 text-sm">${itemsHtml}</div>
      <div class="mt-2 font-semibold">Total: ${money(o.total||0)}</div>
    `;
    // toggle validar
    card.querySelector('button[data-toggle]').addEventListener('click', async (e)=>{
      const id = e.currentTarget.getAttribute('data-toggle');
      const ref = doc(db,"pedidos", id);
      const snap = await getDoc(ref);
      if (snap.exists()){
        const cur = snap.data();
        await updateDoc(ref, { valid: !(cur.valid === true) });
      }
    });
    // eliminar
    card.querySelector('button[data-del]').addEventListener('click', async (e)=>{
      const id = e.currentTarget.getAttribute('data-del');
      if (!confirm('¿Eliminar este pedido permanentemente?')) return;
      await deleteDoc(doc(db,"pedidos", id));
    });

    ordersList.appendChild(card);
  });
}

/* ========= Exportar / Importar (opcional respaldo) ========= */
if (exportBtn){
  exportBtn.addEventListener('click', async ()=>{
    const cats   = (await getDocs(collection(db,"categorias"))).docs.map(d=>({id:d.id,...d.data()}));
    const prods  = (await getDocs(collection(db,"productos"))).docs.map(d=>({id:d.id,...d.data()}));
    const hero   = (await getDocs(collection(db,"hero"))).docs.map(d=>({id:d.id,...d.data()}));
    const orders = (await getDocs(collection(db,"pedidos"))).docs.map(d=>({id:d.id,...d.data()}));
    const brand  = (await getDoc(doc(db,"marca","default"))).data() || null;

    const data = { categorias:cats, productos:prods, hero, pedidos:orders, marca:brand };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='backup_tienda.json'; a.click();
    URL.revokeObjectURL(url);
  });
}
if (importBtn && importFile){
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', async ()=>{
    const file = importFile.files[0]; if (!file) return;
    if (!confirm('Esto reemplazará datos existentes. ¿Continuar?')) return;
    const text = await file.text();
    const data = JSON.parse(text);

    // categorias
    if (Array.isArray(data.categorias)){
      for (const c of data.categorias){
        await setDoc(doc(db,"categorias", c.id || uuid()), { nombre:c.nombre||c.name||'General' });
      }
    }
    // productos
    if (Array.isArray(data.productos)){
      for (const p of data.productos){
        const id = p.id || uuid();
        await setDoc(doc(db,"productos", id), {
          name: p.name||'Producto',
          description: p.description||'',
          category: p.category||'General',
          price: Number(p.price||0),
          discount: Number(p.discount||0),
          quantity: Number(p.quantity||0),
          image: p.image||'',
          createdAt: p.createdAt || serverTimestamp()
        }, { merge:true });
      }
    }
    // hero
    if (Array.isArray(data.hero)){
      for (const h of data.hero){
        await setDoc(doc(db,"hero", h.id || uuid()), { src: h.src || h.image || '', createdAt: serverTimestamp() }, { merge:true });
      }
    }
    // marca
    if (data.marca && typeof data.marca === 'object'){
      await setDoc(doc(db,"marca","default"), { ...data.marca, updatedAt: serverTimestamp() }, { merge:true });
    }
    // pedidos (opcional)
    if (Array.isArray(data.pedidos)){
      for (const o of data.pedidos){
        await setDoc(doc(db,"pedidos", o.id || uuid()), {
          items: Array.isArray(o.items)? o.items : [],
          total: Number(o.total||0),
          valid: !!o.valid,
          createdAt: o.createdAt || serverTimestamp(),
          status: o.status || 'pending'
        }, { merge:true });
      }
    }
    alert('Datos importados.');
    importFile.value = '';
  });
}

/* ========= Mostrar el panel por defecto si ya logueó ========= */
showLogin(); // mantén el flujo simple; si quieres TTL, puedes adaptarlo
// abrir primer tab por UX
const firstBtn = document.querySelector('.menuBtn[data-tab="dashboard"]');
if (firstBtn) firstBtn.click();
