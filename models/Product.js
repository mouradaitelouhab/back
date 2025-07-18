// Modèle Product - Représente les diamants et bijoux sur la plateforme ALMAS & DIMAS
// Gère tous les types de produits : diamants bruts, diamants taillés, bijoux en diamants

const mongoose = require('mongoose');

// Schéma pour les spécifications techniques des diamants (4C + autres)
const diamondSpecsSchema = new mongoose.Schema({
  // Carat (poids du diamant)
  carat: {
    type: Number,
    min: [0.01, 'Le poids en carat doit être supérieur à 0'],
    max: [50, 'Le poids en carat ne peut pas dépasser 50']
  },

  // Couleur (D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z)
  color: {
    type: String,
    enum: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    uppercase: true
  },

  // Pureté (clarté)
  clarity: {
    type: String,
    enum: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'],
    uppercase: true
  },

  // Taille/Coupe
  cut: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Round', 'Princess', 'Emerald', 'Asscher', 'Oval', 'Radiant', 'Cushion', 'Heart', 'Pear', 'Marquise']
  },

  // Forme du diamant
  shape: {
    type: String,
    enum: ['Round', 'Princess', 'Emerald', 'Asscher', 'Oval', 'Radiant', 'Cushion', 'Heart', 'Pear', 'Marquise', 'Baguette']
  },

  // Dimensions (longueur x largeur x hauteur en mm)
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },

  // Profondeur en pourcentage
  depthPercentage: {
    type: Number,
    min: 40,
    max: 80
  },

  // Table en pourcentage
  tablePercentage: {
    type: Number,
    min: 40,
    max: 80
  },

  // Fluorescence
  fluorescence: {
    type: String,
    enum: ['None', 'Faint', 'Medium', 'Strong', 'Very Strong']
  },

  // Symétrie
  symmetry: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor']
  },

  // Polissage
  polish: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor']
  }
}, { _id: false });

// Schéma pour les informations de certification
const certificationSchema = new mongoose.Schema({
  // Organisme de certification (GIA, AGS, SSEF, etc.)
  institute: {
    type: String,
    enum: ['GIA', 'AGS', 'SSEF', 'Gübelin', 'CCIP', 'DSEF', 'EGL', 'IGI', 'GGTL', 'Autre'],
    required: true
  },

  // Numéro de certificat
  certificateNumber: {
    type: String,
    required: true,
    trim: true
  },

  // Date de certification
  certificationDate: {
    type: Date
  },

  // URL ou chemin vers le certificat numérisé
  certificateUrl: {
    type: String
  },

  // Détails supplémentaires de certification
  details: {
    type: String,
    maxlength: 1000
  }
}, { _id: false });

// Schéma principal pour les produits
const productSchema = new mongoose.Schema({
  // Nom du produit
  name: {
    type: String,
    required: [true, 'Le nom du produit est obligatoire'],
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },

  // Description détaillée
  description: {
    type: String,
    required: [true, 'La description est obligatoire'],
    trim: true,
    minlength: [10, 'La description doit contenir au moins 10 caractères'],
    maxlength: [5000, 'La description ne peut pas dépasser 5000 caractères']
  },

  // Prix en MAD (Dirham Marocain)
  price: {
    type: Number,
    required: [true, 'Le prix est obligatoire'],
    min: [0, 'Le prix ne peut pas être négatif']
  },

  // Quantité en stock
  stockQuantity: {
    type: Number,
    required: [true, 'La quantité en stock est obligatoire'],
    min: [0, 'La quantité ne peut pas être négative'],
    default: 1
  },

  // Référence à la catégorie
  categoryID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La catégorie est obligatoire']
  },

  // Référence au vendeur
  sellerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le vendeur est obligatoire']
  },

  // URLs des images du produit
  imageURLs: [{
    type: String,
    required: true
  }],

  // Note moyenne (calculée à partir des avis)
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Nombre total d'avis
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Pourcentage de remise
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Spécifications du diamant (si applicable)
  diamondSpecs: diamondSpecsSchema,

  // Informations de certification
  certification: certificationSchema,

  // Origine géographique
  origin: {
    type: String,
    trim: true,
    maxlength: [100, 'L\'origine ne peut pas dépasser 100 caractères']
  },

  // Qualité générale
  quality: {
    type: String,
    enum: ['Exceptional', 'Excellent', 'Very Good', 'Good', 'Fair'],
    default: 'Good'
  },

  // Type de produit
  productType: {
    type: String,
    enum: ['Raw Diamond', 'Cut Diamond', 'Ring', 'Necklace', 'Earrings', 'Bracelet', 'Pendant', 'Other Jewelry'],
    required: true
  },

  // Métal utilisé (pour les bijoux)
  metal: {
    type: String,
    enum: ['Gold 18K', 'Gold 14K', 'White Gold', 'Rose Gold', 'Platinum', 'Silver', 'Titanium', 'Other']
  },

  // Poids du métal en grammes (pour les bijoux)
  metalWeight: {
    type: Number,
    min: 0
  },

  // Tailles disponibles (pour les bagues principalement)
  availableSizes: [{
    type: String
  }],

  // Statut du produit
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Sold', 'Reserved', 'Under Review'],
    default: 'Active'
  },

  // Produit en vedette
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Produit exclusif/rare
  isExclusive: {
    type: Boolean,
    default: false
  },

  // SKU (Stock Keeping Unit)
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // Poids total du produit en grammes
  weight: {
    type: Number,
    min: 0
  },

  // Dimensions du produit
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },

  // Informations de livraison
  shipping: {
    // Frais de livraison
    cost: {
      type: Number,
      default: 0,
      min: 0
    },
    // Délai de livraison en jours
    estimatedDays: {
      type: Number,
      default: 7,
      min: 1
    },
    // Livraison gratuite
    isFree: {
      type: Boolean,
      default: false
    }
  },

  // Mots-clés pour la recherche
  keywords: [{
    type: String,
    trim: true
  }],

  // Métadonnées SEO
  seo: {
    title: {
      type: String,
      maxlength: 60
    },
    description: {
      type: String,
      maxlength: 160
    },
    keywords: [{
      type: String
    }]
  },

  // Nombre de vues du produit
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Nombre de fois ajouté au panier
  cartAddCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Nombre de fois ajouté aux favoris
  wishlistCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
