// --- CẤU HÌNH SUPABASE ---
const SUPABASE_URL = "https://twhxanzyvzbstnmadyaf.supabase.co";
const SUPABASE_KEY = "sb_publishable_IOmcsUcIS5vPrR_2SP0Kig_GzOAPk_n";

// Sử dụng window để đảm bảo không bị lỗi khai báo lại khi F5
if (!window._supabase) {
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const _supabase = window._supabase;

const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/products/`; 
const DEFAULT_IMG = "Images/pending.jpg";

let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
const productsPerPage = 6;

// Sau đó giữ nguyên các hàm loadProducts, renderPage...
// --- LẤY DỮ LIỆU ---
async function loadProducts() {
    try {
        // Kiểm tra xem _supabase đã được khởi tạo chưa
        if (typeof _supabase === 'undefined') {
            console.error("Biến _supabase chưa được định nghĩa. Hãy kiểm tra lại URL và Key!");
            return;
        }

        const { data, error } = await _supabase
            .from('Product') // Tên bảng phải khớp 100% (ví dụ: chữ P viết hoa)
            .select('*');

        if (error) {
            console.error("Lỗi lấy dữ liệu:", error.message);
            return;
        }

        // Gán dữ liệu vào biến toàn cục
        allProducts = data || []; 
        filteredProducts = [...allProducts];
        
        console.log("Dữ liệu đã tải xong:", allProducts);
        renderPage(1);
    } catch (err) {
        console.error("Lỗi hệ thống:", err);
    }
}

function renderPage(page) {
    currentPage = page;
    const container = document.getElementById("product-list");
    if (!container) return;

    const start = (page - 1) * productsPerPage;
    const end = start + productsPerPage;
    const productsToShow = filteredProducts.slice(start, end);

    container.innerHTML = productsToShow.map(p => {
        // Lưu ý: Tên cột phải viết thường (p.stock, p.discount, p.price) khớp với Database
        const isOutOfStock = p.stock <= 0;
        const discountLabel = Math.round((p.discount || 0) * 100);
        const stockClass = isOutOfStock ? 'out-of-stock-card' : '';
        const isHot = p.is_hot; // Cột is_hot trong database
        const hotClass = (isHot && !isOutOfStock) ? 'hot-border' : '';
        
        // Ghép link ảnh từ Storage bằng image_name
        const finalImg = p.image_name ? (STORAGE_URL + p.image_name) : DEFAULT_IMG;

        return `
        <div class="col-lg-4 col-md-6 col-sm-6 mb-4">
            <div class="glass-card product-card ${hotClass} ${stockClass}">
                <div class="badge-container">
                    ${(isHot && !isOutOfStock) ? '<span class="badge-hot">HOT</span>' : ''}
                    ${(p.discount > 0 && !isOutOfStock) ? `<span class="badge bg-danger badge-discount">-${discountLabel}%</span>` : ''}
                </div>
                <img src="${finalImg}" class="product-img" onerror="this.src='${DEFAULT_IMG}'">
                <div class="product-name mt-2">${p.name}</div>
                <div class="price-container">
                    ${(p.discount > 0 && !isOutOfStock) ? `<small class="text-secondary text-decoration-line-through me-2">${p.baseprice?.toLocaleString()}đ</small>` : ''}
                    <span class="price-new text-info fw-bold">${(p.price || 0).toLocaleString()}đ</span>
                </div>
                <div class="quantity-controls d-flex justify-content-center align-items-center gap-2 mt-2">
                    <button class="qty-btn" type="button" onclick="updateInputQty(${p.id}, -1)">-</button>
                    <input type="text" id="qty-${p.id}" class="qty-input" 
                           value="${isOutOfStock ? 0 : 1}" 
                           oninput="handleQtyInput(this)">
                    <button class="qty-btn" type="button" onclick="updateInputQty(${p.id}, 1)">+</button>
                </div>
                <button class="buy-btn mt-2 w-100 ${isOutOfStock ? 'sold-out-text' : ''}" 
                        ${isOutOfStock ? 'disabled' : `onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price})"`}>
                    ${isOutOfStock ? 'HẾT HÀNG' : 'Thêm vào giỏ'}
                </button>
            </div>
        </div>`;
    }).join('');

    renderPagination();
}

// --- XỬ LÝ GIỎ HÀNG & THANH TOÁN ---
// --- XỬ LÝ GIỎ HÀNG & THANH TOÁN ---
async function pushOrderToAdmin(phone, method) {
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // 1. Lấy thời gian hiện tại
    const now = new Date();
    
    // 2. Tạo chuỗi ngày tháng năm dạng DDMMYYYY (Ví dụ: 30042026)
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}${month}${year}`;

    // Dữ liệu gửi lên Supabase
    const orderData = {
        phone_number: phone,
        payment_method: method,
        total_amount: totalAmount,
        status: method === "COD" ? "Đã xác nhận" : "Chờ xác nhận",
        created_at: now.toISOString()
    };

    try {
        const { data, error } = await _supabase
            .from('Orders') 
            .insert([orderData])
            .select(); 

        if (error) throw error;
        
        if (data && data.length > 0) {
            // 3. Lấy ID tự tăng từ DB và đệm thêm số 0 để đủ 4 chữ số (Ví dụ: 1 -> 0001)
            const orderSequence = String(data[0].id).padStart(4, '0');
            
            // 4. Kết hợp lại thành mã: BB + 30042026 + 0001
            return `BB${dateStr}${orderSequence}`;
        }
        
        return null;
    } catch (error) {
        console.error("Lỗi tạo đơn hàng:", error.message);
        return null;
    }
}

