// Index des modèles - Point d'entrée centralisé pour tous les modèles de données
// Facilite l'importation et la gestion des modèles dans l'application

// Importation de tous les modèles
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Order = require('./Order');
const Cart = require("./Cart");
const Review = require('./Review');
const Wishlist = require('./Wishlist');
const Payment = require('./Payment');
const Shipping = require('./Shipping');

// Exportation de tous les modèles
module.exports = {
  User,
  Category,
  Product,
  Order,
  Cart,
  Review,
  Wishlist,
  Payment,
  Shipping
};

// Fonction utilitaire pour initialiser tous les modèles
// Utile pour s'assurer que tous les modèles sont chargés et leurs relations établies
const initializeModels = () => {
  console.log('📦 Initialisation des modèles de données...');
  
  const models = {
    User,
    Category,
    Product,
    Order,
    Cart,
    Review,
    Wishlist,
    Payment,
    Shipping
  };

  // Vérifier que tous les modèles sont bien chargés
  Object.keys(models).forEach(modelName => {
    if (models[modelName]) {
      console.log(`✅ Modèle ${modelName} chargé avec succès`);
    } else {
      console.error(`❌ Erreur lors du chargement du modèle ${modelName}`);
    }
  });

  console.log('📦 Tous les modèles ont été initialisés');
  return models;
};

// Fonction pour obtenir des statistiques sur tous les modèles
const getModelsStats = async () => {
  try {
    const stats = {};
    
    // Compter les documents dans chaque collection
    stats.users = await User.countDocuments();
    stats.categories = await Category.countDocuments();
    stats.products = await Product.countDocuments();
    stats.orders = await Order.countDocuments();
    stats.carts = await Cart.countDocuments();
    stats.reviews = await Review.countDocuments();
    stats.wishlists = await Wishlist.countDocuments();
    stats.payments = await Payment.countDocuments();
    stats.shippings = await Shipping.countDocuments();

    return stats;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des modèles:', error);
    throw error;
  }
};

// Fonction pour nettoyer les données de test (à utiliser avec précaution)
const cleanupTestData = async () => {
  console.log('🧹 Nettoyage des données de test...');
  
  try {
    // Supprimer toutes les données de test (attention: destructif!)
    await Review.deleteMany({});
    await Payment.deleteMany({});
    await Shipping.deleteMany({});
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({ role: { $ne: 'Admin' } }); // Garder les admins
    
    console.log('✅ Données de test supprimées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des données:', error);
    throw error;
  }
};

// Exporter les fonctions utilitaires
module.exports.initializeModels = initializeModels;
module.exports.getModelsStats = getModelsStats;
module.exports.cleanupTestData = cleanupTestData;

