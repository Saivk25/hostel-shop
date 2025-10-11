
// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC6IbwGhZE_1OtwcWtsgd8Tc1akgTFdzh8",
    authDomain: "hostel-shop.firebaseapp.com",
    projectId: "hostel-shop",
    storageBucket: "hostel-shop.firebasestorage.app",
    messagingSenderId: "665617995921",
    appId: "1:665617995921:web:6643e43c6ee7f369ba0730",
    measurementId: "G-LCY0XSYWWQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

// Global Variables
let items = [];
let orders = [];
let categories = [];
let cart = [];
let currentCategory = 'all';
let currentOrderFilter = 'all';
let pendingOrder = null;
let isSubmitting = false;
let currentAdminCategory = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
        loadImgBBApiKey(); // ADD THIS LINE
        loadUpiId();

    try {
        await loadCategoriesFromFirebase();
        await loadItemsFromFirebase();
        if (document.getElementById('itemsGrid')) {
            renderStudentPage();
        }
        if (document.getElementById('adminItemsGrid')) {
            await loadOrdersFromFirebase();
            renderAdminPage();
            setupOrdersListener();
            setupCategoriesListener();
        }
    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Failed to initialize the app. Please check your connection and refresh.");
    }
});
function renderAdminCategoryFilter() {
    const container = document.querySelector('#manage-items .flex.flex-wrap.gap-2');
    if (!container) return;
    
    // Clear existing buttons except "All Items"
    container.innerHTML = `
        <button onclick="filterAdminItems('all')" class="admin-category-btn active px-4 py-2 text-sm rounded-lg transition-all">
            All Items
        </button>
    `;
    
    // Add category buttons
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.onclick = () => filterAdminItems(cat.name);
        button.className = 'admin-category-btn px-4 py-2 text-sm rounded-lg transition-all';
        button.textContent = cat.name;
        container.appendChild(button);
    });
}

// Filter admin items by category
function filterAdminItems(category) {
    currentAdminCategory = category;
    
    // Update button styles
    document.querySelectorAll('.admin-category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === category || 
            (category === 'all' && btn.textContent.trim() === 'All Items')) {
            btn.classList.add('active');
        }
    });
    
    // Clear search
    const searchInput = document.getElementById('adminItemSearch');
    if (searchInput) searchInput.value = '';
    
    // Render filtered items
    renderAdminItems();
}

