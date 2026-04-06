const csvUrl = "https://docs.google.com/spreadsheets/d/1iQzRLCmtpgGHqYexl32m3EUY35_WgmXvi4CCHqdGzu4/export?format=csv";
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('microCart')) || [];

// INITIAL LOAD
async function loadData() {
    try {
        const response = await fetch(csvUrl);
        const data = await response.text();
        const rows = data.split("\n").slice(1);
        
        allProducts = rows.map(row => {
            const cols = row.split(",");
            return {
                id: cols[0]?.trim(), title: cols[1]?.trim(), price: cols[2]?.trim(),
                desc: cols[3]?.trim(), cat: cols[4]?.trim(), img: cols[5]?.trim()
            };
        }).filter(p => p.title);

        setupCategories();
        renderFeed(allProducts);
        updateCartUI();
    } catch (e) { console.error("Error loading CSV", e); }
}

// SETUP CATEGORY BUTTONS
function setupCategories() {
    const nav = document.getElementById('categoryNav');
    const categories = [...new Set(allProducts.map(p => p.cat))];
    categories.forEach(cat => {
        if(!cat) return;
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.innerText = cat;
        btn.onclick = (e) => filterCategory(cat, e.target);
        nav.appendChild(btn);
    });
}

// RENDER FEED
function renderFeed(products) {
    const feed = document.getElementById('feed');
    feed.innerHTML = products.map(p => `
        <div class="post">
            <div class="post-header"><span>${p.cat}</span> <span>...</span></div>
            <img class="post-img" src="https://lh3.googleusercontent.com/u/0/d/${p.img}" alt="${p.title}">
            <div class="post-info">
                <span class="post-price">₦${p.price}</span>
                <span class="post-username">${p.title}</span>
                <span class="post-desc">${p.desc}</span>
                <button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// FILTERING LOGIC
function filterProducts() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(query));
    renderFeed(filtered);
}

function filterCategory(cat, btn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = (cat === 'All') ? allProducts : allProducts.filter(p => p.cat === cat);
    renderFeed(filtered);
}

// STEP 4: CART LOGIC
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    cart.push(product);
    localStorage.setItem('microCart', JSON.stringify(cart));
    updateCartUI();
    // Optional: Open cart automatically when item added
    // toggleCart(); 
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('microCart', JSON.stringify(cart));
    updateCartUI();
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
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer">✕</button>
            </div>
        `;
    }).join('');
    
    cartTotal.innerText = `₦${total}`;
}

function checkout() {
    if (cart.length === 0) return alert("Cart is empty!");
    alert("Checkout coming in Step 5! This will open a form and WhatsApp.");
}

loadData();
