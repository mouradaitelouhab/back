// Serveur principal pour ALMAS & DIMAS
// Point d'entrée de l'application backend Node.js avec Express

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require("path");
const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

// Charger les variables d'environnement
dotenv.config();

// Importation des routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

// Importation des middlewares
const { sanitizeInput } = require('./middleware/validation');

// Importation de la configuration de base de données
const { connectDB } = require('./config/database');

// Initialisation de l'application Express
const app = express();

// Configuration du port
const PORT = process.env.PORT || 5000;

// Connexion à la base de données MongoDB
connectDB();

// Configuration CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://frontend2-81g7.onrender.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(helmet());
app.use(hpp());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply to all requests
app.use(limiter);

// Parser JSON avec limite de taille
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de nettoyage des données
app.use(sanitizeInput);

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, 'static')));

// Middleware de logging pour le développement
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Route de santé pour vérifier que le serveur fonctionne
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur ALMAS & DIMAS opérationnel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Middleware de gestion d'erreurs globales
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error);

  // Erreur de validation MongoDB
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors
    });
  }

  // Erreur de cast MongoDB (ID invalide)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID invalide'
    });
  }

  // Erreur de duplication MongoDB
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} déjà existant`
    });
  }

  // Erreur JWT
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

  // Erreur générique
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Gestion des promesses rejetées non capturées
process.on('unhandledRejection', (err, promise) => {
  console.error('Promesse rejetée non gérée:', err.message);
  // Fermer le serveur proprement
  server.close(() => {
    process.exit(1);
  });
});

// Gestion des exceptions non capturées
process.on('uncaughtException', (err) => {
  console.error('Exception non capturée:', err.message);
  process.exit(1);
});

// Démarrage du serveur
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost';
const server = app.listen(PORT, '0.0.0.0', () => {
  const baseURL = `http://${HOST}:${PORT}`;

  console.log(`
🚀 Serveur ALMAS & DIMAS démarré avec succès!
📍 Port: ${PORT}
🌍 Environnement: ${process.env.NODE_ENV || 'development'}
🔗 URL: ${baseURL}
📊 Dashboard Admin: ${baseURL}/api/dashboard/admin
👤 Dashboard Vendeur: ${baseURL}/api/dashboard/seller
🏥 Health Check: ${baseURL}/health
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

module.exports = app;