// --- CÁC HÀM CÒN LẠI (GIỮ NGUYÊN LOGIC NHƯNG KHỚP BIẾN) ---
function addToCart(id, name, price) {
    const qtyInput = document.getElementById(`qty-${id}`);
    let qty = parseInt(qtyInput?.value) || 1;
    if (qty < 1) qty = 1;

    const existingItem = cart.find(i => i.id == id);
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({ id: parseInt(id), name, price, qty });
    }

    if (qtyInput) qtyInput.value = 1;
    renderCart();
}

function renderCart() {
    const container = document.getElementById("cart-content");
    const totalEl = document.getElementById("total-price");
    if (!container || !totalEl) return;

    if (cart.length === 0) {
        container.innerHTML = `<p class="text-secondary text-center">Chưa có sản phẩm nào</p>`;
        totalEl.innerText = "0đ";
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        return `
        <div class="cart-item d-flex justify-content-between align-items-center mb-2">
            <div>
                <strong class="cart-item-name">${item.name}</strong> 
                <div class="text-secondary small">x ${item.qty} - ${subtotal.toLocaleString()}đ</div>
            </div>
            <button class="btn-remove-cart" onclick="removeFromCart(${index})">Gỡ</button>
        </div>`;
    }).join('');

    totalEl.innerText = total.toLocaleString() + "đ";
}

// Giữ nguyên các hàm bổ trợ khác (handleQtyInput, updateInputQty, applyFilters, renderPagination, v.v.)
function handleQtyInput(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value === '0' || input.value === '') input.value = '1';
    if (parseInt(input.value) > 100) input.value = '100';
}

function updateInputQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (input) {
        let val = parseInt(input.value) + delta;
        if (val >= 1 && val <= 100) input.value = val;
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    const activeTagEl = document.querySelector('.filter-tag.active');
    const selectedTag = activeTagEl ? activeTagEl.innerText.trim().toLowerCase() : "tất cả";

    filteredProducts = allProducts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm);
        let matchTag = true;

        if (selectedTag !== "tất cả") {
            const categoryMatch = p.category && p.category.toLowerCase() === selectedTag;
            const nameMatch = p.name && p.name.toLowerCase().includes(selectedTag);
            matchTag = categoryMatch || nameMatch;
        }
        return matchSearch && matchTag;
    });

    currentPage = 1;
    renderPage(1);
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination");
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    container.innerHTML = `
        <div class="pagination-input-group d-flex align-items-center gap-2 justify-content-center">
            <button class="btn btn-pagination" ${currentPage === 1 ? 'disabled' : ''} onclick="renderPage(${currentPage - 1})"> << </button>
            <div class="input-page-wrapper">
                <input type="text" id="input-page" class="page-num-input" value="${currentPage}" onchange="goToPage(this.value, ${totalPages})">
                <span class="total-pages">/ ${totalPages}</span>
            </div>
            <button class="btn btn-pagination" ${currentPage === totalPages ? 'disabled' : ''} onclick="renderPage(${currentPage + 1})"> >> </button>
        </div>`;
}