// Search admin items
function searchAdminItems(query) {
    const grid = document.getElementById('adminItemsGrid');
    const emptyState = document.getElementById('adminItemsEmpty');
    if (!grid || !emptyState) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
        // No search query - show current category filter
        renderAdminItems();
        return;
    }
    
    // Filter by search query
    const filtered = items.filter(item => 
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.category && item.category.toLowerCase().includes(normalizedQuery)) ||
        (item.size && item.size.toLowerCase().includes(normalizedQuery))
    );
    
    if (filtered.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Render filtered items
    grid.innerHTML = filtered.map(item => `
        <div class="bg-white/90 rounded-xl shadow-md overflow-hidden border border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer" onclick="showAdminItemModal('${item.id}')">
            <div class="flex items-center gap-4 p-4">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-20 h-20 rounded-lg object-cover border border-green-100 flex-shrink-0">`
                    : `<div class="w-20 h-20 rounded-lg bg-green-50 flex items-center justify-center border border-green-100 flex-shrink-0">
                         <i class="fas fa-box text-green-600 text-3xl"></i>
                       </div>`
                }
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-800 text-base mb-1 truncate">${item.name}</h3>
                    <p class="text-sm text-gray-600 truncate">${item.size || 'N/A'}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-xl font-bold text-green-700">₹${item.price}</p>
                        <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ${item.category || 'Other'}
                        </span>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                    item.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }">
                    ${item.inStock ? 'In Stock' : 'Out'}
                </span>
            </div>
        </div>
    `).join('');
}

// ============================================
// ImgBB Image Upload Functions
// ============================================

// Save ImgBB API Key to localStorage
function saveImgBBApiKey() {
    const apiKey = document.getElementById('imgbbApiKey')?.value.trim();
    if (!apiKey) {
        showToast('Please enter an API key!');
        return;
    }
    localStorage.setItem('imgbbApiKey', apiKey);
    const status = document.getElementById('apiKeyStatus');
    if (status) {
        status.textContent = '✅ API Key saved successfully!';
        status.className = 'text-xs text-green-600 mt-2 font-bold';
    }
    showToast('✅ ImgBB API Key saved! You can now upload images.');
}

// Load saved API key on page load
function loadImgBBApiKey() {
    const savedKey = localStorage.getItem('imgbbApiKey');
    const apiKeyInput = document.getElementById('imgbbApiKey');
    const status = document.getElementById('apiKeyStatus');
    
    if (savedKey && apiKeyInput) {
        apiKeyInput.value = savedKey;
        if (status) {
            status.textContent = '✅ API Key loaded from saved settings';
            status.className = 'text-xs text-green-600 mt-2';
        }
    }
}

// Upload image to ImgBB
async function uploadImageToImgBB(fileInputId, urlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const urlInput = document.getElementById(urlInputId);
    const apiKey = localStorage.getItem('imgbbApiKey');
    
    if (!apiKey) {
        showToast('⚠️ Please set your ImgBB API key first!\n\nGet it from: https://api.imgbb.com/');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file) return;
    
    // Validate file size (max 32MB for ImgBB)
    if (file.size > 32 * 1024 * 1024) {
        showToast('❌ Image size must be less than 32MB');
        return;
    }
    
    // Show loading state
    if (urlInput) {
        urlInput.value = '⏳ Uploading image...';
        urlInput.className = urlInput.className.replace('bg-green-50', 'bg-yellow-50');
    }
    
    try {
        // Convert image to base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            
            // Upload to ImgBB
            const formData = new FormData();
            formData.append('image', base64);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Set the image URL
                if (urlInput) {
                    urlInput.value = data.data.url;
                    urlInput.className = urlInput.className.replace('bg-yellow-50', 'bg-green-50');
                }
                
                // Show preview
                showImagePreview(data.data.url, fileInputId);
                
                console.log('✅ Image uploaded successfully:', data.data.url);
                showToast('✅ Image uploaded successfully!');
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        };
        
        reader.onerror = () => {
            throw new Error('Failed to read image file');
        };
        
    } catch (error) {
        console.error('Upload error:', error);
        if (urlInput) {
            urlInput.value = '';
            urlInput.className = urlInput.className.replace('bg-yellow-50', 'bg-green-50');
        }
        showToast('❌ Upload failed: ' + error.message + '\n\nPlease check your API key and try again.');
    }
}

// Show image preview
function showImagePreview(imageUrl, inputId) {
    // Remove existing preview
    const existingPreview = document.getElementById(`preview-${inputId}`);
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Create new preview
    const fileInput = document.getElementById(inputId);
    if (!fileInput || !fileInput.parentElement) return;
    
    const preview = document.createElement('div');
    preview.id = `preview-${inputId}`;
    preview.className = 'mt-3';
    preview.innerHTML = `
        <p class="text-xs text-gray-500 mb-2">Preview:</p>
        <img src="${imageUrl}" alt="Preview" class="w-32 h-32 object-cover rounded-lg border-2 border-green-300 shadow-md">
    `;
    
    fileInput.parentElement.appendChild(preview);
}

// Expose functions to global scope
window.saveImgBBApiKey = saveImgBBApiKey;
window.uploadImageToImgBB = uploadImageToImgBB;

// Firebase Functions
async function loadItemsFromFirebase() {
    try {
        items = [];
        const querySnapshot = await getDocs(collection(db, "items"));
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        window.items = items;
        
        if (document.getElementById('itemsGrid')) {
            renderItemsGrid();
            renderCategoryFilter();
        }
        return items;
    } catch (error) {
        console.error("Error loading items:", error);
        throw error;
    }
}
async function loadCategoriesFromFirebase() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(cat => cat.name && cat.name !== 'undefined' && cat.name.trim() !== '');
        window.categories = categories;
    } catch (error) {
        console.error("Error loading categories:", error);
        throw error;
    }
}

async function loadOrdersFromFirebase() {
    try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const ordersSnapshot = await getDocs(ordersQuery);
        orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.orders = orders;
    } catch (error) {
        console.error("Error loading orders:", error);
        throw error;
    }
}

async function addItemToFirebase(item) {
    try {
        const docRef = await addDoc(collection(db, 'items'), item);
        return docRef.id;
    } catch (error) {
        console.error("Error adding item:", error);
        throw error;
    }
}

async function addCategoryToFirebase(category) {
    try {
        const existing = categories.find(cat => cat.name.toLowerCase() === category.toLowerCase());
        if (!existing) {
            const docRef = await addDoc(collection(db, 'categories'), { name: category });
            return docRef.id;
        }
        return existing.id; // Avoid duplicate if already exists
    } catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
}

async function updateCategoryInFirebase(categoryId, newName) {
    try {
        const categoryRef = doc(db, 'categories', categoryId);
        await updateDoc(categoryRef, { name: newName });
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
}

async function deleteCategoryFromFirebase(categoryId, categoryName) {
    try {
        // Remove the items check - we'll handle it in deleteCategory function
        await deleteDoc(doc(db, 'categories', categoryId));
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
}

async function updateItemInFirebase(itemId, updates) {
    try {
        const itemRef = doc(db, 'items', itemId);
        await updateDoc(itemRef, updates);
    } catch (error) {
        console.error("Error updating item:", error);
        throw error;
    }
}

async function deleteItemFromFirebase(itemId) {
    try {
        await deleteDoc(doc(db, 'items', itemId));
    } catch (error) {
        console.error("Error deleting item:", error);
        throw error;
    }
}

async function addOrderToFirebase(order) {
    try {
        const docRef = await addDoc(collection(db, 'orders'), order);
        return docRef.id;
    } catch (error) {
        console.error("Error placing order:", error);
        throw error;
    }
}

async function updateOrderInFirebase(orderId, updates) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, updates);
    } catch (error) {
        console.error("Error updating order:", error);
        throw error;
    }
}

async function deleteOrderFromFirebase(orderId) {
    try {
        await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
}

function setupOrdersListener() {
    try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        onSnapshot(ordersQuery, (snapshot) => {
            orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderOrders();
        });
    } catch (error) {
        console.error("Error setting up orders listener:", error);
        showToast("Failed to load real-time orders. Please refresh.");
    }
}

function setupCategoriesListener() {
    let debounceTimer;
    try {
        onSnapshot(collection(db, 'categories'), (snapshot) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                categories = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(cat => cat.name && cat.name !== 'undefined' && cat.name.trim() !== '')
                    .reduce((unique, cat) => {
                        if (!unique.some(c => c.name.toLowerCase() === cat.name.toLowerCase())) unique.push(cat);
                        return unique;
                    }, []);
                renderCategoryFilter();
                renderAdminItems();
                renderAdminCategoryFilter();  // Add this line
                renderCategoryManagement();
                renderCategoryOptions('newItemCategory');
                renderCategoryOptions('editItemCategory');
            }, 100);
        }, (error) => {
            console.error("Error in categories listener:", error);
        });
    } catch (error) {
        console.error("Error setting up categories listener:", error);
    }
}

// Get unique categories
function getCategories() {
    return ['all', ...new Set(categories.map(cat => cat.name))]; // Use Set for uniqueness
}

// Filter category
function filterCategory(category) {
    currentCategory = category;
    renderItemsGrid();
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-purple-500', 'text-white');
        btn.classList.add('bg-white', 'text-gray-700');
        if (btn.textContent.toLowerCase().includes(category)) {
            btn.classList.add('active', 'bg-purple-500', 'text-white');
        }
    });
}

// Render Student Page
function renderStudentPage() {
    if (!document.getElementById('itemsGrid') || !document.getElementById('categoryFilter')) {
        console.error("Student page elements missing");
        return;
    }
    renderCategoryFilter();
    renderItemsGrid();
    renderCart();
}

// Render category filter
function renderCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;
    filter.innerHTML = ''; // Clear to prevent duplicates
    const categoryList = getCategories();
    categoryList.forEach((cat, idx) => {
        const button = document.createElement('button');
        button.onclick = () => filterCategory(cat);
        button.className = `category-btn ${idx === 0 ? 'active bg-purple-500 text-white' : 'bg-white text-gray-700'} px-4 py-2 rounded-full font-medium transition-all hover:shadow-md`;
        button.textContent = cat === 'all' ? 'All Items' : cat;
        filter.appendChild(button);
    });
}

// Render items grid
function renderItemsGrid() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;
    const filteredItems = currentCategory === 'all' ? items : items.filter(item => item.category === currentCategory);
    
    if (filteredItems.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400"><i class="fas fa-box-open text-6xl mb-4 opacity-30"></i><p class="text-lg">No items available in this category</p></div>';
        return;
    }
    
    grid.innerHTML = filteredItems.map(item => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-xl ${!item.inStock ? 'opacity-60' : ''} cursor-pointer" onclick="showItemModal('${item.id}')">
            <div class="relative h-32 sm:h-40 bg-gradient-to-br from-green-400 to-emerald-400 overflow-hidden">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center">
                         <i class="fas fa-box text-white text-4xl"></i>
                       </div>`
                }
                <div class="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    ${item.category || 'Other'}
                </div>
                ${!item.inStock ? '<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">Out of Stock</span></div>' : ''}
            </div>
            <div class="p-3 sm:p-4">
                <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-1 line-clamp-2">${item.name}</h3>
                <p class="text-xs text-gray-500 mb-2">${item.size || 'N/A'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-lg sm:text-xl font-bold text-green-600">₹${item.price}</span>
                    <button onclick="event.stopPropagation(); addToCart('${item.id}')" ${!item.inStock ? 'disabled' : ''}
                            class="px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-all flex items-center gap-1 ${
                                item.inStock ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}
// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Expose to global scope
window.showToast = showToast;
// Cart Functions
function addToCart(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.inStock) 
    
    return;
    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
        showQuickAddFeedback(item);

    }
    renderCart();

}

function removeFromCart(itemId) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    if (item.qty > 1) {
        item.qty--;
    } else {
        cart = cart.filter(i => i.id !== itemId);
    }
    renderCart();
}

function deleteFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    renderCart();
}

