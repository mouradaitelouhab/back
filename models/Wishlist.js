// Modèle Wishlist - Gère les listes de souhaits des utilisateurs
// Permet aux utilisateurs de sauvegarder leurs produits favoris

const mongoose = require('mongoose');

// Schéma pour les articles de la liste de souhaits
const wishlistItemSchema = new mongoose.Schema({
  // Référence au produit
  productID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  // Date d'ajout à la liste de souhaits
  addedAt: {
    type: Date,
    default: Date.now
  },

  // Note personnelle de l'utilisateur sur ce produit
  personalNote: {
    type: String,
    maxlength: [500, 'La note personnelle ne peut pas dépasser 500 caractères'],
    trim: true
  },

  // Priorité (1 = haute, 2 = moyenne, 3 = basse)
  priority: {
    type: Number,
    enum: [1, 2, 3],
    default: 2
  },

  // Prix au moment de l'ajout (pour suivre les variations)
  priceAtAdd: {
    type: Number,
    required: true,
    min: 0
  },

  // Indicateur si l'utilisateur souhaite être notifié des changements de prix
  priceAlertEnabled: {
    type: Boolean,
    default: false
  },

  // Prix cible pour l'alerte
  targetPrice: {
    type: Number,
    min: 0
  },

  // Indicateur si l'utilisateur souhaite être notifié quand le produit est de nouveau en stock
  stockAlertEnabled: {
    type: Boolean,
    default: false
  }
}, { _id: true });

