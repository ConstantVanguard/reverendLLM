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
  guidance: 6
};

// URL publique de votre agenda Google au format iCalendar (ICS)
const originalGoogleCalendarIcsUrl = "https://calendar.google.com/calendar/ical/constantvanguard%40gmail.com/public/basic.ics";
const googleCalendarIcsUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(originalGoogleCalendarIcsUrl);


// Liste qui sera remplie dynamiquement avec les dates bloquées récupérées depuis Google Calendar
let googleCalendarBlockedDates = [];

/**
 * Helper function to parse an iCalendar date string (YYYYMMDD) into a Date object (at UTC midnight).
 * @param {string} dateStr - Date string in YYYYMMDD format.
 * @returns {Date} - Date object.
 */
function parseIcsDate(dateStr) {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed in JS
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(Date.UTC(year, month, day)); // Use Date.UTC to avoid timezone issues during parsing
}

/**
 * Helper function to format a Date object into "YYYY-MM-DD" string.
 * @param {Date} dateObj - Date object.
 * @returns {string} - Date string in "YYYY-MM-DD" format.
 */
function formatDateToYyyyMmDd(dateObj) {
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


/**
 * Récupère les dates des événements depuis l'URL iCalendar de Google Calendar (via le proxy CORS)
 * et les ajoute à la liste googleCalendarBlockedDates.
 * Gère maintenant les événements s'étendant sur plusieurs jours.
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
    let dtstartStr = null;
    let dtendStr = null;

    lines.forEach(line => {
      line = line.trim();
      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        dtstartStr = null;
        dtendStr = null;
      } else if (line === "END:VEVENT") {
        if (dtstartStr) {
          const startDate = parseIcsDate(dtstartStr);
          if (dtendStr) { // If there's an end date, it's a multi-day event or timed event
            const endDate = parseIcsDate(dtendStr);
            // For all-day events, DTEND is the morning of the day *after* the event ends.
            // So, we iterate from startDate up to (but not including) endDate.
            let currentDate = new Date(startDate);
            while (currentDate < endDate) {
              newBlockedDates.add(formatDateToYyyyMmDd(currentDate));
              currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
          } else {
            // If no DTEND, assume it's a single all-day event (though less common for all-day in strict iCal)
            // or a timed event for which we only have DTSTART, so block that single day.
            newBlockedDates.add(formatDateToYyyyMmDd(startDate));
          }
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith("DTSTART;VALUE=DATE:")) {
          dtstartStr = line.substring("DTSTART;VALUE=DATE:".length, "DTSTART;VALUE=DATE:YYYYMMDD".length);
        } else if (line.startsWith("DTSTART:") || line.startsWith("DTSTART;")) {
          let dateStrMatch = line.match(/(\d{8})T?/); // Match YYYYMMDD, optionally followed by T
          if (dateStrMatch && dateStrMatch[1]) {
            dtstartStr = dateStrMatch[1];
          }
        } else if (line.startsWith("DTEND;VALUE=DATE:")) {
          dtendStr = line.substring("DTEND;VALUE=DATE:".length, "DTEND;VALUE=DATE:YYYYMMDD".length);
        } else if (line.startsWith("DTEND:") || line.startsWith("DTEND;")) {
          let dateStrMatch = line.match(/(\d{8})T?/);
          if (dateStrMatch && dateStrMatch[1]) {
            dtendStr = dateStrMatch[1];
          }
        }
      }
    });

    googleCalendarBlockedDates = Array.from(newBlockedDates);
    if (googleCalendarBlockedDates.length > 0) {
        console.log("Dates bloquées récupérées depuis Google Calendar (via proxy):", googleCalendarBlockedDates.sort()); // Sort for easier reading
    } else {
        console.log("Aucune date spécifique récupérée de Google Calendar (via proxy) ou le calendrier est vide pour les jours concernés, ou le format des dates n'est pas reconnu par le parser.");
    }

  } catch (error) {
    console.error("Erreur lors du traitement de l'agenda Google (via proxy):", error);
  }
}

fetchGoogleCalendarBlockedDates();

/**
 * Fonction globale pour vérifier la disponibilité d'une date.
 * (Le reste de cette fonction isServiceDateAvailable reste identique à la version précédente
 * qui fonctionnait pour le décalage de date)
 * @param {string} dateStringFromPicker - La date à vérifier au format "AAAA-MM-JJ" provenant du datePicker.value.
 * @param {string} currentServiceName - Le nom du service (ex: "mariage", "bapteme") pour récupérer le bon délai.
 * @returns {boolean} - True si la date est disponible, false sinon.
 */
function isServiceDateAvailable(dateStringFromPicker, currentServiceName) {
  const parts = dateStringFromPicker.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const day = parseInt(parts[2], 10);
  
  const selectedDate = new Date(year, month, day);
  selectedDate.setHours(0,0,0,0);

  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  if (serviceLeadTimes[currentServiceName] !== undefined) {
    const minLeadDate = new Date(today);
    minLeadDate.setDate(today.getDate() + serviceLeadTimes[currentServiceName]);
    minLeadDate.setHours(0,0,0,0); 
    if (selectedDate < minLeadDate) {
      console.log(`Délai non respecté pour ${currentServiceName}. Date sélectionnée: ${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}, Date minimale autorisée: ${minLeadDate.getFullYear()}-${String(minLeadDate.getMonth()+1).padStart(2,'0')}-${String(minLeadDate.getDate()).padStart(2,'0')}`);
      return false;
    }
  } else {
    console.warn(`Nom de service inconnu pour le délai d'attente: ${currentServiceName}`);
    return false;
  }

  if (!globalAllowedDays.includes(selectedDate.getDay())) {
    console.log(`Jour de la semaine non autorisé: ${selectedDate.getDay()} pour la date ${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`);
    return false;
  }

  const formattedYear = selectedDate.getFullYear();
  const formattedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0'); 
  const formattedDay = String(selectedDate.getDate()).padStart(2, '0'); 
  const formattedDateForComparison = `${formattedYear}-${formattedMonth}-${formattedDay}`;
  
  console.log("Date sélectionnée (formattedDateForComparison) pour vérification :", formattedDateForComparison, "| Type :", typeof formattedDateForComparison);
  console.log("Vérification contre manualBlockedDates. Contenu :", manualBlockedDates, "| La date est-elle incluse ? :", manualBlockedDates.includes(formattedDateForComparison));
  console.log("Vérification contre googleCalendarBlockedDates. Contenu :", googleCalendarBlockedDates.sort(), "| La date est-elle incluse ? :", googleCalendarBlockedDates.includes(formattedDateForComparison)); // Sort for easier reading

  if (manualBlockedDates.includes(formattedDateForComparison)) {
    console.log(`Date bloquée manuellement: ${formattedDateForComparison}`);
    return false;
  }

  if (googleCalendarBlockedDates.includes(formattedDateForComparison)) {
    console.log(`Date bloquée par Google Calendar (via proxy): ${formattedDateForComparison}`);
    return false;
  }

  console.log(`Date ${formattedDateForComparison} disponible pour le service ${currentServiceName}.`);
  return true;
}
