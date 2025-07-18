// Contrôleur d'authentification pour Gems Revived
// Gère l'enregistrement, la connexion et la gestion des tokens JWT

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

/**
 * Générer un token JWT pour un utilisateur
 * @param {Object} user - Objet utilisateur
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d' // Token valide pendant 7 jours
    }
  );
};

/**
 * Enregistrement d'un nouvel utilisateur
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role = 'Buyer', phone, shippingAddress, billingAddress } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Un compte avec cet email existe déjà'
          : 'Ce nom d\'utilisateur est déjà pris'
      });
    }

    // Créer le nouvel utilisateur
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Le hachage se fait automatiquement dans le modèle
      role: role,
      phone: phone,
      shippingAddress: shippingAddress || {},
      billingAddress: billingAddress || {},
      accountStatus: 'Active'
    });

    await newUser.save();

    // Générer le token JWT
    const token = generateToken(newUser);

    // Retourner les informations de l'utilisateur (sans le mot de passe)
    const userResponse = newUser.getPublicProfile();

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: userResponse,
        token: token
      }
    });

    console.log(`[AUTH] New user registered: ${username} (${email})`);

  } catch (error) {
    console.error(`[AUTH] Error during registration for ${email}:`, error);
    
    // Gestion des erreurs de validation MongoDB
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Connexion d'un utilisateur
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Rechercher l'utilisateur par email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le statut du compte
    if (user.accountStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé ou suspendu. Contactez l\'administrateur.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Mettre à jour la date de dernière connexion
    await user.updateLastLogin();

    // Générer le token JWT
    const token = generateToken(user);

    // Retourner les informations de l'utilisateur
    const userResponse = user.getPublicProfile();

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userResponse,
        token: token
      }
    });

    console.log(`[AUTH] Login successful: ${user.username} (${user.email})`);

  } catch (error) {
    console.error(`[AUTH] Error during login for ${email}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Obtenir les informations de l'utilisateur connecté
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // L'utilisateur est déjà disponible via le middleware d'authentification
    const userResponse = req.user.getPublicProfile();

    res.json({
      success: true,
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Mettre à jour le profil de l'utilisateur connecté
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { username, phone, shippingAddress, billingAddress } = req.body;
    const userId = req.user._id;

    // Vérifier si le nouveau nom d'utilisateur est déjà pris
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ 
        username: username,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Ce nom d\'utilisateur est déjà pris'
        });
      }
    }

    // Mettre à jour les champs modifiables
    const updateData = {};
    if (username) updateData.username = username.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (shippingAddress) updateData.shippingAddress = shippingAddress;
    if (billingAddress) updateData.billingAddress = billingAddress;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    const userResponse = updatedUser.getPublicProfile();

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: userResponse
      }
    });

    console.log(`✅ Profil mis à jour: ${updatedUser.username}`);

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Changer le mot de passe de l'utilisateur connecté
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation des données
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(userId);

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword; // Le hachage se fait automatiquement
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

    console.log(`✅ Mot de passe changé: ${user.username}`);

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Déconnexion (côté client principalement)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Dans une implémentation avec blacklist de tokens, on ajouterait le token à la blacklist
    // Pour l'instant, la déconnexion se fait côté client en supprimant le token

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });

    console.log(`✅ Déconnexion: ${req.user.username}`);

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Vérifier la validité d'un token
 * POST /api/auth/verify-token
 */
const verifyToken = async (req, res) => {
  try {
    // Si on arrive ici, c'est que le token est valide (middleware d'auth)
    const userResponse = req.user.getPublicProfile();

    res.json({
      success: true,
      message: 'Token valide',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Demander une réinitialisation de mot de passe
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Pour des raisons de sécurité, on retourne toujours le même message
    // même si l'utilisateur n'existe pas
    res.json({
      success: true,
      message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé'
    });

    if (user) {
      // Générer un token de réinitialisation
      const resetToken = jwt.sign(
        { userId: user._id, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Sauvegarder le token dans la base de données
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
      await user.save();

      // TODO: Envoyer l'email avec le lien de réinitialisation
      console.log(`🔑 Token de réinitialisation généré pour: ${user.email}`);
      console.log(`Reset URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
    }

  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Réinitialiser le mot de passe
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Token invalide'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({
      _id: decoded.userId,
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

    console.log(`✅ Mot de passe réinitialisé: ${user.email}`);

  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  verifyToken,
  forgotPassword,
  resetPassword
};