function getTotalPrice() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderCart() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');
    const cartBadge = document.getElementById('cartBadge');
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    if (!cartEmpty || !cartContent || !cartBadge || !cartItems || !totalPrice) return;
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cart.length === 0) {
        cartEmpty.classList.remove('hidden');
        cartContent.classList.add('hidden');
        cartBadge.classList.add('hidden');
    } else {
        cartEmpty.classList.add('hidden');
        cartContent.classList.remove('hidden');
        cartBadge.classList.remove('hidden');
        cartBadge.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
        cartItems.innerHTML = cart.map(item => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800">${item.name}</h4>
                    <p class="text-sm text-gray-500">₹${item.price} each • ${item.size || 'N/A'}</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                        <button onclick="removeFromCart('${item.id}')" class="text-purple-600 hover:bg-purple-50 rounded p-1">
                            <i class="fas fa-minus text-sm"></i>
                        </button>
                        <span class="font-bold text-gray-800 min-w-[24px] text-center">${item.qty}</span>
                        <button onclick="addToCart('${item.id}')" class="text-purple-600 hover:bg-purple-50 rounded p-1">
                            <i class="fas fa-plus text-sm"></i>
                        </button>
                    </div>
                    <span class="font-bold text-gray-800 min-w-[80px] text-right">₹${item.price * item.qty}</span>
                    <button onclick="deleteFromCart('${item.id}')" class="text-red-500 hover:bg-red-50 rounded p-2">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `).join('');
        totalPrice.textContent = `₹${getTotalPrice()}`;
    }
}

// Place Order
function placeOrder() {
    const studentName = document.getElementById('studentName')?.value.trim();
    const regNumber = document.getElementById('regNumber')?.value.trim();
    const room = document.getElementById('room')?.value.trim();
    
    if (!studentName || !regNumber || !room) {
        showToast('Please fill in your name, registration number, and room number!', 'warning');
        return;
    }
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'warning');
        return;
    }
    
    pendingOrder = {
        studentName,
        regNumber,
        room,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            size: item.size || 'N/A',
            price: item.price,
            qty: item.qty
        })),
        timestamp: Date.now(),
        status: 'pending',
        total: getTotalPrice(),
        paymentMethod: 'upi',
        transactionId: null
    };
    showPaymentModal();
}

// Payment Modal Functions
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const amount = document.getElementById('paymentAmount');
    const qrCodeDiv = document.getElementById('qrCode');
    const transactionIdInput = document.getElementById('transactionIdInput');
    const upiRadio = document.getElementById('paymentUPI');
    if (!modal || !amount || !qrCodeDiv || !transactionIdInput || !upiRadio) return;
    amount.textContent = pendingOrder.total;
    modal.classList.remove('hidden');
    qrCodeDiv.innerHTML = '';
    if (upiRadio.checked) {
        const upiId = getUpiId(); // Get saved UPI ID
const upiString = `upi://pay?pa=${upiId}&pn=K2Essentials&am=${pendingOrder.total}&cu=INR&tn=Order${Date.now()}`;
        try {
        new QRCode(qrCodeDiv, { text: upiString, width: 200, height: 200 });
        // Add UPI ID display below QR code
        const upiDisplay = document.createElement('p');
        upiDisplay.className = 'text-sm text-gray-700 mt-3 font-medium text-center';
        upiDisplay.innerHTML = `UPI ID: <span class="text-green-600 font-bold">${upiId}</span>`;
        qrCodeDiv.appendChild(upiDisplay);
        transactionIdInput.classList.remove('hidden');
    } catch (error) {
            console.error("QR code generation failed:", error);
            qrCodeDiv.innerHTML = '<p class="text-red-500">Failed to generate QR code.</p>';
            transactionIdInput.classList.remove('hidden');
        }
    } else {
        qrCodeDiv.innerHTML = '<p class="text-gray-600">Pay on delivery at the shop.</p>';
        transactionIdInput.classList.add('hidden');
    }
}

function togglePaymentMethod() {
    const upiRadio = document.getElementById('paymentUPI');
    const qrCodeDiv = document.getElementById('qrCode');
    const transactionIdInput = document.getElementById('transactionIdInput');
    if (!qrCodeDiv || !transactionIdInput || !upiRadio) return;
    pendingOrder.paymentMethod = upiRadio.checked ? 'upi' : 'cod';
    qrCodeDiv.innerHTML = '';
    if (upiRadio.checked) {
        const upiString = `upi://pay?pa=9940525358@okbizaxis&pn=K2Essentials&am=${pendingOrder.total}&cu=INR&tn=Order${Date.now()}`;
        try {
        new QRCode(qrCodeDiv, { text: upiString, width: 200, height: 200 });
        // Add UPI ID display below QR code
        const upiDisplay = document.createElement('p');
        upiDisplay.className = 'text-sm text-gray-700 mt-3 font-medium text-center';
        upiDisplay.innerHTML = `UPI ID: <span class="text-green-600 font-bold">${upiId}</span>`;
        qrCodeDiv.appendChild(upiDisplay);
        transactionIdInput.classList.remove('hidden');
    } catch (error) {
            console.error("QR code generation failed:", error);
            qrCodeDiv.innerHTML = '<p class="text-red-500">Failed to generate QR code.</p>';
            transactionIdInput.classList.remove('hidden');
        }
    } else {
        qrCodeDiv.innerHTML = '<p class="text-gray-600">Pay on delivery at the shop.</p>';
        transactionIdInput.classList.add('hidden');
    }
}
// ============================================
// UPI ID Management Functions
// ============================================

// Save UPI ID to localStorage
function saveUpiId() {
    const upiId = document.getElementById('upiIdInput')?.value.trim();
    if (!upiId) {
        showToast('Please enter a UPI ID!', 'warning');
        return;
    }
    
    // Basic validation
    if (!upiId.includes('@')) {
        showToast('Invalid UPI ID format! Must contain @', 'error');
        return;
    }
    
    localStorage.setItem('upiId', upiId);
    const status = document.getElementById('upiIdStatus');
    if (status) {
        status.textContent = '✅ UPI ID saved successfully!';
        status.className = 'text-xs text-green-600 mt-2 font-bold';
    }
    showToast('✅ UPI ID saved! It will be used for all future payments.', 'success');
}

// Load saved UPI ID on page load
function loadUpiId() {
    const savedUpiId = localStorage.getItem('upiId') || '9940525358@okbizaxis'; // Default
    const upiIdInput = document.getElementById('upiIdInput');
    const status = document.getElementById('upiIdStatus');
    
    if (upiIdInput) {
        upiIdInput.value = savedUpiId;
        if (status) {
            status.textContent = savedUpiId === '9940525358@okbizaxis' 
                ? '⚠️ Using default UPI ID' 
                : '✅ Custom UPI ID loaded';
            status.className = savedUpiId === '9940525358@okbizaxis' 
                ? 'text-xs text-yellow-600 mt-2' 
                : 'text-xs text-green-600 mt-2';
        }
    }
}

// Get current UPI ID (with fallback)
function getUpiId() {
    return localStorage.getItem('upiId') || '9940525358@okbizaxis';
}
function cancelPayment() {
    const modal = document.getElementById('paymentModal');
    const transactionId = document.getElementById('transactionId');
    if (!modal || !transactionId) return;
    modal.classList.add('hidden');
    transactionId.value = '';
    pendingOrder = null;
}

