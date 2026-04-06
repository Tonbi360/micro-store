/* --- CONFIGURATION --- */
const csvUrl = "https://docs.google.com/spreadsheets/d/1iQzRLCmtpgGHqYexl32m3EUY35_WgmXvi4CCHqdGzu4/export?format=csv";
const myWhatsAppNumber = "234XXXXXXXXXX"; // <-- REPLACE WITH YOUR PHONE NUMBER (Format: 2348123456789)

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
            // Basic CSV parsing (Split by comma)
            const cols = row.split(",");
            return {
                id: cols[0]?.trim(),
                title: cols[1]?.trim(),
                price: cols[2]?.trim(),
                desc: cols[3]?.trim(),
                cat: cols[4]?.trim(),
                img: cols[5]?.trim()
            };
        }).filter(p => p.title && p.img); // Only show valid products

        setupCategories();
        renderFeed(allProducts);
        updateCartUI();
    } catch (e) {
        console.error("Error loading products:", e);
        document.getElementById('feed').innerHTML = "<center>Error loading store. Please check connection.</center>";
    }
}

/* --- 2. UI TOGGLES --- */
function toggleSearch() {
    const search = document.getElementById('searchContainer');
    search.classList.toggle('hidden');
    if (!search.classList.contains('hidden')) {
        document.getElementById('searchBar').focus();
    }
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
    document.getElementById('cartSidebar').classList.remove('remove'); // Compatibility fix
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

/* --- 3. RENDERING & FILTERING --- */
function setupCategories() {
    const menu = document.getElementById('categoryMenu');
    // Extract unique categories
    const categories = [...new Set(allProducts.map(p => p.cat))];
    
    categories.forEach(cat => {
        if(!cat) return;
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.innerText = cat;
        div.onclick = () => {
            filterCategory(cat, div);
            toggleNav();
        };
        menu.appendChild(div);
    });
}

function renderFeed(products) {
    const feed = document.getElementById('feed');
    if (products.length === 0) {
        feed.innerHTML = "<center style='margin-top:40px;'>No products found.</center>";
        return;
    }

    feed.innerHTML = products.map(p => `
        <div class="post">
            <div class="post-header">
                <span>${p.cat}</span>
                <span style="color:#8e8e8e">...</span>
            </div>
            <img class="post-img" src="https://lh3.googleusercontent.com/u/0/d/${p.img}" alt="${p.title}" loading="lazy">
            <div class="post-info">
                <span class="post-price">₦${p.price}</span>
                <span class="post-title">${p.title}</span>
                <span class="post-desc">${p.desc}</span>
                <button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.desc.toLowerCase().includes(query) ||
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
    if (!product) return;
    
    cart.push(product);
    saveCart();
    updateCartUI();
    
    // Quick animation on cart icon
    const icon = document.querySelector('.cart-icon');
    icon.style.transform = "scale(1.2)";
    setTimeout(() => icon.style.transform = "scale(1)", 200);
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
                    <div style="font-weight:bold; font-size:0.9rem;">${item.title}</div>
                    <div style="color:var(--brand-color)">₦${item.price}</div>
                </div>
                <button onclick="removeFromCart(${index})" class="close-btn" style="font-size:1.2rem">×</button>
            </div>
        `;
    }).join('');
    
    if(cart.length === 0) cartItems.innerHTML = "<center>Your cart is empty</center>";
    cartTotal.innerText = `₦${total}`;
    document.getElementById('modalTotal').innerText = `₦${total}`;
}

/* --- 5. WHATSAPP CHECKOUT FLOW --- */
function openCheckout() {
    if (cart.length === 0) return alert("Add items to your cart first!");
    toggleCart(); // Close the sidebar
    document.getElementById('checkoutModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function sendOrder(event) {
    event.preventDefault(); // Stop form from refreshing page

    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;
    
    // 1. Calculate Total
    let total = 0;
    let itemSummary = "";
    
    cart.forEach((item, index) => {
        total += parseInt(item.price);
        itemSummary += `${index + 1}. ${item.title} (₦${item.price})\n`;
    });

    // 2. Format the WhatsApp Message
    const message = `*📦 NEW ORDER RECEIVED* \n\n` +
                    `*Customer:* ${name}\n` +
                    `*Phone:* ${phone}\n` +
                    `*Address:* ${address}\n\n` +
                    `*Items Ordered:*\n${itemSummary}\n` +
                    `*GRAND TOTAL:* ₦${total}\n\n` +
                    `Please confirm availability. Thanks!`;

    // 3. Create the WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${myWhatsAppNumber}?text=${encodedMessage}`;

    // 4. Open WhatsApp and Clear Cart
    window.open(whatsappUrl, '_blank');
    
    // Clear cart after order is sent
    cart = [];
    saveCart();
    updateCartUI();
    closeAll();
    alert("Order summary sent to WhatsApp!");
}

/* --- BOOTSTRAP --- */
loadData();
