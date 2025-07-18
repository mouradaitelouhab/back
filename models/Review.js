// Modèle Review - Gère les avis et évaluations des produits
// Permet aux clients d'évaluer les produits qu'ils ont achetés

const mongoose = require('mongoose');

// Schéma pour les avis produits
const reviewSchema = new mongoose.Schema({
  // Référence au produit évalué
  productID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'La référence du produit est obligatoire']
  },

  // Référence à l'utilisateur qui donne l'avis
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La référence de l\'utilisateur est obligatoire']
  },

  // Référence à la commande (pour vérifier que l'utilisateur a bien acheté le produit)
  orderID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'La référence de la commande est obligatoire']
  },

  // Note donnée (de 1 à 5 étoiles)
  rating: {
    type: Number,
    required: [true, 'La note est obligatoire'],
    min: [1, 'La note minimum est de 1'],
    max: [5, 'La note maximum est de 5']
  },

  // Titre de l'avis
  title: {
    type: String,
    required: [true, 'Le titre de l\'avis est obligatoire'],
    trim: true,
    minlength: [5, 'Le titre doit contenir au moins 5 caractères'],
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },

  // Commentaire détaillé
  comment: {
    type: String,
    required: [true, 'Le commentaire est obligatoire'],
    trim: true,
    minlength: [10, 'Le commentaire doit contenir au moins 10 caractères'],
    maxlength: [2000, 'Le commentaire ne peut pas dépasser 2000 caractères']
  },

  // Avantages du produit
  pros: [{
    type: String,
    trim: true,
    maxlength: [200, 'Chaque avantage ne peut pas dépasser 200 caractères']
  }],

  // Inconvénients du produit
  cons: [{
    type: String,
    trim: true,
    maxlength: [200, 'Chaque inconvénient ne peut pas dépasser 200 caractères']
  }],

  // Photos jointes à l'avis
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: 100
    }
  }],

  // Évaluation détaillée par critères
  detailedRating: {
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    shipping: {
      type: Number,
      min: 1,
      max: 5
    },
    service: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Statut de l'avis
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Hidden'],
    default: 'Pending'
  },

  // Raison du rejet (si applicable)
  rejectionReason: {
    type: String,
    maxlength: [500, 'La raison du rejet ne peut pas dépasser 500 caractères']
  },

  // Indicateur si l'avis est vérifié (achat confirmé)
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },

  // Indicateur si l'utilisateur recommande le produit
  wouldRecommend: {
    type: Boolean,
    default: true
  },

  // Nombre de personnes qui ont trouvé cet avis utile
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Nombre de personnes qui ont trouvé cet avis inutile
  notHelpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Utilisateurs qui ont voté pour cet avis (pour éviter les votes multiples)
  voters: [{
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['helpful', 'not_helpful']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Réponse du vendeur à l'avis
  sellerResponse: {
    response: {
      type: String,
      maxlength: [1000, 'La réponse du vendeur ne peut pas dépasser 1000 caractères']
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Métadonnées pour la modération
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    },
    moderationNotes: {
      type: String,
      maxlength: 500
    }
  },

  // Indicateur si l'avis a été modifié
  isEdited: {
    type: Boolean,
    default: false
  },

  // Date de la dernière modification
  lastEditedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
reviewSchema.index({ productID: 1 });
reviewSchema.index({ userID: 1 });
reviewSchema.index({ orderID: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ helpfulCount: -1 });

// Index composé pour éviter les avis multiples du même utilisateur pour le même produit
reviewSchema.index({ productID: 1, userID: 1 }, { unique: true });

// Propriété virtuelle pour calculer le score d'utilité
reviewSchema.virtual('helpfulnessScore').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return (this.helpfulCount / total) * 100;
});

// Propriété virtuelle pour vérifier si l'avis peut être modifié
reviewSchema.virtual('canBeEdited').get(function() {
  const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation <= 30 && this.status === 'Approved';
});

// Middleware pour vérifier l'achat avant la création de l'avis
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Vérifier que l'utilisateur a bien acheté ce produit
      const Order = mongoose.model('Order');
      const order = await Order.findOne({
        _id: this.orderID,
        userID: this.userID,
        'items.productID': this.productID,
        orderStatus: 'Delivered'
      });

      if (!order) {
        const error = new Error('Vous ne pouvez évaluer que les produits que vous avez achetés et reçus');
        error.name = 'UnauthorizedReview';
        return next(error);
      }

      this.isVerifiedPurchase = true;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Middleware pour mettre à jour la note du produit après sauvegarde