async function confirmPayment() {
    if (isSubmitting) {
        console.log('Already submitting, please wait...');
        return;
    }
    isSubmitting = true;
    
    const transactionId = document.getElementById('transactionId')?.value.trim();
    if (pendingOrder.paymentMethod === 'upi' && !transactionId) {
        showToast('Please enter the transaction ID for UPI payment!', 'warning');
        isSubmitting = false;
        return;
    }
    
    pendingOrder.transactionId = pendingOrder.paymentMethod === 'upi' ? transactionId : null;
    
    try {
        const orderId = await addOrderToFirebase(pendingOrder);
        console.log('Order placed successfully with ID:', orderId);
        
        // Clear form and cart
        cart = [];
        document.getElementById('studentName').value = '';
        document.getElementById('regNumber').value = '';
        document.getElementById('room').value = '';
        document.getElementById('transactionId').value = '';
        document.getElementById('paymentModal').classList.add('hidden');
        renderCart();
        
        // Show success message
        const message = pendingOrder.paymentMethod === 'cod' 
            ? 'Order placed! Pay on delivery at the shop.' 
            : 'Order placed! Payment verification in progress.';
        
        showToast(message + ' Pick up from shop once confirmed.', 'success', 5000);
        
        pendingOrder = null;
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Error placing order. Please try again.', 'error');
    } finally {
        isSubmitting = false;
    }
}

// Admin Page Functions
function renderAdminPage() {
    if (!document.getElementById('adminItemsGrid') || !document.getElementById('ordersContent')) {
        console.error("Admin page elements missing");
        return;
    }
    renderAdminCategoryFilter();  // Add this line
    renderAdminItems();
    renderOrders();
    renderCategoryOptions('newItemCategory');
    renderCategoryOptions('editItemCategory');
    
    if (document.getElementById('categoryManagement')) {
        renderCategoryManagement();
    }
}

