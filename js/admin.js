// ===== Keys & Config =====
var S_KEYS = {
  PRODUCTS: 'tdp_products',
  CATEGORIES: 'tdp_categories',
  ORDERS: 'tdp_orders',
  HERO: 'tdp_hero_images',
  BRAND: 'tdp_brand',
  ARCHIVE_MONTHS: 'tdp_archive_months',
  ARCHIVE_YEARS: 'tdp_archive_years',
  SESSION: 'tdp_admin_session'
};
var CFG = window.APP_CONFIG || { sessionTTLms: 60000 };

function UUID(){
  try { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  catch(e){ return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
}
function load(key, fallback){ try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; } }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function formatBOB(n){ try{ return 'Bs ' + Number(n).toFixed(2); }catch(e){ return 'Bs 0.00'; } }
function now(){ return Date.now(); }

// ===== Session (TTL) =====
function sessionActive(){
  var s = load(S_KEYS.SESSION, null);
  if (!s) return false;
  return (now() - (s.ts || 0)) < (CFG.sessionTTLms || 60000);
}
function touchSession(){
  var s = load(S_KEYS.SESSION, { token: UUID(), ts: now() });
  s.ts = now();
  save(S_KEYS.SESSION, s);
}
function clearSession(){ localStorage.removeItem(S_KEYS.SESSION); }

// ===== Elements =====
var loginSection = document.getElementById("loginSection");
var adminPanel = document.getElementById("adminPanel");
var loginBtn = document.getElementById("loginBtn");
var logoutBtn = document.getElementById("logoutBtn");

var addCategoryForm = document.getElementById("addCategoryForm");
var categoryList = document.getElementById("categoryList");
var categoryName = document.getElementById("categoryName");

var addProductForm = document.getElementById("addProductForm");
var productId = document.getElementById("productId");
var productNameInp = document.getElementById("productName");
var productDesc = document.getElementById("productDescription");
var productCategory = document.getElementById("productCategory");
var productPrice = document.getElementById("productPrice");
var productDiscount = document.getElementById("productDiscount");
var productImage = document.getElementById("productImage");
var resetFormBtn = document.getElementById("resetForm");
var deleteProductBtn = document.getElementById('deleteProductBtn');
var adminProductList = document.getElementById("adminProductList");

var kpiProducts = document.getElementById("kpiProducts");
var kpiCategories = document.getElementById("kpiCategories");
var kpiOrders = document.getElementById("kpiOrders");
var kpiRevenue = document.getElementById("kpiRevenue");

var addHeroForm = document.getElementById("addHeroForm");
var heroImage = document.getElementById("heroImage");
var heroList = document.getElementById("heroList");
var ordersList = document.getElementById("ordersList");
var historyList = document.getElementById("historyList");

var archiveNowBtn = document.getElementById("archiveNow");
var resetMetricsBtn = document.getElementById("resetMetrics");
// ... (otras variables como kpiRevenue)

// AÑADE ESTAS LÍNEAS
var exportBtn = document.getElementById("exportBtn");
var importBtn = document.getElementById("importBtn");
var importFile = document.getElementById("importFile");
// ===== Auth =====
function showPanel(){
  loginSection.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  touchSession();
  renderAll();
  var firstBtn = document.querySelector('.menuBtn[data-tab="dashboard"]');
  if (firstBtn) firstBtn.click();
}
function showLogin(){
  adminPanel.classList.add("hidden");
  loginSection.classList.remove("hidden");
}
if (sessionActive()) showPanel(); else showLogin();

if (loginBtn){
  loginBtn.addEventListener("click", function(){
    var user = document.getElementById("adminUser").value;
    var pass = document.getElementById("adminPass").value;
    if (user === "formula" && pass === "andes"){
      showPanel();
    } else {
      alert("Credenciales incorrectas");
    }
  });
}
if (logoutBtn){ logoutBtn.addEventListener("click", function(){ clearSession(); location.reload(); }); }

['click','keydown','mousemove','scroll','touchstart'].forEach(function(ev){
  window.addEventListener(ev, function(){ if (!adminPanel.classList.contains('hidden')) touchSession(); }, { passive: true });
});
setInterval(function(){ if (!sessionActive()) showLogin(); }, 2000);

// ===== Data helpers =====
function getProducts(){ return load(S_KEYS.PRODUCTS, []); }
function setProducts(arr){ save(S_KEYS.PRODUCTS, arr); localStorage.setItem(S_KEYS.PRODUCTS, JSON.stringify(arr)); }
function getCategories(){ return load(S_KEYS.CATEGORIES, []); }
function setCategories(arr){ save(S_KEYS.CATEGORIES, arr); localStorage.setItem(S_KEYS.CATEGORIES, JSON.stringify(arr)); }
function getOrders(){ return load(S_KEYS.ORDERS, []); }
function setOrders(arr){ save(S_KEYS.ORDERS, arr); localStorage.setItem(S_KEYS.ORDERS, JSON.stringify(arr)); }
function getHero(){ return load(S_KEYS.HERO, []); }
function setHero(arr){ save(S_KEYS.HERO, arr); localStorage.setItem(S_KEYS.HERO, JSON.stringify(arr)); }
function getBrand(){ return load(S_KEYS.BRAND, window.APP_CONFIG ? window.APP_CONFIG.brandDefault : {}); }
function setBrand(b){ save(S_KEYS.BRAND, b); localStorage.setItem(S_KEYS.BRAND, JSON.stringify(b)); }

// Seed if admin loads first
(function seed(){
  if (getCategories().length===0) setCategories(['Ebooks','Plantillas','Cursos','Música']);
  if (getProducts().length===0){
    var img = '';
    setProducts([
      { id: UUID(), name: 'Ebook SEO Pro', description: 'Guía completa', category: 'Ebooks', price: 19.99, discount: 0, image: img, createdAt: Date.now() },
      { id: UUID(), name: 'Plantillas Pro', description: 'Paquete de 20 plantillas', category: 'Plantillas', price: 9.99, discount: 10, image: img, createdAt: Date.now()-10000 }
    ]);
  }
  if (getHero().length===0) setHero([]);
})();

// ===== Tabs =====
var tabs = document.querySelectorAll('.menuBtn');
var sections = document.querySelectorAll('.tabSection');
for (var i=0;i<tabs.length;i++){
  tabs[i].addEventListener('click', function(){
    for (var b=0;b<tabs.length;b++){ tabs[b].classList.remove('bg-blue-800','text-white','shadow'); }
    this.classList.add('bg-blue-800','text-white','shadow');
    var t = this.getAttribute('data-tab');
    for (var s=0;s<sections.length;s++){ sections[s].classList.add('hidden'); }
    var section = document.getElementById('tab-'+t);
    if (section) section.classList.remove('hidden');
  });
}

// ===== Categories =====
function renderCategories(){
  var cats = getCategories();
  kpiCategories.textContent = cats.length;
  categoryList.innerHTML = "";
  productCategory.innerHTML = "";
  cats.forEach(function(cat, i){
    var li = document.createElement("li");
    li.className = "flex justify-between items-center border rounded px-2 py-1";
    li.innerHTML = '<input class="flex-1 bg-transparent outline-none" value="'+cat+'" data-edit="'+i+'" />'
                 + '<button class="text-rose-600 hover:underline" data-del="'+i+'">Eliminar</button>';
    categoryList.appendChild(li);
    var opt = document.createElement("option"); opt.value = cat; opt.textContent = cat; productCategory.appendChild(opt);
  });
  var editInputs = categoryList.querySelectorAll("input[data-edit]");
  for (var e=0;e<editInputs.length;e++){
    editInputs[e].addEventListener("change", function(ev){
      var i = Number(ev.currentTarget.getAttribute("data-edit"));
      var cats = getCategories();
      var val = ev.currentTarget.value.trim();
      cats[i] = val || cats[i];
      setCategories(cats); renderCategories(); renderProducts(); renderKPIs(); drawChart();
    });
  }
  var delBtns = categoryList.querySelectorAll("button[data-del]");
  for (var d=0;d<delBtns.length;d++){
    delBtns[d].addEventListener("click", function(ev){
      var i = Number(ev.currentTarget.getAttribute("data-del"));
      var cats = getCategories();
      var removed = cats.splice(i,1);
      setCategories(cats);
      var prods = getProducts();
      if (removed.length && cats.length){
        for (var pi=0;pi<prods.length;pi++){
          if (prods[pi].category === removed[0]) prods[pi].category = cats[0];
        }
        setProducts(prods);
      }
      renderCategories(); renderProducts(); renderKPIs(); drawChart();
    });
  }
}
if (addCategoryForm){
  addCategoryForm.addEventListener("submit", function(e){
    e.preventDefault();
    var name = (categoryName.value||"").trim(); if (!name) return;
    var cats = getCategories(); if (cats.indexOf(name) === -1){ cats.push(name); setCategories(cats); renderCategories(); drawChart(); }
    categoryName.value = "";
  });
}


// Delete current product
if (deleteProductBtn){
  deleteProductBtn.addEventListener('click', function(){
    var id = deleteProductBtn.getAttribute('data-id') || productId.value;
    if (!id){ alert('No hay producto seleccionado.'); return; }
    if (!confirm('¿Eliminar este producto?')) return;
    var prods = getProducts();
    var idx = prods.findIndex(function(x){ return x.id===id; });
    if (idx>=0){ prods.splice(idx,1); setProducts(prods); }
    addProductForm.reset(); productId.value=''; productDiscount.value=0;
    if (deleteProductBtn){ deleteProductBtn.classList.add('hidden'); deleteProductBtn.disabled = true; deleteProductBtn.removeAttribute('data-id'); }
    renderProducts(); renderKPIs(); drawChart();
  });
}
// ===== Products =====
function renderProducts(){
  var prods = getProducts();
  kpiProducts.textContent = prods.length;
  adminProductList.innerHTML = "";
  prods.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); }).forEach(function(p){
    var discounted = p.discount && p.discount>0;
    var unit = discounted ? (Number(p.price)*(1 - p.discount/100)) : Number(p.price);
    var card = document.createElement("button"); card.type='button';
    card.className = "bg-white border p-3 rounded-xl shadow hover:shadow-md text-left";
    card.innerHTML = '<img src="'+(p.image||'')+'" class="w-full h-40 object-cover rounded">'
                   + '<h3 class="font-bold mt-2">'+p.name+'</h3>'
                   + '<p class="text-sm opacity-70">'+p.category+'</p>'
                   + '<p class="font-semibold">'+(discounted ? ('<span class="line-through text-sm opacity-70">'+formatBOB(Number(p.price))+'</span> '+formatBOB(unit)) : formatBOB(Number(p.price)))+'</p>'
                   + '<div class="mt-2 text-xs bg-slate-100 px-2 py-0.5 rounded">ID: '+p.id.slice(0,8)+'…</div>';
    card.addEventListener("click", function(){ fillFormForEdit(p); });
    adminProductList.appendChild(card);
  });
}
function fillFormForEdit(p){
  if (deleteProductBtn){ deleteProductBtn.classList.remove('hidden'); deleteProductBtn.disabled = false; deleteProductBtn.setAttribute('data-id', p.id); }
  productId.value = p.id;
  productNameInp.value = p.name;
  productDesc.value = p.description||'';
  productCategory.value = p.category;
  productPrice.value = p.price;
  productDiscount.value = p.discount||0;
  document.getElementById('productQuantity').value = p.quantity || 0;
  window.scrollTo({top:0, behavior:'smooth'});
}
if (addProductForm){
  addProductForm.addEventListener("submit", function(e){
    e.preventDefault();
    var id = productId.value || UUID();
    var name = productNameInp.value.trim();
    var description = productDesc.value.trim();
    var category = productCategory.value;
    var price = Number(productPrice.value||0);
    var discount = Math.max(0, Math.min(100, Number(productDiscount.value||0)));
    var quantity = Math.max(0, Number(document.getElementById('productQuantity').value || 0));
    var createdAt = Date.now();
    var prods = getProducts();
    var idx = prods.findIndex(function(x){ return x.id===id; });
    function finalize(imageData){
     var data = { id:id, name:name, description:description, category:category, price:price, discount:discount, quantity:quantity, image:imageData, createdAt:createdAt };
      if (idx>=0){
        data.createdAt = prods[idx].createdAt||createdAt;
        if (!imageData) data.image = prods[idx].image;
        prods[idx] = data;
      } else {
        if (!imageData) data.image = '';
        prods.push(data);
      }
      setProducts(prods); renderProducts(); renderKPIs(); drawChart();
      addProductForm.reset(); productId.value = ""; productDiscount.value = 0;
    }
    var file = productImage.files[0];
    if (file){
      var reader = new FileReader();
      reader.onload = function(){ finalize(reader.result); };
      reader.readAsDataURL(file);
    } else {
      finalize(null);
    }
  });
}
if (resetFormBtn){
  resetFormBtn.addEventListener("click", function(){
    addProductForm.reset(); productId.value=""; productDiscount.value=0;
    document.getElementById('productQuantity').value = '';
    if (deleteProductBtn){ deleteProductBtn.classList.add('hidden'); deleteProductBtn.disabled = true; deleteProductBtn.removeAttribute('data-id'); }
  });
}

