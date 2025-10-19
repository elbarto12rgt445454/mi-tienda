// ===== Config & Helpers =====
var S_KEYS = {
  PRODUCTS: 'tdp_products',
  CATEGORIES: 'tdp_categories',
  CART: 'tdp_cart',
  ORDERS: 'tdp_orders',
  HERO: 'tdp_hero_images',
  BRAND: 'tdp_brand'
};
var CFG = window.APP_CONFIG || { whatsapp: '59168650455', sessionTTLms: 60000, brandDefault: {} };

function UUID(){
  try { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  catch(e){ return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
}
function load(key, fallback){ try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; } }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function formatBOB(n){ try{ return 'Bs ' + Number(n).toFixed(2); }catch(e){ return 'Bs 0.00'; } }

// ===== Seed (solo si vacío) =====
(function seed(){
  var categories = load(S_KEYS.CATEGORIES, null);
  var products = load(S_KEYS.PRODUCTS, null);
  var hero = load(S_KEYS.HERO, null);
  if (!categories || categories.length === 0) {
    categories = ['Ebooks', 'Plantillas', 'Cursos', 'Música'];
    save(S_KEYS.CATEGORIES, categories);
  }
  if (!products || products.length === 0) {
    var img = '';
    products = [
      { id: UUID(), name: 'Ebook SEO Pro', description: 'Guía completa', category: 'Ebooks', price: 19.99, discount: 0, image: img, createdAt: Date.now() },
      { id: UUID(), name: 'Plantillas Pro', description: 'Paquete de 20 plantillas', category: 'Plantillas', price: 9.99, discount: 10, image: img, createdAt: Date.now()-10000 }
    ];
    save(S_KEYS.PRODUCTS, products);
  }
  if (!hero || hero.length === 0) {
    hero = [];
    save(S_KEYS.HERO, hero);
  }
})();

// ===== Elements =====
var container = document.getElementById("productContainer");
var searchInput = document.getElementById("searchInput");
var filterCategory = document.getElementById("filterCategory");
var sortBy = document.getElementById("sortBy");
var cartButton = document.getElementById("cartButton");
var cartModal = document.getElementById("cartModal");
var cartItems = document.getElementById("cartItems");
var cartTotal = document.getElementById("cartTotal");
var checkoutButton = document.getElementById("checkoutButton");
var closeCart = document.getElementById("closeCart");
var cartCount = document.getElementById("cartCount");
var fabCart = document.getElementById("fabCart");

var productModal = document.getElementById("productModal");
var modalClose = document.getElementById("modalClose");
var modalTitle = document.getElementById("modalTitle");
var modalImage = document.getElementById("modalImage");
var modalCategory = document.getElementById("modalCategory");
var modalDesc = document.getElementById("modalDesc");
var modalPrice = document.getElementById("modalPrice");
var modalQty = document.getElementById("modalQty");
var modalAddToCart = document.getElementById("modalAddToCart");

var heroSlides = document.getElementById("heroSlides");
var heroDots = document.getElementById("heroDots");
var heroPrev = document.getElementById("heroPrev");
var heroNext = document.getElementById("heroNext");

var PRODUCTS = load(S_KEYS.PRODUCTS, []);
var CATEGORIES = load(S_KEYS.CATEGORIES, []);
var CART = load(S_KEYS.CART, []);

// ===== Brand =====
function getBrand(){
  try { var v = localStorage.getItem(S_KEYS.BRAND); return v ? JSON.parse(v) : (CFG.brandDefault || {}); }
  catch(e){ return (CFG.brandDefault || {}); }
}
function applyBrandToUI(){
  var brand = getBrand();
  var logoEl = document.getElementById('brandLogo');
  if (logoEl){
    if (brand.logo){ logoEl.src = brand.logo; logoEl.classList.remove('hidden'); }
    else { logoEl.classList.add('hidden'); }
  }
  var contact = document.getElementById('contactInfo');
  if (contact){
    contact.innerHTML = '<div><strong>'+(brand.name||'')+'</strong></div>' +
                        '<div>📍 '+(brand.address||'')+'</div>' +
                        '<div>📞 '+(brand.phone||'')+' &nbsp; ✉️ '+(brand.email||'')+'</div>';
  }
  var about = document.getElementById('brandAbout');
  if (about){ about.textContent = brand.name || 'Tienda Digital Pro'; }
}

// ===== Categories =====
function renderCategoryFilter(){
  filterCategory.innerHTML = '<option value="all">Todas las categorías</option>';
  for (var i=0;i<CATEGORIES.length;i++){
    var opt = document.createElement('option');
    opt.value = CATEGORIES[i]; opt.textContent = CATEGORIES[i];
    filterCategory.appendChild(opt);
  }
}

// ===== Products =====
function renderProducts(list){
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = "<p class='col-span-full text-center opacity-70'>No hay productos disponibles.</p>";
    return;
  }
  list.forEach(function(p){
    var discounted = p.discount && p.discount > 0;
    var isSoldOut = !p.quantity || p.quantity <= 0;
    var unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
    var card = document.createElement("article");
    card.className = "bg-white rounded-xl shadow hover:shadow-lg transition flex flex-col overflow-hidden";
    card.innerHTML = ''
      + '<button class="relative group" data-id="'+p.id+'">'
      +   '<img src="'+(p.image || 'data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27768%27 height=%27512%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%23e5e7eb%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-size=%2732%27 fill=%2799a%27>Producto</text></svg>')+'" alt="'+p.name+'" class="w-full h-48 object-cover">'
      +   '<span class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">'+p.category+'</span>'
      + '</button>'
      + '<div class="p-3 flex flex-col gap-1">'
      +   '<h3 class="font-bold text-lg">'+p.name+'</h3>'
      +   '<p class="text-sm opacity-80 line-clamp-2">'+(p.description||'')+'</p>'
      +   '<div class="mt-1 flex items-center justify-between">'
      +     (discounted
              ? '<div class="flex items-baseline gap-2"><span class="text-sm line-through opacity-70">'+formatBOB(Number(p.price))+'</span><span class="font-extrabold">'+formatBOB(unit)+'</span></div>'
              : '<span class="font-extrabold">'+formatBOB(Number(p.price))+'</span>')
            +     (isSoldOut
              ? '<span class="bg-rose-600 text-white text-sm px-3 py-1 rounded">Agotado</span>'
              : '<button class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" data-add="'+p.id+'">Agregar</button>')
      +   '</div>'
      +   '<div class="text-sm text-white font-semibold mt-2 text-shadow">'
      +     (isSoldOut ? 'Sin unidades disponibles' : 'Stock disponible: ' + p.quantity + ' unidad(es)')
      +   '</div>'
      + '</div>';

    container.appendChild(card);
  });

  var detailBtns = container.querySelectorAll("button[data-id]");
  for (var i=0;i<detailBtns.length;i++){
    detailBtns[i].addEventListener("click", function(e){
      openProductModal(e.currentTarget.getAttribute("data-id"));
    });
  }
  var addBtns = container.querySelectorAll("button[data-add]");
  for (var j=0;j<addBtns.length;j++){
    addBtns[j].addEventListener("click", function(e){
      addToCart(e.currentTarget.getAttribute("data-add"), 1);
    });
  }
}

