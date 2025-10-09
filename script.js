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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadItemsFromFirebase(), loadCategoriesFromFirebase()]);
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
        alert("Failed to initialize the app. Please check your connection and refresh.");
    }
});

// Firebase Functions
async function loadItemsFromFirebase() {
    try {
        const itemsSnapshot = await getDocs(collection(db, 'items'));
        items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error loading items:", error);
        throw error;
    }
}

async function loadCategoriesFromFirebase() {
    try {
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(cat => cat.name && cat.name !== 'undefined' && cat.name.trim() !== '');
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
        const itemsUsingCategory = items.filter(item => item.category === categoryName);
        if (itemsUsingCategory.length > 0) {
            throw new Error("Cannot delete category: items are still associated with it.");
        }
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
        alert("Failed to load real-time orders. Please refresh.");
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
                renderCategoryManagement();
                renderCategoryOptions('newItemCategory');
                renderCategoryOptions('editItemCategory');
            }, 100); // 100ms debounce to prevent multiple rapid updates
        }, (error) => {
            console.error("Error in categories listener:", error);
            alert("Failed to load real-time categories. Please refresh.");
        });
    } catch (error) {
        console.error("Error setting up categories listener:", error);
        alert("Failed to load real-time categories. Please refresh.");
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
    grid.innerHTML = filteredItems.length ? filteredItems.map(item => `
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${!item.inStock ? 'opacity-60' : ''}">
            <div class="relative h-48 bg-gradient-to-br from-purple-400 to-pink-400 overflow-hidden">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center">
                         <i class="fas fa-box text-white text-5xl"></i>
                       </div>`
                }
                <div class="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    ${item.category || 'Other'}
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-1">${item.name}</h3>
                <p class="text-sm text-gray-500 mb-3">${item.size || 'N/A'}</p>
                <div class="flex items-center justify-between mb-4">
                    <span class="text-2xl font-bold text-purple-600">₹${item.price}</span>
                    ${!item.inStock ? '<span class="out-of-stock">Out of Stock</span>' : ''}
                </div>
                <button onclick="addToCart('${item.id}')" ${!item.inStock ? 'disabled' : ''}
                        class="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            item.inStock ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }">
                    <i class="fas fa-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-center text-gray-500">No items available.</p>';
}

