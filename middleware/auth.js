// Middleware d'authentification JWT pour Gems Revived
// Gère l'authentification et l'autorisation des utilisateurs

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware pour vérifier le token JWT
 * Extrait le token du header Authorization et vérifie sa validité
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'accès requis'
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer les informations de l'utilisateur
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si le compte est actif
    if (user.accountStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé ou suspendu'
      });
    }

    // Ajouter les informations de l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Middleware pour vérifier les rôles d'utilisateur
 * @param {Array} allowedRoles - Rôles autorisés (ex: ['Admin', 'Seller'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 */
const requireAdmin = requireRole(['Admin']);

/**
 * Middleware pour vérifier si l'utilisateur est un vendeur ou un admin
 */
const requireSeller = requireRole(['Seller', 'Admin']);

/**
 * Middleware pour vérifier si l'utilisateur peut accéder à une ressource
 * Permet l'accès si l'utilisateur est propriétaire de la ressource ou admin
 * @param {String} resourceUserField - Nom du champ contenant l'ID utilisateur dans la ressource
 */
const requireOwnershipOrAdmin = (resourceUserField = 'userID') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les admins ont accès à tout
    if (req.user.role === 'Admin') {
      return next();
    }

    // Vérifier la propriété de la ressource
    const resourceUserId = req.body[resourceUserField] || 
                          req.params[resourceUserField] || 
                          req.query[resourceUserField];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur de la ressource manquant'
      });
    }

    if (resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette ressource'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur peut gérer un produit
 * Permet l'accès si l'utilisateur est le vendeur du produit ou admin
 */
const requireProductOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les admins ont accès à tout
    if (req.user.role === 'Admin') {
      return next();
    }

    const { Product } = require('../models');
    const productId = req.params.productId || req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID du produit manquant'
      });
    }

    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    if (product.sellerID.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à gérer ce produit'
      });
    }

    // Ajouter le produit à la requête pour éviter une nouvelle requête
    req.product = product;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété du produit:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Middleware pour vérifier si l'utilisateur peut gérer une commande
 * Permet l'accès si l'utilisateur est l'acheteur, le vendeur ou admin
 */
const requireOrderAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Les admins ont accès à tout
    if (req.user.role === 'Admin') {
      return next();
    }

    const { Order } = require('../models');
    const orderId = req.params.orderId || req.params.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ID de la commande manquant'
      });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    const userId = req.user._id.toString();
    const isOwner = order.userID.toString() === userId;
    const isSeller = order.sellerID.toString() === userId;

    if (!isOwner && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à accéder à cette commande'
      });
    }

    // Ajouter la commande à la requête
    req.order = order;
    req.isOrderOwner = isOwner;
    req.isOrderSeller = isSeller;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès à la commande:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Middleware optionnel pour l'authentification
 * N'interrompt pas la requête si aucun token n'est fourni
 * Utile pour les endpoints qui peuvent fonctionner avec ou sans authentification
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // Pas de token, continuer sans utilisateur
      req.user = null;
      return next();
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.accountStatus === 'Active') {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans utilisateur
    req.user = null;
    next();
  }
};

/**
 * Middleware pour limiter le taux de requêtes par utilisateur
 * Simple implémentation en mémoire (pour production, utiliser Redis)
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Nettoyer les anciennes entrées
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSeller,
  requireOwnershipOrAdmin,
  requireProductOwnership,
  requireOrderAccess,
  optionalAuth,
  rateLimitByUser
};

