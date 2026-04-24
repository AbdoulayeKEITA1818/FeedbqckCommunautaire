const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const signalementRoutes = require('./routes/signalementRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const statistiqueRoutes = require('./routes/statistiqueRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/signalements', signalementRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/statistiques', statistiqueRoutes);
app.use('/api/admin', adminRoutes);

mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/declic_feedback')
    .then(() => console.log('Connecte a MongoDB'))
    .catch((err) => console.error('Erreur de connexion MongoDB:', err));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API DECLIC en ligne' });
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route non trouvee' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erreur serveur interne' });
});

const configuredPort = Number.parseInt(process.env.PORT, 10);
const PORT = Number.isNaN(configuredPort) ? 5000 : configuredPort;
const MAX_PORT_RETRIES = 10;

function startServer(port, remainingRetries = MAX_PORT_RETRIES) {
    const server = http.createServer(app);

    server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && remainingRetries > 0) {
            const nextPort = port + 1;
            console.warn(`Le port ${port} est deja utilise. Nouvelle tentative sur le port ${nextPort}...`);
            startServer(nextPort, remainingRetries - 1);
            return;
        }

        console.error(`Impossible de demarrer le serveur sur le port ${port}:`, error.message);
        process.exit(1);
    });

    server.listen(port, () => {
        console.log(`Serveur demarre sur le port ${port}`);
    });
}

startServer(PORT);
