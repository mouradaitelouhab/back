// Modèle ShoppingCart - Gère les paniers d'achat des utilisateurs
// Permet aux utilisateurs d'ajouter des produits avant de passer commande

const mongoose = require('mongoose');

// Schéma pour les articles du panier
const cartItemSchema = new mongoose.Schema({
  // Référence au produit
  productID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  // Quantité souhaitée
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La quantité doit être au moins de 1'],
    max: [10, 'La quantité ne peut pas dépasser 10 par article']
  },

  // Prix unitaire au moment de l'ajout (pour détecter les changements de prix)
  priceAtAdd: {
    type: Number,
    required: true,
    min: [0, 'Le prix ne peut pas être négatif']
  },

  // Date d'ajout au panier
  addedAt: {
    type: Date,
    default: Date.now
  },

  // Taille sélectionnée (pour les bagues principalement)
  selectedSize: {
    type: String,
    trim: true
  },

  // Options personnalisées (gravure, etc.)
  customOptions: {
    engraving: {
      type: String,
      maxlength: [50, 'La gravure ne peut pas dépasser 50 caractères']
    },
    giftWrap: {
      type: Boolean,
      default: false
    },
    giftMessage: {
      type: String,
      maxlength: [200, 'Le message cadeau ne peut pas dépasser 200 caractères']
    }
  }
}, { _id: true });