// Schéma principal pour la liste de souhaits
const wishlistSchema = new mongoose.Schema({
  // Référence à l'utilisateur propriétaire de la liste
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Une seule liste de souhaits par utilisateur
  },

  // Nom de la liste de souhaits (par défaut "Ma liste de souhaits")
  name: {
    type: String,
    default: 'Ma liste de souhaits',
    trim: true,
    maxlength: [100, 'Le nom de la liste ne peut pas dépasser 100 caractères']
  },

  // Description de la liste
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },

  // Articles dans la liste de souhaits
  items: [wishlistItemSchema],

  // Indicateur si la liste est publique (partageable)
  isPublic: {
    type: Boolean,
    default: false
  },

  // Token de partage pour les listes publiques
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },

  // Statistiques de la liste
  stats: {
    totalItems: {
      type: Number,
      default: 0,
      min: 0
    },
    totalValue: {
      type: Number,
      default: 0,
      min: 0
    },
    averagePrice: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Paramètres de notification
  notifications: {
    priceDrops: {
      type: Boolean,
      default: true
    },
    backInStock: {
      type: Boolean,
      default: true
    },
    newSimilarProducts: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
wishlistSchema.index({ userID: 1 });
wishlistSchema.index({ shareToken: 1 });
wishlistSchema.index({ isPublic: 1 });
wishlistSchema.index({ 'items.productID': 1 });
wishlistSchema.index({ 'items.addedAt': -1 });

// Middleware pour calculer automatiquement les statistiques avant la sauvegarde
wishlistSchema.pre('save', async function(next) {
  try {
    await this.calculateStats();
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pour générer un token de partage si la liste devient publique
wishlistSchema.pre('save', function(next) {
  if (this.isModified('isPublic') && this.isPublic && !this.shareToken) {
    this.shareToken = this.generateShareToken();
  }
  next();
});

// Méthode pour générer un token de partage unique
wishlistSchema.methods.generateShareToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
};

// Méthode pour ajouter un produit à la liste de souhaits
wishlistSchema.methods.addItem = async function(productId, personalNote = '', priority = 2) {
  try {
    // Vérifier si le produit existe
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Produit non trouvé');
    }

    // Vérifier si le produit n'est pas déjà dans la liste
    const existingItem = this.items.find(item => 
      item.productID.toString() === productId.toString()
    );

    if (existingItem) {
      throw new Error('Ce produit est déjà dans votre liste de souhaits');
    }

    // Ajouter le nouvel article
    this.items.push({
      productID: productId,
      personalNote: personalNote,
      priority: priority,
      priceAtAdd: product.discountedPrice,
      addedAt: new Date()
    });

    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Méthode pour supprimer un produit de la liste de souhaits
wishlistSchema.methods.removeItem = async function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  await this.save();
  return this;
};

// Méthode pour supprimer un produit par son ID
wishlistSchema.methods.removeItemByProductId = async function(productId) {
  this.items = this.items.filter(item => item.productID.toString() !== productId.toString());
  await this.save();
  return this;
};

// Méthode pour mettre à jour un article de la liste
wishlistSchema.methods.updateItem = async function(itemId, updates) {
  const item = this.items.id(itemId);
  
  if (!item) {
    throw new Error('Article non trouvé dans la liste de souhaits');
  }

  // Champs modifiables
  const updatableFields = ['personalNote', 'priority', 'priceAlertEnabled', 'targetPrice', 'stockAlertEnabled'];
  
  updatableFields.forEach(field => {
    if (updates[field] !== undefined) {
      item[field] = updates[field];
    }
  });

  await this.save();
  return this;
};

// Méthode pour vider complètement la liste de souhaits
wishlistSchema.methods.clearWishlist = async function() {
  this.items = [];
  await this.save();
  return this;
};

// Méthode pour calculer les statistiques de la liste
wishlistSchema.methods.calculateStats = async function() {
  if (this.items.length === 0) {
    this.stats = {
      totalItems: 0,
      totalValue: 0,
      averagePrice: 0
    };
    return;
  }

  // Peupler les informations des produits pour obtenir les prix actuels
  await this.populate('items.productID');

  let totalValue = 0;
  let validItems = 0;

  for (const item of this.items) {
    if (item.productID && item.productID.price) {
      totalValue += item.productID.discountedPrice;
      validItems++;
    }
  }

  this.stats = {
    totalItems: this.items.length,
    totalValue: Math.round(totalValue * 100) / 100,
    averagePrice: validItems > 0 ? Math.round((totalValue / validItems) * 100) / 100 : 0
  };
};

// Méthode pour obtenir les articles triés par priorité
wishlistSchema.methods.getItemsByPriority = function() {
  return this.items.sort((a, b) => a.priority - b.priority);
};

// Méthode pour obtenir les articles récemment ajoutés
wishlistSchema.methods.getRecentItems = function(limit = 5) {
  return this.items
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, limit);
};

// Méthode pour déplacer tous les articles vers le panier
wishlistSchema.methods.moveAllToCart = async function() {
  const ShoppingCart = mongoose.model('ShoppingCart');
  
  // Obtenir ou créer le panier de l'utilisateur
  let cart = await ShoppingCart.findOne({ userID: this.userID });
  if (!cart) {
    cart = new ShoppingCart({ userID: this.userID });
  }

  const addedItems = [];
  const failedItems = [];

  // Essayer d'ajouter chaque article au panier
  for (const item of this.items) {
    try {
      await cart.addItem(item.productID, 1);
      addedItems.push(item);
    } catch (error) {
      failedItems.push({
        item: item,
        error: error.message
      });
    }
  }

  // Supprimer les articles ajoutés avec succès de la liste de souhaits
  for (const addedItem of addedItems) {
    await this.removeItem(addedItem._id);
  }

  return {
    addedCount: addedItems.length,
    failedCount: failedItems.length,
    failedItems: failedItems
  };
};

// Méthode pour vérifier les changements de prix
wishlistSchema.methods.checkPriceChanges = async function() {
  await this.populate('items.productID');
  
  const priceChanges = [];

  for (const item of this.items) {
    if (item.productID) {
      const currentPrice = item.productID.discountedPrice;
      const originalPrice = item.priceAtAdd;
      
      if (currentPrice !== originalPrice) {
        const changePercentage = ((currentPrice - originalPrice) / originalPrice) * 100;
        
        priceChanges.push({
          itemId: item._id,
          productName: item.productID.name,
          originalPrice: originalPrice,
          currentPrice: currentPrice,
          changeAmount: currentPrice - originalPrice,
          changePercentage: Math.round(changePercentage * 100) / 100,
          isPriceDrop: currentPrice < originalPrice,
          shouldAlert: item.priceAlertEnabled && 
                      item.targetPrice && 
                      currentPrice <= item.targetPrice
        });
      }
    }
  }

  return priceChanges;
};

// Méthode pour vérifier les produits de nouveau en stock
wishlistSchema.methods.checkStockChanges = async function() {
  await this.populate('items.productID');
  
  const stockChanges = [];

  for (const item of this.items) {
    if (item.productID && 
        item.stockAlertEnabled && 
        item.productID.stockQuantity > 0 && 
        item.productID.status === 'Active') {
      
      stockChanges.push({
        itemId: item._id,
        productName: item.productID.name,
        stockQuantity: item.productID.stockQuantity
      });
    }
  }

  return stockChanges;
};

// Méthode statique pour obtenir les listes publiques
wishlistSchema.statics.getPublicWishlists = function(limit = 10) {
  return this.find({ isPublic: true })
    .populate('userID', 'username')
    .populate('items.productID', 'name price imageURLs')
    .sort({ updatedAt: -1 })
    .limit(limit);
};

// Méthode statique pour trouver une liste par token de partage
wishlistSchema.statics.findByShareToken = function(token) {
  return this.findOne({ shareToken: token, isPublic: true })
    .populate('userID', 'username')
    .populate('items.productID');
};

// Propriété virtuelle pour vérifier si la liste est vide
wishlistSchema.virtual('isEmpty').get(function() {
  return this.items.length === 0;
});

// Propriété virtuelle pour obtenir le nombre d'articles
wishlistSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

// Créer et exporter le modèle
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;

