const mongoose = require('mongoose');

const statistiqueSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    totalSignalements: {
        type: Number,
        default: 0
    },
    signalementsParService: {
        sante: Number,
        education: Number,
        eau: Number,
        energie: Number,
        transport: Number,
        securite: Number,
        administration: Number
    },
    signalementsParStatut: {
        recu: Number,
        encours: Number,
        resolu: Number,
        attente: Number
    },
    signalementsParQuartier: {
        type: Map,
        of: Number
    },
    tempsMoyenResolution: Number, // en heures
    utilisateursInscrits: Number,
    signalementsMoisCourant: Number,
    signalementsResolusMois: Number,
    tauxResolution: Number, // pourcentage
    topQuartiersProblemes: [{
        quartier: String,
        count: Number
    }],
    tendances: {
        evolution7Jours: [{
            date: Date,
            count: Number
        }],
        evolutionMois: Number // pourcentage
    }
});

// Méthode statique pour mettre à jour les statistiques
statistiqueSchema.statics.mettreAJourStatistiques = async function() {
    const Signalement = mongoose.model('Signalement');
    const Utilisateur = mongoose.model('Utilisateur');
    
    const aujourdhui = new Date();
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const ilYa7Jours = new Date(aujourdhui);
    ilYa7Jours.setDate(ilYa7Jours.getDate() - 7);
    
    // Calculer les statistiques
    const totalSignalements = await Signalement.countDocuments();
    const signalementsResolus = await Signalement.countDocuments({ statut: 'Résolu' });
    const utilisateursInscrits = await Utilisateur.countDocuments();
    
    // Compter par service
    const signalementsParService = {};
    const services = ['Santé', 'Éducation', 'Eau et assainissement', 'Énergie', 'Transport', 'Sécurité', 'Administration'];
    
    for (const service of services) {
        const count = await Signalement.countDocuments({ service });
        signalementsParService[service.toLowerCase().replace(/[^a-z]/g, '')] = count;
    }
    
    // Compter par statut
    const statuts = ['Reçu', 'En cours', 'Résolu', 'En attente'];
    const signalementsParStatut = {};
    for (const statut of statuts) {
        const count = await Signalement.countDocuments({ statut });
        signalementsParStatut[statut.toLowerCase().replace(/[^a-z]/g, '')] = count;
    }
    
    // Top quartiers
    const topQuartiers = await Signalement.aggregate([
        { $group: { _id: '$localisation.quartier', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    
    // Créer ou mettre à jour les statistiques du jour
    const stats = await this.findOneAndUpdate(
        { date: { $gte: new Date(aujourdhui.setHours(0, 0, 0, 0)) } },
        {
            $set: {
                totalSignalements,
                signalementsParService,
                signalementsParStatut,
                utilisateursInscrits,
                tauxResolution: totalSignalements > 0 ? (signalementsResolus / totalSignalements * 100).toFixed(2) : 0,
                topQuartiersProblemes: topQuartiers.map(q => ({
                    quartier: q._id,
                    count: q.count
                }))
            }
        },
        { upsert: true, new: true }
    );
    
    return stats;
};

module.exports = mongoose.model('Statistique', statistiqueSchema);