function renderAdminItems() {
    const grid = document.getElementById('adminItemsGrid');
    const emptyState = document.getElementById('adminItemsEmpty');
    if (!grid) return;
    
    // Filter by current category
    const filteredItems = currentAdminCategory === 'all' 
        ? items 
        : items.filter(item => item.category === currentAdminCategory);
    
    if (filteredItems.length === 0) {
        if (emptyState) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            grid.innerHTML = '<p class="text-center text-gray-600 py-8 col-span-full">No items in this category.</p>';
        }
        return;
    }
    
    if (emptyState) {
        grid.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }
    
    grid.innerHTML = filteredItems.map(item => `
        <div class="bg-white/90 rounded-xl shadow-md overflow-hidden border border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer" onclick="showAdminItemModal('${item.id}')">
            <div class="flex items-center gap-4 p-4">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-20 h-20 rounded-lg object-cover border border-green-100 flex-shrink-0">`
                    : `<div class="w-20 h-20 rounded-lg bg-green-50 flex items-center justify-center border border-green-100 flex-shrink-0">
                         <i class="fas fa-box text-green-600 text-3xl"></i>
                       </div>`
                }
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-800 text-base mb-1 truncate">${item.name}</h3>
                    <p class="text-sm text-gray-600 truncate">${item.size || 'N/A'}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <p class="text-xl font-bold text-green-700">₹${item.price}</p>
                        <span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ${item.category || 'Other'}
                        </span>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                    item.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }">
                    ${item.inStock ? 'In Stock' : 'Out'}
                </span>
            </div>
        </div>
    `).join('');
}
function showAdminItemModal(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.id = 'adminItemModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-md w-full">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${item.name}</h3>
                    <p class="text-sm text-gray-500 mb-2">${item.size || 'N/A'}</p>
                    <p class="text-xl font-bold text-green-600 mb-2">₹${item.price}</p>
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        ${item.category || 'Other'}
                    </span>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${
                    item.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }">
                    ${item.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
            </div>
            ${item.image 
                ? `<img src="${item.image}" alt="${item.name}" class="w-full h-48 object-cover rounded-lg border border-green-100 mb-4">`
                : `<div class="w-full h-48 rounded-lg bg-green-50 flex items-center justify-center border border-green-100 mb-4">
                     <i class="fas fa-box text-green-600 text-4xl"></i>
                   </div>`
            }
            <div class="grid grid-cols-2 gap-3">
                <button onclick="closeAdminItemModal(); toggleStock('${item.id}')" class="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium transition-all">
                    <i class="fas fa-toggle-on"></i> Toggle Stock
                </button>
                <button onclick="closeAdminItemModal(); openEditModal('${item.id}')" class="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-all">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="closeAdminItemModal()" class="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all">
                    Close
                </button>
                <button onclick="closeAdminItemModal(); deleteItem('${item.id}')" class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-medium transition-all">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeAdminItemModal();
    };
    
    document.body.appendChild(modal);
}

function closeAdminItemModal() {
    const modal = document.getElementById('adminItemModal');
    if (modal) modal.remove();
}

// Expose to global scope
window.showAdminItemModal = showAdminItemModal;
window.closeAdminItemModal = closeAdminItemModal;

function renderCategoryManagement() {
    const categoryManagement = document.getElementById('categoryManagement');
    if (!categoryManagement) return;
    categoryManagement.innerHTML = `
        <div class="bg-white/90 rounded-2xl shadow-lg p-6 mb-8 border border-green-200">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Manage Categories</h2>
            <div class="flex gap-4 mb-6">
                <input type="text" id="newCategoryName" placeholder="New Category Name" class="flex-1 px-4 py-3 bg-green-50 text-gray-800 placeholder-gray-500 border border-green-200 rounded-xl focus:border-green-500 focus:outline-none">
                <button onclick="addCategory()" class="px-6 py-3 bg-gradient-to-r from-lime-500 to-green-500 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
                    <i class="fas fa-plus"></i> Add Category
                </button>
            </div>
            <div class="space-y-3">
                ${categories.map(category => `
                    <div class="flex items-center gap-3 bg-green-50 p-4 rounded-xl border border-green-200">
                        <input type="text" value="${category.name}" id="category-${category.id}" class="flex-1 px-4 py-2 bg-white text-gray-800 border border-green-200 rounded-lg focus:border-green-500 focus:outline-none">
                        <button onclick="updateCategory('${category.id}')" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button onclick="deleteCategory('${category.id}', '${category.name}')" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-2">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function addCategory() {
    const categoryInput = document.getElementById('newCategoryName');
    if (!categoryInput) {
        console.error('Category input field not found');
        showToast('Error: Category input field not found!');
        return;
    }
    
    const categoryName = categoryInput.value.trim();
    if (!categoryName) {
        showToast('Please enter a category name!');
        return;
    }
    
    // Check for duplicates
    const exists = categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    if (exists) {
        showToast('This category already exists!');
        categoryInput.value = '';
        return;
    }
    
    try {
        const newId = await addCategoryToFirebase(categoryName);
        console.log('Category added successfully:', categoryName, newId);
        showToast('Category added successfully!');

        categoryInput.value = '';
        // Don't manually refresh - let the listener handle it
    } catch (error) {
        showToast('Failed to add category. Please try again.');
        console.error('Add category error:', error);
    }
}

async function updateCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const oldName = category.name;
    const newName = document.getElementById(`category-${categoryId}`).value.trim();
    
    if (!newName) {
        showToast('Category name cannot be empty!');
        return;
    }
    
    if (newName === oldName) {
        showToast('No changes made.');
        return;
    }
    
    // Check if new name already exists
    const exists = categories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === newName.toLowerCase());
    if (exists) {
        showToast('A category with this name already exists!');
        return;
    }
    
    try {
        // Update category name in Firebase
        await updateCategoryInFirebase(categoryId, newName);
        
        // Update all items that use this category
        const itemsToUpdate = items.filter(item => item.category === oldName);
        const updatePromises = itemsToUpdate.map(item => 
            updateItemInFirebase(item.id, { category: newName })
        );
        await Promise.all(updatePromises);
        
        // Reload items to reflect changes
        await loadItemsFromFirebase();
        
        console.log(`Updated category "${oldName}" to "${newName}" and ${itemsToUpdate.length} items`);
        showToast('Category updated successfully!');
    } catch (error) {
        showToast('Failed to update category. Please try again.');
        console.error('Update category error:', error);
    }
}

async function deleteCategory(categoryId, categoryName) {
    // Find items using this category
    const itemsUsingCategory = items.filter(item => item.category === categoryName);
    
    if (itemsUsingCategory.length > 0) {
        const confirmMsg = `This category has ${itemsUsingCategory.length} items.\n\nAll items will be moved to "Other" category.\n\nContinue?`;
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        try {
            // Move all items to "Other" category
            const updatePromises = itemsUsingCategory.map(item => 
                updateItemInFirebase(item.id, { category: 'Other' })
            );
            await Promise.all(updatePromises);
            
            // Delete the category
            await deleteCategoryFromFirebase(categoryId, categoryName);
            
            // Reload data
            await loadItemsFromFirebase();
            await loadCategoriesFromFirebase();
            
            renderCategoryManagement();
            renderAdminItems();
            
            showToast(`Category deleted. ${itemsUsingCategory.length} items moved to "Other"`, 'success', 4000);
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category. Please try again.', 'error');
        }
    } else {
        // No items, safe to delete
        if (confirm(`Delete category "${categoryName}"?`)) {
            try {
                await deleteCategoryFromFirebase(categoryId, categoryName);
                await loadCategoriesFromFirebase();
                renderCategoryManagement();
                showToast('Category deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting category:', error);
                showToast('Failed to delete category', 'error');
            }
        }
    }
}

// Bulk Upload Function with Duplicate Handling
// Replace the bulkUploadItems function in script.js
async function bulkUploadItems() {
    const fileInput = document.getElementById('bulkUpload');
    const file = fileInput.files[0];
    if (!file) {
        showToast('Please select an Excel or CSV file!', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            await loadItemsFromFirebase();
            await loadCategoriesFromFirebase();
            
            let addedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;
            let newCategoriesCount = 0;
            let imagesAddedCount = 0;
            const updates = [];
            const newCategories = new Set();

            // First pass: collect categories
            for (const row of json) {
                if (!row['Item name']) continue;
                const categoryName = row['Category']?.trim() || 'Other';
                
                const categoryExists = categories.some(cat => 
                    cat.name.toLowerCase() === categoryName.toLowerCase()
                );
                
                if (!categoryExists && !newCategories.has(categoryName.toLowerCase())) {
                    newCategories.add(categoryName.toLowerCase());
                }
            }

            // Create new categories
            for (const categoryName of newCategories) {
                const originalName = json.find(row => 
                    row['Category']?.trim().toLowerCase() === categoryName
                )?.['Category']?.trim();
                
                if (originalName) {
                    try {
                        await addCategoryToFirebase(originalName);
                        newCategoriesCount++;
                    } catch (error) {
                        console.error(`Failed to create category ${originalName}:`, error);
                    }
                }
            }

            if (newCategoriesCount > 0) {
                await loadCategoriesFromFirebase();
            }

            // Second pass: process items with images
            for (const row of json) {
                if (!row['Item name']) continue;

                const imageUrl = (row['Image URL'] || row['ImageURL'])?.trim() || null;

                const newItem = {
                    name: row['Item name'].trim(),
                    category: row['Category']?.trim() || 'Other',
                    size: row['Size/Quantity']?.trim() || 'N/A',
                    price: parseFloat(row['Price']) || 0.0,
                    inStock: true,
                    image: imageUrl  // Add image from CSV
                };

                const existingByName = items.find(item => 
                    item.name.toLowerCase() === newItem.name.toLowerCase() && 
                    item.category.toLowerCase() === newItem.category.toLowerCase()
                );

                if (existingByName) {
                    // Check what changed
                    const hasChanges = 
                        existingByName.size !== newItem.size ||
                        existingByName.price !== newItem.price ||
                        existingByName.image !== newItem.image;  // Check image too

                    if (hasChanges) {
                        const itemUpdates = {
                            size: newItem.size,
                            price: newItem.price
                        };
                        
                        // Only update image if new one provided
                        if (imageUrl && imageUrl !== existingByName.image) {
                            itemUpdates.image = imageUrl;
                            imagesAddedCount++;
                        }
                        
                        updates.push({
                            id: existingByName.id,
                            updates: itemUpdates
                        });
                        updatedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    // New item
                    await addItemToFirebase(newItem);
                    addedCount++;
                    if (imageUrl) imagesAddedCount++;
                }
            }

            // Apply all updates
            for (const update of updates) {
                await updateItemInFirebase(update.id, update.updates);
            }

            // Refresh UI
            await loadItemsFromFirebase();
            await loadCategoriesFromFirebase();
            renderAdminItems();
            renderCategoryManagement();
            renderCategoryFilter();

            // Summary
            let summary = [];
            if (newCategoriesCount > 0) summary.push(`${newCategoriesCount} categories`);
            if (addedCount > 0) summary.push(`${addedCount} items added`);
            if (updatedCount > 0) summary.push(`${updatedCount} items updated`);
            if (imagesAddedCount > 0) summary.push(`${imagesAddedCount} images added`);
            if (skippedCount > 0) summary.push(`${skippedCount} skipped`);

            showToast(
                summary.length > 0 ? summary.join(', ') : 'No changes detected',
                addedCount > 0 || updatedCount > 0 || imagesAddedCount > 0 ? 'success' : 'info',
                6000
            );

            fileInput.value = '';

        } catch (error) {
            console.error('Bulk upload error:', error);
            showToast('Upload failed: ' + error.message, 'error');
        }
    };
    
    reader.onerror = () => {
        showToast('Failed to read file', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}
// Expose to global scope (add this to the existing window object assignments)
window.bulkUploadItems = bulkUploadItems;
async function addItem() {
    const name = document.getElementById('newItemName')?.value.trim();
    const size = document.getElementById('newItemSize')?.value.trim();
    const priceInput = document.getElementById('newItemPrice')?.value;
    const price = parseFloat(priceInput);
    const category = document.getElementById('newItemCategory')?.value;
const image = document.getElementById('newItemImage')?.value.trim();    
    console.log('Adding item:', { name, size, price, category, image });
    
    if (!name || isNaN(price) || price <= 0 || !category) {
        showToast('Please fill in all required fields (Name, Price, and Category)!');
        console.error('Validation failed:', { name, price, category });
        return;
    }
    
    const newItem = {
        name,
        size: size || null,
        price,
        category,
        inStock: true,
        image: image || null
    };
    
    try {
        const newId = await addItemToFirebase(newItem);
        console.log('Item added successfully with ID:', newId);
        
        // Clear form
        document.getElementById('newItemName').value = '';
        document.getElementById('newItemSize').value = '';
        document.getElementById('newItemPrice').value = '';
        document.getElementById('newItemCategory').value = '';
        document.getElementById('newItemImage').value = '';
        document.getElementById('newItemImage').value = '';
document.getElementById('newItemImageUrl').value = '';
        // Reload items and refresh UI
        await loadItemsFromFirebase();
        renderAdminItems();
        
        showToast('Item added successfully!');
    } catch (error) {
        showToast('Error adding item. Please try again.');
        console.error('Add item error:', error);
    }
}
async function removeDuplicateItems() {
    // Reload fresh data from Firebase first
    await loadItemsFromFirebase();
    
    const itemMap = new Map();
    const duplicates = [];
    
    items.forEach(item => {
        const key = `${item.name}|${item.category}|${item.size}|${item.price}`;
        
        if (itemMap.has(key)) {
            // This is a duplicate - add to duplicates list
            duplicates.push(item);
        } else {
            // First occurrence - keep it
            itemMap.set(key, item);
        }
    });
    
    if (duplicates.length === 0) {
        showToast('No duplicates found!', 'info');
        return;
    }
    
    const confirmed = confirm(`Found ${duplicates.length} duplicate items.\n\nDelete them all?\n\n(This will keep the first occurrence of each item)`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Show loading toast
        showToast('Deleting duplicates, please wait...', 'info', 10000);
        
        // Delete all duplicates in batch
        const deletePromises = duplicates.map(duplicate => 
            deleteItemFromFirebase(duplicate.id)
        );
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        // Reload items from Firebase
        await loadItemsFromFirebase();
        
        // Refresh all UI components
        renderAdminItems();
        renderAdminCategoryFilter();
        if (document.getElementById('itemsGrid')) {
            renderItemsGrid();
            renderCategoryFilter();
        }
        
        // Update dashboard
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
        showToast(`Successfully deleted ${duplicates.length} duplicate items!`, 'success', 5000);
        
        console.log('✅ Duplicates removed:', duplicates.length);
        console.log('📦 Remaining unique items:', items.length);
        
    } catch (error) {
        console.error('Error removing duplicates:', error);
        showToast('Failed to remove some duplicates. Please try again.', 'error');
    }
}

// Add to global scope
window.removeDuplicateItems = removeDuplicateItems;
async function toggleStock(itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        try {
            await updateItemInFirebase(itemId, { inStock: !item.inStock });
            item.inStock = !item.inStock;
            renderAdminItems();
        } catch (error) {
            showToast('Error toggling stock. Please try again.');
        }
    }
}

function openEditModal(itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        document.getElementById('editItemId').value = itemId;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemSize').value = item.size || '';
        document.getElementById('editItemPrice').value = item.price;
        document.getElementById('editItemCategory').value = item.category || '';
        document.getElementById('editItemImageUrl').value = item.image || '';
        
        // Show existing image preview
        const previewContainer = document.getElementById('editImagePreviewContainer');
        if (item.image && previewContainer) {
            previewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${item.image}" alt="Current image" class="w-32 h-32 object-cover rounded-lg border-2 border-green-300 shadow-md">
                    <div class="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                        Current
                    </div>
                </div>
            `;
        } else if (previewContainer) {
            previewContainer.innerHTML = '<p class="text-sm text-gray-500 italic">No image currently set</p>';
        }
        
        document.getElementById('editModal').classList.remove('hidden');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

async function saveItemEdit() {
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value.trim();
    const size = document.getElementById('editItemSize').value.trim();
    const price = parseFloat(document.getElementById('editItemPrice').value);
    const category = document.getElementById('editItemCategory').value;
const image = document.getElementById('editItemImageUrl').value.trim(); // Get URL from hidden input
if (!name || isNaN(price) || !category) {
        showToast('Please fill in all required fields (Name, Price, and Category)!');
        return;
    }
    const updates = {
        name,
        size: size || null,
        price,
        category,
        image: image || null
    };
    try {
        await updateItemInFirebase(itemId, updates);
        await loadItemsFromFirebase();
        renderAdminItems();
        closeEditModal();
    } catch (error) {
        showToast('Error saving item. Please try again.');
        console.error(error);
    }
}

async function deleteItem(itemId) {
    if (confirm('Delete this item permanently?')) {
        try {
            await deleteItemFromFirebase(itemId);
            items = items.filter(i => i.id !== itemId);
            renderAdminItems();
        } catch (error) {
            showToast('Error deleting item. Please try again.');
        }
    }
}

function renderCategoryOptions(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
    // Apply consistent styling with proper text color
    select.classList.add('px-4', 'py-3', 'rounded-xl', 'focus:outline-none', 'appearance-none');
    
    // Different styling for admin vs edit modal
    if (elementId === 'editItemCategory') {
        select.classList.add('bg-white', 'text-gray-800', 'border-2', 'border-gray-200', 'focus:border-purple-500');
        select.classList.remove('bg-transparent', 'text-white', 'border-white/30', 'focus:border-purple-400');
    } else {
        select.classList.add('bg-white/20', 'text-white', 'border-2', 'border-white/30', 'focus:border-purple-400');
        select.classList.remove('bg-transparent', 'bg-white', 'text-gray-800', 'border-gray-200', 'focus:border-purple-500');
    }
    
    // Style the options for better visibility
    const options = select.querySelectorAll('option');
    options.forEach(opt => {
        opt.style.backgroundColor = '#1a1a2e';
        opt.style.color = 'white';
    });
}

// Orders Management
function filterOrders(status) {
    currentOrderFilter = status;
    renderOrders();
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-purple-500');
        btn.classList.add('bg-white/20');
        if (btn.textContent.toLowerCase() === status) {
            btn.classList.add('active', 'bg-purple-500');
        }
    });
}

