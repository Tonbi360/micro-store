/* --- CONFIGURATION --- */
const csvUrl = "https://docs.google.com/spreadsheets/d/1iQzRLCmtpgGHqYexl32m3EUY35_WgmXvi4CCHqdGzu4/export?format=csv";
const myWhatsAppNumber = "2349022066352"; 

// GOOGLE FORM LOGGING CONFIGURATION
const formActionUrl = "https://docs.google.com/forms/d/e/1FAIpQLScTKqoankmnGROcBf84r4fyWolrfTH2NEdGSI7MOyW_RycqEQ/formResponse";
const formEntries = {
    name: "entry.980833548",
    phone: "entry.936037984",
    address: "entry.2118146560",
    details: "entry.1531993443"
};

/* --- STATE MANAGEMENT --- */
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('microCart')) || [];
let likedItems = JSON.parse(localStorage.getItem('microLikes')) || {};

/* --- 1. INITIAL LOAD & CUSTOM LOADER --- */
async function loadData() {
    const feed = document.getElementById('feed');
    
    feed.innerHTML = `
        <div class="loader">
            <div class="plane-animation">✈️</div>
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            <div class="loading-text">Fetching latest styles...</div>
        </div>
    `;

    try {
        const response = await fetch(csvUrl);
        const data = await response.text();
        const rows = data.split("\n").slice(1);
        
        allProducts = rows.map(row => {
            const cols = row.split(",");
            const id = cols[0]?.trim();
            // Seed a "Base Like" count based on ID to make the store look established
            const baseLikes = (parseInt(id.replace(/\D/g,'')) % 50) + 5; 
            
            return {
                id: id,
                title: cols[1]?.trim(),
                price: cols[2]?.trim(),
                desc: cols[3]?.trim(),
                cat: cols[4]?.trim(),
                img: cols[5]?.trim(),
                status: cols[6]?.trim(), 
                stock: parseInt(cols[7]?.trim()) || 0,
                baseLikes: baseLikes
            };
        }).filter(p => p.title && p.img);

        setupCategories();
        renderFeed(allProducts);
        updateCartUI();
    } catch (e) {
        console.error("Error loading products:", e);
        feed.innerHTML = "<center style='margin-top:50px;'>Unable to connect. Please check your data/link.</center>";
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
    if(document.getElementById('checkoutModal')) document.getElementById('checkoutModal').classList.remove('active');
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
    if (!feed) return;
    
    if (products.length === 0) {
        feed.innerHTML = "<center style='margin-top:40px;'>No matches found.</center>";
        return;
    }

    feed.innerHTML = products.map(p => {
        let buttonHTML = `<button class="buy-btn" onclick="addToCart('${p.id}')">Add to Cart</button>`;
        let badgeHTML = "";
        
        if (p.status !== "Active" || p.stock <= 0) {
            badgeHTML = `<span class="badge badge-out">SOLD OUT</span>`;
            buttonHTML = `<button class="buy-btn" style="background:#eee; color:#999; border:none" disabled>SOLD OUT</button>`;
        } else if (p.stock <= 3) {
            badgeHTML = `<span class="badge badge-low">🔥 ONLY ${p.stock} LEFT</span>`;
        }

        const isLiked = likedItems[p.id] ? 'active' : '';
        const currentLikes = p.baseLikes + (likedItems[p.id] ? 1 : 0);

        return `
            <div class="post" id="post-${p.id}">
                <div class="post-header"><span>${p.cat}</span> <span style="color:#ccc">...</span></div>
                
                <div class="post-img-container" ondblclick="handleLike('${p.id}')">
                    <div class="heart-pop">❤️</div>
                    <img class="post-img" src="https://lh3.googleusercontent.com/u/0/d/${p.img}" alt="${p.title}" loading="lazy">
                </div>

                <div class="social-action-bar">
                    <span class="action-icon like-icon ${isLiked}" onclick="handleLike('${p.id}')">
                        ${likedItems[p.id] ? '❤️' : '🤍'}
                    </span>
                    <span class="action-icon" onclick="shareProduct('${p.title}', '${p.id}')">🔗</span>
                </div>

                <div class="post-info">
                    <div class="like-count"><b>${currentLikes} likes</b></div>
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
        p.title.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query)
    );
    renderFeed(filtered);
}

function filterCategory(cat, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(element) element.classList.add('active');
    const filtered = (cat === 'All') ? allProducts : allProducts.filter(p => p.cat === cat);
    renderFeed(filtered);
}

/* --- 4. SOCIAL LOGIC (LIKE & SHARE) --- */
function handleLike(id) {
    const post = document.getElementById(`post-${id}`);
    const heartPop = post.querySelector('.heart-pop');
    const likeIcon = post.querySelector('.like-icon');
    const likeText = post.querySelector('.like-count b');
    const product = allProducts.find(p => p.id === id);

    // 1. Trigger Visual Heart Animation
    heartPop.classList.remove('animate-heart');
    void heartPop.offsetWidth; 
    heartPop.classList.add('animate-heart');

    // 2. Toggle Like State
    if (!likedItems[id]) {
        likedItems[id] = true;
        likeIcon.innerHTML = '❤️';
        likeIcon.classList.add('active');
    } else {
        delete likedItems[id];
        likeIcon.innerHTML = '🤍';
        likeIcon.classList.remove('active');
    }

    // 3. Update UI Text
    const newCount = product.baseLikes + (likedItems[id] ? 1 : 0);
    likeText.innerText = `${newCount} likes`;

    // 4. Save to Memory
    localStorage.setItem('microLikes', JSON.stringify(likedItems));
}

function shareProduct(title, id) {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: `MicroStore | ${title}`,
            text: `Check this out on MicroStore!`,
            url: url
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copied!");
    }
}

/* --- 5. CART SYSTEM --- */
function addToCart(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product || product.stock <= 0) return;
    
    cart.push(product);
    saveCart();
    updateCartUI();
    
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
    if(!cartCount) return;
    
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
    
    if(cart.length === 0) cartItems.innerHTML = "<center style='margin-top:20px'>Your cart is empty</center>";
    cartTotal.innerText = `₦${total}`;
    if(document.getElementById('modalTotal')) document.getElementById('modalTotal').innerText = `₦${total}`;
}

/* --- 6. CHECKOUT & LOGGING ENGINE --- */
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

    const iframeId = "hidden_iframe_" + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeId; iframe.id = iframeId; iframe.style.display = "none";
    document.body.appendChild(iframe);

    const hiddenForm = document.createElement('form');
    hiddenForm.action = formActionUrl; hiddenForm.method = "POST"; hiddenForm.target = iframeId; hiddenForm.style.display = "none";

    const dataMap = { [formEntries.name]: name, [formEntries.phone]: phone, [formEntries.address]: address, [formEntries.details]: fullDetails };

    for (const key in dataMap) {
        const input = document.createElement('input'); input.type = "hidden"; input.name = key; input.value = dataMap[key];
        hiddenForm.appendChild(input);
    }

    document.body.appendChild(hiddenForm);
    hiddenForm.submit();
    
    setTimeout(() => {
        if(document.body.contains(hiddenForm)) document.body.removeChild(hiddenForm);
        if(document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);

    const message = `*📦 NEW ORDER RECEIVED*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}\n\n*Items Ordered:*\n${itemSummary}\n*GRAND TOTAL:* ₦${total}`;
    window.open(`https://wa.me/${myWhatsAppNumber}?text=${encodeURIComponent(message)}`, '_blank');

    cart = [];
    localStorage.setItem('microCart', JSON.stringify(cart));
    updateCartUI();
    closeAll();
}

loadData();
