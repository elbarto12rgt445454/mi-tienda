// main.js — Tienda conectada a Firebase (productos, categorías, hero, marca, pedidos)
import { db, APP_CONFIG } from './config.js';
import {
  collection, doc, getDoc, getDocs, onSnapshot, addDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ===== Util ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const money = n => 'Bs ' + Number(n||0).toFixed(2);

/* ===== Elementos del DOM (coinciden con tu index.html) ===== */
const container     = $("#productContainer");
const searchInput   = $("#searchInput");
const filterCategory= $("#filterCategory");
const sortBy        = $("#sortBy");

const cartButton    = $("#cartButton");
const cartModal     = $("#cartModal");
const cartItems     = $("#cartItems");
const cartTotal     = $("#cartTotal");
const checkoutButton= $("#checkoutButton");
const closeCart     = $("#closeCart");
const cartCount     = $("#cartCount");
const fabCart       = $("#fabCart");

const productModal  = $("#productModal");
const modalClose    = $("#modalClose");
const modalTitle    = $("#modalTitle");
const modalImage    = $("#modalImage");
const modalCategory = $("#modalCategory");
const modalDesc     = $("#modalDesc");
const modalPrice    = $("#modalPrice");
const modalQty      = $("#modalQty");
const modalAddToCart= $("#modalAddToCart");

const heroSlides    = $("#heroSlides");
const heroDots      = $("#heroDots");
const heroPrev      = $("#heroPrev");
const heroNext      = $("#heroNext");

const brandLogo     = $("#brandLogo");
const contactInfo   = $("#contactInfo");
const brandAbout    = $("#brandAbout");

/* ===== Estado ===== */
let PRODUCTS = [];  // [{id, ...}]
let CATEGORIES = []; // ["Ebooks", ...]
let CART = JSON.parse(localStorage.getItem('tdp_cart')||'[]');
let currentSlide = 0, slideTimer;

/* ===== Marca (en vivo) ===== */
onSnapshot(doc(db,"marca","default"), snap=>{
  const brand = snap.exists() ? snap.data() : (APP_CONFIG.brandDefault || {});
  if (brandLogo){
    if (brand.logo){ brandLogo.src = brand.logo; brandLogo.classList.remove('hidden'); }
    else brandLogo.classList.add('hidden');
  }
  if (contactInfo){
    contactInfo.innerHTML =
      `<div><strong>${brand.name||''}</strong></div>
       <div>📍 ${brand.address||''}</div>
       <div>📞 ${brand.phone||''} &nbsp; ✉️ ${brand.email||''}</div>`;
  }
  if (brandAbout) brandAbout.textContent = brand.name || 'Tienda Digital Pro';
});

/* ===== Categorías (en vivo) ===== */
onSnapshot(collection(db,"categorias"), snap=>{
  CATEGORIES = snap.docs.map(d => (d.data().nombre));
  renderCategoryFilter();
  applyFilters();
});
function renderCategoryFilter(){
  if (!filterCategory) return;
  filterCategory.innerHTML = '<option value="all">Todas las categorías</option>';
  CATEGORIES.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    filterCategory.appendChild(opt);
  });
}

/* ===== Productos (en vivo) ===== */
onSnapshot(collection(db,"productos"), snap=>{
  PRODUCTS = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  applyFilters();
  updateCartCount();
});

/* ===== Hero (en vivo) ===== */
onSnapshot(collection(db,"hero"), snap=>{
  const imgs = snap.docs.map(d=>d.data().src).filter(Boolean);
  renderHero(imgs);
});
function renderHero(imgs){
  if (!heroSlides || !heroDots) return;
  heroSlides.innerHTML = ""; heroDots.innerHTML = "";
  imgs.forEach((src, i)=>{
    const slide = document.createElement('img');
    slide.src = src; slide.alt = 'Slide '+(i+1);
    slide.className = "absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500";
    slide.style.zIndex = 0;
    heroSlides.appendChild(slide);

    const dot = document.createElement('button');
    dot.className = "w-2.5 h-2.5 rounded-full bg-white/70 hover:bg-white";
    dot.addEventListener('click', ()=> setSlide(i));
    heroDots.appendChild(dot);
  });
  setSlide(0);
  if (heroPrev) heroPrev.onclick = ()=> setSlide(currentSlide-1);
  if (heroNext) heroNext.onclick = ()=> setSlide(currentSlide+1);
}
function setSlide(i){
  const slides = heroSlides.querySelectorAll("img");
  const dots   = heroDots.querySelectorAll("button");
  if (slides.length===0) return;
  currentSlide = (i + slides.length) % slides.length;
  slides.forEach((el,idx)=> el.style.opacity = (idx===currentSlide?1:0));
  dots.forEach((d,idx)=> d.style.opacity = (idx===currentSlide?1:0.5));
  clearTimeout(slideTimer);
  slideTimer = setTimeout(()=> setSlide(currentSlide+1), 5000);
}