productSchema.index({ name: 'text', description: 'text', keywords: 'text' });
productSchema.index({ categoryID: 1 });
productSchema.index({ sellerID: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ status: 1 });
productSchema.index({ productType: 1 });
productSchema.index({ 'diamondSpecs.carat': 1 });
productSchema.index({ 'diamondSpecs.color': 1 });
productSchema.index({ 'diamondSpecs.clarity': 1 });
productSchema.index({ 'diamondSpecs.cut': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: -1 });

// Middleware pour générer automatiquement le SKU
productSchema.pre('save', function(next) {
  if (!this.sku && this.isNew) {
    // Générer un SKU unique basé sur le type de produit et un timestamp
    const prefix = this.productType.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${prefix}-${timestamp}`;
  }
  next();
});

// Propriété virtuelle pour le prix avec remise
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Propriété virtuelle pour vérifier si le produit est en stock
productSchema.virtual('inStock').get(function() {
  return this.stockQuantity > 0 && this.status === 'Active';
});

// Propriété virtuelle pour obtenir la première image
productSchema.virtual('primaryImage').get(function() {
  return this.imageURLs && this.imageURLs.length > 0 ? this.imageURLs[0] : null;
});

// Méthode pour calculer la note moyenne à partir des avis
productSchema.methods.calculateRating = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { productID: this._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.rating = Math.round(stats[0].averageRating * 10) / 10; // Arrondir à 1 décimale
    this.reviewCount = stats[0].totalReviews;
  } else {
    this.rating = 0;
    this.reviewCount = 0;
  }

  await this.save();
  return { rating: this.rating, reviewCount: this.reviewCount };
};

// Méthode pour incrémenter le nombre de vues
productSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Méthode pour vérifier si le produit peut être acheté
productSchema.methods.canBePurchased = function() {
  return this.status === 'Active' && this.stockQuantity > 0;
};

// Méthode pour réduire le stock après un achat
productSchema.methods.reduceStock = function(quantity = 1) {
  if (this.stockQuantity >= quantity) {
    this.stockQuantity -= quantity;
    if (this.stockQuantity === 0) {
      this.status = 'Sold';
    }
    return this.save();
  } else {
    throw new Error('Stock insuffisant');
  }
};

// Méthode statique pour rechercher des produits
productSchema.statics.searchProducts = function(searchQuery, filters = {}) {
  const query = { status: 'Active' };

  // Recherche textuelle
  if (searchQuery) {
    query.$text = { $search: searchQuery };
  }

  // Filtres par catégorie
  if (filters.categoryID) {
    query.categoryID = filters.categoryID;
  }

  // Filtres par prix
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }

  // Filtres par spécifications diamant
  if (filters.carat) {
    query['diamondSpecs.carat'] = filters.carat;
  }
  if (filters.color) {
    query['diamondSpecs.color'] = filters.color;
  }
  if (filters.clarity) {
    query['diamondSpecs.clarity'] = filters.clarity;
  }
  if (filters.cut) {
    query['diamondSpecs.cut'] = filters.cut;
  }

  // Filtre par type de produit
  if (filters.productType) {
    query.productType = filters.productType;
  }

  return this.find(query);
};

// Créer et exporter le modèle
const Product = mongoose.model('Product', productSchema);

module.exports = Product;

