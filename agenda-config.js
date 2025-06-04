// agenda-config.js
// Fichier de configuration centralisé pour l'agenda et les réservations

// Jours de la semaine autorisés pour la réservation (0=Dimanche, 1=Lundi, ..., 6=Samedi)
// Actuellement configuré pour Lundi, Jeudi, Samedi
const globalAllowedDays = [1, 4, 6];

// Dates spécifiques que vous souhaitez bloquer manuellement (ex: vacances, engagements personnels)
// Format : "AAAA-MM-JJ"
const manualBlockedDates = [
  // Exemples (à adapter ou supprimer) :
  // "2025-07-25",
  // "2025-08-10",
  // "2025-12-24",
  // "2025-12-25"
  // Ajoutez ici vos propres dates bloquées si nécessaire
];

// Délai d'attente minimum en jours avant de pouvoir réserver chaque service
const serviceLeadTimes = {
  bapteme: 13,
  mariage: 41,
  confirmation: 12,
  enterrement: 0, // Pour les funérailles, un délai de 0 jour est souvent nécessaire
  guidance: 1
};

// URL publique de votre agenda Google au format iCalendar (ICS)
// Remplacez la ligne ci-dessous par votre URL iCal publique réelle
const googleCalendarIcsUrl = "https://calendar.google.com/calendar/ical/constantvanguard%40gmail.com/public/basic.ics";

// Liste qui sera remplie dynamiquement avec les dates bloquées récupérées depuis Google Calendar
let googleCalendarBlockedDates = [];

/**
 * Récupère les dates des événements depuis l'URL iCalendar de Google Calendar
 * et les ajoute à la liste googleCalendarBlockedDates.
 * Cette fonction est asynchrone.
 */
async function fetchGoogleCalendarBlockedDates() {
  if (!googleCalendarIcsUrl || googleCalendarIcsUrl === "METTRE_ICI_VOTRE_URL_ICAL_PUBLIQUE") {
    console.warn("L'URL iCal de Google Calendar n'est pas configurée ou utilise la valeur par défaut. La synchronisation Google Calendar est désactivée.");
    return;
  }

  try {
    const response = await fetch(googleCalendarIcsUrl, { cache: "no-store" }); // Ajout de no-store pour tenter de forcer le rafraîchissement
    if (!response.ok) {
      console.error("Erreur lors de la récupération de l'agenda Google:", response.status, response.statusText);
      // Afficher un message plus visible pour le Révérend si le calendrier n'est pas accessible
      if (response.status === 404) {
        console.error("L'URL du calendrier Google semble incorrecte ou le calendrier n'est pas public/partagé correctement (Erreur 404).");
      }
      return;
    }
    const icsData = await response.text();

    const lines = icsData.split(/\r\n|\n|\r/); // Gère différents types de sauts de ligne
    const newBlockedDates = new Set();
    let inEvent = false;
    let currentEventStartDate = null;

    lines.forEach(line => {
      line = line.trim();
      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        currentEventStartDate = null;
      } else if (line === "END:VEVENT") {
        if (currentEventStartDate) {
          newBlockedDates.add(currentEventStartDate);
        }
        inEvent = false;
        currentEventStartDate = null;
      } else if (inEvent) {
        if (line.startsWith("DTSTART;VALUE=DATE:")) {
          const dateStr = line.substring("DTSTART;VALUE=DATE:".length, "DTSTART;VALUE=DATE:YYYYMMDD".length);
          currentEventStartDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
        } else if (line.startsWith("DTSTART:") || line.startsWith("DTSTART;")) { // Gère aussi les DTSTART avec heure
          let dateStrMatch = line.match(/(\d{8})T/);
          if (dateStrMatch && dateStrMatch[1]) {
            const dateStr = dateStrMatch[1];
            currentEventStartDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
          }
        }
      }
    });

    googleCalendarBlockedDates = Array.from(newBlockedDates);
    if (googleCalendarBlockedDates.length > 0) {
        console.log("Dates bloquées récupérées depuis Google Calendar:", googleCalendarBlockedDates);
    } else {
        console.log("Aucune date spécifique récupérée de Google Calendar ou le calendrier est vide pour les jours concernés.");
    }

  } catch (error) {
    console.error("Erreur lors du traitement de l'agenda Google (ex: problème réseau, CORS si test en local sans serveur) :", error);
    // Si vous testez en local en ouvrant directement le fichier HTML, le `fetch` peut être bloqué par la politique CORS.
    // Cela devrait fonctionner correctement une fois le site hébergé (ex: sur GitHub Pages).
  }
}

// Déclenche la récupération des données de Google Calendar au chargement du script.
// Note: Il n'y a pas de garantie que cette opération sera terminée AVANT
// que l'utilisateur interagisse avec le sélecteur de date sur les pages.
// Pour une solution plus robuste, il faudrait que les scripts des services
// attendent la fin de cette promesse ou la ré-évaluent.
// Cependant, pour garder la modification simple, on part du principe que
// la liste sera remplie peu après le chargement de la page.
fetchGoogleCalendarBlockedDates();

/**
 * Fonction globale pour vérifier la disponibilité d'une date.
 * Elle est destinée à être appelée par les scripts spécifiques de chaque service.
 * @param {string} dateString - La date à vérifier au format "AAAA-MM-JJ".
 * @param {string} currentServiceName - Le nom du service (ex: "mariage", "bapteme") pour récupérer le bon délai.
 * @returns {boolean} - True si la date est disponible, false sinon.
 */
function isServiceDateAvailable(dateString, currentServiceName) {
  const selectedDate = new Date(dateString);
  selectedDate.setHours(0, 0, 0, 0); // Normaliser à minuit pour la comparaison

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normaliser à minuit

  // 1. Vérifier le délai d'attente spécifique au service
  if (serviceLeadTimes[currentServiceName] !== undefined) {
    const minLeadDate = new Date(today); // Partir de la date d'aujourd'hui normalisée
    minLeadDate.setDate(minLeadDate.getDate() + serviceLeadTimes[currentServiceName]);
    // minLeadDate est déjà à minuit grâce à la normalisation de 'today'
    if (selectedDate < minLeadDate) {
      console.log(`Délai non respecté pour ${currentServiceName}. Date sélectionnée: ${selectedDate}, Date minimale autorisée: ${minLeadDate}`);
      return false;
    }
  } else {
    console.warn(`Nom de service inconnu pour le délai d'attente: ${currentServiceName}`);
    // Comportement par défaut si le nom du service n'est pas dans serviceLeadTimes : considérer comme indisponible ou lever une erreur.
    // Pour l'instant, on le considère comme indisponible pour éviter les réservations non désirées.
    return false;
  }

  // 2. Jours autorisés (Lundi, Jeudi, Samedi)
  if (!globalAllowedDays.includes(selectedDate.getDay())) {
    console.log(`Jour de la semaine non autorisé: ${selectedDate.getDay()}`);
    return false;
  }

  // 3. Dates bloquées manuellement
  const formattedDate = selectedDate.toISOString().split('T')[0];
  if (manualBlockedDates.includes(formattedDate)) {
    console.log(`Date bloquée manuellement: ${formattedDate}`);
    return false;
  }

  // 4. Dates bloquées depuis Google Calendar (si la liste est remplie)
  if (googleCalendarBlockedDates.includes(formattedDate)) {
    console.log(`Date bloquée par Google Calendar: ${formattedDate}`);
    return false;
  }

  // Si toutes les vérifications passent, la date est disponible
  return true;
}
