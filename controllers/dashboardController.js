// Contrôleur Dashboard pour ALMAS & DIMAS
// Fournit les données et statistiques pour les tableaux de bord admin et vendeur

const mongoose = require('mongoose');
const { User, Product, Order, Payment, Shipping, Review, Category } = require('../models');

/**
 * Dashboard administrateur - Vue d'ensemble complète
 * GET /api/dashboard/admin
 */
const getAdminDashboard = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Période en jours (7, 30, 90, 365)
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Statistiques générales
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Nouveaux utilisateurs par période
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Commandes par période
    const ordersInPeriod = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Revenus par période
    const revenueInPeriod = await Payment.aggregate([
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: startDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Répartition des utilisateurs par rôle
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Statuts des commandes
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top 5 des produits les plus vendus
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productID',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.finalPrice'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          totalSold: 1,
          totalRevenue: 1,
          currentPrice: '$product.price'
        }
      }
    ]);

    // Top 5 des vendeurs
    const topSellers = await Order.aggregate([
      {
        $group: {
          _id: '$sellerID',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          sellerName: '$seller.username',
          sellerEmail: '$seller.email',
          totalOrders: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Évolution des ventes par jour (derniers 30 jours)
    const salesTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Catégories les plus populaires
    const popularCategories = await Product.aggregate([
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.productID', '$$productId'] } } }
          ],
          as: 'orders'
        }
      },
      {
        $group: {
          _id: '$categoryID',
          productCount: { $sum: 1 },
          orderCount: { $sum: { $size: '$orders' } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          categoryName: '$category.categoryName',
          productCount: 1,
          orderCount: 1
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    // Commandes récentes (dernières 10)
    const recentOrders = await Order.find()
      .populate('userID', 'username email')
      .populate('sellerID', 'username')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber orderStatus finalAmount createdAt');

    // Avis récents nécessitant une modération
    const pendingReviews = await Review.find({ status: 'Pending' })
      .populate('userID', 'username')
      .populate('productID', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          newUsers,
          ordersInPeriod,
          revenueInPeriod: revenueInPeriod[0]?.total || 0,
          period: periodDays
        },
        charts: {
          usersByRole,
          ordersByStatus,
          salesTrend,
          popularCategories
        },
        topLists: {
          topProducts,
          topSellers
        },
        recent: {
          recentOrders,
          pendingReviews
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Dashboard vendeur - Vue spécifique au vendeur connecté
 * GET /api/dashboard/seller
 */
const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Statistiques du vendeur
    const totalProducts = await Product.countDocuments({ sellerID: sellerId });
    const activeProducts = await Product.countDocuments({ 
      sellerID: sellerId, 
      status: 'Active' 
    });
    const totalOrders = await Order.countDocuments({ sellerID: sellerId });
    const totalRevenue = await Order.aggregate([
      { $match: { sellerID: sellerId, orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Commandes par période
    const ordersInPeriod = await Order.countDocuments({
      sellerID: sellerId,
      createdAt: { $gte: startDate }
    });

    // Revenus par période
    const revenueInPeriod = await Order.aggregate([
      {
        $match: {
          sellerID: sellerId,
          orderStatus: { $ne: 'Cancelled' },
          createdAt: { $gte: startDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Statuts des commandes du vendeur
    const ordersByStatus = await Order.aggregate([
      { $match: { sellerID: sellerId } },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Produits les plus vendus du vendeur
    const topSellerProducts = await Order.aggregate([
      { $match: { sellerID: sellerId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productID',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.finalPrice'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          totalSold: 1,
          totalRevenue: 1,
          currentPrice: '$product.price',
          stockQuantity: '$product.stockQuantity'
        }
      }
    ]);

    // Évolution des ventes du vendeur
    const salesTrend = await Order.aggregate([
      {
        $match: {
          sellerID: sellerId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Commandes récentes du vendeur
    const recentOrders = await Order.find({ sellerID: sellerId })
      .populate('userID', 'username email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber orderStatus finalAmount createdAt');

    // Produits en rupture de stock
    const lowStockProducts = await Product.find({
      sellerID: sellerId,
      stockQuantity: { $lte: 5 },
      status: 'Active'
    }).select('name stockQuantity price').limit(10);

    // Avis récents sur les produits du vendeur
    const recentReviews = await Review.find()
      .populate({
        path: 'productID',
        match: { sellerID: sellerId },
        select: 'name'
      })
      .populate('userID', 'username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Filtrer les avis où le produit appartient au vendeur
    const sellerReviews = recentReviews.filter(review => review.productID);

    // Note moyenne des produits du vendeur
    const averageRating = await Review.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productID',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $match: { 'product.sellerID': sellerId, status: 'Approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Commandes nécessitant une action
    const pendingActions = await Order.find({
      sellerID: sellerId,
      orderStatus: { $in: ['Pending', 'Confirmed'] }
    }).countDocuments();

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          activeProducts,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          ordersInPeriod,
          revenueInPeriod: revenueInPeriod[0]?.total || 0,
          averageRating: averageRating[0]?.averageRating || 0,
          totalReviews: averageRating[0]?.totalReviews || 0,
          pendingActions,
          period: periodDays
        },
        charts: {
          ordersByStatus,
          salesTrend
        },
        topProducts: topSellerProducts,
        recent: {
          recentOrders,
          recentReviews: sellerReviews
        },
        alerts: {
          lowStockProducts
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard vendeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Statistiques détaillées pour l'admin
 * GET /api/dashboard/admin/stats
 */
const getDetailedStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Définir le groupement selon la période
    let groupId;
    switch (groupBy) {
      case 'hour':
        groupId = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupId = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupId = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        groupId = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupId = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    // Statistiques des commandes
    const orderStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          averageOrderValue: { $avg: '$finalAmount' },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Statistiques des utilisateurs
    const userStats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          newUsers: { $sum: 1 },
          newBuyers: {
            $sum: { $cond: [{ $eq: ['$role', 'Buyer'] }, 1, 0] }
          },
          newSellers: {
            $sum: { $cond: [{ $eq: ['$role', 'Seller'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    // Statistiques des produits
    const productStats = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          newProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        orders: orderStats,
        users: userStats,
        products: productStats,
        period: { startDate, endDate, groupBy }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques détaillées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Rapport de performance pour un vendeur spécifique
 * GET /api/dashboard/seller/:sellerId/performance
 */
const getSellerPerformance = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Vérifier que l'utilisateur peut accéder à ces données
    if (req.user.role !== 'Admin' && req.user._id.toString() !== sellerId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Informations du vendeur
    const seller = await User.findById(sellerId).select('username email createdAt');
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Vendeur non trouvé'
      });
    }

    // Performance des ventes
    const salesPerformance = await Order.aggregate([
      { $match: { sellerID: new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          averageOrderValue: { $avg: '$finalAmount' },
          completionRate: {
            $avg: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Performance des produits
    const productPerformance = await Product.aggregate([
      { $match: { sellerID: new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    // Évolution mensuelle
    const monthlyTrend = await Order.aggregate([
      {
        $match: {
          sellerID: new mongoose.Types.ObjectId(sellerId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        seller,
        performance: {
          sales: salesPerformance[0] || {},
          products: productPerformance[0] || {},
          monthlyTrend
        },
        period: periodDays
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la performance vendeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

module.exports = {
  getAdminDashboard,
  getSellerDashboard,
  getDetailedStats,
  getSellerPerformance
};



/**
 * Dashboard client - Vue spécifique au client connecté
 * GET /api/dashboard/client
 */
const getClientDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch user details
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    }

    // Total orders for the client
    const totalOrders = await Order.countDocuments({ userID: userId });

    // Total spent by the client
    const totalSpent = await Order.aggregate([
      { $match: { userID: userId, orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Recent orders for the client
    const recentOrders = await Order.find({ userID: userId })
      .populate('items.productID', 'name price images')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent reviews by the client
    const recentReviews = await Review.find({ userID: userId })
      .populate('productID', 'name images')
      .sort({ createdAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        user,
        overview: {
          totalOrders,
          totalSpent: totalSpent[0]?.total || 0,
          period: periodDays
        },
        recent: {
          recentOrders,
          recentReviews
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du dashboard client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

module.exports = {
  getAdminDashboard,
  getSellerDashboard,
  getDetailedStats,
  getSellerPerformance,
  getClientDashboard
};

