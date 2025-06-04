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
const originalGoogleCalendarIcsUrl = "https://calendar.google.com/calendar/ical/constantvanguard%40gmail.com/public/basic.ics";
const googleCalendarIcsUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(originalGoogleCalendarIcsUrl);


// Liste qui sera remplie dynamiquement avec les dates bloquées récupérées depuis Google Calendar
let googleCalendarBlockedDates = [];

/**
 * Récupère les dates des événements depuis l'URL iCalendar de Google Calendar (via le proxy CORS)
 * et les ajoute à la liste googleCalendarBlockedDates.
 * Cette fonction est asynchrone.
 */
async function fetchGoogleCalendarBlockedDates() {
  if (!googleCalendarIcsUrl) {
    console.warn("L'URL iCal (via proxy) n'est pas configurée. La synchronisation Google Calendar est désactivée.");
    return;
  }

  try {
    const response = await fetch(googleCalendarIcsUrl, { cache: "no-store" });
    if (!response.ok) {
      console.error("Erreur lors de la récupération de l'agenda Google via le proxy:", response.status, response.statusText);
      if (response.status === 404) {
        console.error("L'URL du calendrier Google (via proxy) semble incorrecte, ou le calendrier n'est pas public/partagé correctement, ou le proxy a un problème (Erreur 404).");
      }
      return;
    }
    const icsData = await response.text();

    const lines = icsData.split(/\r\n|\n|\r/);
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
        } else if (line.startsWith("DTSTART:") || line.startsWith("DTSTART;")) {
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
        console.log("Dates bloquées récupérées depuis Google Calendar (via proxy):", googleCalendarBlockedDates);
    } else {
        console.log("Aucune date spécifique récupérée de Google Calendar (via proxy) ou le calendrier est vide pour les jours concernés, ou le format des dates n'est pas reconnu par le parser simplifié.");
    }

  } catch (error) {
    console.error("Erreur lors du traitement de l'agenda Google (via proxy):", error);
  }
}

// Déclenche la récupération des données de Google Calendar au chargement du script.
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
    const minLeadDate = new Date(today);
    minLeadDate.setDate(today.getDate() + serviceLeadTimes[currentServiceName]); // Utiliser today.getDate() pour éviter les problèmes de fin de mois
    minLeadDate.setHours(0,0,0,0); // S'assurer que l'heure est à minuit
    if (selectedDate < minLeadDate) {
      console.log(`Délai non respecté pour ${currentServiceName}. Date sélectionnée: ${selectedDate.toISOString().split('T')[0]}, Date minimale autorisée: ${minLeadDate.toISOString().split('T')[0]}`);
      return false;
    }
  } else {
    console.warn(`Nom de service inconnu pour le délai d'attente: ${currentServiceName}`);
    return false;
  }

  // 2. Jours autorisés (Lundi, Jeudi, Samedi)
  if (!globalAllowedDays.includes(selectedDate.getDay())) {
    console.log(`Jour de la semaine non autorisé: ${selectedDate.getDay()} pour la date ${selectedDate.toISOString().split('T')[0]}`);
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
    console.log(`Date bloquée par Google Calendar (via proxy): ${formattedDate}`);
    return false;
  }

  // Si toutes les vérifications passent, la date est disponible
  console.log(`Date ${formattedDate} disponible pour le service ${currentServiceName}.`);
  return true;
}
