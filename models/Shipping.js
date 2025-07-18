const mongoose = require('mongoose');

// Schéma pour l'adresse de livraison
const deliveryAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  street: { type: String, required: true, trim: true },
  street2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: 'France' },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  instructions: { type: String, maxlength: 500, trim: true }
}, { _id: false });

// Schéma pour les événements de suivi
const trackingEventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'label_created', 'picked_up', 'in_transit', 'out_for_delivery',
      'delivered', 'delivery_attempted', 'exception', 'returned',
      'lost', 'damaged'
    ],
    required: true
  },
  description: { type: String, required: true, trim: true },
  location: {
    city: String,
    state: String,
    country: String,
    facility: String
  },
  timestamp: { type: Date, required: true },
  source: { type: String, enum: ['carrier', 'api', 'manual', 'webhook'], default: 'api' }
}, { _id: true });

// Schéma principal pour les expéditions
const shippingSchema = new mongoose.Schema({
  orderID: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: [true, 'La référence de la commande est obligatoire'], unique: true },
  sellerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'La référence du vendeur est obligatoire'] },
  shippingMethod: { type: String, enum: ['Standard', 'Express', 'Premium', 'Same Day', 'International'], required: true, default: 'Standard' },
  carrier: { type: String, enum: ['La Poste', 'Chronopost', 'DHL', 'UPS', 'FedEx', 'TNT', 'Mondial Relay', 'Autre'], required: true, default: 'La Poste' },
  carrierService: { type: String, trim: true },
  trackingNumber: { type: String, required: true, trim: true, unique: true },
  trackingUrl: { type: String, trim: true },
  shippingStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Ready to Ship', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Delivery Failed', 'Returned', 'Lost', 'Damaged', 'Cancelled'],
    default: 'Pending'
  },
  shippingAddress: { type: deliveryAddressSchema, required: true },
  returnAddress: { type: deliveryAddressSchema, required: true },
  package: {
    weight: { type: Number, min: 0, required: true },
    weightUnit: { type: String, enum: ['g', 'kg', 'lb', 'oz'], default: 'g' },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'in'], default: 'cm' }
    },
    value: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'EUR' },
    description: { type: String, required: true, trim: true }
  },
  shippingCost: { type: Number, required: true, min: 0 },
  insurance: {
    isInsured: { type: Boolean, default: false },
    value: { type: Number, min: 0 },
    cost: { type: Number, min: 0 }
  },
  signatureRequired: { type: Boolean, default: false },
  saturdayDelivery: { type: Boolean, default: false },
  shippedAt: { type: Date },
  estimatedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },
  deliveryTimeframe: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 }
  },
  trackingEvents: [trackingEventSchema],
  lastTrackingUpdate: { type: Date },
  delivery: {
    receivedBy: { type: String, trim: true },
    deliveryLocation: { type: String, trim: true },
    signature: { type: String },
    deliveryPhoto: { type: String },
    deliveryNotes: { type: String, maxlength: 500 }
  },
  return: {
    isReturned: { type: Boolean, default: false },
    reason: {
      type: String,
      enum: ['delivery_failed', 'refused_by_recipient', 'incorrect_address', 'damaged_package', 'customer_request', 'other']
    },
    returnedAt: { type: Date },
    returnTrackingNumber: { type: String }
  },
  shippingLabel: {
    labelUrl: { type: String },
    labelFormat: { type: String, enum: ['PDF', 'PNG', 'ZPL'], default: 'PDF' },
    createdAt: { type: Date }
  },
  carrierMetadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  internalNotes: { type: String, maxlength: 1000 },
  autoTracking: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
shippingSchema.index({ orderID: 1 });
shippingSchema.index({ sellerID: 1 });
shippingSchema.index({ trackingNumber: 1 });
shippingSchema.index({ shippingStatus: 1 });
shippingSchema.index({ carrier: 1 });
shippingSchema.index({ shippedAt: -1 });
shippingSchema.index({ estimatedDeliveryDate: 1 });
shippingSchema.index({ actualDeliveryDate: -1 });

// Middleware
shippingSchema.pre('save', function(next) {
  if (this.isModified('shippingStatus') && this.shippingStatus === 'Shipped' && !this.shippedAt) {
    this.shippedAt = new Date();
  }
  if (this.isModified('shippingStatus') && this.shippingStatus === 'Delivered' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }
  next();
});

// Virtuals
shippingSchema.virtual('isInTransit').get(function() {
  return ['Shipped', 'In Transit', 'Out for Delivery'].includes(this.shippingStatus);
});