// Schéma principal pour le panier d'achat
const shoppingCartSchema = new mongoose.Schema({
  // Référence à l'utilisateur propriétaire du panier
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Un seul panier par utilisateur
  },

  // Articles dans le panier
  items: [cartItemSchema],

  // Prix total calculé (sans frais de livraison)
  totalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Le prix total ne peut pas être négatif']
  },

  // Nombre total d'articles
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre d\'articles ne peut pas être négatif']
  },

  // Code promo appliqué
  promoCode: {
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    discount: {
      type: Number,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      min: 0
    }
  },

  // Devise utilisée
  currency: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'GBP']
  },

  // Date d'expiration du panier (pour nettoyer les paniers abandonnés)
  expiresAt: {
    type: Date,
    default: function() {
      // Le panier expire après 30 jours d'inactivité
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },

  // Statut du panier
  status: {
    type: String,
    enum: ['Active', 'Abandoned', 'Converted', 'Expired'],
    default: 'Active'
  },

  // Informations de session (pour les utilisateurs non connectés)
  sessionId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
shoppingCartSchema.index({ userID: 1 });
shoppingCartSchema.index({ sessionId: 1 });
shoppingCartSchema.index({ status: 1 });
shoppingCartSchema.index({ expiresAt: 1 });

// Index TTL pour supprimer automatiquement les paniers expirés
shoppingCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Middleware pour calculer automatiquement les totaux avant la sauvegarde
shoppingCartSchema.pre('save', async function(next) {
  try {
    // Recalculer les totaux
    await this.calculateTotals();
    
    // Mettre à jour la date d'expiration si le panier est modifié
    if (this.isModified('items') && this.items.length > 0) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      this.status = 'Active';
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour ajouter un article au panier
shoppingCartSchema.methods.addItem = async function(productId, quantity = 1, selectedSize = null, customOptions = {}) {
  try {
    // Vérifier si le produit existe et est disponible
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Produit non trouvé');
    }
    
    if (!product.canBePurchased()) {
      throw new Error('Ce produit n\'est pas disponible à l\'achat');
    }
    
    if (product.stockQuantity < quantity) {
      throw new Error(`Stock insuffisant. Seulement ${product.stockQuantity} article(s) disponible(s)`);
    }

    // Vérifier si l'article existe déjà dans le panier
    const existingItemIndex = this.items.findIndex(item => 
      item.productID.toString() === productId.toString() && 
      item.selectedSize === selectedSize
    );

    if (existingItemIndex > -1) {
      // Mettre à jour la quantité de l'article existant
      const newQuantity = this.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stockQuantity) {
        throw new Error(`Quantité totale demandée (${newQuantity}) dépasse le stock disponible (${product.stockQuantity})`);
      }
      
      this.items[existingItemIndex].quantity = newQuantity;
      this.items[existingItemIndex].addedAt = new Date();
    } else {
      // Ajouter un nouvel article
      this.items.push({
        productID: productId,
        quantity: quantity,
        priceAtAdd: product.discountedPrice,
        selectedSize: selectedSize,
        customOptions: customOptions,
        addedAt: new Date()
      });
    }

    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Méthode pour supprimer un article du panier
shoppingCartSchema.methods.removeItem = async function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  await this.save();
  return this;
};

// Méthode pour mettre à jour la quantité d'un article
shoppingCartSchema.methods.updateItemQuantity = async function(itemId, newQuantity) {
  const item = this.items.id(itemId);
  
  if (!item) {
    throw new Error('Article non trouvé dans le panier');
  }

  if (newQuantity <= 0) {
    return this.removeItem(itemId);
  }

  // Vérifier le stock disponible
  const Product = mongoose.model('Product');
  const product = await Product.findById(item.productID);
  
  if (!product) {
    throw new Error('Produit non trouvé');
  }
  
  if (product.stockQuantity < newQuantity) {
    throw new Error(`Stock insuffisant. Seulement ${product.stockQuantity} article(s) disponible(s)`);
  }

  item.quantity = newQuantity;
  await this.save();
  return this;
};

// Méthode pour vider complètement le panier
shoppingCartSchema.methods.clearCart = async function() {
  this.items = [];
  this.promoCode = {};
  await this.save();
  return this;
};

// Méthode pour calculer les totaux
shoppingCartSchema.methods.calculateTotals = async function() {
  if (this.items.length === 0) {
    this.totalPrice = 0;
    this.totalItems = 0;
    return;
  }

  // Peupler les informations des produits pour obtenir les prix actuels
  await this.populate('items.productID');

  let totalPrice = 0;
  let totalItems = 0;

  for (const item of this.items) {
    if (item.productID) {
      // Utiliser le prix actuel du produit (avec remise)
      const currentPrice = item.productID.discountedPrice;
      totalPrice += currentPrice * item.quantity;
      totalItems += item.quantity;
    }
  }

  // Appliquer le code promo si présent
  if (this.promoCode && this.promoCode.discount > 0) {
    const discountAmount = (totalPrice * this.promoCode.discount) / 100;
    this.promoCode.discountAmount = discountAmount;
    totalPrice -= discountAmount;
  }

  this.totalPrice = Math.round(totalPrice * 100) / 100; // Arrondir à 2 décimales
  this.totalItems = totalItems;
};

// Méthode pour appliquer un code promo
shoppingCartSchema.methods.applyPromoCode = async function(promoCode, discountPercentage) {
  this.promoCode = {
    code: promoCode.toUpperCase(),
    discount: discountPercentage
  };
  
  await this.calculateTotals();
  await this.save();
  return this;
};

// Méthode pour supprimer le code promo
shoppingCartSchema.methods.removePromoCode = async function() {
  this.promoCode = {};
  await this.calculateTotals();
  await this.save();
  return this;
};

// Méthode pour vérifier la disponibilité de tous les articles
shoppingCartSchema.methods.validateAvailability = async function() {
  const unavailableItems = [];
  
  await this.populate('items.productID');
  
  for (const item of this.items) {
    if (!item.productID) {
      unavailableItems.push({
        itemId: item._id,
        reason: 'Produit non trouvé'
      });
      continue;
    }
    
    if (!item.productID.canBePurchased()) {
      unavailableItems.push({
        itemId: item._id,
        productName: item.productID.name,
        reason: 'Produit non disponible'
      });
      continue;
    }
    
    if (item.productID.stockQuantity < item.quantity) {
      unavailableItems.push({
        itemId: item._id,
        productName: item.productID.name,
        requestedQuantity: item.quantity,
        availableQuantity: item.productID.stockQuantity,
        reason: 'Stock insuffisant'
      });
    }
  }
  
  return unavailableItems;
};

// Méthode pour convertir le panier en commande
shoppingCartSchema.methods.convertToOrder = async function(shippingAddress, billingAddress, paymentMethod) {
  // Valider la disponibilité avant conversion
  const unavailableItems = await this.validateAvailability();
  if (unavailableItems.length > 0) {
    throw new Error('Certains articles ne sont plus disponibles');
  }

  const Order = mongoose.model('Order');
  
  // Grouper les articles par vendeur (pour créer une commande par vendeur)
  const itemsBySeller = {};
  
  await this.populate('items.productID');
  
  for (const item of this.items) {
    const sellerId = item.productID.sellerID.toString();
    if (!itemsBySeller[sellerId]) {
      itemsBySeller[sellerId] = [];
    }
    itemsBySeller[sellerId].push(item);
  }

  const orders = [];

  // Créer une commande pour chaque vendeur
  for (const [sellerId, items] of Object.entries(itemsBySeller)) {
    const orderItems = items.map(item => ({
      productID: item.productID._id,
      quantity: item.quantity,
      priceAtOrder: item.productID.price,
      discountAtOrder: item.productID.discount || 0,
      finalPrice: item.productID.discountedPrice
    }));

    const totalAmount = orderItems.reduce((sum, item) => 
      sum + (item.finalPrice * item.quantity), 0
    );

    const order = new Order({
      userID: this.userID,
      sellerID: sellerId,
      items: orderItems,
      totalAmount: totalAmount,
      shippingCost: 0, // À calculer selon la méthode de livraison
      taxAmount: 0, // À calculer selon les règles fiscales
      finalAmount: totalAmount,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      currency: this.currency
    });

    await order.save();
    orders.push(order);
  }

  // Marquer le panier comme converti et le vider
  this.status = 'Converted';
  await this.clearCart();

  return orders;
};

// Méthode statique pour nettoyer les paniers abandonnés
shoppingCartSchema.statics.cleanupAbandonedCarts = async function() {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours
  
  const result = await this.updateMany(
    { 
      updatedAt: { $lt: cutoffDate },
      status: 'Active'
    },
    { 
      status: 'Abandoned'
    }
  );

  return result;
};

// Créer et exporter le modèle
const ShoppingCart = mongoose.model('ShoppingCart', shoppingCartSchema);

module.exports = ShoppingCart;

