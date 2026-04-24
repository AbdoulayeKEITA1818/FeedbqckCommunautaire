const express = require('express');
const router = express.Router();
const Statistique = require('../models/Statistique');
const Signalement = require('../models/Signalement');
const Utilisateur = require('../models/Utilisateur');

// Stats globales
router.get('/globales', async (req, res) => {
    try {
        const totalSignalements = await Signalement.countDocuments();
        const signalementsResolus = await Signalement.countDocuments({ statut: 'Résolu' });
        const signalementsEnCours = await Signalement.countDocuments({ statut: 'En cours' });
        const signalementsReçus = await Signalement.countDocuments({ statut: 'Reçu' });
        const signalementsEnAttente = await Signalement.countDocuments({ statut: 'En attente' });
        const utilisateursInscrits = await Utilisateur.countDocuments();
        
        const tauxResolution = totalSignalements > 0 
            ? ((signalementsResolus / totalSignalements) * 100).toFixed(1) 
            : 0;

        res.json({
            success: true,
            data: {
                totalSignalements,
                signalementsResolus,
                signalementsEnCours,
                signalementsReçus,
                signalementsEnAttente,
                utilisateursInscrits,
                tauxResolution: parseFloat(tauxResolution)
            }
        });
    } catch (error) {
        console.error('Erreur stats globales:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des statistiques' 
        });
    }
});

// Stats par service
router.get('/service', async (req, res) => {
    try {
        const services = ['Santé', 'Éducation', 'Eau et assainissement', 'Énergie', 'Transport', 'Sécurité', 'Administration'];
        const statsParService = [];
        
        for (const service of services) {
            const count = await Signalement.countDocuments({ service });
            if (count > 0) {
                statsParService.push({ service, count });
            }
        }
        
        // Trier par nombre décroissant
        statsParService.sort((a, b) => b.count - a.count);
        
        res.json({
            success: true,
            data: statsParService
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des stats par service' 
        });
    }
});

// Stats par quartier
router.get('/quartier', async (req, res) => {
    try {
        const resultats = await Signalement.aggregate([
            {
                $group: {
                    _id: '$localisation.quartier',
                    count: { $sum: 1 },
                    resolus: {
                        $sum: { $cond: [{ $eq: ['$statut', 'Résolu'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        const statsParQuartier = resultats.map(r => ({
            quartier: r._id,
            total: r.count,
            resolus: r.resolus
        }));
        
        res.json({
            success: true,
            data: statsParQuartier
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des stats par quartier' 
        });
    }
});

// Stats mensuelles (évolution sur 12 mois)
router.get('/mensuelles', async (req, res) => {
    try {
        const aujourdHui = new Date();
        const moisDernier = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth() - 11, 1);
        
        const resultats = await Signalement.aggregate([
            {
                $match: {
                    createdAt: { $gte: moisDernier }
                }
            },
            {
                $group: {
                    _id: {
                        annee: { $year: '$createdAt' },
                        mois: { $month: '$createdAt' }
                    },
                    total: { $sum: 1 },
                    resolus: {
                        $sum: { $cond: [{ $eq: ['$statut', 'Résolu'] }, 1, 0] }
                    }
                }
            },
            { $sort: { '_id.annee': 1, '_id.mois': 1 } }
        ]);
        
        const statsMensuelles = resultats.map(r => ({
            annee: r._id.annee,
            mois: r._id.mois,
            total: r.total,
            resolus: r.resolus
        }));
        
        res.json({
            success: true,
            data: statsMensuelles
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des stats mensuelles' 
        });
    }
});

// Stats par statut
router.get('/statut', async (req, res) => {
    try {
        const resultats = await Signalement.aggregate([
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const statsParStatut = {};
        resultats.forEach(r => {
            statsParStatut[r._id] = r.count;
        });
        
        res.json({
            success: true,
            data: statsParStatut
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des stats par statut' 
        });
    }
});

// Évolution sur 7 jours
router.get('/evolution-7-jours', async (req, res) => {
    try {
        const aujourdHui = new Date();
        const ilYa7Jours = new Date(aujourdHui);
        ilYa7Jours.setDate(ilYa7Jours.getDate() - 6);
        ilYa7Jours.setHours(0, 0, 0, 0);
        
        const resultats = await Signalement.aggregate([
            {
                $match: {
                    createdAt: { $gte: ilYa7Jours }
                }
            },
            {
                $group: {
                    _id: {
                        annee: { $year: '$createdAt' },
                        mois: { $month: '$createdAt' },
                        jour: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.annee': 1, '_id.mois': 1, '_id.jour': 1 } }
        ]);
        
        // Compléter avec des zéros pour les jours sans signalements
        const evolution = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(aujourdHui);
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
            
            const trouve = resultats.find(r => 
                r._id.jour === date.getDate() && 
                r._id.mois === date.getMonth() + 1 && 
                r._id.annee === date.getFullYear()
            );
            
            evolution.push({
                date: dateStr,
                count: trouve ? trouve.count : 0
            });
        }
        
        res.json({
            success: true,
            data: evolution
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération de l\'évolution' 
        });
    }
});

module.exports = router;