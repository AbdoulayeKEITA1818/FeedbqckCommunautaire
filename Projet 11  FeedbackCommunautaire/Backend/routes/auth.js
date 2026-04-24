const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

// Middleware pour protéger les routes
const proteger = async (req, res, next) => {
    try {
        let token;

        // Vérifier le token dans les headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Vérifier le token dans les cookies
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé. Veuillez vous connecter.'
            });
        }

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Récupérer l'utilisateur
        const utilisateur = await Utilisateur.findById(decoded.id);
        
        if (!utilisateur) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier si le compte est actif
        if (!utilisateur.estActif) {
            return res.status(403).json({
                success: false,
                message: 'Votre compte a été désactivé'
            });
        }

        // Ajouter l'utilisateur à la requête
        req.user = utilisateur;
        next();

    } catch (error) {
        console.error('Erreur authentification:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token invalide'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expiré. Veuillez vous reconnecter.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur d\'authentification'
        });
    }
};

// Middleware pour autoriser des rôles spécifiques
const autoriser = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Le rôle ${req.user.role} n'a pas la permission d'accéder à cette ressource`
            });
        }

        next();
    };
};

// Middleware pour vérifier la propriété
const verifierPropriete = (model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const Model = require(`../models/${model}`);
            const document = await Model.findById(req.params[paramName]);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Ressource non trouvée'
                });
            }

            // Vérifier si l'utilisateur est le propriétaire
            if (document.utilisateurId && document.utilisateurId.toString() !== req.user.id) {
                // Vérifier si l'utilisateur est admin
                if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                    return res.status(403).json({
                        success: false,
                        message: 'Vous n\'êtes pas autorisé à modifier cette ressource'
                    });
                }
            }

            req.document = document;
            next();

        } catch (error) {
            console.error('Erreur vérification propriété:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur de vérification des permissions'
            });
        }
    };
};

module.exports = {
    proteger,
    autoriser,
    verifierPropriete
};