function openProductModal(id){
  var p = PRODUCTS.find(function(x){ return x.id===id; });
  if (!p) return;

  var discounted = p.discount && p.discount > 0;
  var unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
  var isSoldOut = !p.quantity || p.quantity <= 0; // ✅ Ahora definida correctamente

  modalTitle.textContent = p.name;
  modalImage.src = p.image || '';
  modalCategory.textContent = p.category;
  modalDesc.textContent = p.description || '';
  modalPrice.textContent = Number(unit).toFixed(2);

  // 🔽 Mostrar stock en el modal
  var stockInfo = document.getElementById('modalStock');
  if (stockInfo) {
    stockInfo.textContent = p.quantity && p.quantity > 0
      ? 'Stock disponible: ' + p.quantity + ' unidad(es)'
      : 'Sin unidades disponibles';
  }

  // 🔽 Estado del botón según stock
  if (isSoldOut) {
    modalAddToCart.textContent = 'Agotado';
    modalAddToCart.disabled = true;
    modalAddToCart.classList.add('bg-slate-400', 'cursor-not-allowed');
    modalAddToCart.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    modalQty.disabled = true;
    modalQty.value = 0;
    modalAddToCart.onclick = null;
  } else {
    modalAddToCart.textContent = 'Agregar al carrito';
    modalAddToCart.disabled = false;
    modalAddToCart.classList.remove('bg-slate-400', 'cursor-not-allowed');
    modalAddToCart.classList.add('bg-blue-600', 'hover:bg-blue-700');
    modalQty.disabled = false;
    modalQty.value = 1;
    modalAddToCart.onclick = function(){
      addToCart(p.id, Number(modalQty.value) || 1);
      closeModal(productModal);
    };
  }

  openModal(productModal);
}


