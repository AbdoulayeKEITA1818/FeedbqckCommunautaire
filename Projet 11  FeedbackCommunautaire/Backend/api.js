import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const signalementAPI = {
    // Créer un signalement
    creerSignalement: (data) => api.post('/signalements', data),
    
    // Récupérer tous les signalements
    getSignalements: (params) => api.get('/signalements', { params }),
    
    // Récupérer un signalement par ID
    getSignalementById: (id) => api.get(`/signalements/${id}`),
    
    // Mettre à jour le statut
    updateStatut: (id, statut) => api.patch(`/signalements/${id}/statut`, { statut }),
    
    // Ajouter un commentaire
    ajouterCommentaire: (id, data) => api.post(`/signalements/${id}/commentaires`, data),
    
    // Rechercher des signalements
    rechercherSignalements: (params) => api.get('/signalements/recherche', { params }),
    
    // Récupérer les statistiques
    getStatistiques: () => api.get('/statistiques'),
    
    // Récupérer les signalements par quartier
    getSignalementsParQuartier: (quartier) => api.get(`/signalements?quartier=${quartier}`),
};

export const authAPI = {
    // Inscription
    register: (data) => api.post('/utilisateurs/register', data),
    
    // Connexion
    login: (data) => api.post('/utilisateurs/login', data),
    
    // Vérifier le token
    verifyToken: () => api.get('/utilisateurs/verify'),
    
    // Mot de passe oublié
    forgotPassword: (email) => api.post('/utilisateurs/forgot-password', { email }),
    
    // Réinitialiser le mot de passe
    resetPassword: (token, data) => api.post(`/utilisateurs/reset-password/${token}`, data),
};

export const statistiqueAPI = {
    // Récupérer les stats globales
    getGlobalStats: () => api.get('/statistiques/globales'),
    
    // Récupérer les stats par service
    getStatsByService: () => api.get('/statistiques/service'),
    
    // Récupérer les stats par mois
    getStatsByMonth: () => api.get('/statistiques/mensuelles'),
};

export default api;