// Modèle Category - Gère les catégories de produits pour Gems Revived
// Permet une organisation hiérarchique des diamants et bijoux

const mongoose = require('mongoose');

// Schéma pour les catégories de produits
const categorySchema = new mongoose.Schema({
  // Nom de la catégorie (ex: "Bagues", "Colliers", "Diamants bruts")
  categoryName: {
    type: String,
    required: [true, 'Le nom de la catégorie est obligatoire'],
    unique: true,
    trim: true,
    minlength: [2, 'Le nom de la catégorie doit contenir au moins 2 caractères'],
    maxlength: [50, 'Le nom de la catégorie ne peut pas dépasser 50 caractères']
  },

  // Description détaillée de la catégorie
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },

  // Référence vers la catégorie parent (pour créer une hiérarchie)
  parentCategoryID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },

  // Slug pour les URLs (généré automatiquement à partir du nom)
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },

  // Image représentative de la catégorie
  image: {
    type: String,
    default: null
  },

  // Ordre d'affichage (pour trier les catégories)
  displayOrder: {
    type: Number,
    default: 0
  },

  // Indicateur si la catégorie est active
  isActive: {
    type: Boolean,
    default: true
  },

  // Métadonnées SEO
  seoTitle: {
    type: String,
    maxlength: [60, 'Le titre SEO ne peut pas dépasser 60 caractères']
  },

  seoDescription: {
    type: String,
    maxlength: [160, 'La description SEO ne peut pas dépasser 160 caractères']
  },

  // Mots-clés associés à la catégorie
  keywords: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
categorySchema.index({ categoryName: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategoryID: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

// Middleware pour générer automatiquement le slug avant la sauvegarde
categorySchema.pre('save', function(next) {
  if (this.isModified('categoryName')) {
    // Créer un slug à partir du nom de la catégorie
    this.slug = this.categoryName
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Propriété virtuelle pour obtenir les sous-catégories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategoryID'
});

// Propriété virtuelle pour obtenir les produits de cette catégorie
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoryID'
});

// Méthode pour vérifier si c'est une catégorie racine
categorySchema.methods.isRootCategory = function() {
  return !this.parentCategoryID;
};

// Méthode pour obtenir le chemin complet de la catégorie
categorySchema.methods.getFullPath = async function() {
  let path = [this.categoryName];
  let current = this;

  // Remonter la hiérarchie jusqu'à la racine
  while (current.parentCategoryID) {
    current = await this.constructor.findById(current.parentCategoryID);
    if (current) {
      path.unshift(current.categoryName);
    } else {
      break;
    }
  }

  return path.join(' > ');
};

// Méthode statique pour obtenir toutes les catégories racines
categorySchema.statics.getRootCategories = function() {
  return this.find({ parentCategoryID: null, isActive: true })
    .sort({ displayOrder: 1, categoryName: 1 });
};

// Méthode statique pour obtenir l'arbre complet des catégories
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ displayOrder: 1, categoryName: 1 });

  // Organiser en arbre hiérarchique
  const categoryMap = {};
  const tree = [];

  // Créer une map de toutes les catégories
  categories.forEach(category => {
    categoryMap[category._id] = {
      ...category.toObject(),
      children: []
    };
  });

  // Construire l'arbre
  categories.forEach(category => {
    if (category.parentCategoryID) {
      // C'est une sous-catégorie
      const parent = categoryMap[category.parentCategoryID];
      if (parent) {
        parent.children.push(categoryMap[category._id]);
      }
    } else {
      // C'est une catégorie racine
      tree.push(categoryMap[category._id]);
    }
  });

  return tree;
};

// Méthode pour compter les produits dans cette catégorie
categorySchema.methods.getProductCount = async function() {
  const Product = mongoose.model('Product');
  return await Product.countDocuments({ 
    categoryID: this._id,
    // On pourrait ajouter d'autres filtres comme isActive: true
  });
};

// Middleware pour empêcher la suppression d'une catégorie qui a des produits
categorySchema.pre('remove', async function(next) {
  try {
    const productCount = await this.getProductCount();
    if (productCount > 0) {
      const error = new Error(`Impossible de supprimer la catégorie "${this.categoryName}" car elle contient ${productCount} produit(s)`);
      error.name = 'CategoryHasProductsError';
      return next(error);
    }

    // Vérifier s'il y a des sous-catégories
    const subcategoryCount = await this.constructor.countDocuments({ parentCategoryID: this._id });
    if (subcategoryCount > 0) {
      const error = new Error(`Impossible de supprimer la catégorie "${this.categoryName}" car elle contient ${subcategoryCount} sous-catégorie(s)`);
      error.name = 'CategoryHasSubcategoriesError';
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Créer et exporter le modèle
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