// ===== Modal helpers =====
function openModal(el){ if (el){ el.classList.remove("hidden"); el.classList.add("flex"); } }
function closeModal(el){ if (el){ el.classList.add("hidden"); el.classList.remove("flex"); } }
if (modalClose){ modalClose.addEventListener("click", function(){ closeModal(productModal); }); }

// ===== Filters + Sort =====
function applyFilters(){
  var list = PRODUCTS.slice();
  var term = (searchInput.value||'').toLowerCase().trim();
  var selectedCategory = filterCategory.value;
  if (term) list = list.filter(function(p){ return (String(p.name||'').toLowerCase().includes(term) || String(p.description||'').toLowerCase().includes(term)); });
  if (selectedCategory !== 'all') list = list.filter(function(p){ return p.category === selectedCategory; });

  var sort = sortBy.value;
  if (sort === 'price-asc') list.sort(function(a,b){ return a.price - b.price; });
  else if (sort === 'price-desc') list.sort(function(a,b){ return b.price - a.price; });
  else if (sort === 'name-asc') list.sort(function(a,b){ return a.name.localeCompare(b.name); });
  else if (sort === 'name-desc') list.sort(function(a,b){ return b.name.localeCompare(a.name); });
  else if (sort === 'recent') list.sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); });

  renderProducts(list);
}

// ===== Cart =====
function updateCartCount(){
  var totalQty = CART.reduce(function(acc, item){ return acc + item.qty; }, 0);
  cartCount.textContent = totalQty;
  if (fabCart){ fabCart.classList.toggle('hidden', totalQty === 0); fabCart.classList.add('z-[9999]'); }
}

function renderCart(){
  cartItems.innerHTML = "";
  var total = 0;
  CART.forEach(function(ci, idx){
    var p = PRODUCTS.find(function(x){ return x.id===ci.id; });
    if (!p) return;
    var unit = (p.discount && p.discount>0) ? (p.price*(1 - p.discount/100)) : p.price;
    var line = unit * ci.qty;
    total += line;
    var row = document.createElement("div");
    row.className = "flex justify-between items-center border-b py-2 gap-2";
    row.innerHTML = ''
      + '<div class="flex items-center gap-2">'
      +   '<img src="'+(p.image||'')+'" class="w-12 h-12 object-cover rounded" />'
      +   '<div>'
      +     '<div class="font-semibold">'+p.name+'</div>'
      +     '<div class="text-sm opacity-80">'+formatBOB(unit)+' x '
      +       '<input data-qty="'+idx+'" type="number" min="1" value="'+ci.qty+'" class="w-16 px-1 py-0.5 border rounded" />'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="flex items-center gap-3">'
      +   '<span class="font-semibold">'+formatBOB(line)+'</span>'
      +   '<button data-del="'+idx+'" class="text-rose-600 hover:underline">Eliminar</button>'
      + '</div>';
    cartItems.appendChild(row);
  });
  cartTotal.textContent = total.toFixed(2);

  var qtyInputs = cartItems.querySelectorAll("input[data-qty]");
  var qtyInputs = cartItems.querySelectorAll("input[data-qty]");
  for (var i=0; i<qtyInputs.length; i++){
    qtyInputs[i].addEventListener("change", function(e){
      var idx = Number(e.currentTarget.getAttribute("data-qty"));
      var v = Math.max(1, Number(e.currentTarget.value) || 1);
      var p = PRODUCTS.find(function(x){ return x.id === CART[idx].id; });
      if (p && p.quantity && v > p.quantity) {
        alert('Solo hay ' + p.quantity + ' unidad(es) disponibles.');
        v = p.quantity; // ajusta al máximo disponible
      }
      CART[idx].qty = v;
      save(S_KEYS.CART, CART);
      renderCart();
      updateCartCount();
    });
  }
  var delBtns = cartItems.querySelectorAll("button[data-del]");
  for (var j=0;j<delBtns.length;j++){
    delBtns[j].addEventListener("click", function(e){
      var i = Number(e.currentTarget.getAttribute("data-del"));
      CART.splice(i,1); save(S_KEYS.CART, CART); renderCart(); updateCartCount();
    });
  }
}

