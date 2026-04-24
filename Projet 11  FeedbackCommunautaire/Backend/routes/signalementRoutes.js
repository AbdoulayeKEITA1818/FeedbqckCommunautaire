const express = require('express');
const router = express.Router();
const Signalement = require('../models/Signalement');
const { body, validationResult } = require('express-validator');

// Middleware de validation
const validateSignalement = [
    body('service').isIn(['Santé', 'Éducation', 'Eau et assainissement', 'Énergie', 'Transport', 'Sécurité', 'Administration']),
    body('description').isLength({ min: 20 }),
    body('localisation.quartier').notEmpty(),
    body('emailCitoyen').optional().isEmail()
];

// Créer un nouveau signalement
router.post('/', validateSignalement, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const signalement = new Signalement({
            ...req.body,
            statut: 'Reçu',
            priorite: determinerPriorite(req.body)
        });

        await signalement.save();
        
        // TODO: Envoyer un email de confirmation
        // TODO: Notifier les agents concernés
        
        res.status(201).json({
            success: true,
            data: signalement,
            message: 'Signalement créé avec succès',
            codeSuivi: signalement.codeSuivi
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Récupérer tous les signalements (avec pagination)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, service, statut, quartier } = req.query;
        
        const query = {};
        if (service) query.service = service;
        if (statut) query.statut = statut;
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
        res.status(500).json({ success: false, message: error.message });
    }
});

// Récupérer un signalement par ID
router.get('/:id', async (req, res) => {
    try {
        const signalement = await Signalement.findById(req.params.id);
        
        if (!signalement) {
            return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
        }
        
        res.json({ success: true, data: signalement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mettre à jour le statut d'un signalement
router.patch('/:id/statut', async (req, res) => {
    try {
        const { statut } = req.body;
        const validStatuts = ['Reçu', 'En cours', 'Résolu', 'En attente', 'Archivé'];
        
        if (!validStatuts.includes(statut)) {
            return res.status(400).json({ success: false, message: 'Statut invalide' });
        }
        
        const signalement = await Signalement.findById(req.params.id);
        
        if (!signalement) {
            return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
        }
        
        signalement.statut = statut;
        if (statut === 'Résolu') {
            signalement.dateResolution = new Date();
        }
        
        await signalement.save();
        
        // TODO: Notifier l'utilisateur du changement de statut
        
        res.json({ 
            success: true, 
            data: signalement,
            message: `Statut mis à jour: ${statut}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ajouter un commentaire à un signalement
router.post('/:id/commentaires', async (req, res) => {
    try {
        const { texte, utilisateurId } = req.body;
        
        if (!texte || !utilisateurId) {
            return res.status(400).json({ success: false, message: 'Texte et utilisateur requis' });
        }
        
        const signalement = await Signalement.findById(req.params.id);
        
        if (!signalement) {
            return res.status(404).json({ success: false, message: 'Signalement non trouvé' });
        }
        
        signalement.commentaires.push({
            utilisateurId,
            texte,
            likes: 0
        });
        
        await signalement.save();
        
        res.json({ 
            success: true, 
            data: signalement.commentaires,
            message: 'Commentaire ajouté'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rechercher des signalements par quartier ou service
router.get('/recherche', async (req, res) => {
    try {
        const { q, service, quartier, dateDebut, dateFin } = req.query;
        
        const query = {};
        
        if (q) {
            query.$or = [
                { description: { $regex: q, $options: 'i' } },
                { 'localisation.quartier': { $regex: q, $options: 'i' } }
            ];
        }
        
        if (service) query.service = service;
        if (quartier) query['localisation.quartier'] = quartier;
        
        if (dateDebut || dateFin) {
            query.createdAt = {};
            if (dateDebut) query.createdAt.$gte = new Date(dateDebut);
            if (dateFin) query.createdAt.$lte = new Date(dateFin);
        }
        
        const signalements = await Signalement.find(query)
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({ success: true, data: signalements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Fonction helper pour déterminer la priorité
function determinerPriorite(data) {
    const motsUrgents = ['urgence', 'urgent', 'danger', 'grave', 'accident', 'incendie'];
    const description = data.description.toLowerCase();
    
    for (const mot of motsUrgents) {
        if (description.includes(mot)) {
            return 'Urgente';
        }
    }
    
    if (data.service === 'Santé' || data.service === 'Sécurité') {
        return 'Haute';
    }
    
    return 'Moyenne';
}

module.exports = router;