const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Importer les routes
const signalementRoutes = require('./routes/signalementRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const statistiqueRoutes = require('./routes/statistiqueRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/signalements', signalementRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/statistiques', statistiqueRoutes);
app.use('/api/admin', adminRoutes);

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/declic_feedback', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log(' Connecté à MongoDB'))
.catch(err => console.error(' Erreur de connexion MongoDB:', err));

// Route de test
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API DECLIC en ligne' });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Serveur démarré sur le port ${PORT}`);
});