// Cart Functions
function addToCart(itemId) {
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
    const room = document.getElementById('room')?.value.trim();
    if (!studentName || !room) {
        alert('Please fill in your name and room number!');
        return;
    }
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    pendingOrder = {
        studentName,
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
        const upiString = `upi://pay?pa=hostelshop@upi&pn=HostelShop&am=${pendingOrder.total}&cu=INR&tn=Order${Date.now()}`;
        try {
            new QRCode(qrCodeDiv, { text: upiString, width: 200, height: 200 });
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
        const upiString = `upi://pay?pa=hostelshop@upi&pn=HostelShop&am=${pendingOrder.total}&cu=INR&tn=Order${Date.now()}`;
        try {
            new QRCode(qrCodeDiv, { text: upiString, width: 200, height: 200 });
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
        alert('Please enter the transaction ID for UPI payment!');
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
        document.getElementById('room').value = '';
        document.getElementById('transactionId').value = '';
        document.getElementById('paymentModal').classList.add('hidden');
        renderCart();
        
        // Show success message
        const message = `Order placed successfully! 🎉\n${pendingOrder.paymentMethod === 'cod' ? 'Pay on delivery at the shop.' : 'Your payment is being verified.'}\nPick up from the shop once confirmed.`;
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.innerHTML = message;
            successDiv.classList.remove('hidden');
            setTimeout(() => successDiv.classList.add('hidden'), 5000);
        }
        
        pendingOrder = null;
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order. Please try again.');
    } finally {
        isSubmitting = false;
    }
}

// Admin Page Functions
function renderAdminPage() {
    if (!document.getElementById('adminItemsGrid') || !document.getElementById('ordersContent') || !document.getElementById('categoryManagement')) {
        console.error("Admin page elements missing");
        return;
    }
    renderAdminItems();
    renderOrders();
    renderCategoryManagement();
    renderCategoryOptions('newItemCategory');
    setupCategoriesListener();
}

function renderAdminItems() {
    const grid = document.getElementById('adminItemsGrid');
    if (!grid) return;
    grid.innerHTML = items.map(item => `
        <div class="bg-white/10 backdrop-blur rounded-xl p-4">
            <div class="flex items-start gap-3 mb-3">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover">`
                    : `<div class="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center">
                         <i class="fas fa-box text-white text-2xl"></i>
                       </div>`
                }
                <div class="flex-1">
                    <h3 class="font-bold text-white text-lg">${item.name}</h3>
                    <p class="text-gray-300 text-sm">${item.size || 'N/A'}</p>
                    <p class="text-2xl font-bold text-purple-300 mt-1">₹${item.price}</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded text-xs font-medium bg-purple-500/30 text-purple-200">
                        ${item.category || 'Other'}
                    </span>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${
                    item.inStock ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }">
                    ${item.inStock ? 'In Stock' : 'Out'}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="toggleStock('${item.id}')" class="px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-all">
                    Toggle Stock
                </button>
                <button onclick="openEditModal('${item.id}')" class="px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-all">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteItem('${item.id}')" class="col-span-2 px-3 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-all">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function renderCategoryManagement() {
    const categoryManagement = document.getElementById('categoryManagement');
    if (!categoryManagement) return;
    categoryManagement.innerHTML = `
        <div class="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-8">
            <h2 class="text-2xl font-bold text-white mb-6">Manage Categories</h2>
            <div class="flex gap-4 mb-4">
                <input type="text" id="newCategoryName" placeholder="New Category Name" class="flex-1 px-4 py-3 bg-white/20 backdrop-blur text-white placeholder-gray-300 border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none">
                <button onclick="addCategory()" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2">
                    <i class="fas fa-plus"></i> Add Category
                </button>
            </div>
            <div class="space-y-4">
                ${categories.map(category => `
                    <div class="flex items-center gap-4 bg-white/5 p-4 rounded-lg">
                        <input type="text" value="${category.name}" id="category-${category.id}" class="flex-1 px-4 py-2 bg-white/20 text-white border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none">
                        <button onclick="updateCategory('${category.id}')" class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button onclick="deleteCategory('${category.id}', '${category.name}')" class="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-all">
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
        alert('Error: Category input field not found!');
        return;
    }
    
    const categoryName = categoryInput.value.trim();
    if (!categoryName) {
        alert('Please enter a category name!');
        return;
    }
    
    // Check for duplicates
    const exists = categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    if (exists) {
        alert('This category already exists!');
        categoryInput.value = '';
        return;
    }
    
    try {
        const newId = await addCategoryToFirebase(categoryName);
        console.log('Category added successfully:', categoryName, newId);
        alert('Category added successfully!');

        categoryInput.value = '';
        // Don't manually refresh - let the listener handle it
    } catch (error) {
        alert('Failed to add category. Please try again.');
        console.error('Add category error:', error);
    }
}

async function updateCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const oldName = category.name;
    const newName = document.getElementById(`category-${categoryId}`).value.trim();
    
    if (!newName) {
        alert('Category name cannot be empty!');
        return;
    }
    
    if (newName === oldName) {
        alert('No changes made.');
        return;
    }
    
    // Check if new name already exists
    const exists = categories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === newName.toLowerCase());
    if (exists) {
        alert('A category with this name already exists!');
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
        alert('Category updated successfully!');
    } catch (error) {
        alert('Failed to update category. Please try again.');
        console.error('Update category error:', error);
    }
}

async function deleteCategory(categoryId, categoryName) {
    if (confirm(`Delete category "${categoryName}"?`)) {
        await deleteCategoryFromFirebase(categoryId, categoryName);
        renderCategoryManagement();
    }
}