/* ===== Render de productos ===== */
function renderProducts(list){
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = "<p class='col-span-full text-center opacity-70'>No hay productos disponibles.</p>";
    return;
  }
  list.forEach(p=>{
    const discounted = p.discount && p.discount>0;
    const unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
    const isSoldOut = !(p.quantity>0);

    const article = document.createElement('article');
    article.className = "bg-white rounded-xl shadow hover:shadow-lg transition flex flex-col overflow-hidden";
    article.innerHTML = `
      <button class="relative group" data-id="${p.id}">
        <img src="${p.image||'data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27768%27 height=%27512%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%23e5e7eb%27/></svg>'}" alt="${p.name}" class="w-full h-48 object-cover">
        <span class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">${p.category||''}</span>
      </button>
      <div class="p-3 flex flex-col gap-1">
        <h3 class="font-bold text-lg">${p.name}</h3>
        <p class="text-sm opacity-80 line-clamp-2">${p.description||''}</p>
        <div class="mt-1 flex items-center justify-between">
          ${
            discounted
              ? `<div class="flex items-baseline gap-2"><span class="text-sm line-through opacity-70">${money(p.price)}</span><span class="font-extrabold">${money(unit)}</span></div>`
              : `<span class="font-extrabold">${money(p.price)}</span>`
          }
          ${
            isSoldOut
            ? '<span class="bg-rose-600 text-white text-sm px-3 py-1 rounded">Agotado</span>'
            : `<button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" data-add="${p.id}">Agregar</button>`
          }
        </div>
        <div class="text-xs text-slate-500 mt-1">${isSoldOut ? 'Sin unidades disponibles' : 'Stock disponible: ' + p.quantity + ' unidad(es)'}</div>
      </div>
    `;
    container.appendChild(article);
  });

  // Detalle modal
  container.querySelectorAll("button[data-id]").forEach(btn=>{
    btn.addEventListener("click", ()=> openProductModal(btn.getAttribute("data-id")));
  });
  // Agregar directo
  container.querySelectorAll("button[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=> addToCart(btn.getAttribute("data-add"), 1));
  });
}

/* ===== Búsqueda / filtros ===== */
function applyFilters(){
  let list = PRODUCTS.slice();
  const term = (searchInput?.value||'').toLowerCase().trim();
  const selectedCategory = filterCategory?.value || 'all';

  if (term) list = list.filter(p => String(p.name||'').toLowerCase().includes(term) || String(p.description||'').toLowerCase().includes(term));
  if (selectedCategory !== 'all') list = list.filter(p => p.category === selectedCategory);

  const sort = sortBy?.value || 'recent';
  if (sort === 'price-asc') list.sort((a,b)=> a.price - b.price);
  else if (sort === 'price-desc') list.sort((a,b)=> b.price - a.price);
  else if (sort === 'name-asc') list.sort((a,b)=> a.name.localeCompare(b.name));
  else if (sort === 'name-desc') list.sort((a,b)=> b.name.localeCompare(a.name));
  else if (sort === 'recent') list.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

  renderProducts(list);
}
if (filterCategory) filterCategory.addEventListener("change", applyFilters);
if (sortBy) sortBy.addEventListener("change", applyFilters);
if (searchInput){
  // tu header tiene un botón con id searchToggle; abre/cierra input
  const searchToggle = $("#searchToggle");
  if (searchToggle){
    searchToggle.addEventListener("click", ()=>{
      if (searchInput.classList.contains('hidden')){
        searchInput.classList.remove('hidden'); searchInput.style.width='220px'; searchInput.focus();
      } else {
        searchInput.classList.add('hidden'); searchInput.style.width='0';
        searchInput.value=''; applyFilters();
      }
    });
  }
  searchInput.addEventListener("input", applyFilters);
}

/* ===== Modal de producto ===== */
function openModal(el){ if (el){ el.classList.remove("hidden"); el.classList.add("flex"); } }
function closeModal(el){ if (el){ el.classList.add("hidden"); el.classList.remove("flex"); } }
if (modalClose) modalClose.addEventListener("click", ()=> closeModal(productModal));

function openProductModal(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  const discounted = p.discount && p.discount>0;
  const unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
  const isSoldOut = !(p.quantity>0);

  modalTitle.textContent = p.name;
  modalImage.src = p.image || '';
  modalCategory.textContent = p.category || '';
  modalDesc.textContent = p.description || '';
  modalPrice.textContent = Number(unit).toFixed(2);

  const stockInfo = $("#modalStock");
  if (stockInfo) stockInfo.textContent = isSoldOut ? 'Sin unidades disponibles' : ('Stock disponible: ' + p.quantity + ' unidad(es)');

  if (isSoldOut){
    modalAddToCart.textContent = 'Agotado';
    modalAddToCart.disabled = true;
    modalQty.disabled = true;
    modalQty.value = 0;
    modalAddToCart.onclick = null;
  } else {
    modalAddToCart.textContent = 'Agregar al carrito';
    modalAddToCart.disabled = false;
    modalQty.disabled = false;
    modalQty.value = 1;
    modalAddToCart.onclick = ()=>{
      addToCart(p.id, Number(modalQty.value)||1);
      closeModal(productModal);
    };
  }

  openModal(productModal);
}

/* ===== Carrito ===== */
function saveCart(){ localStorage.setItem('tdp_cart', JSON.stringify(CART)); }
function updateCartCount(){
  const totalQty = CART.reduce((acc, it)=> acc + it.qty, 0);
  if (cartCount) cartCount.textContent = totalQty;
  if (fabCart) { fabCart.classList.toggle('hidden', totalQty===0); fabCart.classList.add('z-[9999]'); }
}
function addToCart(productId, qty){
  const p = PRODUCTS.find(x=>x.id===productId);
  if (!p) return alert('Producto no encontrado.');
  if (!(p.quantity>0)) return alert('Este producto está agotado.');
  const exist = CART.find(ci=>ci.id===productId);
  const desired = (exist ? exist.qty : 0) + qty;
  if (desired > p.quantity) return alert('Solo hay ' + p.quantity + ' unidad(es) disponibles.');
  if (exist) exist.qty += qty; else CART.push({ id: productId, qty });
  saveCart(); updateCartCount();
}
function renderCart(){
  cartItems.innerHTML = "";
  let total = 0;
  CART.forEach((ci, idx)=>{
    const p = PRODUCTS.find(x=>x.id===ci.id);
    if (!p) return;
    const unit = (p.discount && p.discount>0) ? (p.price*(1 - p.discount/100)) : p.price;
    const line = unit * ci.qty;
    total += line;
    const row = document.createElement('div');
    row.className = "flex justify-between items-center border-b py-2 gap-2";
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <img src="${p.image||''}" class="w-12 h-12 object-cover rounded" />
        <div>
          <div class="font-semibold">${p.name}</div>
          <div class="text-sm opacity-80">${money(unit)} x
            <input data-qty="${idx}" type="number" min="1" value="${ci.qty}" class="w-16 px-1 py-0.5 border rounded" />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-semibold">${money(line)}</span>
        <button data-del="${idx}" class="text-rose-600 hover:underline">Eliminar</button>
      </div>
    `;
    cartItems.appendChild(row);
  });
  cartTotal.textContent = total.toFixed(2);

  // qty change
  cartItems.querySelectorAll("input[data-qty]").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = Number(e.currentTarget.getAttribute("data-qty"));
      let v = Math.max(1, Number(e.currentTarget.value)||1);
      const p = PRODUCTS.find(x=>x.id===CART[idx].id);
      if (p && p.quantity && v > p.quantity){
        alert('Solo hay ' + p.quantity + ' unidad(es) disponibles.');
        v = p.quantity;
      }
      CART[idx].qty = v; saveCart(); renderCart(); updateCartCount();
    });
  });
  // delete
  cartItems.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const i = Number(e.currentTarget.getAttribute("data-del"));
      CART.splice(i,1); saveCart(); renderCart(); updateCartCount();
    });
  });
}
if (cartButton) cartButton.addEventListener("click", ()=>{ renderCart(); openModal(cartModal); });
if (fabCart)    fabCart.addEventListener("click", ()=>{ renderCart(); openModal(cartModal); });
if (closeCart)  closeCart.addEventListener("click", ()=> closeModal(cartModal));