function renderOrders() {
    const ordersEmpty = document.getElementById('ordersEmpty');
    const ordersContent = document.getElementById('ordersContent');
    if (!ordersEmpty || !ordersContent) return;

    let filteredOrders = currentOrderFilter === 'all' ? orders : orders.filter(o => o.status === currentOrderFilter);

    if (filteredOrders.length === 0) {
        ordersEmpty.classList.remove('hidden');
        ordersContent.classList.add('hidden');
    } else {
        ordersEmpty.classList.add('hidden');
        ordersContent.classList.remove('hidden');
        // This code generates the cards with the student's name and payment method
        ordersContent.innerHTML = filteredOrders.map(order => `
            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg mb-2 flex items-center gap-2">
    <i class="fas fa-user-circle text-gray-500"></i>
    <span>${order.studentName}</span>
</h3>
<div class="flex items-center text-gray-600 text-sm mb-1 font-medium">
    <i class="fas fa-id-card w-4 text-center mr-2"></i>
    <span>Reg: ${order.regNumber || 'N/A'}</span>
</div>
<div class="flex items-center text-gray-600 text-sm mb-1 font-medium">
    <i class="fas fa-home w-4 text-center mr-2"></i>
    <span>Room ${order.room}</span>
</div>
                        <div class="flex items-center text-gray-500 text-xs mb-1">
                            <i class="fas fa-clock w-4 text-center mr-2"></i>
                            <span>${new Date(order.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="flex items-center text-gray-500 text-xs">
                            <i class="fas ${order.paymentMethod === 'upi' ? 'fa-qrcode' : 'fa-money-bill-wave'} w-4 text-center mr-2"></i>
                            <span>Payment: <span class="font-semibold text-gray-700">${(order.paymentMethod || 'N/A').toUpperCase()}</span></span>
                        </div>
                        ${order.transactionId ? `<div class="flex items-center text-gray-500 text-xs mt-1">
                            <i class="fas fa-receipt w-4 text-center mr-2"></i>
                            <span>TXN: ${order.transactionId}</span>
                        </div>` : ''}
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                        }">
                            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <p class="text-xl font-bold text-purple-600 mt-2">₹${order.total}</p>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-3 space-y-2">
                    ${order.items.map(item => `
                        <div class="flex justify-between items-center text-sm">
                            <p class="text-gray-800">${item.name} (${item.size}) × ${item.qty}</p>
                            <p class="text-gray-600">₹${item.price * item.qty}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="flex gap-3 mt-4 border-t border-gray-200 pt-3">
                    ${order.status === 'pending' ? `<button onclick="markComplete('${order.id}')" 
                        class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 transition-all text-sm font-medium flex items-center justify-center gap-2">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>` : ''}
                    <button onclick="deleteOrder('${order.id}')" 
                        class="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition-all text-sm font-medium flex items-center justify-center gap-2">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

async function markComplete(orderId) {
    try {
        await updateOrderInFirebase(orderId, { status: 'completed' });
        orders.find(o => o.id === orderId).status = 'completed';
        renderOrders();
        showToast('Order marked as completed!');
    } catch (error) {
        showToast('Error updating order status.');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Delete this order permanently?')) return;
    try {
        await deleteOrderFromFirebase(orderId);
        orders = orders.filter(o => o.id !== orderId);
        renderOrders();
        showToast('Order deleted successfully!');
    } catch (error) {
        showToast('Error deleting order. Please try again.');
    }
}
// In script.js (assuming Firebase is initialized as before)
function showItemModal(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('modalItemName').textContent = item.name;
    document.getElementById('modalItemSize').textContent = item.size || 'N/A';
    document.getElementById('modalItemPrice').textContent = `₹${item.price}`;
    document.getElementById('modalItemCategory').textContent = item.category || 'Other';
    
    // FIXED IMAGE DISPLAY
    document.getElementById('modalItemImage').innerHTML = item.image 
        ? `<div class="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-green-100 overflow-hidden">
             <img src="${item.image}" alt="${item.name}" class="max-w-full max-h-full object-contain">
           </div>`
        : `<div class="w-full h-64 rounded-lg bg-green-50 flex items-center justify-center border border-green-100">
             <i class="fas fa-box text-green-600 text-4xl"></i>
           </div>`;
    
    document.getElementById('modalAddToCart').onclick = () => {
        addToCart(itemId);
        closeItemModal();
    };
    
    document.getElementById('itemModal').classList.remove('hidden');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.add('hidden');
}

function searchItems(query) {
    const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(query.toLowerCase()))
    );
    
    // Temporarily set category to show search results
    const originalCategory = currentCategory;
    currentCategory = 'all';
    
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400"><i class="fas fa-search text-6xl mb-4 opacity-30"></i><p class="text-lg">No items match your search</p></div>';
        return;
    }
    
    grid.innerHTML = filtered.map(item => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-xl ${!item.inStock ? 'opacity-60' : ''} cursor-pointer" onclick="showItemModal('${item.id}')">
            <div class="relative h-32 sm:h-40 bg-gradient-to-br from-green-400 to-emerald-400 overflow-hidden">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center">
                         <i class="fas fa-box text-white text-4xl"></i>
                       </div>`
                }
                <div class="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    ${item.category || 'Other'}
                </div>
            </div>
            <div class="p-3 sm:p-4">
                <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-1 line-clamp-2">${item.name}</h3>
                <p class="text-xs text-gray-500 mb-2">${item.size || 'N/A'}</p>
                <div class="flex items-center justify-between">
                    <span class="text-lg sm:text-xl font-bold text-green-600">₹${item.price}</span>
                    <button onclick="event.stopPropagation(); addToCart('${item.id}')" ${!item.inStock ? 'disabled' : ''}
                            class="px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-all flex items-center gap-1 ${
                                item.inStock ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}
// ============================================
// ENHANCED SEARCH & NAVIGATION FUNCTIONS
// Add these to your script.js file
// ============================================

// Global variable to store last viewed item position
let lastScrollPosition = 0;
let lastAddedItemId = null;

// ============================================
// SMART SEARCH FUNCTIONS
// ============================================

/**
 * Live search with fuzzy matching and smart suggestions
 * Matches: "cream onion" → "Cream & Onion", "Sour Cream Onion", etc.
 */
function liveSearchItems(query) {
    const searchInput = document.getElementById('itemSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const suggestionsDiv = document.getElementById('searchSuggestions');
    const suggestionsGrid = document.getElementById('searchSuggestionsGrid');
    
    // Show/hide clear button
    if (query.trim()) {
        clearBtn?.classList.remove('hidden');
    } else {
        clearBtn?.classList.add('hidden');
        suggestionsDiv?.classList.add('hidden');
        renderItemsGrid(); // Show all items
        return;
    }
    
    // Normalize query for better matching
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/);
    
    // Smart search algorithm
    const matches = items.filter(item => {
        const searchText = `${item.name} ${item.category} ${item.size || ''}`.toLowerCase();
        
        // Exact match (highest priority)
        if (searchText.includes(normalizedQuery)) {
            return true;
        }
        
        // All words match (fuzzy)
        const allWordsMatch = queryWords.every(word => searchText.includes(word));
        if (allWordsMatch) {
            return true;
        }
        
        // Partial word matches (for typos)
        const partialMatches = queryWords.filter(word => {
            return searchText.split(' ').some(itemWord => 
                itemWord.startsWith(word) || word.startsWith(itemWord)
            );
        });
        
        return partialMatches.length >= Math.ceil(queryWords.length / 2);
    });
    
    // Show suggestions if matches found
    if (matches.length > 0) {
        showSearchSuggestions(matches, query);
    } else {
        suggestionsDiv.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-search text-4xl mb-2 opacity-30"></i>
                <p class="text-sm">No items found for "${query}"</p>
                <button onclick="clearSearch()" class="text-green-600 hover:text-green-700 text-sm mt-2">Clear search</button>
            </div>
        `;
        suggestionsDiv.classList.remove('hidden');
    }
}

/**
 * Display mini preview cards for search suggestions
 */
function showSearchSuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('searchSuggestions');
    const suggestionsGrid = document.getElementById('searchSuggestionsGrid');
    
    if (!suggestionsDiv || !suggestionsGrid) return;
    
    // Limit to top 10 matches for performance
    const topMatches = matches.slice(0, 10);
    
    suggestionsGrid.innerHTML = topMatches.map(item => `
        <div class="search-suggestion-item bg-white rounded-lg p-2 border border-green-200 shadow-sm" 
             onclick="quickAddItem('${item.id}')">
            <div class="relative h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-md overflow-hidden mb-2">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center">
                         <i class="fas fa-box text-white text-xl"></i>
                       </div>`
                }
                ${!item.inStock ? '<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><span class="text-white text-xs font-bold">Out</span></div>' : ''}
            </div>
            <h4 class="text-xs font-bold text-gray-800 truncate mb-1">${highlightMatch(item.name, query)}</h4>
            <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-green-600">₹${item.price}</span>
                <button onclick="event.stopPropagation(); quickAddItem('${item.id}')" 
                        ${!item.inStock ? 'disabled' : ''}
                        class="text-xs px-2 py-1 rounded ${item.inStock ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    suggestionsDiv.classList.remove('hidden');
}