// ===== Hero Manager =====
function renderHeroList(){
  var imgs = getHero();
  heroList.innerHTML = "";
  imgs.forEach(function(src,i){
    var card = document.createElement("div");
    card.className = "relative";
    card.innerHTML = '<img src="'+src+'" class="w-full h-28 object-cover rounded border">'
                   + '<button data-del="'+i+'" class="absolute top-1 right-1 bg-rose-600 text-white text-xs px-2 py-0.5 rounded">Eliminar</button>';
    heroList.appendChild(card);
  });
  var delBtns = heroList.querySelectorAll("button[data-del]");
  for (var d=0;d<delBtns.length;d++){
    delBtns[d].addEventListener("click", function(e){
      var i = Number(e.currentTarget.getAttribute("data-del"));
      var arr = getHero(); arr.splice(i,1); setHero(arr); renderHeroList();
    });
  }
}
if (addHeroForm){
  addHeroForm.addEventListener("submit", function(e){
    e.preventDefault();
    var file = heroImage.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){ var arr = getHero(); arr.push(reader.result); setHero(arr); renderHeroList(); addHeroForm.reset(); };
    reader.readAsDataURL(file);
  });
}

// ===== Brand & Contact =====
var brandForm = document.getElementById('brandForm');
var brandName = document.getElementById('brandName');
var brandAddress = document.getElementById('brandAddress');
var brandPhone = document.getElementById('brandPhone');
var brandEmail = document.getElementById('brandEmail');
var brandLogoInp = document.getElementById('brandLogo');

