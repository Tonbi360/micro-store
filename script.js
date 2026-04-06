/* --- CONFIGURATION --- */
const csvUrl = "https://docs.google.com/spreadsheets/d/1iQzRLCmtpgGHqYexl32m3EUY35_WgmXvi4CCHqdGzu4/export?format=csv";
const myWhatsAppNumber = "2349022066352"; 

// GOOGLE FORM LOGGING CONFIGURATION
const formActionUrl = "https://docs.google.com/forms/d/e/1aNjngugM7vMq-5PUg_jGFAjAVTh4FfePdq9IOLjpmIo/formResponse";
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
                status: cols[6]?.trim(), // Active/Inactive
                stock: parseInt(cols[7]?.trim()) || 0 // Stock Column
            };
        }).filter(p => p.title && p.img);

        setupCategories();
        renderFeed(allProducts);
        updateCartUI();
    } catch (e) {
        console.error("Error loading products:", e);
        document.getElementById('feed').innerHTML = "<center style='margin-top:50px;'>Error loading store.</center>";
    }
}

/* --- 2. UI TOGGLES --- */
function toggleSearch() { 
    document.getElementById('searchContainer').classList.toggle('hidden'); 
}

function toggleNav() { 
    document.getElementById('navSidebar').classList.toggle('open'); 
    document.getElementById('overlay').classList.toggle('active'); 
}

function toggleCart() { 
    document.getElementById('cartSidebar').classList.toggle('open'); 
    document.getElementById('overlay').classList.toggle('active'); 
}

function closeAll() {
    document.getElementById('navSidebar').classList.remove('open');
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

/* --- 3. RENDERING & FILTERING --- */
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
    if (products.length === 0) {
        feed.innerHTML = "<center style='margin-top:40px;'>No products found.</center>";
        return;
    }

    feed.innerHTML = products.map(p => {
        // STOCK & SCARCITY LOGIC
        let buttonHTML = "";
        let badgeHTML = "";
        
        if (p.status !== "Active" || p.stock <= 0) {
            badgeHTML = `<span class="badge badge-out">SOLD OUT</span>`;
            buttonHTML = `<button class="buy-btn" style="background:#ccc; color:#666" disabled>SOLD OUT</button>`;
        } else if (p.stock <= 3) {
            badgeHTML = `<span class="badge badge-low">🔥 ONLY ${p.stock} LEFT</span>`;
            buttonHTML = `<button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>`;
        } else {
            buttonHTML = `<button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>`;
        }

        return `
            <div class="post">
                <div class="post-header"><span>${p.cat}</span> <span style="color:#eee">...</span></div>
                <img class="post-img" src="https://lh3.googleusercontent.com/u/0/d/${p.img}" alt="${p.title}" loading="lazy">
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
    const filtered = allProducts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.cat.toLowerCase().includes(query)
    );
    renderFeed(filtered);
}

function filterCategory(cat, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');
    const filtered = (cat === 'All') ? allProducts : allProducts.filter(p => p.cat === cat);
    renderFeed(filtered);
}

/* --- 4. CART SYSTEM --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product || product.stock <= 0) return;
    
    cart.push(product);
    saveCart();
    updateCartUI();
    toggleCart(); 
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('microCart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    cartCount.innerText = cart.length;
    
    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        total += parseInt(item.price);
        return `
            <div class="cart-item">
                <img src="https://lh3.googleusercontent.com/u/0/d/${item.img}">
                <div style="flex:1">
                    <div style="font-weight:bold">${item.title}</div>
                    <div>₦${item.price}</div>
                </div>
                <button onclick="removeFromCart(${index})" class="close-btn" style="color:red">×</button>
            </div>
        `;
    }).join('');
    
    if(cart.length === 0) cartItems.innerHTML = "<center>Cart is empty</center>";
    cartTotal.innerText = `₦${total}`;
    document.getElementById('modalTotal').innerText = `₦${total}`;
}

/* --- 5. CHECKOUT & WHATSAPP LOGGING --- */
function openCheckout() {
    if (cart.length === 0) return;
    toggleCart();
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

async function sendOrder(event) {
    event.preventDefault(); // Prevents page refresh

    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;
    
    let itemSummary = "";
    let total = 0;
    cart.forEach((item, i) => {
        total += parseInt(item.price);
        itemSummary += `${i+1}. ${item.title} (₦${item.price})\n`;
    });

    const fullDetails = `Total Order: ₦${total}\nItems:\n${itemSummary}`;

    // --- PART A: SILENT GOOGLE FORM LOG ---
    const formData = new URLSearchParams();
    formData.append(formEntries.name, name);
    formData.append(formEntries.phone, phone);
    formData.append(formEntries.address, address);
    formData.append(formEntries.details, fullDetails);

    try {
        // This sends the data to your Google Sheet in the background
        fetch(formActionUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });
    } catch (e) {
        console.log("Form log skipped");
    }

    // --- PART B: WHATSAPP REDIRECT ---
    const message = `*📦 NEW ORDER RECEIVED*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}\n\n*Items Ordered:*\n${itemSummary}\n*GRAND TOTAL:* ₦${total}`;
    
    const whatsappUrl = `https://wa.me/${myWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Reset Site
    cart = [];
    saveCart();
    updateCartUI();
    closeAll();
    alert("Order summary sent to WhatsApp!");
}

/* --- BOOTSTRAP --- */
loadData();
