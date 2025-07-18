// Routes du Dashboard pour Gems Revived
// Fournit les endpoints pour les tableaux de bord administrateur et vendeur

const express = require('express');
const router = express.Router();

// Importation des contrôleurs et middlewares
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireAdmin, requireSeller } = require('../middleware/auth');
const { validateObjectId, sanitizeInput } = require('../middleware/validation');

/**
 * @route   GET /api/dashboard/admin
 * @desc    Obtenir le tableau de bord administrateur
 * @access  Private (Admin seulement)
 */
router.get('/admin',
  authenticateToken,
  requireAdmin,
  sanitizeInput,
  dashboardController.getAdminDashboard
);

/**
 * @route   GET /api/dashboard/seller
 * @desc    Obtenir le tableau de bord vendeur
 * @access  Private (Vendeur ou Admin)
 */
router.get('/seller',
  authenticateToken,
  requireSeller,
  sanitizeInput,
  dashboardController.getSellerDashboard
);

/**
 * @route   GET /api/dashboard/admin/stats
 * @desc    Obtenir des statistiques détaillées pour l'admin
 * @access  Private (Admin seulement)
 */
router.get('/admin/stats',
  authenticateToken,
  requireAdmin,
  sanitizeInput,
  dashboardController.getDetailedStats
);

/**
 * @route   GET /api/dashboard/seller/:sellerId/performance
 * @desc    Obtenir le rapport de performance d'un vendeur spécifique
 * @access  Private (Admin ou le vendeur concerné)
 */
/*
router.get('/seller/:sellerId/performance',
  authenticateToken,
  validateObjectId('sellerId'),
  sanitizeInput,
  dashboardController.getSellerPerformance
);
*/

module.exports = router;



/**
 * @route   GET /api/dashboard/client
 * @desc    Obtenir le tableau de bord client
 * @access  Private (Client seulement)
 */
router.get("/client",
  authenticateToken,
  sanitizeInput,
  dashboardController.getClientDashboard
);