/**
 * Highlight matching text in search results
 */
function highlightMatch(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.split(/\s+/).join('|')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

/**
 * Quick add item from search suggestions
 */
function quickAddItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.inStock) return;
    
    // Store current scroll position
    lastScrollPosition = window.scrollY;
    lastAddedItemId = itemId;
    
    // Add to cart
    addToCart(itemId);
    
    // Show brief success message
    showQuickAddFeedback(item);
    
    // Update floating cart button
    updateFloatingCartBadge();
}

/**
 * Show brief feedback when item added from search
 */
function showQuickAddFeedback(item) {
    const feedback = document.createElement('div');
    feedback.className = 'fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-c gap-2 animate-fade-in';
    feedback.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="text-sm font-medium">${item.name} added to cart!</span>
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(-20px)';
        feedback.style.transition = 'all 0.3s ease';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

/**
 * Clear search and reset view
 */
function clearSearch() {
    const searchInput = document.getElementById('itemSearch');
    const clearBtn = document.getElementById('clearSearchBtn');
    const suggestionsDiv = document.getElementById('searchSuggestions');
    
    if (searchInput) searchInput.value = '';
    clearBtn?.classList.add('hidden');
    suggestionsDiv?.classList.add('hidden');
    
    // Reset to show all items
    currentCategory = 'all';
    renderItemsGrid();
    renderCategoryFilter();
}

// ============================================
// CART NAVIGATION FUNCTIONS
// ============================================

/**
 * Scroll to cart section smoothly
 */
function scrollToCart() {
    // Store current scroll position
    lastScrollPosition = window.scrollY;
    
    const cartSection = document.getElementById('cartSection');
    if (cartSection) {
        cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Show back button
        const backBtn = document.getElementById('backToItemsBtn');
        if (backBtn) {
            setTimeout(() => backBtn.classList.remove('hidden'), 500);
        }
    }
}

/**
 * Scroll back to last viewed item
 */
function scrollToLastItem() {
    // If there's a last added item, scroll to it and highlight
    if (lastAddedItemId) {
        const itemElement = document.querySelector(`[onclick*="${lastAddedItemId}"]`);
        if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add highlight animation
            itemElement.classList.add('highlight-item');
            setTimeout(() => itemElement.classList.remove('highlight-item'), 2000);
            
            return;
        }
    }
    
    // Otherwise, scroll to last scroll position
    if (lastScrollPosition > 0) {
        window.scrollTo({ top: lastScrollPosition, behavior: 'smooth' });
    } else {
        // Default: scroll to items section
        const itemsSection = document.getElementById('itemsSection');
        if (itemsSection) {
            itemsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Hide back button
    const backBtn = document.getElementById('backToItemsBtn');
    if (backBtn) {
        backBtn.classList.add('hidden');
    }
}

/**
 * Update floating cart badge
 */
function updateFloatingCartBadge() {
    const floatingBtn = document.getElementById('floatingCartBtn');
    const badge = document.getElementById('floatingCartBadge');
    
    if (!floatingBtn || !badge) return;
    
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    
    if (totalItems > 0) {
        floatingBtn.classList.remove('hidden');
        badge.textContent = totalItems;
        
        // Bounce animation
        floatingBtn.style.animation = 'none';
        setTimeout(() => {
            floatingBtn.style.animation = 'bounce 2s infinite';
        }, 10);
    } else {
        floatingBtn.classList.add('hidden');
    }
}

/**
 * Show/hide floating cart based on scroll position
 */
function handleFloatingCartVisibility() {
    const floatingBtn = document.getElementById('floatingCartBtn');
    const cartSection = document.getElementById('cartSection');
    
    if (!floatingBtn || !cartSection) return;
    
    const cartPosition = cartSection.offsetTop;
    const scrollPosition = window.scrollY + window.innerHeight;
    
    // Hide floating button when cart is visible
    if (scrollPosition >= cartPosition) {
        floatingBtn.style.opacity = '0';
        floatingBtn.style.pointerEvents = 'none';
    } else {
        floatingBtn.style.opacity = '1';
        floatingBtn.style.pointerEvents = 'auto';
    }
}

// ============================================
// OVERRIDE EXISTING FUNCTIONS
// ============================================

/**
 * Enhanced addToCart with navigation tracking
 */
const originalAddToCart = window.addToCart;
window.addToCart = function(itemId) {
    // Store last added item
    lastAddedItemId = itemId;
    lastScrollPosition = window.scrollY;
    
    // Call original function
    if (originalAddToCart) {
        originalAddToCart(itemId);
    } else {
        // Fallback if original doesn't exist
        const item = items.find(i => i.id === itemId);
        if (!item || !item.inStock) return;
        const existing = cart.find(i => i.id === itemId);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ ...item, qty: 1 });
        }
        renderCart();
    }
    
    // Update floating cart
    updateFloatingCartBadge();
};

