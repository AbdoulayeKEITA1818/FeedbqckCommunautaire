const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { proteger, autoriser } = require('./auth');

// Validation pour l'inscription
const validationInscription = [
    body('email').isEmail().withMessage('Email invalide'),
    body('motDePasse').isLength({ min: 6 }).withMessage('Mot de passe trop court'),
    body('nom').notEmpty().withMessage('Nom requis'),
    body('prenom').notEmpty().withMessage('Prénom requis')
];

// Inscription
router.post('/register', validationInscription, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, motDePasse, nom, prenom, telephone, quartier } = req.body;
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await Utilisateur.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cet email est déjà utilisé' 
            });
        }

        const user = new Utilisateur({ 
            email, 
            motDePasse, 
            nom, 
            prenom, 
            telephone, 
            quartier 
        });
        await user.save();

        // Générer le token JWT
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'secret_dev', 
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
                quartier: user.quartier
            },
            message: 'Inscription réussie'
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'inscription' 
        });
    }
});

// Connexion
router.post('/login', async (req, res) => {
    try {
        const { email, motDePasse } = req.body;
        
        if (!email || !motDePasse) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        const user = await Utilisateur.findOne({ email });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        const motDePasseValide = await user.verifierMotDePasse(motDePasse);
        
        if (!motDePasseValide) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'secret_dev', 
            { expiresIn: '7d' }
        );

        // Mettre à jour la dernière connexion
        user.derniereConnexion = new Date();
        await user.save();

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
                quartier: user.quartier,
                photoProfil: user.photoProfil
            },
            message: 'Connexion réussie'
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la connexion' 
        });
    }
});

// Vérifier le token (pour maintenir la session)
router.get('/verify', proteger, async (req, res) => {
    try {
        const user = await Utilisateur.findById(req.user._id).select('-motDePasse');
        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                nom: user.nom,
                prenom: user.prenom,
                role: user.role,
                quartier: user.quartier,
                photoProfil: user.photoProfil
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur de vérification' 
        });
    }
});

// Obtenir le profil d'un utilisateur
router.get('/profile', proteger, async (req, res) => {
    try {
        const user = await Utilisateur.findById(req.user._id)
            .select('-motDePasse')
            .populate('signalementsSoumis', 'service description statut createdAt codeSuivi');
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération du profil' 
        });
    }
});

// Mettre à jour le profil
router.put('/profile', proteger, async (req, res) => {
    try {
        const { telephone, quartier, preferences } = req.body;
        
        const user = await Utilisateur.findByIdAndUpdate(
            req.user._id,
            { telephone, quartier, preferences },
            { new: true, runValidators: true }
        ).select('-motDePasse');
        
        res.json({
            success: true,
            user,
            message: 'Profil mis à jour'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour du profil' 
        });
    }
});

// Mot de passe oublié (envoi d'email)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await Utilisateur.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Aucun compte trouvé avec cet email'
            });
        }

        // Générer un code de vérification
        const code = user.genererCodeVerification();
        await user.save();

        // TODO: Envoyer l'email avec le code
        // await envoyerEmailReset(user.email, code);

        res.json({
            success: true,
            message: 'Code de réinitialisation envoyé (à implémenter)'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la demande de réinitialisation' 
        });
    }
});

// Réinitialiser le mot de passe
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { motDePasse } = req.body;
        
        if (!motDePasse || motDePasse.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Le mot de passe doit contenir au moins 6 caractères'
            });
        }

        // TODO: Implémenter la vérification du token de réinitialisation
        // Pour l'instant, on utilise une approche simplifiée

        res.json({
            success: true,
            message: 'Mot de passe réinitialisé (à implémenter)'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la réinitialisation' 
        });
    }
});

module.exports = router;