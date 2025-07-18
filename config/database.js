// Configuration de la connexion à MongoDB
// Ce fichier gère la connexion à la base de données MongoDB pour notre application

const mongoose = require('mongoose');

/**
 * Fonction pour établir la connexion à MongoDB
 * Utilise les variables d'environnement pour la configuration
 */
const connectDB = async () => {
  try {
    // Skip MongoDB connection if URI is not provided
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MongoDB URI not provided, running without database');
      return;
    }

    // Tentative de connexion à MongoDB avec l'URI définie dans .env
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Options de connexion pour optimiser les performances et la stabilité
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connecté avec succès: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.name}`);
    
    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose déconnecté de MongoDB');
    });

  } catch (error) {
    console.error('❌ Erreur lors de la connexion à MongoDB:', error.message);
    console.log('⚠️  Continuing without database connection...');
    // Don't exit the process, just continue without database
  }
};

/**
 * Fonction pour fermer proprement la connexion à la base de données
 * Utile lors de l'arrêt de l'application
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée proprement');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de la connexion:', error.message);
  }
};

// Gestion de l'arrêt gracieux de l'application
process.on('SIGINT', async () => {
  console.log('\n🛑 Signal SIGINT reçu, fermeture de l\'application...');
  await disconnectDB();
  process.exit(0);
});

module.exports = { connectDB, disconnectDB };

