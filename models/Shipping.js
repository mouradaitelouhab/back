// Modèle Shipping - Gère les informations d'expédition et de livraison
// Suit le processus complet de livraison des commandes

const mongoose = require('mongoose');

// Schéma pour l'adresse de livraison
const deliveryAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  street2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
    default: 'France'
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  instructions: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, { _id: false });

// Schéma pour les événements de suivi
const trackingEventSchema = new mongoose.Schema({
  // Statut de l'événement
  status: {
    type: String,
    enum: [
      'label_created',      // Étiquette créée
      'picked_up',          // Colis récupéré
      'in_transit',         // En transit
      'out_for_delivery',   // En cours de livraison
      'delivered',          // Livré
      'delivery_attempted', // Tentative de livraison
      'exception',          // Exception/problème
      'returned',           // Retourné
      'lost',              // Perdu
      'damaged'            // Endommagé
    ],
    required: true
  },

  // Description de l'événement
  description: {
    type: String,
    required: true,
    trim: true
  },

  // Localisation de l'événement
  location: {
    city: String,
    state: String,
    country: String,
    facility: String
  },

  // Date et heure de l'événement
  timestamp: {
    type: Date,
    required: true
  },

  // Source de l'information (transporteur, API, manuel)
  source: {
    type: String,
    enum: ['carrier', 'api', 'manual', 'webhook'],
    default: 'api'
  }
}, { _id: true });

// Schéma principal pour les expéditions
const shippingSchema = new mongoose.Schema({
  // Référence à la commande
  orderID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'La référence de la commande est obligatoire'],
    unique: true
  },

  // Référence au vendeur
  sellerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La référence du vendeur est obligatoire']
  },

  // Méthode de livraison
  shippingMethod: {
    type: String,
    enum: ['Standard', 'Express', 'Premium', 'Same Day', 'International'],
    required: true,
    default: 'Standard'
  },

  // Transporteur
  carrier: {
    type: String,
    enum: ['La Poste', 'Chronopost', 'DHL', 'UPS', 'FedEx', 'TNT', 'Mondial Relay', 'Autre'],
    required: true,
    default: 'La Poste'
  },

  // Service du transporteur
  carrierService: {
    type: String,
    trim: true
  },

  // Numéro de suivi
  trackingNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  // URL de suivi du transporteur
  trackingUrl: {
    type: String,
    trim: true
  },

  // Statut de l'expédition
  shippingStatus: {
    type: String,
    enum: [
      'Pending',           // En attente
      'Processing',        // En cours de préparation
      'Ready to Ship',     // Prêt à expédier
      'Shipped',          // Expédié
      'In Transit',       // En transit
      'Out for Delivery', // En cours de livraison
      'Delivered',        // Livré
      'Delivery Failed',  // Échec de livraison
      'Returned',         // Retourné
      'Lost',            // Perdu
      'Damaged',         // Endommagé
      'Cancelled'        // Annulé
    ],
    default: 'Pending'
  },

  // Adresse de livraison
  shippingAddress: {
    type: deliveryAddressSchema,
    required: true
  },

  // Adresse de retour (vendeur)
  returnAddress: {
    type: deliveryAddressSchema,
    required: true
  },

  // Informations sur le colis
  package: {
    weight: {
      type: Number,
      min: 0,
      required: true
    },
    weightUnit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'g'
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm'
      }
    },
    value: {
      type: Number,
      min: 0,
      required: true
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Coût de l'expédition
  shippingCost: {
    type: Number,
    required: true,
    min: 0
  },

  // Assurance
  insurance: {
    isInsured: {
      type: Boolean,
      default: false
    },
    value: {
      type: Number,
      min: 0
    },
    cost: {
      type: Number,
      min: 0
    }
  },

  // Signature requise
  signatureRequired: {
    type: Boolean,
    default: false
  },

  // Livraison le samedi
  saturdayDelivery: {
    type: Boolean,
    default: false
  },

  // Date d'expédition
  shippedAt: {
    type: Date
  },

  // Date de livraison estimée
  estimatedDeliveryDate: {
    type: Date
  },

  // Date de livraison effective
  actualDeliveryDate: {
    type: Date
  },

  // Délai de livraison en jours ouvrés
  deliveryTimeframe: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    }
  },

  // Événements de suivi
  trackingEvents: [trackingEventSchema],

  // Dernière mise à jour du suivi
  lastTrackingUpdate: {
    type: Date
  },

  // Informations de livraison
  delivery: {
    // Personne qui a reçu le colis
    receivedBy: {
      type: String,
      trim: true
    },
    // Lieu de livraison (si différent de l'adresse)
    deliveryLocation: {
      type: String,
      trim: true
    },
    // Signature (base64 ou URL)
    signature: {
      type: String
    },
    // Photo de livraison
    deliveryPhoto: {
      type: String
    },
    // Notes de livraison
    deliveryNotes: {
      type: String,
      maxlength: 500
    }
  },

  // Informations de retour (si applicable)
  return: {
    isReturned: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      enum: [
        'delivery_failed',
        'refused_by_recipient',
        'incorrect_address',
        'damaged_package',
        'customer_request',
        'other'
      ]
    },
    returnedAt: {
      type: Date
    },
    returnTrackingNumber: {
      type: String
    }
  },

  // Étiquette d'expédition
  shippingLabel: {
    labelUrl: {
      type: String
    },
    labelFormat: {
      type: String,
      enum: ['PDF', 'PNG', 'ZPL'],
      default: 'PDF'
    },
    createdAt: {
      type: Date
    }
  },

  // Métadonnées du transporteur
  carrierMetadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Notes internes
  internalNotes: {
    type: String,
    maxlength: 1000
  },

  // Indicateur si le suivi est automatique
  autoTracking: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
