// Script to populate database with mock data for development
// This creates sample products, users, and categories for testing

const mockProducts = [
  {
    id: 1,
    name: 'Bracelet Tennis Diamants',
    description: 'Bracelet tennis composé de 38 diamants ronds taille brillant de qualité exceptionnelle, monté sur or blanc.',
    price: 124000,
    originalPrice: 155000,
    category: 'bracelets',
    images: ['/api/images/bracelet1.jpg', '/api/images/bracelet2.jpg'],
    rating: 4.9,
    reviewCount: 156,
    stockQuantity: 4,
    specifications: {
      metal: 'Or blanc 18 carats',
      gemstone: 'Diamants naturels',
      color: 'F-G',
      cut: 'Brillant',
      length: '18 cm'
    },
    status: 'Active'
  },
  {
    id: 2,
    name: 'Boucles d\'Oreilles Puces Diamant',
    description: 'Paire de puces d\'oreilles en or jaune 18 carats, chacune sertie d\'un diamant rond de 0.5 carat.',
    price: 32000,
    originalPrice: 36000,
    category: 'earrings',
    images: ['/api/images/earrings1.jpg', '/api/images/earrings2.jpg'],
    rating: 4.8,
    reviewCount: 203,
    stockQuantity: 8,
    specifications: {
      metal: 'Or jaune 18 carats',
      gemstone: 'Diamants naturels',
      color: 'G-H',
      cut: 'Brillant',
      caratWeight: '1.0 ct total'
    },
    status: 'Active'
  },
  {
    id: 3,
    name: 'Collier Chaîne Or',
    description: 'Collier chaîne en or jaune 18 carats, maille forçat, longueur 45 cm.',
    price: 18500,
    originalPrice: 22000,
    category: 'necklaces',
    images: ['/api/images/necklace1.jpg', '/api/images/necklace2.jpg'],
    rating: 4.7,
    reviewCount: 89,
    stockQuantity: 12,
    specifications: {
      metal: 'Or jaune 18 carats',
      length: '45 cm',
      weight: '15.2g',
      clasp: 'Mousqueton'
    },
    status: 'Active'
  },
  {
    id: 4,
    name: 'Bague Solitaire Diamant',
    description: 'Bague solitaire en platine sertie d\'un diamant rond de 2 carats, taille brillant.',
    price: 285000,
    originalPrice: 320000,
    category: 'rings',
    images: ['/api/images/ring1.jpg', '/api/images/ring2.jpg'],
    rating: 5.0,
    reviewCount: 45,
    stockQuantity: 2,
    specifications: {
      metal: 'Platine 950',
      gemstone: 'Diamant naturel',
      caratWeight: '2.0 ct',
      color: 'D',
      clarity: 'VVS1',
      cut: 'Brillant'
    },
    status: 'Active'
  },
  {
    id: 5,
    name: 'Montre Diamants Luxe',
    description: 'Montre de luxe avec cadran serti de diamants, bracelet en or blanc.',
    price: 450000,
    originalPrice: 500000,
    category: 'watches',
    images: ['/api/images/watch1.jpg', '/api/images/watch2.jpg'],
    rating: 4.9,
    reviewCount: 23,
    stockQuantity: 1,
    specifications: {
      metal: 'Or blanc 18 carats',
      movement: 'Automatique',
      waterResistance: '50m',
      gemstone: 'Diamants naturels'
    },
    status: 'Active'
  }
];

const mockCategories = [
  { id: 1, name: 'rings', displayName: 'Bagues', description: 'Bagues de fiançailles et alliances' },
  { id: 2, name: 'necklaces', displayName: 'Colliers', description: 'Colliers et pendentifs' },
  { id: 3, name: 'earrings', displayName: 'Boucles d\'oreilles', description: 'Boucles d\'oreilles et puces' },
  { id: 4, name: 'bracelets', displayName: 'Bracelets', description: 'Bracelets et gourmettes' },
  { id: 5, name: 'watches', displayName: 'Montres', description: 'Montres de luxe' }
];

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@almasdimas.com',
    role: 'Admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    id: 2,
    username: 'testuser',
    email: 'test@example.com',
    role: 'Buyer',
    firstName: 'Test',
    lastName: 'User'
  }
];

// Simple in-memory storage for development
let products = [...mockProducts];
let categories = [...mockCategories];
let users = [...mockUsers];
let cart = [];
let orders = [];

// Export functions to access data
const getAllProducts = () => products;
const getProductById = (id) => products.find(p => p.id == id);
const getCategories = () => categories;
const getUsers = () => users;
const getCart = () => cart;
const addToCart = (item) => cart.push(item);
const clearCart = () => cart = [];
const getOrders = () => orders;
const addOrder = (order) => orders.push(order);

module.exports = {
  getAllProducts,
  getProductById,
  getCategories,
  getUsers,
  getCart,
  addToCart,
  clearCart,
  getOrders,
  addOrder,
  mockProducts,
  mockCategories,
  mockUsers
};

