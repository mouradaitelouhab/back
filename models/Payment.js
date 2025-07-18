// Modèle Payment - Gère les transactions de paiement via Stripe
// Suit l'historique complet des paiements et remboursements

const mongoose = require('mongoose');

// Schéma pour les détails de la méthode de paiement
const paymentMethodSchema = new mongoose.Schema({
  // Type de méthode de paiement
  type: {
    type: String,
    enum: ['card', 'bank_transfer', 'crypto', 'paypal', 'apple_pay', 'google_pay'],
    required: true
  },

  // Détails de la carte (si applicable)
  card: {
    brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay']
    },
    last4: {
      type: String,
      length: 4
    },
    expMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expYear: {
      type: Number,
      min: new Date().getFullYear()
    },
    country: {
      type: String,
      length: 2,
      uppercase: true
    }
  },

  // Détails du virement bancaire (si applicable)
  bankTransfer: {
    bankName: String,
    accountLast4: String,
    country: String
  },

  // Détails crypto (si applicable)
  crypto: {
    currency: {
      type: String,
      enum: ['bitcoin', 'ethereum', 'litecoin']
    },
    walletAddress: String
  }
}, { _id: false });

// Schéma pour les frais de transaction
const feesSchema = new mongoose.Schema({
  // Frais Stripe
  stripeFee: {
    type: Number,
    default: 0,
    min: 0
  },

  // Frais de la plateforme
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },

  // Autres frais
  otherFees: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total des frais
  totalFees: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Schéma principal pour les paiements
const paymentSchema = new mongoose.Schema({
  // Référence à la commande
  orderID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'La référence de la commande est obligatoire']
  },

  // Référence à l'utilisateur qui effectue le paiement
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La référence de l\'utilisateur est obligatoire']
  },

  // Montant du paiement
  amount: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0.01, 'Le montant minimum est de 0.01']
  },

  // Devise
  currency: {
    type: String,
    required: true,
    default: 'MAD',
    enum: ['MAD', 'EUR', 'USD', 'GBP'],
    uppercase: true
  },

  // Statut du paiement
  status: {
    type: String,
    enum: [
      'pending',           // En attente
      'processing',        // En cours de traitement
      'succeeded',         // Réussi
      'failed',           // Échoué
      'canceled',         // Annulé
      'requires_action',  // Nécessite une action (3D Secure)
      'refunded',         // Remboursé
      'partially_refunded' // Partiellement remboursé
    ],
    default: 'pending'
  },

  // Méthode de paiement utilisée
  paymentMethod: paymentMethodSchema,

  // ID de l'intention de paiement Stripe
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },

  // ID de la charge Stripe (si le paiement est réussi)
  stripeChargeId: {
    type: String,
    sparse: true
  },

  // Secret client pour confirmer le paiement côté frontend
  clientSecret: {
    type: String,
    required: true
  },

  // Frais de transaction
  fees: feesSchema,

  // Montant net reçu par le vendeur
  netAmount: {
    type: Number,
    min: 0
  },

  // Date de traitement du paiement
  processedAt: {
    type: Date
  },

  // Informations de remboursement
  refunds: [{
    refundId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled'],
      required: true
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Map,
      of: String
    }
  }],

  // Tentatives de paiement
  attempts: [{
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'canceled']
    },
    errorCode: String,
    errorMessage: String,
    paymentMethodId: String
  }],

  // Métadonnées additionnelles
  metadata: {
    type: Map,
    of: String
  },

  // Adresse IP du client (pour la sécurité)
  clientIp: {
    type: String
  },

  // User Agent du navigateur
  userAgent: {
    type: String
  },

  // Informations de géolocalisation
  location: {
    country: String,
    city: String,
    region: String
  },

  // Score de risque (fourni par Stripe Radar)
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },

  // Niveau de risque
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high']
  },

  // Indicateur si le paiement a été marqué comme frauduleux
  isFraudulent: {
    type: Boolean,
    default: false
  },

  // Notes internes sur le paiement
  internalNotes: {
    type: String,
    maxlength: 1000
  },

  // Webhook events reçus de Stripe
  webhookEvents: [{
    eventId: String,
    eventType: String,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    processed: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
paymentSchema.index({ orderID: 1 });
paymentSchema.index({ userID: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ stripeChargeId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ processedAt: -1 });

// Middleware pour calculer le montant net avant la sauvegarde
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - (this.fees.totalFees || 0);
  }
  next();
});

// Propriété virtuelle pour vérifier si le paiement est réussi
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'succeeded';
});

// Propriété virtuelle pour vérifier si le paiement peut être remboursé
paymentSchema.virtual('canBeRefunded').get(function() {
  return this.status === 'succeeded' && this.getRemainingRefundableAmount() > 0;
});

// Propriété virtuelle pour obtenir le montant total remboursé
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds
    .filter(refund => refund.status === 'succeeded')
    .reduce((total, refund) => total + refund.amount, 0);
});