shippingSchema.index({ orderID: 1 });
shippingSchema.index({ sellerID: 1 });
shippingSchema.index({ trackingNumber: 1 });
shippingSchema.index({ shippingStatus: 1 });
shippingSchema.index({ carrier: 1 });
shippingSchema.index({ shippedAt: -1 });
shippingSchema.index({ estimatedDeliveryDate: 1 });
shippingSchema.index({ actualDeliveryDate: -1 });

// Middleware pour mettre à jour automatiquement les dates
shippingSchema.pre('save', function(next) {
  // Mettre à jour shippedAt quand le statut passe à "Shipped"
  if (this.isModified('shippingStatus') && this.shippingStatus === 'Shipped' && !this.shippedAt) {
    this.shippedAt = new Date();
  }

  // Mettre à jour actualDeliveryDate quand le statut passe à "Delivered"
  if (this.isModified('shippingStatus') && this.shippingStatus === 'Delivered' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }

  next();
});

// Propriété virtuelle pour vérifier si l'expédition est en cours
shippingSchema.virtual('isInTransit').get(function() {
  return ['Shipped', 'In Transit', 'Out for Delivery'].includes(this.shippingStatus);
});

// Propriété virtuelle pour vérifier si l'expédition est livrée
shippingSchema.virtual('isDelivered').get(function() {
  return this.shippingStatus === 'Delivered';
});

