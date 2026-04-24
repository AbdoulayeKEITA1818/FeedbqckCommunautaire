const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const utilisateurSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true
    },
    prenom: {
        type: String,
        required: [true, 'Le prénom est requis'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true
    },
    telephone: {
        type: String,
        required: false
    },
    quartier: {
        type: String,
        required: false
    },
    motDePasse: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
    },
    role: {
        type: String,
        enum: ['citoyen', 'agent', 'admin'],
        default: 'citoyen'
    },
    photoProfil: String,
    signalementsSoumis: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signalement'
    }],
    signalementsVotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signalement'
    }],
    notifications: [{
        type: {
            type: String,
            enum: ['statut_change', 'nouveau_commentaire', 'anniversaire', 'newsletter']
        },
        message: String,
        lu: {
            type: Boolean,
            default: false
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    preferences: {
        notificationsEmail: {
            type: Boolean,
            default: true
        },
        newsletter: {
            type: Boolean,
            default: false
        }
    },
    derniereConnexion: Date,
    estVerifie: {
        type: Boolean,
        default: false
    },
    codeVerification: String,
    dateExpirationCode: Date
}, {
    timestamps: true
});

// Hasher le mot de passe avant sauvegarde
utilisateurSchema.pre('save', async function(next) {
    if (!this.isModified('motDePasse')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Méthode pour vérifier le mot de passe
utilisateurSchema.methods.verifierMotDePasse = async function(motDePasseSaisi) {
    return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

// Méthode pour générer un code de vérification
utilisateurSchema.methods.genererCodeVerification = function() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.codeVerification = code;
    this.dateExpirationCode = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
    return code;
};

module.exports = mongoose.model('Utilisateur', utilisateurSchema);