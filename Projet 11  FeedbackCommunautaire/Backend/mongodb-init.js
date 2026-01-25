// Script pour initialiser la base de données avec des données de test
db = db.getSiblingDB('declic_feedback');

// Créer les collections
db.createCollection('signalements');
db.createCollection('utilisateurs');
db.createCollection('statistiques');

// Créer des utilisateurs de test
db.utilisateurs.insertMany([
    {
        nom: 'Admin',
        prenom: 'System',
        email: 'admin@declic.sn',
        motDePasse: '$2a$10$YourHashedPasswordHere', // "admin123"
        role: 'admin',
        estVerifie: true,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        nom: 'Agent',
        prenom: 'Municipal',
        email: 'agent@declic.sn',
        motDePasse: '$2a$10$YourHashedPasswordHere', // "agent123"
        role: 'agent',
        estVerifie: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);

// Créer des index
db.signalements.createIndex({ service: 1, statut: 1 });
db.signalements.createIndex({ 'localisation.quartier': 1 });
db.signalements.createIndex({ createdAt: -1 });
db.signalements.createIndex({ codeSuivi: 1 }, { unique: true });

db.utilisateurs.createIndex({ email: 1 }, { unique: true });

// Insérer des signalements de test
const signalementsTest = [
    {
        service: 'Eau et assainissement',
        description: 'Fuite d\'eau importante rue Mohamed V, devant l\'école primaire. L\'eau coule depuis 3 jours.',
        localisation: {
            quartier: 'Colobane',
            adresse: 'Rue Mohamed V, près de l\'école primaire'
        },
        typesProbleme: ['Panne', 'Mauvaise qualité'],
        statut: 'Résolu',
        priorite: 'Haute',
        codeSuivi: 'DEC-AB12CD',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-18')
    },
    {
        service: 'Transport',
        description: 'Absence d\'éclairage public sur la route principale du quartier. Danger pour les piétons la nuit.',
        localisation: {
            quartier: 'Soucoupapaye',
            adresse: 'Route principale'
        },
        typesProbleme: ['Manque', 'Danger'],
        statut: 'En cours',
        priorite: 'Haute',
        codeSuivi: 'DEC-EF34GH',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
    },
    {
        service: 'Santé',
        description: 'Centre de santé fermé pendant les heures d\'ouverture. Pas d\'affichage d\'information.',
        localisation: {
            quartier: 'Tilene',
            adresse: 'Centre de santé Tilene'
        },
        typesProbleme: ['Panne', 'Mauvaise qualité'],
        statut: 'Reçu',
        priorite: 'Moyenne',
        codeSuivi: 'DEC-IJ56KL',
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
    }
];

db.signalements.insertMany(signalementsTest);

print(' Base de données DECLIC initialisée avec succès');