function addToCart(productId, qty){
  var p = PRODUCTS.find(function(x){ return x.id===productId; });
  if (!p || !p.quantity || p.quantity <= 0) {
    alert('Este producto está agotado.');
    return;
  }

  var exist = CART.find(function(ci){ return ci.id===productId; });
  if (exist) {
    var nuevaCantidad = exist.qty + qty;
    if (nuevaCantidad > p.quantity) {
      alert('Solo hay ' + p.quantity + ' unidad(es) disponibles.');
      return;
    }
    exist.qty = nuevaCantidad;
  } else {
    if (qty > p.quantity) {
      alert('Solo hay ' + p.quantity + ' unidad(es) disponibles.');
      return;
    }
    CART.push({ id: productId, qty: qty });
  }

  save(S_KEYS.CART, CART);
  updateCartCount();
}
if (cartButton){ cartButton.addEventListener("click", function(){ renderCart(); openModal(cartModal); }); }
if (fabCart){ fabCart.addEventListener("click", function(){ renderCart(); openModal(cartModal); }); }
if (closeCart){ closeCart.addEventListener("click", function(){ closeModal(cartModal); }); }

if (checkoutButton){
  checkoutButton.addEventListener("click", function(){
    if (CART.length === 0) return;
    var total = 0;
    var message = "Hola, quiero comprar los siguientes productos:%0A%0A";
    CART.forEach(function(ci){
      var p = PRODUCTS.find(function(x){ return x.id===ci.id; });
      if (!p) return;
      var unit = (p.discount && p.discount>0) ? (p.price*(1 - p.discount/100)) : p.price;
      var line = unit * ci.qty;
      total += line;
      message += "• "+p.name+" x "+ci.qty+" - "+formatBOB(line)+"%0A";
    });
       message += "%0A**Total:** Bs "+total.toFixed(2);
    CART.forEach(function(ci){
      var p = PRODUCTS.find(function(x){ return x.id === ci.id; });
      if (p && p.quantity && p.quantity > 0) {
        p.quantity = Math.max(0, p.quantity - ci.qty);
      }
    });
    save(S_KEYS.PRODUCTS, PRODUCTS);
    localStorage.setItem(S_KEYS.PRODUCTS, JSON.stringify(PRODUCTS));

    var orders = load(S_KEYS.ORDERS, []);
    orders.push({ id: UUID(), createdAt: Date.now(), items: CART, total: total, valid: false, status: 'pending' });


    CART.forEach(function(ci){
      var p = PRODUCTS.find(function(x){ return x.id === ci.id; });
      if (p && p.quantity && p.quantity > 0) {
        p.quantity = Math.max(0, p.quantity - ci.qty);
      }
    });
    save(S_KEYS.PRODUCTS, PRODUCTS);
    localStorage.setItem(S_KEYS.PRODUCTS, JSON.stringify(PRODUCTS));

    var orders = load(S_KEYS.ORDERS, []);
    orders.push({ id: UUID(), createdAt: Date.now(), items: CART, total: total, valid: false, status: 'pending' });


    var orders = load(S_KEYS.ORDERS, []);
    orders.push({ id: UUID(), createdAt: Date.now(), items: CART, total: total, valid: false, status: 'pending' });
    save(S_KEYS.ORDERS, orders);
    // disparar evento de cambio para admin
    localStorage.setItem(S_KEYS.ORDERS, JSON.stringify(orders));

    CART = []; save(S_KEYS.CART, CART); updateCartCount(); renderCart(); closeModal(cartModal);  applyFilters();
    var url = "https://wa.me/"+CFG.whatsapp+"?text="+message;
    window.open(url, "_blank");
  });
}