reviewSchema.post('save', async function() {
  try {
    const Product = mongoose.model('Product');
    const product = await Product.findById(this.productID);
    if (product) {
      await product.calculateRating();
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note du produit:', error);
  }
});

// Middleware pour mettre à jour la note du produit après suppression
reviewSchema.post('remove', async function() {
  try {
    const Product = mongoose.model('Product');
    const product = await Product.findById(this.productID);
    if (product) {
      await product.calculateRating();
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note du produit:', error);
  }
});

// Méthode pour voter sur l'utilité de l'avis
reviewSchema.methods.voteHelpful = async function(userId, isHelpful) {
  // Vérifier si l'utilisateur a déjà voté
  const existingVote = this.voters.find(voter => voter.userID.toString() === userId.toString());
  
  if (existingVote) {
    // Mettre à jour le vote existant
    if (existingVote.vote === 'helpful' && !isHelpful) {
      this.helpfulCount -= 1;
      this.notHelpfulCount += 1;
    } else if (existingVote.vote === 'not_helpful' && isHelpful) {
      this.notHelpfulCount -= 1;
      this.helpfulCount += 1;
    }
    existingVote.vote = isHelpful ? 'helpful' : 'not_helpful';
    existingVote.votedAt = new Date();
  } else {
    // Nouveau vote
    if (isHelpful) {
      this.helpfulCount += 1;
    } else {
      this.notHelpfulCount += 1;
    }
    
    this.voters.push({
      userID: userId,
      vote: isHelpful ? 'helpful' : 'not_helpful',
      votedAt: new Date()
    });
  }

  await this.save();
  return this;
};

// Méthode pour ajouter une réponse du vendeur
reviewSchema.methods.addSellerResponse = async function(response, sellerId) {
  // Vérifier que c'est bien le vendeur du produit
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.productID);
  
  if (!product || product.sellerID.toString() !== sellerId.toString()) {
    throw new Error('Seul le vendeur du produit peut répondre à cet avis');
  }

  this.sellerResponse = {
    response: response,
    respondedAt: new Date(),
    respondedBy: sellerId
  };

  await this.save();
  return this;
};

// Méthode pour modérer l'avis
reviewSchema.methods.moderate = async function(status, moderatorId, notes = '') {
  const validStatuses = ['Approved', 'Rejected', 'Hidden'];
  
  if (!validStatuses.includes(status)) {
    throw new Error('Statut de modération invalide');
  }

  this.status = status;
  this.moderation = {
    moderatedBy: moderatorId,
    moderatedAt: new Date(),
    moderationNotes: notes
  };

  if (status === 'Rejected') {
    this.rejectionReason = notes;
  }

  await this.save();
  return this;
};

// Méthode pour modifier l'avis
reviewSchema.methods.editReview = async function(updates) {
  if (!this.canBeEdited) {
    throw new Error('Cet avis ne peut plus être modifié');
  }

  // Champs modifiables
  const editableFields = ['title', 'comment', 'rating', 'pros', 'cons', 'detailedRating', 'wouldRecommend'];
  
  editableFields.forEach(field => {
    if (updates[field] !== undefined) {
      this[field] = updates[field];
    }
  });

  this.isEdited = true;
  this.lastEditedAt = new Date();
  this.status = 'Pending'; // Remettre en attente de modération

  await this.save();
  return this;
};

// Méthode statique pour obtenir les statistiques des avis d'un produit
reviewSchema.statics.getProductReviewStats = async function(productId) {
  const stats = await this.aggregate([
    { $match: { productID: new mongoose.Types.ObjectId(productId), status: 'Approved' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        },
        recommendationRate: {
          $avg: { $cond: ['$wouldRecommend', 1, 0] }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recommendationRate: 0
    };
  }

  const result = stats[0];
  
  // Calculer la distribution des notes
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

  return {
    totalReviews: result.totalReviews,
    averageRating: Math.round(result.averageRating * 10) / 10,
    ratingDistribution: distribution,
    recommendationRate: Math.round(result.recommendationRate * 100)
  };
};

// Créer et exporter le modèle
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

