Documentation MVP - DECLIC Feedback

Le MVP de DECLIC Feedback est une plateforme web simple qui permet aux citoyens de signaler un probleme lie a un service public, de consulter quelques statistiques globales et de creer une session utilisateur. Le projet est divise en deux parties: un dossier Backend qui expose les APIs, et un dossier Frontend qui affiche l’interface et consomme ces APIs. Le backend est deja fonctionnel; le frontend a ete adapte pour dialoguer directement avec lui.

Architecture
Le backend expose les routes principales sous /api. Les routes actuellement utilisees par le MVP sont:

/api/health : verifier que l’API est disponible
/api/utilisateurs/register : creer un compte
/api/utilisateurs/login : se connecter
/api/signalements : creer un signalement et recuperer la liste des signalements
/api/statistiques/globales : statistiques generales
/api/statistiques/service : repartition des signalements par service
/api/statistiques/quartier : repartition par quartier
/api/statistiques/evolution-7-jours : evolution recente
Le frontend est une application statique servie localement par un petit serveur Node. Ce serveur expose l’interface sur http://127.0.0.1:3000 et agit aussi comme proxy vers le backend. Il detecte automatiquement le backend sur les ports 5000 a 5010.

Fonctionnement du MVP

Au chargement de la page, le frontend teste d’abord /api/health.
Si le backend repond, le frontend charge les statistiques globales et la liste des derniers signalements.
L’utilisateur peut:
creer un compte
se connecter
remplir un formulaire de signalement
filtrer et consulter les signalements existants
Quand un signalement est envoye, le frontend envoie un JSON compatible avec le backend, puis affiche le message de confirmation et le codeSuivi.
La session utilisateur est conservee dans le navigateur via localStorage pour garder le token et les informations du profil.
Lancement du projet
Dans un premier terminal:

cd "C:\Users\SALIF\Documents\doc-keita\FeedbqckCommunautaire\Projet 11  FeedbackCommunautaire\Backend"
node server.js
Dans un second terminal:

cd "C:\Users\SALIF\Documents\doc-keita\FeedbqckCommunautaire\Projet 11  FeedbackCommunautaire\Frontend"
npm start
Ensuite ouvrir:
http://127.0.0.1:3000/

Donnees MongoDB
Les utilisateurs de l’application sont stockes dans la collection utilisateurs. Les signalements sont stockes dans la collection signalements. Si on utilise MongoDB Atlas, ces collections sont visibles dans Data Explorer.

Perimetre MVP
Cette version valide le coeur du produit:

creation de compte
connexion
soumission de signalement
consultation des signalements
affichage des statistiques principales
verification de la disponibilite de l’API
Cette version n’est pas encore une version finale produit: certaines fonctions du backend existent mais ne sont pas encore exploitees a fond dans l’interface, par exemple certaines actions admin avancees, l’upload complet de photos ou les notifications.
