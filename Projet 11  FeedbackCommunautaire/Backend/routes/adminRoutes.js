const express = require('express');
const router = express.Router();
const { proteger, autoriser } = require('./auth');
const Signalement = require('../models/Signalement');
const Utilisateur = require('../models/Utilisateur');
const Statistique = require('../models/Statistique');

// Middleware pour vérifier que c'est un admin
const isAdmin = [proteger, autoriser('admin')];

// Dashboard admin (stats complètes)
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const totalSignalements = await Signalement.countDocuments();
        const signalementsResolus = await Signalement.countDocuments({ statut: 'Résolu' });
        const signalementsEnCours = await Signalement.countDocuments({ statut: 'En cours' });
        const utilisateursInscrits = await Utilisateur.countDocuments();
        
        // Derniers signalements
        const derniersSignalements = await Signalement.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('utilisateurId', 'nom prenom email');
        
        // Top quartiers
        const topQuartiers = await Signalement.aggregate([
            { $group: { _id: '$localisation.quartier', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        res.json({
            success: true,
            data: {
                stats: {
                    totalSignalements,
                    signalementsResolus,
                    signalementsEnCours,
                    utilisateursInscrits,
                    tauxResolution: totalSignalements > 0 
                        ? ((signalementsResolus / totalSignalements) * 100).toFixed(1) 
                        : 0
                },
                derniersSignalements,
                topQuartiers: topQuartiers.map(q => ({
                    quartier: q._id,
                    count: q.count
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération du dashboard' 
        });
    }
});

// Liste de tous les utilisateurs (pour admin)
router.get('/utilisateurs', isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, role } = req.query;
        
        const query = {};
        if (role) query.role = role;
        
        const utilisateurs = await Utilisateur.find(query)
            .select('-motDePasse')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await Utilisateur.countDocuments(query);
        
        res.json({
            success: true,
            data: utilisateurs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des utilisateurs' 
        });
    }
});

// Changer le rôle d'un utilisateur
router.put('/utilisateurs/:id/role', isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!['citoyen', 'agent', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rôle invalide'
            });
        }
        
        const utilisateur = await Utilisateur.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-motDePasse');
        
        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }
        
        res.json({
            success: true,
            utilisateur,
            message: `Rôle mis à jour: ${role}`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour du rôle' 
        });
    }
});

// Liste de tous les signalements (pour admin)
router.get('/signalements', isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, statut, service, quartier } = req.query;
        
        const query = {};
        if (statut) query.statut = statut;
        if (service) query.service = service;
        if (quartier) query['localisation.quartier'] = quartier;
        
        const signalements = await Signalement.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('utilisateurId', 'nom prenom email');
        
        const total = await Signalement.countDocuments(query);
        
        res.json({
            success: true,
            data: signalements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des signalements' 
        });
    }
});

// Mettre à jour un signalement (admin uniquement)
router.patch('/signalements/:id', isAdmin, async (req, res) => {
    try {
        const { statut, priorite, notesAdmin } = req.body;
        
        const signalement = await Signalement.findById(req.params.id);
        
        if (!signalement) {
            return res.status(404).json({
                success: false,
                message: 'Signalement non trouvé'
            });
        }
        
        if (statut) signalement.statut = statut;
        if (priorite) signalement.priorite = priorite;
        
        if (statut === 'Résolu') {
            signalement.dateResolution = new Date();
        }
        
        if (notesAdmin) {
            signalement.notesAdmin.push({
                texte: notesAdmin,
                auteur: req.user.nom + ' ' + req.user.prenom,
                date: new Date()
            });
        }
        
        await signalement.save();
        
        res.json({
            success: true,
            data: signalement,
            message: 'Signalement mis à jour'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour du signalement' 
        });
    }
});

// Supprimer un signalement (admin uniquement)
router.delete('/signalements/:id', isAdmin, async (req, res) => {
    try {
        const signalement = await Signalement.findByIdAndDelete(req.params.id);
        
        if (!signalement) {
            return res.status(404).json({
                success: false,
                message: 'Signalement non trouvé'
            });
        }
        
        res.json({
            success: true,
            message: 'Signalement supprimé'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression du signalement' 
        });
    }
});

// Statistiques détaillées (admin)
router.get('/statistiques-detaillees', isAdmin, async (req, res) => {
    try {
        // Stats par service
        const services = ['Santé', 'Éducation', 'Eau et assainissement', 'Énergie', 'Transport', 'Sécurité', 'Administration'];
        const statsParService = [];
        
        for (const service of services) {
            const count = await Signalement.countDocuments({ service });
            const resolus = await Signalement.countDocuments({ service, statut: 'Résolu' });
            statsParService.push({
                service,
                total: count,
                resolus,
                tauxResolution: count > 0 ? ((resolus / count) * 100).toFixed(1) : 0
            });
        }
        
        // Stats par quartier
        const statsParQuartier = await Signalement.aggregate([
            {
                $group: {
                    _id: '$localisation.quartier',
                    total: { $sum: 1 },
                    resolus: {
                        $sum: { $cond: [{ $eq: ['$statut', 'Résolu'] }, 1, 0] }
                    }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({
            success: true,
            data: {
                parService: statsParService,
                parQuartier: statsParQuartier
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des statistiques' 
        });
    }
});

module.exports = router;