function goToPage(value, maxPage) {
    let page = parseInt(value);
    if (isNaN(page) || page < 1) page = 1;
    if (page > maxPage) page = maxPage;
    renderPage(page);
}

// Các hàm xử lý giao diện Modal giữ nguyên...
function removeFromCart(index) { cart.splice(index, 1); renderCart(); }
function handleCheckout() { 
    if (cart.length === 0) return;
    const modal = document.getElementById("checkout-modal");
    const details = document.getElementById("modal-cart-details");
    let total = 0;
    details.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `<div class="d-flex justify-content-between mb-2"><span>${item.name} (x${item.qty})</span><span class="text-info">${(item.price * item.qty).toLocaleString()}đ</span></div>`;
    }).join('') + `<hr><div class="d-flex justify-content-between fw-bold"><span>TỔNG CỘNG:</span><span class="text-warning">${total.toLocaleString()}đ</span></div>`;
    modal.style.display = "flex";
}

async function finalProcess() {
    const phone = document.getElementById("user-phone").value.trim();
    const method = document.getElementById("payment-method").value;
    const vnf_regex = /^(03|05|07|08|09)+([0-9]{8})$/;

    if (!vnf_regex.test(phone)) {
        showNoti("LỖI", "Số điện thoại không đúng định dạng VN!");
        return;
    }

    const realOrderCode = await pushOrderToAdmin(phone, method);
    if (!realOrderCode) {
        showNoti("LỖI", "Không thể kết nối đến server!");
        return;
    }

    if (method === "BANK") {
        document.getElementById("payment-modal").style.display = "none";
        document.getElementById("bank-modal").style.display = "flex";
        document.getElementById("bank-msg").innerText = realOrderCode;
        let totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const qrUrl = `https://img.vietqr.io/image/OCB-0385948843-compact.png?amount=${totalAmount}&addInfo=${realOrderCode}&accountName=NGUYEN%20MINH%20TUNG`;
        document.getElementById("qr-image").src = qrUrl;
    } else {
        showNoti("THÀNH CÔNG", "Đơn COD đã nhận, mã đơn: " + realOrderCode);
        finishAll("COD");
    }
}

function finishAll(type = "BANK") {
    if (type === "BANK") showNoti("ĐANG XÁC MINH", "BBao sẽ kiểm tra tài khoản và gọi điện xác nhận ngay.");
    cart = []; renderCart();
    ["payment-modal", "bank-modal", "checkout-modal"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = "none";
    });
}

function showNoti(title, message) {
    const modal = document.getElementById("notification-modal");
    if (modal) {
        document.getElementById("noti-title").innerText = title;
        document.getElementById("noti-message").innerText = message;
        modal.style.display = "flex";
    } else { alert(`${title}: ${message}`); }
}

function closeModal() { document.getElementById("checkout-modal").style.display = "none"; }
function confirmPayment() { document.getElementById("checkout-modal").style.display = "none"; document.getElementById("payment-modal").style.display = "flex"; }
function backToCart() { document.getElementById("payment-modal").style.display = "none"; document.getElementById("checkout-modal").style.display = "flex"; }
function closeNoti() { document.getElementById("notification-modal").style.display = "none"; }
function closeBankModal() { document.getElementById("bank-modal").style.display = "none"; document.getElementById("payment-modal").style.display = "flex"; }
function copySTK() {
    const stk = "0385948843";
    navigator.clipboard.writeText(stk).then(() => showNoti("THÔNG BÁO", "Đã sao chép số tài khoản: " + stk));
}

window.onload = function() {
    loadProducts();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            applyFilters();
        });
    });
};