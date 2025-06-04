// guidance-script.js

document.addEventListener('DOMContentLoaded', function() {
  const serviceName = "guidance"; // Nom du service pour récupérer les configurations
  const datePicker = document.getElementById("datePicker");
  const messageDiv = document.getElementById("message");
  const paypalButtonSingleDiv = document.getElementById("paypalButtonSingle");
  const paypalButtonGuidanceDiv = document.getElementById("paypalButtonGuidance");
  const bookButton = document.getElementById("bookButton");
  const sessionTypeSelect = document.getElementById("sessionType");
  const hamburgerButton = document.getElementById('hamburger-button');
  const mobileMenu = document.getElementById('mobile-menu');

  // S'assurer que les éléments HTML requis existent
  if (!datePicker || !messageDiv || !paypalButtonSingleDiv || !paypalButtonGuidanceDiv || !bookButton || !sessionTypeSelect || !hamburgerButton || !mobileMenu) {
    console.error("Un ou plusieurs éléments HTML requis sont manquants sur la page Accompagnement Spirituel.");
    if(datePicker) datePicker.disabled = true;
    if(bookButton) bookButton.disabled = true;
    if(sessionTypeSelect) sessionTypeSelect.disabled = true;
    if(messageDiv) {
        messageDiv.textContent = "Erreur de configuration de la page. Veuillez contacter l'administrateur.";
        messageDiv.style.color = "red";
    }
    return;
  }

  // Initialiser la date minimale dans le sélecteur
  try {
    if (typeof serviceLeadTimes !== 'undefined' && serviceLeadTimes && serviceLeadTimes[serviceName] !== undefined) {
      const today = new Date();
      const minDate = new Date();
      minDate.setDate(today.getDate() + serviceLeadTimes[serviceName]);
      datePicker.min = minDate.toISOString().split('T')[0];
    } else {
      console.error(`Le délai pour le service '${serviceName}' n'est pas défini dans agenda-config.js ou agenda-config.js n'est pas chargé.`);
      datePicker.disabled = true;
      bookButton.disabled = true;
      sessionTypeSelect.disabled = true;
      messageDiv.textContent = "Erreur de configuration des délais. Veuillez contacter l'administrateur.";
      messageDiv.style.color = "red";
    }
  } catch (e) {
    console.error("Erreur lors de l'initialisation du datePicker (agenda-config.js est-il chargé?) :", e);
    datePicker.disabled = true;
    bookButton.disabled = true;
    sessionTypeSelect.disabled = true;
    messageDiv.textContent = "Erreur de chargement de la configuration de l'agenda.";
    messageDiv.style.color = "red";
    return;
  }

  datePicker.addEventListener("click", function() {
    try {
      this.showPicker();
    } catch (error) {
      console.info("showPicker() n'est pas supporté sur ce navigateur/OS ou le datePicker est désactivé.");
    }
  });

  bookButton.addEventListener("click", function() {
    const dateValue = datePicker.value;
    const selectedType = sessionTypeSelect.value;

    paypalButtonSingleDiv.style.display = "none";
    paypalButtonGuidanceDiv.style.display = "none";

    if (!dateValue) {
      messageDiv.textContent = "Veuillez sélectionner une date.";
      messageDiv.style.color = "#FFD140";
      return;
    }

    if (typeof isServiceDateAvailable === "function") {
      if (isServiceDateAvailable(dateValue, serviceName)) {
        messageDiv.style.color = "#C8B071";
        
        if (selectedType === "single") {
          messageDiv.textContent = "Date disponible. Veuillez procéder au paiement de votre acompte (70€) pour réserver cette date."; // Acompte pour séance ponctuelle
          paypalButtonSingleDiv.style.display = "block";
        } else { // "guidance"
          messageDiv.textContent = "Date disponible. Veuillez procéder au paiement de votre acompte (100€) pour réserver cette date."; // Acompte pour guidance complète (supposé, basé sur le script original)
          paypalButtonGuidanceDiv.style.display = "block";
        }
      } else {
        messageDiv.style.color = "#FFD140";
        messageDiv.textContent = "La date sélectionnée n'est pas disponible. Veuillez choisir une autre date.";
      }
    } else {
      console.error("La fonction isServiceDateAvailable n'est pas définie. Vérifiez que agenda-config.js est correctement chargé AVANT ce script.");
      messageDiv.textContent = "Erreur de vérification de la disponibilité. Contactez l'administrateur.";
      messageDiv.style.color = "red";
    }
  });

  sessionTypeSelect.addEventListener("change", function() {
    if (messageDiv.textContent.startsWith("Date disponible")) {
        messageDiv.textContent = "Le type de séance a changé. Veuillez re-vérifier la disponibilité.";
        messageDiv.style.color = "#FFD140"; 
        paypalButtonSingleDiv.style.display = "none";
        paypalButtonGuidanceDiv.style.display = "none";
    }
  });

  hamburgerButton.addEventListener('click', function(event) {
    event.stopPropagation();
    mobileMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', function(event) {
    if (!hamburgerButton.contains(event.target) && !mobileMenu.contains(event.target)) {
      mobileMenu.classList.add('hidden');
    }
  });
});