// ===== Hero =====
function renderHero(){
  var imgs = load(S_KEYS.HERO, []);
  if (!heroSlides) return;
  heroSlides.innerHTML = ""; heroDots.innerHTML = "";
  imgs.forEach(function(src,i){
    var slide = document.createElement("img");
    slide.src = src; slide.alt = "Slide "+(i+1);
    slide.className = "absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500";
    slide.style.zIndex = 0;
    heroSlides.appendChild(slide);
    var dot = document.createElement("button");
    dot.className = "w-2.5 h-2.5 rounded-full bg-white/70 hover:bg-white";
    dot.addEventListener("click", function(){ setSlide(i); });
    heroDots.appendChild(dot);
  });
  setSlide(0);
}
var currentSlide = 0, slideTimer;
function setSlide(i){
  var slides = heroSlides.querySelectorAll("img");
  var dots = heroDots.querySelectorAll("button");
  if (slides.length === 0) return;
  currentSlide = (i + slides.length) % slides.length;
  for (var s=0;s<slides.length;s++){ slides[s].style.opacity = (s===currentSlide ? 1 : 0); }
  for (var d=0;d<dots.length;d++){ dots[d].style.opacity = (d===currentSlide ? 1 : 0.5); }
  clearInterval(slideTimer);
  slideTimer = setInterval(function(){ setSlide(currentSlide + 1); }, 5000);
}
if (heroPrev){ heroPrev.addEventListener("click", function(){ setSlide(currentSlide - 1); }); }
if (heroNext){ heroNext.addEventListener("click", function(){ setSlide(currentSlide + 1); }); }

// ===== Init =====
function safeAdd(el, ev, fn){ if (el) el.addEventListener(ev, fn); }
safeAdd(searchInput, "input", applyFilters);
safeAdd(filterCategory, "change", applyFilters);
safeAdd(sortBy, "change", applyFilters);

function init(){
  PRODUCTS = load(S_KEYS.PRODUCTS, []);
  CATEGORIES = load(S_KEYS.CATEGORIES, []);
  renderCategoryFilter();
  renderHero();
  applyFilters();
  updateCartCount();
  applyBrandToUI();
}
try { init(); } catch(e){ console.error("Init error tienda", e); alert("Error iniciando la tienda. Limpia el almacenamiento local e intenta nuevamente."); }

window.addEventListener("storage", function(e){
  if ([S_KEYS.PRODUCTS, S_KEYS.CATEGORIES, S_KEYS.HERO, S_KEYS.BRAND, S_KEYS.ORDERS].indexOf(e.key) !== -1){
    try { init(); } catch(err){ console.error(err); }
  }
});
// 🔹 Efecto tipo Google para el buscador
document.addEventListener("DOMContentLoaded", function(){
  const searchToggle = document.getElementById("searchToggle");
  const searchInput = document.getElementById("searchInput");

  if (searchToggle && searchInput){
    searchToggle.addEventListener("click", function(e){
      e.stopPropagation();

      const isHidden = searchInput.classList.contains("hidden");
      if (isHidden){
        searchInput.classList.remove("hidden");
        searchInput.classList.add("w-56", "md:w-64");
        searchInput.focus();
      } else {
        searchInput.classList.add("hidden");
        searchInput.classList.remove("w-56", "md:w-64");
      }
    });

    // Cerrar cuando clic fuera
    document.addEventListener("click", function(e){
      if (!searchInput.contains(e.target) && !searchToggle.contains(e.target)){
        searchInput.classList.add("hidden");
        searchInput.classList.remove("w-56", "md:w-64");
      }
    });

    // Cerrar con tecla ESC
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape"){
        searchInput.classList.add("hidden");
        searchInput.classList.remove("w-56", "md:w-64");
      }
    });
  }
});