/* ===== Checkout: crea pedido en Firestore + abre WhatsApp; valida stock con transacción ===== */
if (checkoutButton){
  checkoutButton.addEventListener("click", async ()=>{
    if (CART.length === 0) return;

    // Construir mensaje y total
    let total = 0;
    let message = "Hola, quiero comprar los siguientes productos:%0A%0A";
    for (const ci of CART){
      const p = PRODUCTS.find(x=>x.id===ci.id);
      if (!p) continue;
      const unit = (p.discount && p.discount>0) ? (p.price*(1 - p.discount/100)) : p.price;
      const line = unit * ci.qty;
      total += line;
      message += `• ${p.name} x ${ci.qty} - ${money(line)}%0A`;
    }
    message += `%0A**Total:** Bs ${total.toFixed(2)}`;

    // Transacción: verifica stock y descuenta
    try {
      await runTransaction(db, async (tx)=>{
        for (const ci of CART){
          const ref = doc(db,"productos", ci.id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('Producto no encontrado');
          const data = snap.data();
          const qty = Number(data.quantity||0);
          if (qty < ci.qty) throw new Error(`Stock insuficiente para ${data.name}`);
          tx.update(ref, { quantity: qty - ci.qty });
        }
      });
    } catch (err){
      alert('No se pudo completar: ' + err.message);
      return;
    }

    // Crear pedido
    const items = CART.map(ci => ({ id: ci.id, qty: ci.qty }));
    await addDoc(collection(db,"pedidos"), {
      items,
      total: Number(total.toFixed(2)),
      valid: false,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Limpiar carrito y abrir WhatsApp
    CART = []; saveCart(); renderCart(); updateCartCount(); closeModal(cartModal);
    const url = "https://wa.me/"+APP_CONFIG.whatsapp+"?text="+message;
    window.open(url, "_blank");
    applyFilters();
  });
}

/* ===== Inicializar ===== */
updateCartCount();
applyFilters();

