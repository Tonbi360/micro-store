/* --- CONFIGURATION --- */
const csvUrl = "https://docs.google.com/spreadsheets/d/1iQzRLCmtpgGHqYexl32m3EUY35_WgmXvi4CCHqdGzu4/export?format=csv";
const myWhatsAppNumber = "2349022066352"; 

// UPDATED WITH YOUR NEW FORM ID
const formActionUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdxwd7zTGNkOEqxTxrDyhBMJ6tWWAwdSzf09QoHfS4rwr-fzQ/formResponse";
const formEntries = {
    name: "entry.740117733",
    phone: "entry.1869179273",
    address: "entry.1133397450",
    details: "entry.1045888552"
};

/* --- STATE MANAGEMENT --- */
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('microCart')) || [];

/* --- 1. INITIAL LOAD --- */
async function loadData() {
    try {
        const response = await fetch(csvUrl);
        const data = await response.text();
        const rows = data.split("\n").slice(1);
        
        allProducts = rows.map(row => {
            const cols = row.split(",");
            return {
                id: cols[0]?.trim(),
                title: cols[1]?.trim(),
                price: cols[2]?.trim(),
                desc: cols[3]?.trim(),
                cat: cols[4]?.trim(),
                img: cols[5]?.trim(),
                status: cols[6]?.trim(), 
                stock: parseInt(cols[7]?.trim()) || 0 
            };
        }).filter(p => p.title && p.img);

        setupCategories();
        renderFeed(allProducts);
        updateCartUI();
    } catch (e) {
        console.error("Error loading products:", e);
    }
}

/* --- 2. UI TOGGLES --- */
function toggleSearch() { document.getElementById('searchContainer').classList.toggle('hidden'); }
function toggleNav() { document.getElementById('navSidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('active'); }
function toggleCart() { document.getElementById('cartSidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('active'); }
function closeAll() {
    document.getElementById('navSidebar').classList.remove('open');
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

/* --- 3. RENDERING --- */
function setupCategories() {
    const menu = document.getElementById('categoryMenu');
    menu.innerHTML = `<div class="nav-item active" onclick="filterCategory('All', this)">All Products</div>`;
    const categories = [...new Set(allProducts.map(p => p.cat))];
    categories.forEach(cat => {
        if(!cat) return;
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.innerText = cat;
        div.onclick = () => { filterCategory(cat, div); toggleNav(); };
        menu.appendChild(div);
    });
}

function renderFeed(products) {
    const feed = document.getElementById('feed');
    if (!feed) return;
    feed.innerHTML = products.map(p => {
        let buttonHTML = `<button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>`;
        let badgeHTML = "";
        
        if (p.status !== "Active" || p.stock <= 0) {
            badgeHTML = `<span class="badge badge-out">SOLD OUT</span>`;
            buttonHTML = `<button class="buy-btn" style="background:#ccc; color:#666" disabled>SOLD OUT</button>`;
        } else if (p.stock <= 3) {
            badgeHTML = `<span class="badge badge-low">🔥 ONLY ${p.stock} LEFT</span>`;
        }

        return `
            <div class="post">
                <div class="post-header"><span>${p.cat}</span></div>
                <img class="post-img" src="https://lh3.googleusercontent.com/u/0/d/${p.img}" alt="${p.title}">
                <div class="post-info">
                    ${badgeHTML}
                    <span class="post-price">₦${p.price}</span>
                    <span class="post-title">${p.title}</span>
                    <span class="post-desc">${p.desc}</span>
                    ${buttonHTML}
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query));
    renderFeed(filtered);
}

function filterCategory(cat, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');
    const filtered = (cat === 'All') ? allProducts : allProducts.filter(p => p.cat === cat);
    renderFeed(filtered);
}

/* --- 4. CART --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product || product.stock <= 0) return;
    cart.push(product);
    localStorage.setItem('microCart', JSON.stringify(cart));
    updateCartUI();
    toggleCart();
}
function removeFromCart(index) { cart.splice(index, 1); localStorage.setItem('microCart', JSON.stringify(cart)); updateCartUI(); }

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    if(!cartCount) return;
    cartCount.innerText = cart.length;
    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        total += parseInt(item.price);
        return `<div class="cart-item"><img src="https://lh3.googleusercontent.com/u/0/d/${item.img}"><div style="flex:1"><b>${item.title}</b><div>₦${item.price}</div></div><button onclick="removeFromCart(${index})" class="close-btn">×</button></div>`;
    }).join('');
    cartTotal.innerText = `₦${total}`;
    document.getElementById('modalTotal').innerText = `₦${total}`;
}

/* --- 5. CHECKOUT ENGINE --- */
function openCheckout() {
    if (cart.length === 0) return;
    toggleCart();
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function sendOrder(event) {
    event.preventDefault();

    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;
    
    let itemSummary = "";
    let total = 0;
    cart.forEach((item, i) => {
        total += parseInt(item.price);
        itemSummary += `${i+1}. ${item.title} (₦${item.price})\n`;
    });

    const fullDetails = `Total: ₦${total}\nItems:\n${itemSummary}`;

    // --- PART A: LOG TO GOOGLE SHEET (Using URLSearchParams for reliability) ---
    const logData = new URLSearchParams();
    logData.append(formEntries.name, name);
    logData.append(formEntries.phone, phone);
    logData.append(formEntries.address, address);
    logData.append(formEntries.details, fullDetails);

    fetch(formActionUrl, {
        method: "POST",
        mode: "no-cors",
        body: logData
    }).catch(e => console.log("Silent Log failed, but continuing to WhatsApp."));

    // --- PART B: WHATSAPP REDIRECT ---
    const message = `*📦 NEW ORDER RECEIVED*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}\n\n*Items Ordered:*\n${itemSummary}\n*GRAND TOTAL:* ₦${total}`;
    const whatsappUrl = `https://wa.me/${myWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // Reset UI
    cart = [];
    localStorage.setItem('microCart', JSON.stringify(cart));
    updateCartUI();
    closeAll();
}

loadData();
