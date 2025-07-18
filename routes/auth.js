// Routes d'authentification pour Gems Revived
// Gère toutes les routes liées à l'authentification des utilisateurs

const express = require('express');
const router = express.Router();

// Importation des contrôleurs et middlewares
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  sanitizeInput 
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Enregistrer un nouvel utilisateur
 * @access  Public
 */
router.post('/register', 
  sanitizeInput,
  validateUserRegistration,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Connecter un utilisateur
 * @access  Public
 */
router.post('/login',
  sanitizeInput,
  validateUserLogin,
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  authController.getMe
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  sanitizeInput,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Changer le mot de passe de l'utilisateur connecté
 * @access  Private
 */
router.put('/change-password',
  authenticateToken,
  sanitizeInput,
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnecter l'utilisateur
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Vérifier la validité d'un token
 * @access  Private
 */
router.post('/verify-token',
  authenticateToken,
  authController.verifyToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demander une réinitialisation de mot de passe
 * @access  Public
 */
router.post('/forgot-password',
  sanitizeInput,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe avec un token
 * @access  Public
 */
router.post('/reset-password',
  sanitizeInput,
  authController.resetPassword
);

module.exports = router;