// Propriété virtuelle pour calculer le délai de livraison réel
shippingSchema.virtual('actualDeliveryDays').get(function() {
  if (this.shippedAt && this.actualDeliveryDate) {
    const diffTime = this.actualDeliveryDate - this.shippedAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Méthode pour mettre à jour le statut d'expédition
shippingSchema.methods.updateStatus = function(newStatus, description = '', location = {}) {
  this.shippingStatus = newStatus;
  
  // Ajouter un événement de suivi
  this.addTrackingEvent(newStatus.toLowerCase().replace(/\s+/g, '_'), description, location);
  
  return this.save();
};

// Méthode pour ajouter un événement de suivi
shippingSchema.methods.addTrackingEvent = function(status, description, location = {}, timestamp = null) {
  const event = {
    status: status,
    description: description,
    location: location,
    timestamp: timestamp || new Date(),
    source: 'manual'
  };

  this.trackingEvents.push(event);
  this.lastTrackingUpdate = new Date();

  // Mettre à jour le statut principal si nécessaire
  const statusMapping = {
    'delivered': 'Delivered',
    'out_for_delivery': 'Out for Delivery',
    'in_transit': 'In Transit',
    'picked_up': 'Shipped',
    'exception': 'Delivery Failed',
    'returned': 'Returned',
    'lost': 'Lost',
    'damaged': 'Damaged'
  };

  if (statusMapping[status]) {
    this.shippingStatus = statusMapping[status];
  }

  return this;
};

// Méthode pour générer l'URL de suivi
shippingSchema.methods.generateTrackingUrl = function() {
  const trackingUrls = {
    'La Poste': `https://www.laposte.fr/outils/suivre-vos-envois?code=${this.trackingNumber}`,
    'Chronopost': `https://www.chronopost.fr/tracking-colis?listeNumerosLT=${this.trackingNumber}`,
    'DHL': `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${this.trackingNumber}`,
    'UPS': `https://www.ups.com/track?loc=fr_FR&tracknum=${this.trackingNumber}`,
    'FedEx': `https://www.fedex.com/apps/fedextrack/?tracknumbers=${this.trackingNumber}`,
    'TNT': `https://www.tnt.com/express/fr_fr/site/shipping-tools/tracking.html?searchType=con&cons=${this.trackingNumber}`
  };

  this.trackingUrl = trackingUrls[this.carrier] || '';
  return this.trackingUrl;
};

// Méthode pour calculer la date de livraison estimée
shippingSchema.methods.calculateEstimatedDelivery = function() {
  if (!this.shippedAt || !this.deliveryTimeframe) {
    return null;
  }

  const shippedDate = new Date(this.shippedAt);
  const maxDays = this.deliveryTimeframe.max || 7;
  
  // Ajouter les jours ouvrés (exclure weekends)
  let deliveryDate = new Date(shippedDate);
  let daysAdded = 0;
  
  while (daysAdded < maxDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    
    // Exclure samedi (6) et dimanche (0) sauf si saturdayDelivery est true
    const dayOfWeek = deliveryDate.getDay();
    if (dayOfWeek !== 0 && (dayOfWeek !== 6 || this.saturdayDelivery)) {
      daysAdded++;
    }
  }

  this.estimatedDeliveryDate = deliveryDate;
  return deliveryDate;
};

// Méthode pour vérifier si la livraison est en retard
shippingSchema.methods.isLate = function() {
  if (!this.estimatedDeliveryDate || this.isDelivered) {
    return false;
  }
  
  return new Date() > this.estimatedDeliveryDate;
};

// Méthode pour obtenir le dernier événement de suivi
shippingSchema.methods.getLatestTrackingEvent = function() {
  if (this.trackingEvents.length === 0) {
    return null;
  }
  
  return this.trackingEvents
    .sort((a, b) => b.timestamp - a.timestamp)[0];
};

// Méthode pour marquer comme livré
shippingSchema.methods.markAsDelivered = function(receivedBy = '', deliveryLocation = '', signature = '', photo = '', notes = '') {
  this.shippingStatus = 'Delivered';
  this.actualDeliveryDate = new Date();
  
  this.delivery = {
    receivedBy: receivedBy,
    deliveryLocation: deliveryLocation,
    signature: signature,
    deliveryPhoto: photo,
    deliveryNotes: notes
  };

  this.addTrackingEvent('delivered', `Colis livré${receivedBy ? ` à ${receivedBy}` : ''}`, {}, new Date());
  
  return this.save();
};

// Méthode pour traiter un retour
shippingSchema.methods.processReturn = function(reason, returnTrackingNumber = '') {
  this.return = {
    isReturned: true,
    reason: reason,
    returnedAt: new Date(),
    returnTrackingNumber: returnTrackingNumber
  };

  this.shippingStatus = 'Returned';
  this.addTrackingEvent('returned', `Colis retourné - Raison: ${reason}`, {}, new Date());
  
  return this.save();
};

// Méthode statique pour obtenir les expéditions en retard
shippingSchema.statics.getLateShipments = function() {
  const today = new Date();
  
  return this.find({
    shippingStatus: { $in: ['Shipped', 'In Transit', 'Out for Delivery'] },
    estimatedDeliveryDate: { $lt: today }
  })
  .populate('orderID', 'orderNumber')
  .populate('sellerID', 'username email')
  .sort({ estimatedDeliveryDate: 1 });
};

// Méthode statique pour obtenir les statistiques d'expédition
shippingSchema.statics.getShippingStats = async function(sellerId = null, startDate = null, endDate = null) {
  const matchStage = {};
  
  if (sellerId) {
    matchStage.sellerID = new mongoose.Types.ObjectId(sellerId);
  }
  
  if (startDate || endDate) {
    matchStage.shippedAt = {};
    if (startDate) matchStage.shippedAt.$gte = new Date(startDate);
    if (endDate) matchStage.shippedAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalShipments: { $sum: 1 },
        deliveredCount: {
          $sum: { $cond: [{ $eq: ['$shippingStatus', 'Delivered'] }, 1, 0] }
        },
        inTransitCount: {
          $sum: { $cond: [{ $in: ['$shippingStatus', ['Shipped', 'In Transit', 'Out for Delivery']] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$shippingStatus', 'Delivery Failed'] }, 1, 0] }
        },
        averageDeliveryDays: {
          $avg: {
            $cond: [
              { $and: ['$shippedAt', '$actualDeliveryDate'] },
              { $divide: [{ $subtract: ['$actualDeliveryDate', '$shippedAt'] }, 1000 * 60 * 60 * 24] },
              null
            ]
          }
        },
        carrierBreakdown: {
          $push: '$carrier'
        }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : {
    totalShipments: 0,
    deliveredCount: 0,
    inTransitCount: 0,
    failedCount: 0,
    averageDeliveryDays: 0,
    carrierBreakdown: []
  };
};

// Créer et exporter le modèle
const Shipping = mongoose.model('Shipping', shippingSchema);

module.exports = Shipping;

