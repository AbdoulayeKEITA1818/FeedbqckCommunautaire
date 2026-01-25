const mongoose = require('mongoose');

const signalementSchema = new mongoose.Schema({
    service: {
        type: String,
        required: true,
        enum: ['Santé', 'Éducation', 'Eau et assainissement', 'Énergie', 'Transport', 'Sécurité', 'Administration']
    },
    description: {
        type: String,
        required: [true, 'La description est requise'],
        minlength: [20, 'La description doit contenir au moins 20 caractères']
    },
    localisation: {
        quartier: {
            type: String,
            required: true
        },
        adresse: String,
        coordonnees: {
            lat: Number,
            lng: Number
        }
    },
    photos: [{
        url: String,
        public_id: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    typesProbleme: [{
        type: String,
        enum: ['Panne', 'Manque', 'Mauvaise qualité', 'Danger', 'Autre']
    }],
    statut: {
        type: String,
        enum: ['Reçu', 'En cours', 'Résolu', 'En attente', 'Archivé'],
        default: 'Reçu'
    },
    priorite: {
        type: String,
        enum: ['Basse', 'Moyenne', 'Haute', 'Urgente'],
        default: 'Moyenne'
    },
    utilisateurId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur'
    },
    emailCitoyen: {
        type: String,
        required: false
    },
    numeroTelephone: String,
    codeSuivi: {
        type: String,
        unique: true
    },
    dateResolution: Date,
    notesAdmin: [{
        texte: String,
        auteur: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    nombreVotes: {
        type: Number,
        default: 0
    },
    commentaires: [{
        utilisateurId: mongoose.Schema.Types.ObjectId,
        texte: String,
        date: {
            type: Date,
            default: Date.now
        },
        likes: Number
    }]
}, {
    timestamps: true
});

// Générer un code de suivi unique avant sauvegarde
signalementSchema.pre('save', async function(next) {
    if (!this.codeSuivi) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'DEC-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.codeSuivi = code;
    }
    next();
});

// Méthode pour mettre à jour le statut
signalementSchema.methods.mettreAJourStatut = function(nouveauStatut) {
    this.statut = nouveauStatut;
    if (nouveauStatut === 'Résolu') {
        this.dateResolution = new Date();
    }
    return this.save();
};

// Index pour les recherches
signalementSchema.index({ service: 1, statut: 1 });
signalementSchema.index({ 'localisation.quartier': 1 });
signalementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Signalement', signalementSchema);
