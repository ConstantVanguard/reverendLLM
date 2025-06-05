// confirmation-script.js

document.addEventListener('DOMContentLoaded', function() {
  const serviceName = "confirmation"; // Nom du service pour récupérer les configurations
  const datePicker = document.getElementById("datePicker");
  const messageDiv = document.getElementById("message");
  const paypalButtonDiv = document.getElementById("paypalButton");
  const bookButton = document.getElementById("bookButton");
  const hamburgerButton = document.getElementById('hamburger-button');
  const mobileMenu = document.getElementById('mobile-menu');

  // S'assurer que les éléments existent avant d'ajouter des écouteurs
  if (!datePicker || !messageDiv || !paypalButtonDiv || !bookButton || !hamburgerButton || !mobileMenu) {
    console.error("Un ou plusieurs éléments HTML requis sont manquants sur la page Confirmation.");
    return;
  }

  // Initialiser la date minimale dans le sélecteur
  try {
    if (serviceLeadTimes && serviceLeadTimes[serviceName] !== undefined) {
      const today = new Date();
      const minDate = new Date();
      minDate.setDate(today.getDate() + serviceLeadTimes[serviceName]);
      datePicker.min = minDate.toISOString().split('T')[0];
    } else {
      console.error(`Le délai pour le service '${serviceName}' n'est pas défini dans agenda-config.js.`);
      datePicker.disabled = true;
      bookButton.disabled = true;
      messageDiv.textContent = "Erreur de configuration des délais. Veuillez contacter l'administrateur.";
      messageDiv.style.color = "red";
    }
  } catch (e) {
    console.error("Erreur lors de l'initialisation du datePicker (agenda-config.js est-il chargé?) :", e);
    datePicker.disabled = true;
    bookButton.disabled = true;
    messageDiv.textContent = "Erreur de chargement de la configuration de l'agenda.";
    messageDiv.style.color = "red";
    return;
  }

  // Écouteur pour le clic sur le sélecteur de date
  datePicker.addEventListener("click", function() {
    try {
      this.showPicker();
    } catch (error) {
      console.info("showPicker() n'est pas supporté sur ce navigateur/OS ou le datePicker est désactivé.");
    }
  });

  // Écouteur pour le bouton "Vérifier la disponibilité"
  bookButton.addEventListener("click", function() {
    const dateValue = datePicker.value;
    paypalButtonDiv.style.display = "none"; // Cacher le bouton PayPal par défaut

    if (!dateValue) {
      messageDiv.textContent = "Veuillez sélectionner une date.";
      messageDiv.style.color = "#FFD140";
      return;
    }

    // Utilisation de la fonction globale de agenda-config.js
    if (typeof isServiceDateAvailable === "function") {
      if (isServiceDateAvailable(dateValue, serviceName)) {
        messageDiv.style.color = "#C8B071";
        // Le message d'acompte pour la confirmation est de 50€ selon le script original
        messageDiv.textContent = "Date disponible. Veuillez procéder au paiement de l'acompte de 50€.";
        paypalButtonDiv.style.display = "block";
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

  // Gestion du menu hamburger
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