function loadBrandToForm(){
  var b = getBrand() || {};
  brandName.value = b.name||'';
  brandAddress.value = b.address||'';
  brandPhone.value = b.phone||'';
  brandEmail.value = b.email||'';
}
if (brandForm){
  brandForm.addEventListener("submit", function(e){
    e.preventDefault();
    var b = getBrand() || {};
    var data = {
      name: brandName.value || b.name,
      address: brandAddress.value || b.address,
      phone: brandPhone.value || b.phone,
      email: brandEmail.value || b.email,
      logo: b.logo || null
    };
    var file = brandLogoInp.files[0];
    if (file){
      var reader = new FileReader();
      reader.onload = function(){ data.logo = reader.result; setBrand(data); alert('Marca guardada'); };
      reader.readAsDataURL(file);
    } else {
      setBrand(data); alert('Marca guardada');
    }
  });
}
var resetBrandBtn = document.getElementById('resetBrandBtn');
if (resetBrandBtn){
  resetBrandBtn.addEventListener("click", function(){ localStorage.removeItem(S_KEYS.BRAND); loadBrandToForm(); });
}

// ===== Orders =====
function renderOrders(){
  var orders = getOrders().sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  kpiOrders.textContent = orders.length;
  var revenue = orders.reduce(function(acc, o){ return acc + (o.total||0); }, 0);
  kpiRevenue.textContent = formatBOB(revenue);

  ordersList.innerHTML = "";
  if (orders.length === 0){
    ordersList.innerHTML = "<p class='opacity-70'>No hay pedidos aún.</p>";
    return;
  }

  var prods = getProducts();
  orders.forEach(function(o){
    var date = new Date(o.createdAt||Date.now()).toLocaleString();
    var items = (o.items||[]).map(function(it){
      var p = prods.find(function(x){ return x.id===it.id; });
      var unit = p ? ((p.discount&&p.discount>0) ? (p.price*(1-p.discount/100)) : p.price) : 0;
      return "• " + (p ? p.name : it.id) + " x " + it.qty + " (" + formatBOB(unit*it.qty) + ")";
    }).join("<br>");
    var valid = o.valid === true;

    var card = document.createElement("div");
    card.className = "border rounded-xl p-3";
    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-semibold">Pedido ${o.id.slice(0,8)}…</div>
          <div class="text-sm opacity-70">${date}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm ${valid ? 'text-emerald-600' : 'text-rose-600'}">${valid ? 'VALIDADO' : 'PENDIENTE'}</span>
          <button data-toggle="${o.id}" class="px-3 py-1 rounded ${valid ? 'bg-rose-600' : 'bg-emerald-600'} text-white">${valid ? 'Invalidar' : 'Validar'}</button>
          <button data-del="${o.id}" class="px-3 py-1 rounded bg-slate-500 text-white hover:bg-slate-600">Eliminar</button>
        </div>
      </div>
      <div class="mt-2 text-sm">${items}</div>
      <div class="mt-2 font-semibold">Total: ${formatBOB(o.total||0)}</div>
    `;
    ordersList.appendChild(card);
  });

  // ✅ Botón Validar / Invalidar
    // ✅ Botón Validar / Invalidar
  var toggles = ordersList.querySelectorAll("button[data-toggle]");
  toggles.forEach(function(btn){
    btn.addEventListener("click", function(e){
      var id = e.currentTarget.getAttribute("data-toggle");
      var orders = getOrders();
      var i = orders.findIndex(function(x){ return x.id===id; });
      if (i >= 0) {
        orders[i].valid = !(orders[i].valid === true);
        setOrders(orders);

        // 🔁 actualizar todo al validar/invalidad
        renderOrders();
        renderKPIs();
        drawChart(); // 🔹 aquí se actualiza el gráfico automáticamente
      }
    });
  });

  // ✅ Botón Eliminar pedido
  var delBtns = ordersList.querySelectorAll("button[data-del]");
  delBtns.forEach(function(btn){
    btn.addEventListener("click", function(e){
      var id = e.currentTarget.getAttribute("data-del");
      if (!confirm("¿Eliminar este pedido permanentemente?")) return;

      var orders = getOrders().filter(function(x){ return x.id !== id; });
      setOrders(orders);

      // 🔁 actualizar todo al eliminar
      renderOrders();
      renderKPIs();
      drawChart(); // 🔹 también aquí
    });
  });
}

// ===== History =====
function monthKey(ts){ var d = new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function yearKey(ts){ var d = new Date(ts); return String(d.getFullYear()); }
function getArchiveMonths(){ return load(S_KEYS.ARCHIVE_MONTHS, {}); }
function setArchiveMonths(obj){ save(S_KEYS.ARCHIVE_MONTHS, obj); }
function getArchiveYears(){ return load(S_KEYS.ARCHIVE_YEARS, {}); }
function setArchiveYears(obj){ save(S_KEYS.ARCHIVE_YEARS, obj); }

function rolloverArchives(){
  var orders = getOrders();
  var currentK = monthKey(Date.now());
  var byMonth = orders.reduce(function(acc,o){ var k = monthKey(o.createdAt||Date.now()); (acc[k]=acc[k]||[]).push(o); return acc; }, {});
  var months = getArchiveMonths();
  Object.keys(byMonth).forEach(function(k){
    if (k !== currentK){ months[k] = (months[k]||[]).concat(byMonth[k]); }
  });
  setArchiveMonths(months);
  var newLive = byMonth[currentK] || [];
  setOrders(newLive);

  var years = getArchiveYears();
  Object.keys(months).forEach(function(mk){
    var arr = months[mk]; var y = mk.slice(0,4);
    if (!years[y]) years[y] = { total:0, count:0 };
    arr.forEach(function(o){ years[y].total += (o.total||0); years[y].count += 1; });
  });
  setArchiveYears(years);
}

function renderHistory(){
  var months = getArchiveMonths();
  var years = getArchiveYears();
  historyList.innerHTML = "";
  var monthsKeys = Object.keys(months).sort().reverse();
  if (monthsKeys.length){
    var mWrap = document.createElement('div');
    mWrap.innerHTML = "<h4 class='font-bold mb-2'>Historial Mensual</h4>";
    monthsKeys.forEach(function(k){
      var list = months[k].map(function(o){
        var d = new Date(o.createdAt||Date.now()).toLocaleDateString();
        return 'Pedido '+o.id.slice(0,6)+'… — '+d+' — '+formatBOB(o.total||0)+' — '+(o.valid?'VALIDADO':'PENDIENTE');
      }).join('<br>');
      var sec = document.createElement('div');
      sec.className = "border p-3 rounded mb-2";
      sec.innerHTML = "<div class='font-semibold mb-1'>"+k+"</div><div class='text-sm'>"+(list || 'Sin datos')+"</div>";
      mWrap.appendChild(sec);
    });
    historyList.appendChild(mWrap);
  }
  var yKeys = Object.keys(years).sort().reverse();
  if (yKeys.length){
    var yWrap = document.createElement('div');
    yWrap.innerHTML = "<h4 class='font-bold mb-2 mt-4'>Estadística Anual</h4>";
    yKeys.forEach(function(y){
      var sec = document.createElement('div');
      sec.className = "border p-3 rounded mb-2";
      sec.innerHTML = "<div class='font-semibold mb-1'>"+y+"</div><div class='text-sm'>Pedidos: "+years[y].count+" — Ingresos: "+formatBOB(years[y].total||0)+"</div>";
      yWrap.appendChild(sec);
    });
    historyList.appendChild(yWrap);
  }
}

// ===== KPIs & Chart =====
function renderKPIs(){
  var prods = getProducts();
  var cats = getCategories();
  var orders = getOrders();
  kpiProducts.textContent = prods.length;
  kpiCategories.textContent = cats.length;
  kpiOrders.textContent = orders.length;
  var revenue = orders.reduce(function(acc, o){ return acc + (o.total||0); }, 0);
  kpiRevenue.textContent = formatBOB(revenue);
}
function drawChart(){
  var orders = getOrders().filter(o => o.valid === true); // solo validados
  var monthsData = {};
  var nowY = new Date().getFullYear();

  orders.forEach(o => {
    var d = new Date(o.createdAt || Date.now());
    var y = d.getFullYear();
    var m = d.getMonth();
    if (y === nowY) { // solo el año actual
      monthsData[m] = (monthsData[m] || 0) + (o.total || 0);
    }
  });

  // Datos para el gráfico
  var labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var data = labels.map((_, i) => monthsData[i] || 0);

  var ctx = document.getElementById('chartByCategory').getContext('2d');
  if (window.chartByCategory) window.chartByCategory.destroy();

  window.chartByCategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ventas validadas por mes (Bs)',
        data,
        backgroundColor: 'rgba(59,130,246,0.7)', // azul tailwind
        borderColor: 'rgba(37,99,235,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { callback: value => 'Bs ' + value } }
      }
    }
  });

  // Calcular ganancias del mes y año
  var currentMonth = new Date().getMonth();
  var totalYear = Object.values(monthsData).reduce((a,b)=>a+b,0);
  var totalMonth = monthsData[currentMonth] || 0;

  // Mostrar debajo del gráfico
  const statsContainer = document.getElementById("chartStats");
  if (statsContainer){
    statsContainer.innerHTML = `
      <div class="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
        <div><strong>💰 Ganancia del mes:</strong> ${formatBOB(totalMonth)}</div>
        <div><strong>📆 Ganancia del año:</strong> ${formatBOB(totalYear)}</div>
      </div>
    `;
  }
}
// ===== Brand form =====
var brandForm = document.getElementById('brandForm');
if (brandForm){
  // already wired above
}

// ===== Render All =====
function renderAll(){
  try {
    if (!sessionActive()){ showLogin(); return; }
    renderCategories();
    renderProducts();
    renderOrders();
    renderHistory();
    renderKPIs();
    drawChart();
    loadBrandToForm();
    renderHeroList();
  } catch(e){
    console.error("Admin render error", e);
  }
}
if (archiveNowBtn){ archiveNowBtn.addEventListener('click', function(){ rolloverArchives(); renderAll(); }); }
if (resetMetricsBtn){
  resetMetricsBtn.addEventListener('click', function(){
    if (!confirm('¿Seguro que deseas limpiar las métricas y pedidos actuales?')) return;
    setOrders([]); setArchiveMonths({}); setArchiveYears({}); renderAll();
  });
}

// realtime updates
window.addEventListener("storage", function(e){
  if ([S_KEYS.ORDERS, S_KEYS.PRODUCTS, S_KEYS.CATEGORIES, S_KEYS.HERO, S_KEYS.BRAND, S_KEYS.ARCHIVE_MONTHS, S_KEYS.ARCHIVE_YEARS].indexOf(e.key) !== -1){
    renderAll();
  }
});
setInterval(renderAll, 2000);
window.addEventListener('focus', renderAll);


var logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn){
  logoutBtn.addEventListener('click', function(e){
    e.preventDefault();
    try { localStorage.removeItem('tdp_admin_session'); } catch(err){}
    try { localStorage.removeItem('tdp_admin_session_exp'); } catch(err){}
    alert('Sesión cerrada.');
    adminPanel.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });
  // ===== LÓGICA DE IMPORTAR Y EXPORTAR =====

if (exportBtn) {
  exportBtn.addEventListener('click', function() {
    if (!confirm('¿Deseas descargar una copia de seguridad de todos los datos de la tienda?')) return;

    // 1. Recopilamos todos los datos importantes
    const dataToExport = {
      products: getProducts(),
      categories: getCategories(),
      hero: getHero(),
      brand: getBrand()
      // No exportamos los pedidos para no mezclarlos
    };

    // 2. Creamos un archivo JSON para descargar
    const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataString);
    downloadNode.setAttribute("download", "copia_seguridad_tienda.json");
    document.body.appendChild(downloadNode);

    // 3. Simulamos el click para que se descargue
    downloadNode.click();
    downloadNode.remove();
    alert('Copia de seguridad descargada.');
  });
}

if (importBtn && importFile) {
  // Al hacer clic en Importar, activamos el selector de archivos
  importBtn.addEventListener('click', () => importFile.click());

  // Cuando el usuario selecciona un archivo
  importFile.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (confirm('¡ATENCIÓN! Esto reemplazará todos los productos, categorías y datos de la marca actuales. ¿Estás seguro de continuar?')) {

          // Guardamos los datos del archivo en localStorage
          setProducts(data.products || []);
          setCategories(data.categories || []);
          setHero(data.hero || []);
          setBrand(data.brand || {});

          alert('¡Datos importados con éxito! La página se actualizará.');
          location.reload(); // Recargamos para que todos los cambios se apliquen
        }
      } catch (err) {
        alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON de copia de seguridad válido.');
      }
    };
    reader.readAsText(file);
    importFile.value = ''; // Limpiamos para poder subir el mismo archivo otra vez
  });
}

// Asegúrate de que este bloque de código esté ANTES de la última llave de cierre del archivo.
}
