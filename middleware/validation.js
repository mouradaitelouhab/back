// Middleware de validation des données pour Gems Revived
// Valide les données d'entrée pour assurer la cohérence et la sécurité

const mongoose = require('mongoose');

/**
 * Middleware pour valider les ObjectId MongoDB
 * @param {String} paramName - Nom du paramètre à valider
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `Paramètre ${paramName} manquant`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `ID ${paramName} invalide`
      });
    }

    next();
  };
};

/**
 * Validation pour l'enregistrement d'un utilisateur
 */
const validateUserRegistration = (req, res, next) => {
  const { username, email, password, role } = req.body;
  const errors = [];

  // Validation du nom d'utilisateur
  if (!username || username.trim().length < 3) {
    errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
  }

  if (username && username.length > 30) {
    errors.push('Le nom d\'utilisateur ne peut pas dépasser 30 caractères');
  }

  // Validation de l'email
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Adresse email invalide');
  }

  // Validation du mot de passe
  if (!password || password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }

  // Validation du rôle
  const validRoles = ['Buyer', 'Seller', 'Admin'];
  if (role && !validRoles.includes(role)) {
    errors.push('Rôle invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour la connexion d'un utilisateur
 */
const validateUserLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email requis');
  }

  if (!password) {
    errors.push('Mot de passe requis');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données manquantes',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour la création d'un produit
 */
const validateProductCreation = (req, res, next) => {
  const { name, description, price, stockQuantity, categoryID, productType } = req.body;
  const errors = [];

  // Validation du nom
  if (!name || name.trim().length < 3) {
    errors.push('Le nom du produit doit contenir au moins 3 caractères');
  }

  if (name && name.length > 200) {
    errors.push('Le nom du produit ne peut pas dépasser 200 caractères');
  }

  // Validation de la description
  if (!description || description.trim().length < 10) {
    errors.push('La description doit contenir au moins 10 caractères');
  }

  if (description && description.length > 5000) {
    errors.push('La description ne peut pas dépasser 5000 caractères');
  }

  // Validation du prix
  if (!price || isNaN(price) || price < 0) {
    errors.push('Prix invalide (doit être un nombre positif)');
  }

  // Validation du stock
  if (stockQuantity !== undefined && (isNaN(stockQuantity) || stockQuantity < 0)) {
    errors.push('Quantité en stock invalide');
  }

  // Validation de la catégorie
  if (!categoryID || !mongoose.Types.ObjectId.isValid(categoryID)) {
    errors.push('ID de catégorie invalide');
  }

  // Validation du type de produit
  const validProductTypes = ['Raw Diamond', 'Cut Diamond', 'Ring', 'Necklace', 'Earrings', 'Bracelet', 'Pendant', 'Other Jewelry'];
  if (!productType || !validProductTypes.includes(productType)) {
    errors.push('Type de produit invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour la création d'une catégorie
 */
const validateCategoryCreation = (req, res, next) => {
  const { categoryName, description, parentCategoryID } = req.body;
  const errors = [];

  // Validation du nom de catégorie
  if (!categoryName || categoryName.trim().length < 2) {
    errors.push('Le nom de la catégorie doit contenir au moins 2 caractères');
  }

  if (categoryName && categoryName.length > 50) {
    errors.push('Le nom de la catégorie ne peut pas dépasser 50 caractères');
  }

  // Validation de la description
  if (description && description.length > 500) {
    errors.push('La description ne peut pas dépasser 500 caractères');
  }

  // Validation de la catégorie parent
  if (parentCategoryID && !mongoose.Types.ObjectId.isValid(parentCategoryID)) {
    errors.push('ID de catégorie parent invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour l'ajout d'un avis
 */
const validateReviewCreation = (req, res, next) => {
  const { productID, orderID, rating, title, comment } = req.body;
  const errors = [];

  // Validation du produit
  if (!productID || !mongoose.Types.ObjectId.isValid(productID)) {
    errors.push('ID de produit invalide');
  }

  // Validation de la commande
  if (!orderID || !mongoose.Types.ObjectId.isValid(orderID)) {
    errors.push('ID de commande invalide');
  }

  // Validation de la note
  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    errors.push('La note doit être comprise entre 1 et 5');
  }

  // Validation du titre
  if (!title || title.trim().length < 5) {
    errors.push('Le titre doit contenir au moins 5 caractères');
  }

  if (title && title.length > 100) {
    errors.push('Le titre ne peut pas dépasser 100 caractères');
  }

  // Validation du commentaire
  if (!comment || comment.trim().length < 10) {
    errors.push('Le commentaire doit contenir au moins 10 caractères');
  }

  if (comment && comment.length > 2000) {
    errors.push('Le commentaire ne peut pas dépasser 2000 caractères');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour l'ajout au panier
 */
const validateCartItem = (req, res, next) => {
  const { productId, quantity, selectedSize } = req.body;
  const errors = [];

  // Validation du produit
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    errors.push('ID de produit invalide');
  }

  // Validation de la quantité
  if (quantity !== undefined) {
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      errors.push('La quantité doit être comprise entre 1 et 10');
    }
  }

  // Validation de la taille (optionnelle)
  if (selectedSize && typeof selectedSize !== 'string') {
    errors.push('Taille sélectionnée invalide');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour la création d'une commande
 */
const validateOrderCreation = (req, res, next) => {
  const { shippingAddress, billingAddress, paymentMethod } = req.body;
  const errors = [];

  // Validation de l'adresse de livraison
  if (!shippingAddress) {
    errors.push('Adresse de livraison requise');
  } else {
    if (!shippingAddress.firstName || shippingAddress.firstName.trim().length < 2) {
      errors.push('Prénom requis dans l\'adresse de livraison');
    }
    if (!shippingAddress.lastName || shippingAddress.lastName.trim().length < 2) {
      errors.push('Nom requis dans l\'adresse de livraison');
    }
    if (!shippingAddress.street || shippingAddress.street.trim().length < 5) {
      errors.push('Adresse de rue requise');
    }
    if (!shippingAddress.city || shippingAddress.city.trim().length < 2) {
      errors.push('Ville requise');
    }
    if (!shippingAddress.zipCode || shippingAddress.zipCode.trim().length < 3) {
      errors.push('Code postal requis');
    }
  }

  // Validation de l'adresse de facturation
  if (!billingAddress) {
    errors.push('Adresse de facturation requise');
  }

  // Validation de la méthode de paiement
  if (!paymentMethod) {
    errors.push('Méthode de paiement requise');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Validation pour les paramètres de recherche
 */
const validateSearchParams = (req, res, next) => {
  const { page, limit, minPrice, maxPrice, rating } = req.query;
  const errors = [];

  // Validation de la pagination
  if (page && (isNaN(page) || page < 1)) {
    errors.push('Numéro de page invalide');
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    errors.push('Limite invalide (1-100)');
  }

  // Validation des prix
  if (minPrice && (isNaN(minPrice) || minPrice < 0)) {
    errors.push('Prix minimum invalide');
  }

  if (maxPrice && (isNaN(maxPrice) || maxPrice < 0)) {
    errors.push('Prix maximum invalide');
  }

  if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
    errors.push('Le prix minimum ne peut pas être supérieur au prix maximum');
  }

  // Validation de la note
  if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
    errors.push('Note invalide (1-5)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Paramètres de recherche invalides',
      errors: errors
    });
  }

  next();
};

/**
 * Middleware pour nettoyer et normaliser les données d'entrée
 */
const sanitizeInput = (req, res, next) => {
  // Fonction récursive pour nettoyer les objets
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Supprimer les espaces en début/fin et les caractères dangereux
        sanitized[key] = value.trim().replace(/[<>]/g, '');
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  // Nettoyer body, query et params
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

/**
 * Middleware pour valider les fichiers uploadés
 */
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(); // Pas de fichiers, continuer
    }

    const errors = [];

    req.files.forEach((file, index) => {
      // Vérifier le type de fichier
      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`Fichier ${index + 1}: Type de fichier non autorisé (${file.mimetype})`);
      }

      // Vérifier la taille
      if (file.size > maxSize) {
        errors.push(`Fichier ${index + 1}: Taille trop importante (max: ${maxSize / 1024 / 1024}MB)`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Fichiers invalides',
        errors: errors
      });
    }

    next();
  };
};

module.exports = {
  validateObjectId,
  validateUserRegistration,
  validateUserLogin,
  validateProductCreation,
  validateCategoryCreation,
  validateReviewCreation,
  validateCartItem,
  validateOrderCreation,
  validateSearchParams,
  sanitizeInput,
  validateFileUpload
};