async function addItem() {
    const name = document.getElementById('newItemName')?.value.trim();
    const size = document.getElementById('newItemSize')?.value.trim();
    const priceInput = document.getElementById('newItemPrice')?.value;
    const price = parseFloat(priceInput);
    const category = document.getElementById('newItemCategory')?.value;
    const image = document.getElementById('newItemImage')?.value.trim();
    
    console.log('Adding item:', { name, size, price, category, image });
    
    if (!name || isNaN(price) || price <= 0 || !category) {
        alert('Please fill in all required fields (Name, Price, and Category)!');
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
        
        // Reload items and refresh UI
        await loadItemsFromFirebase();
        renderAdminItems();
        
        alert('Item added successfully!');
    } catch (error) {
        alert('Error adding item. Please try again.');
        console.error('Add item error:', error);
    }
}

async function toggleStock(itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        try {
            await updateItemInFirebase(itemId, { inStock: !item.inStock });
            item.inStock = !item.inStock;
            renderAdminItems();
        } catch (error) {
            alert('Error toggling stock. Please try again.');
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
        document.getElementById('editItemImage').value = item.image || '';
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
    const image = document.getElementById('editItemImage').value.trim();
    if (!name || isNaN(price) || !category) {
        alert('Please fill in all required fields (Name, Price, and Category)!');
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
        alert('Error saving item. Please try again.');
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
            alert('Error deleting item. Please try again.');
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
        ordersContent.innerHTML = filteredOrders.map(order => `
            <div class="bg-white/10 backdrop-blur rounded-xl p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-white text-lg flex items-center gap-2">
                            <i class="fas fa-user"></i> ${order.studentName}
                        </h3>
                        <p class="text-gray-300 text-sm flex items-center gap-2 mt-1">
                            <i class="fas fa-home"></i> Room ${order.room}
                        </p>
                        <p class="text-gray-400 text-xs mt-1">
                            <i class="fas fa-clock"></i> ${new Date(order.timestamp).toLocaleString()}
                        </p>
                        ${order.transactionId ? `<p class="text-gray-300 text-sm mt-1">
                            <i class="fas fa-receipt"></i> TXN: ${order.transactionId}
                        </p>` : ''}
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-4 py-1 rounded-full text-sm font-bold ${
                            order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'
                        }">
                            ${order.status === 'pending' ? 'Pending' : 'Completed'}
                        </span>
                        <p class="text-2xl font-bold text-purple-300 mt-2">₹${order.total}</p>
                    </div>
                </div>
                <div class="bg-white/5 rounded-lg p-4 mb-4">
                    <ul class="space-y-2">
                        ${order.items.map(item => `
                            <li class="flex justify-between text-gray-200">
                                <span>${item.name} (${item.size}) × ${item.qty}</span>
                                <span class="font-semibold">₹${item.price * item.qty}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="flex gap-2">
                    ${order.status === 'pending' ? `<button onclick="markComplete('${order.id}')" 
                        class="flex-1 px-4 py-2 bg-green-500/30 hover:bg-green-500/50 text-white rounded-lg transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-check-circle"></i> Mark Complete
                    </button>` : ''}
                    <button onclick="deleteOrder('${order.id}')" 
                        class="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-all flex items-center justify-center gap-2">
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
        alert('Order marked as completed!');
    } catch (error) {
        alert('Error updating order status.');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Delete this order permanently?')) return;
    try {
        await deleteOrderFromFirebase(orderId);
        orders = orders.filter(o => o.id !== orderId);
        renderOrders();
        alert('Order deleted successfully!');
    } catch (error) {
        alert('Error deleting order. Please try again.');
    }
}

// Expose functions to global scope
window.filterCategory = filterCategory;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.deleteFromCart = deleteFromCart;
window.placeOrder = placeOrder;
window.togglePaymentMethod = togglePaymentMethod;
window.cancelPayment = cancelPayment;
window.confirmPayment = confirmPayment;
window.addItem = addItem;
window.toggleStock = toggleStock;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveItemEdit = saveItemEdit;
window.deleteItem = deleteItem;
window.filterOrders = filterOrders;
window.markComplete = markComplete;
window.deleteOrder = deleteOrder;