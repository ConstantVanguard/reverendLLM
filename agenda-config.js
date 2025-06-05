// agenda-config.js
// Fichier de configuration centralisé pour l'agenda et les réservations

// Jours de la semaine autorisés pour la réservation (0=Dimanche, 1=Lundi, ..., 6=Samedi)
// Actuellement configuré pour Lundi, Jeudi, Samedi
const globalAllowedDays = [1, 4, 6];

// Dates spécifiques que vous souhaitez bloquer manuellement.
// Formats acceptés:
// - "AAAA-MM-JJ" pour une date spécifique (ex: "2025-07-25")
// - "MM-JJ" pour une date récurrente chaque année (ex: "12-25" pour Noël)
const manualBlockedDates = [
  // Exemples (à adapter ou supprimer) :
  // "2024-07-25",      // Bloque uniquement le 25 juillet 2024
  "12-24",          // 
  "12-25",          // Bloque le 25 décembre de chaque année (Noël)
  "12-31",          // 
  "01-01",          // Bloque le 1er janvier de chaque année (Nouvel An)
  "11-01",          // Bloque le 1er novembre de chaque année (Toussaint)
  "08-11",          // 
  "05-04",          // 
  // Ajoutez au-dessus vos propres dates bloquées
];

// Délai d'attente minimum en jours avant de pouvoir réserver chaque service
const serviceLeadTimes = {
  bapteme: 17,
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
  return new Date(Date.UTC(year, month, day));
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
          if (dtendStr) {
            const endDate = parseIcsDate(dtendStr);
            let currentDate = new Date(startDate);
            while (currentDate < endDate) {
              newBlockedDates.add(formatDateToYyyyMmDd(currentDate));
              currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
          } else {
            newBlockedDates.add(formatDateToYyyyMmDd(startDate));
          }
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith("DTSTART;VALUE=DATE:")) {
          dtstartStr = line.substring("DTSTART;VALUE=DATE:".length, "DTSTART;VALUE=DATE:YYYYMMDD".length);
        } else if (line.startsWith("DTSTART:") || line.startsWith("DTSTART;")) {
          let dateStrMatch = line.match(/(\d{8})T?/);
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
        console.log("Dates bloquées récupérées depuis Google Calendar (via proxy):", googleCalendarBlockedDates.sort());
    } else {
        console.log("Aucune date spécifique récupérée de Google Calendar (via proxy) ou le calendrier est vide pour les jours concernés, ou le format des dates n'est pas reconnu par le parser.");
    }
  } catch (error) {
    console.error("Erreur lors du traitement de l'agenda Google (via proxy):", error);
  }
}
fetchGoogleCalendarBlockedDates();

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
  const formattedMonthStr = String(selectedDate.getMonth() + 1).padStart(2, '0'); 
  const formattedDayStr = String(selectedDate.getDate()).padStart(2, '0'); 
  const fullFormattedDateForComparison = `${formattedYear}-${formattedMonthStr}-${formattedDayStr}`;
  const monthDayFormattedForComparison = `${formattedMonthStr}-${formattedDayStr}`; // Format "MM-JJ"

  console.log("Date sélectionnée (formattedDateForComparison) pour vérification :", fullFormattedDateForComparison, "| Type :", typeof fullFormattedDateForComparison);
  console.log("Vérification contre manualBlockedDates. Contenu :", manualBlockedDates);
  
  // 3. Dates bloquées manuellement (gère "AAAA-MM-JJ" et "MM-JJ")
  for (const manualDate of manualBlockedDates) {
    if (manualDate.length === 10 && manualDate === fullFormattedDateForComparison) { // Format "AAAA-MM-JJ"
      console.log(`Date bloquée manuellement (date spécifique): ${fullFormattedDateForComparison}`);
      return false;
    } else if (manualDate.length === 5 && manualDate === monthDayFormattedForComparison) { // Format "MM-JJ"
      console.log(`Date bloquée manuellement (récurrence annuelle MM-JJ): ${monthDayFormattedForComparison} pour ${fullFormattedDateForComparison}`);
      return false;
    }
  }
  
  console.log("Vérification contre googleCalendarBlockedDates. Contenu :", googleCalendarBlockedDates.sort(), "| La date est-elle incluse ? :", googleCalendarBlockedDates.includes(fullFormattedDateForComparison));

  if (googleCalendarBlockedDates.includes(fullFormattedDateForComparison)) {
    console.log(`Date bloquée par Google Calendar (via proxy): ${fullFormattedDateForComparison}`);
    return false;
  }

  console.log(`Date ${fullFormattedDateForComparison} disponible pour le service ${currentServiceName}.`);
  return true;
}