// Méthode pour obtenir le montant restant remboursable
paymentSchema.methods.getRemainingRefundableAmount = function() {
  return this.amount - this.totalRefunded;
};

// Méthode pour ajouter une tentative de paiement
paymentSchema.methods.addAttempt = function(status, errorCode = null, errorMessage = null, paymentMethodId = null) {
  this.attempts.push({
    attemptedAt: new Date(),
    status: status,
    errorCode: errorCode,
    errorMessage: errorMessage,
    paymentMethodId: paymentMethodId
  });

  return this.save();
};

// Méthode pour mettre à jour le statut du paiement
paymentSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;

  if (newStatus === 'succeeded') {
    this.processedAt = new Date();
    if (additionalData.chargeId) {
      this.stripeChargeId = additionalData.chargeId;
    }
  }

  // Ajouter des métadonnées si fournies
  if (additionalData.metadata) {
    Object.keys(additionalData.metadata).forEach(key => {
      this.metadata.set(key, additionalData.metadata[key]);
    });
  }

  return this.save();
};

// Méthode pour traiter un remboursement
paymentSchema.methods.processRefund = function(refundId, amount, reason, status = 'pending') {
  if (amount > this.getRemainingRefundableAmount()) {
    throw new Error('Le montant du remboursement dépasse le montant remboursable');
  }

  this.refunds.push({
    refundId: refundId,
    amount: amount,
    reason: reason,
    status: status,
    processedAt: new Date()
  });

  // Mettre à jour le statut du paiement si nécessaire
  if (status === 'succeeded') {
    const totalRefunded = this.totalRefunded + amount;
    if (totalRefunded >= this.amount) {
      this.status = 'refunded';
    } else {
      this.status = 'partially_refunded';
    }
  }

  return this.save();
};

// Méthode pour mettre à jour le statut d'un remboursement
paymentSchema.methods.updateRefundStatus = function(refundId, newStatus) {
  const refund = this.refunds.find(r => r.refundId === refundId);
  
  if (!refund) {
    throw new Error('Remboursement non trouvé');
  }

  refund.status = newStatus;

  // Recalculer le statut du paiement
  const succeededRefunds = this.refunds.filter(r => r.status === 'succeeded');
  const totalRefunded = succeededRefunds.reduce((total, r) => total + r.amount, 0);

  if (totalRefunded >= this.amount) {
    this.status = 'refunded';
  } else if (totalRefunded > 0) {
    this.status = 'partially_refunded';
  } else {
    this.status = 'succeeded';
  }

  return this.save();
};

// Méthode pour ajouter un événement webhook
paymentSchema.methods.addWebhookEvent = function(eventId, eventType) {
  // Vérifier si l'événement n'a pas déjà été traité
  const existingEvent = this.webhookEvents.find(e => e.eventId === eventId);
  
  if (!existingEvent) {
    this.webhookEvents.push({
      eventId: eventId,
      eventType: eventType,
      receivedAt: new Date(),
      processed: false
    });
  }

  return this.save();
};

// Méthode pour marquer un événement webhook comme traité
paymentSchema.methods.markWebhookEventProcessed = function(eventId) {
  const event = this.webhookEvents.find(e => e.eventId === eventId);
  
  if (event) {
    event.processed = true;
  }

  return this.save();
};

// Méthode statique pour obtenir les statistiques de paiement
paymentSchema.statics.getPaymentStats = async function(startDate = null, endDate = null, sellerId = null) {
  const matchStage = { status: 'succeeded' };
  
  if (startDate || endDate) {
    matchStage.processedAt = {};
    if (startDate) matchStage.processedAt.$gte = new Date(startDate);
    if (endDate) matchStage.processedAt.$lte = new Date(endDate);
  }

  // Si on veut les stats pour un vendeur spécifique, on doit joindre avec Order
  const pipeline = [
    { $match: matchStage }
  ];

  if (sellerId) {
    pipeline.push(
      {
        $lookup: {
          from: 'orders',
          localField: 'orderID',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $match: {
          'order.sellerID': new mongoose.Types.ObjectId(sellerId)
        }
      }
    );
  }

  pipeline.push({
    $group: {
      _id: null,
      totalPayments: { $sum: 1 },
      totalAmount: { $sum: '$amount' },
      totalNetAmount: { $sum: '$netAmount' },
      totalFees: { $sum: '$fees.totalFees' },
      averageAmount: { $avg: '$amount' },
      currencyBreakdown: {
        $push: {
          currency: '$currency',
          amount: '$amount'
        }
      }
    }
  });

  const stats = await this.aggregate(pipeline);

  return stats.length > 0 ? stats[0] : {
    totalPayments: 0,
    totalAmount: 0,
    totalNetAmount: 0,
    totalFees: 0,
    averageAmount: 0,
    currencyBreakdown: []
  };
};

// Méthode statique pour obtenir les paiements échoués récents
paymentSchema.statics.getRecentFailedPayments = function(limit = 10) {
  return this.find({ status: 'failed' })
    .populate('userID', 'username email')
    .populate('orderID', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Créer et exporter le modèle
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

