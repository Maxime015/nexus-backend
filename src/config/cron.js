import cron from "cron";
import https from "https";
import { ENV } from "./env.js";

// Création d'une tâche planifiée (Cron Job)
// Cette tâche envoie une requête GET à l’API toutes les 14 minutes
const job = new cron.CronJob("*/14 * * * *", function () {
  https
    .get(ENV.API_URL, (res) => {
      if (res.statusCode === 200)
        console.log("✅ Requête GET envoyée avec succès");
      else
        console.log("❌ Échec de la requête GET", res.statusCode);
    })
    .on("error", (e) => console.error("⚠️ Erreur lors de l’envoi de la requête :", e));
});

export default job;

/* 
🕒 EXPLICATION DU CRON JOB :
Un "cron job" est une tâche planifiée qui s’exécute automatiquement à intervalles réguliers.
Ici, nous envoyons une requête GET toutes les 14 minutes pour maintenir l’application active.

📅 Comment définir une planification ?
Une planification Cron s’écrit sous la forme d’une expression composée de 5 champs :

👉 MINUTE | HEURE | JOUR DU MOIS | MOIS | JOUR DE LA SEMAINE

📖 EXEMPLES DE PLANIFICATIONS :
--------------------------------
// 14 * * * *  → Toutes les 14 minutes  
// 0 0 * * 0    → À minuit chaque dimanche  
// 30 3 15 * *  → À 3h30 du matin le 15 de chaque mois  
// 0 0 1 1 *    → À minuit le 1er janvier  
// 0 * * * *    → Toutes les heures

*/