/**
 * Enhanced renderCart with floating button update
 */
const originalRenderCart = window.renderCart;
window.renderCart = function() {
    // Call original function
    if (originalRenderCart) {
        originalRenderCart();
    }
    
    // Update floating cart badge
    updateFloatingCartBadge();
};

// ============================================
// EVENT LISTENERS
// ============================================

// Handle scroll for floating cart visibility
window.addEventListener('scroll', handleFloatingCartVisibility);

// Initialize floating cart on page load
window.addEventListener('DOMContentLoaded', () => {
    updateFloatingCartBadge();
    handleFloatingCartVisibility();
});
// ============================================
// EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE
// ============================================
// This must be at the END of script.js

// Item Modal Functions
window.showItemModal = showItemModal;
window.closeItemModal = closeItemModal;

// Category Functions
window.filterCategory = filterCategory;

// Cart Functions
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.deleteFromCart = deleteFromCart;

// Order Functions
window.placeOrder = placeOrder;
window.togglePaymentMethod = togglePaymentMethod;
window.cancelPayment = cancelPayment;
window.confirmPayment = confirmPayment;

// Admin Item Functions
window.addItem = addItem;
window.toggleStock = toggleStock;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveItemEdit = saveItemEdit;
window.deleteItem = deleteItem;

// Admin Order Functions
window.filterOrders = filterOrders;
window.markComplete = markComplete;
window.deleteOrder = deleteOrder;

// Search & Navigation Functions
window.liveSearchItems = liveSearchItems;
window.clearSearch = clearSearch;
window.quickAddItem = quickAddItem;
window.scrollToCart = scrollToCart;
window.scrollToLastItem = scrollToLastItem;
window.updateFloatingCartBadge = updateFloatingCartBadge;

// Admin Modal Functions
window.showAdminItemModal = showAdminItemModal;
window.closeAdminItemModal = closeAdminItemModal;

// Bulk Upload Functions
window.bulkUploadItems = bulkUploadItems;

// ImgBB Functions
window.saveImgBBApiKey = saveImgBBApiKey;
window.uploadImageToImgBB = uploadImageToImgBB;

// Category Management Functions
window.addCategory = addCategory;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.renderCategoryManagement = renderCategoryManagement;

// Admin Item Management Functions
window.filterAdminItems = filterAdminItems;
window.searchAdminItems = searchAdminItems;
window.renderAdminCategoryFilter = renderAdminCategoryFilter;

// Utility Functions
window.checkDuplicates = checkDuplicates;
window.showToast = showToast;
// UPI ID Functions
window.saveUpiId = saveUpiId;
window.loadUpiId = loadUpiId;
window.getUpiId = getUpiId;