shippingSchema.virtual('isDelivered').get(function() {
  return this.shippingStatus === 'Delivered';
});

shippingSchema.virtual('actualDeliveryDays').get(function() {
  if (this.shippedAt && this.actualDeliveryDate) {
    const diffTime = this.actualDeliveryDate - this.shippedAt;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Methods
shippingSchema.methods.updateStatus = function(newStatus, description = '', location = {}) {
  this.shippingStatus = newStatus;
  this.addTrackingEvent(newStatus.toLowerCase().replace(/\s+/g, '_'), description, location);
  return this.save();
};

shippingSchema.methods.addTrackingEvent = function(status, description, location = {}, timestamp = null) {
  const event = {
    status,
    description,
    location,
    timestamp: timestamp || new Date(),
    source: 'manual'
  };
  this.trackingEvents.push(event);
  this.lastTrackingUpdate = new Date();

  const statusMapping = {
    delivered: 'Delivered',
    out_for_delivery: 'Out for Delivery',
    in_transit: 'In Transit',
    picked_up: 'Shipped',
    exception: 'Delivery Failed',
    returned: 'Returned',
    lost: 'Lost',
    damaged: 'Damaged'
  };

  if (statusMapping[status]) {
    this.shippingStatus = statusMapping[status];
  }
  return this;
};

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

shippingSchema.methods.calculateEstimatedDelivery = function() {
  if (!this.shippedAt || !this.deliveryTimeframe) return null;

  const shippedDate = new Date(this.shippedAt);
  const maxDays = this.deliveryTimeframe.max || 7;

  let deliveryDate = new Date(shippedDate);
  let daysAdded = 0;

  while (daysAdded < maxDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    const dayOfWeek = deliveryDate.getDay();
    if (dayOfWeek !== 0 && (dayOfWeek !== 6 || this.saturdayDelivery)) {
      daysAdded++;
    }
  }

  this.estimatedDeliveryDate = deliveryDate;
  return deliveryDate;
};

shippingSchema.methods.isLate = function() {
  if (!this.estimatedDeliveryDate || this.isDelivered) return false;
  return new Date() > this.estimatedDeliveryDate;
};

shippingSchema.methods.getLatestTrackingEvent = function() {
  if (this.trackingEvents.length === 0) return null;
  return this.trackingEvents.sort((a, b) => b.timestamp - a.timestamp)[0];
};

shippingSchema.methods.markAsDelivered = function(receivedBy = '', deliveryLocation = '', signature = '', photo = '', notes = '') {
  this.shippingStatus = 'Delivered';
  this.actualDeliveryDate = new Date();
  this.delivery = { receivedBy, deliveryLocation, signature, deliveryPhoto: photo, deliveryNotes: notes };
  this.addTrackingEvent('delivered', `Colis livré${receivedBy ? ` à ${receivedBy}` : ''}`, {}, new Date());
  return this.save();
};

shippingSchema.methods.processReturn = function(reason, returnTrackingNumber = '') {
  this.return = {
    isReturned: true,
    reason,
    returnedAt: new Date(),
    returnTrackingNumber
  };
  this.shippingStatus = 'Returned';
  this.addTrackingEvent('returned', `Colis retourné - Raison: ${reason}`, {}, new Date());
  return this.save();
};

// Statics
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

shippingSchema.statics.getShippingStats = async function(sellerId = null, startDate = null, endDate = null) {
  const matchStage = {};
  if (sellerId) matchStage.sellerID = new mongoose.Types.ObjectId(sellerId);
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
        deliveredCount: { $sum: { $cond: [{ $eq: ['$shippingStatus', 'Delivered'] }, 1, 0] } },
        inTransitCount: { $sum: { $cond: [{ $in: ['$shippingStatus', ['Shipped', 'In Transit', 'Out for Delivery']] }, 1, 0] } },
        failedCount: { $sum: { $cond: [{ $eq: ['$shippingStatus', 'Delivery Failed'] }, 1, 0] } },
        averageDeliveryDays: {
          $avg: {
            $cond: [
              { $and: ['$shippedAt', '$actualDeliveryDate'] },
              { $divide: [{ $subtract: ['$actualDeliveryDate', '$shippedAt'] }, 1000 * 60 * 60 * 24] },
              null
            ]
          }
        },
        carrierBreakdown: { $push: '$carrier' }
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

// Export with duplicate model check
const Shipping = mongoose.models.Shipping || mongoose.model('Shipping', shippingSchema);
module.exports = Shipping; 
