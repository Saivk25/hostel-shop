const firebaseConfig = {
  apiKey: "AIzaSyC6IbwGhZE_1OtwcWtsgd8Tc1akgTFdzh8",
  authDomain: "hostel-shop.firebaseapp.com",
  projectId: "hostel-shop",
  storageBucket: "hostel-shop.firebasestorage.app",
  messagingSenderId: "665617995921",
  appId: "1:665617995921:web:6643e43c6ee7f369ba0730",
  measurementId: "G-LCY0XSYWWQ"
};
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle, Clock, User, Home, DollarSign } from 'lucide-react';

// Firebase Config (replace with your actual config)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6IbwGhZE_1OtwcWtsgd8Tc1akgTFdzh8",
  authDomain: "hostel-shop.firebaseapp.com",
  projectId: "hostel-shop",
  storageBucket: "hostel-shop.firebasestorage.app",
  messagingSenderId: "665617995921",
  appId: "1:665617995921:web:6643e43c6ee7f369ba0730"
};

// Mock Firebase functions (since we can't use real Firebase in artifacts)
const mockDB = {
  items: [
    { id: '1', name: 'Maggi Noodles', price: 20, inStock: true },
    { id: '2', name: 'Coca Cola', price: 40, inStock: true },
    { id: '3', name: 'Lays Chips', price: 20, inStock: true },
    { id: '4', name: 'Cadbury Dairy Milk', price: 50, inStock: false },
    { id: '5', name: 'Notebook', price: 30, inStock: true },
    { id: '6', name: 'Pen Set', price: 25, inStock: true }
  ],
  orders: []
};

const HostelShopApp = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState(mockDB.items);
  const [orders, setOrders] = useState(mockDB.orders);
  const [cart, setCart] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [room, setRoom] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Student Page Functions
  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    const item = cart.find(i => i.id === id);
    if (item.qty > 1) {
      setCart(cart.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i));
    } else {
      setCart(cart.filter(i => i.id !== id));
    }
  };

  const deleteFromCart = (id) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const placeOrder = () => {
    if (!studentName.trim() || !room.trim()) {
      alert('Please fill in your name and room number!');
      return;
    }
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const newOrder = {
      id: Date.now().toString(),
      studentName: studentName.trim(),
      room: room.trim(),
      items: cart,
      timestamp: Date.now(),
      status: 'pending',
      total: getTotalPrice()
    };

    mockDB.orders.push(newOrder);
    setOrders([...mockDB.orders]);
    setCart([]);
    setStudentName('');
    setRoom('');
    alert('Order placed successfully! 🎉\nPick up from the shop later.');
  };

  // Admin Page Functions
  const addItem = () => {
    if (!newItemName.trim() || !newItemPrice) {
      alert('Please enter valid name and price!');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      price: parseInt(newItemPrice),
      inStock: true
    };

    mockDB.items.push(newItem);
    setItems([...mockDB.items]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const toggleStock = (id) => {
    const itemIndex = mockDB.items.findIndex(i => i.id === id);
    mockDB.items[itemIndex].inStock = !mockDB.items[itemIndex].inStock;
    setItems([...mockDB.items]);
  };

  const updatePrice = (id) => {
    const newPrice = prompt('Enter new price:');
    if (newPrice && !isNaN(newPrice) && parseInt(newPrice) > 0) {
      const itemIndex = mockDB.items.findIndex(i => i.id === id);
      mockDB.items[itemIndex].price = parseInt(newPrice);
      setItems([...mockDB.items]);
    } else {
      alert('Invalid price!');
    }
  };

  const deleteItem = (id) => {
    if (confirm('Delete this item?')) {
      mockDB.items = mockDB.items.filter(i => i.id !== id);
      setItems([...mockDB.items]);
    }
  };

  const markComplete = (id) => {
    const orderIndex = mockDB.orders.findIndex(o => o.id === id);
    mockDB.orders[orderIndex].status = 'completed';
    setOrders([...mockDB.orders]);
  };

  const deleteOrder = (id) => {
    if (confirm('Delete this order?')) {
      mockDB.orders = mockDB.orders.filter(o => o.id !== id);
      setOrders([...mockDB.orders]);
    }
  };

  // Student View
  const StudentView = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
              <Package className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hostel Shop</h1>
              <p className="text-sm text-gray-500">Order & Pick Up Later</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdmin(true)}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Admin Login
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Items Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                  !item.inStock ? 'opacity-60' : ''
                }`}
              >
                <div className="bg-gradient-to-br from-purple-400 to-pink-400 h-32 flex items-center justify-center">
                  <Package className="text-white" size={48} />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-purple-600">₹{item.price}</span>
                    {!item.inStock && (
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.inStock}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      item.inStock
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={20} />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="text-purple-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
            {cart.length > 0 && (
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-bold">
                {cart.reduce((sum, item) => sum + item.qty, 0)} items
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Your cart is empty</p>
              <p className="text-sm">Add some items to get started!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-purple-600 hover:bg-purple-50 rounded p-1"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold text-gray-800 min-w-[24px] text-center">{item.qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-purple-600 hover:bg-purple-50 rounded p-1"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="font-bold text-gray-800 min-w-[80px] text-right">
                        ₹{item.price * item.qty}
                      </span>
                      <button
                        onClick={() => deleteFromCart(item.id)}
                        className="text-red-500 hover:bg-red-50 rounded p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center text-2xl font-bold text-gray-800">
                  <span>Total:</span>
                  <span className="text-purple-600">₹{getTotalPrice()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Room Number"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={placeOrder}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <CheckCircle size={24} />
                Place Order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Admin View
  const AdminView = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm shadow-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
              <Package className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-gray-300">Manage Shop & Orders</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdmin(false)}
            className="text-sm text-purple-300 hover:text-white font-medium"
          >
            Student View
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Add New Item */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Add New Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item Name"
              className="px-4 py-3 bg-white/20 backdrop-blur text-white placeholder-gray-300 border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              placeholder="Price (₹)"
              className="px-4 py-3 bg-white/20 backdrop-blur text-white placeholder-gray-300 border-2 border-white/30 rounded-xl focus:border-purple-400 focus:outline-none"
            />
            <button
              onClick={addItem}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        {/* Items Management */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Manage Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{item.name}</h3>
                    <p className="text-2xl font-bold text-purple-300">₹{item.price}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.inStock
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {item.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStock(item.id)}
                    className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-all"
                  >
                    Toggle Stock
                  </button>
                  <button
                    onClick={() => updatePrice(item.id)}
                    className="flex-1 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-all"
                  >
                    Update Price
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-3 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders Management */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Orders</h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <Clock size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.sort((a, b) => b.timestamp - a.timestamp).map(order => (
                <div key={order.id} className="bg-white/10 backdrop-blur rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <User size={20} />
                        {order.studentName}
                      </h3>
                      <p className="text-gray-300 text-sm flex items-center gap-2 mt-1">
                        <Home size={16} />
                        Room {order.room}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(order.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${
                          order.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {order.status === 'pending' ? 'Pending' : 'Completed'}
                      </span>
                      <p className="text-2xl font-bold text-purple-300 mt-2">₹{order.total}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <ul className="space-y-2">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-gray-200">
                          <span>{item.name} × {item.qty}</span>
                          <span className="font-semibold">₹{item.price * item.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => markComplete(order.id)}
                        className="flex-1 px-4 py-2 bg-green-500/30 hover:bg-green-500/50 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Mark Complete
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return isAdmin ? <AdminView /> : <StudentView />;
};

export default HostelShopApp;