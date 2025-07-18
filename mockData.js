const mockUsers = [
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d4',
    username: 'adminUser',
    email: 'admin@example.com',
    role: 'Admin',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d5',
    username: 'sellerUser',
    email: 'seller@example.com',
    role: 'Seller',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d6',
    username: 'clientUser',
    email: 'client@example.com',
    role: 'Buyer',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockProducts = [
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d7',
    name: 'Bague Solitaire Éternité',
    price: 85000,
    category: 'rings',
    sellerID: '65f9a7b3b3e9c7d8a1b2c3d5',
    stockQuantity: 3,
    status: 'Active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d8',
    name: 'Collier Rivière de Diamants',
    price: 158000,
    category: 'necklaces',
    sellerID: '65f9a7b3b3e9c7d8a1b2c3d5',
    stockQuantity: 2,
    status: 'Active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockOrders = [
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3d9',
    orderNumber: 'ORD001',
    userID: '65f9a7b3b3e9c7d8a1b2c3d6',
    sellerID: '65f9a7b3b3e9c7d8a1b2c3d5',
    items: [
      { productID: '65f9a7b3b3e9c7d8a1b2c3d7', quantity: 1, finalPrice: 85000 }
    ],
    finalAmount: 85000,
    orderStatus: 'Delivered',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockReviews = [
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3da',
    productID: '65f9a7b3b3e9c7d8a1b2c3d7',
    userID: '65f9a7b3b3e9c7d8a1b2c3d6',
    rating: 5,
    comment: 'Magnifique bague, je suis très satisfait!',
    status: 'Approved',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockCategories = [
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3db',
    categoryName: 'rings',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '65f9a7b3b3e9c7d8a1b2c3dc',
    categoryName: 'necklaces',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

module.exports = {
  mockUsers,
  mockProducts,
  mockOrders,
  mockReviews,
  mockCategories
};

