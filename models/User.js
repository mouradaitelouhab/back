// Modèle User - Représente les utilisateurs de la plateforme Gems Revived
// Ce modèle gère les acheteurs, vendeurs et administrateurs

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schéma pour l'adresse (utilisé pour l'adresse de livraison et de facturation)
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: false,
    trim: true
  },
  city: {
    type: String,
    required: false,
    trim: true
  },
  state: {
    type: String,
    required: false,
    trim: true
  },
  zipCode: {
    type: String,
    required: false,
    trim: true
  },
  country: {
    type: String,
    required: false,
    trim: true,
    default: 'France'
  }
}, { _id: false }); // _id: false pour éviter la création d'un ID pour chaque adresse

// Schéma principal pour les utilisateurs
const userSchema = new mongoose.Schema({
  // Nom d'utilisateur unique
  username: {
    type: String,
    required: [true, 'Le nom d\'utilisateur est obligatoire'],
    unique: true,
    trim: true,
    minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
    maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères']
  },

  // Email unique pour l'authentification
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },

  // Mot de passe hashé
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },

  // Numéro de téléphone optionnel
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Veuillez entrer un numéro de téléphone valide']
  },

  // Adresse de livraison
  shippingAddress: {
    type: addressSchema,
    default: {}
  },

  // Adresse de facturation
  billingAddress: {
    type: addressSchema,
    default: {}
  },

  // Statut du compte
  accountStatus: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },

  // Rôle de l'utilisateur dans le système
  role: {
    type: String,
    enum: ['Buyer', 'Seller', 'Admin'],
    default: 'Buyer'
  },

  // Photo de profil (URL ou chemin vers le fichier)
  avatar: {
    type: String,
    default: null
  },

  // Indicateur de vérification email
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Token de vérification email
  emailVerificationToken: {
    type: String,
    default: null
  },

  // Token de réinitialisation de mot de passe
  passwordResetToken: {
    type: String,
    default: null
  },

  // Expiration du token de réinitialisation
  passwordResetExpires: {
    type: Date,
    default: null
  },

  // Date de dernière connexion
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  // Ajouter automatiquement createdAt et updatedAt
  timestamps: true,
  // Optimiser les requêtes JSON
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// Middleware pour hasher le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified('password')) return next();

  try {
    // Générer un salt et hasher le mot de passe
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la comparaison des mots de passe');
  }
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Supprimer les informations sensibles
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  
  return userObject;
};

// Méthode pour vérifier si l'utilisateur est un vendeur
userSchema.methods.isSeller = function() {
  return this.role === 'Seller' || this.role === 'Admin';
};

// Méthode pour vérifier si l'utilisateur est un administrateur
userSchema.methods.isAdmin = function() {
  return this.role === 'Admin';
};

// Méthode pour mettre à jour la date de dernière connexion
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Propriété virtuelle pour le nom complet (si on ajoute prénom/nom plus tard)
userSchema.virtual('fullName').get(function() {
  return this.firstName && this.lastName ? `${this.firstName} ${this.lastName}` : this.username;
});

// Middleware pour nettoyer les données avant la suppression
userSchema.pre('remove', async function(next) {
  try {
    // Ici, on pourrait supprimer les données associées (commandes, avis, etc.)
    // Pour l'instant, on laisse cette logique pour plus tard
    console.log(`Suppression de l'utilisateur: ${this.username}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Créer et exporter le modèle
const User = mongoose.model('User', userSchema);

module.exports = User;

