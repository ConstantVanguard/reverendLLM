// Fonction pour vérifier si la date est disponible
function isDateAvailable(date) {
  const selectedDate = new Date(date);
  const today = new Date();
  // Appliquer le délai de 1 jour
  const minDate = new Date();
  minDate.setDate(today.getDate() + 1);

  // Vérifier le délai minimal
  if (selectedDate < minDate) {
    return false;
  }

  // Jours autorisés: Lundi (1), Jeudi (4) et Samedi (6)
  const allowedDays = [1, 4, 6];
  if (!allowedDays.includes(selectedDate.getDay())) {
    return false;
  }

  // Liste des dates bloquées (à compléter par l'administrateur au format "YYYY-MM-DD")
  const blockedDates = ["2025-05-15", "2025-06-20"]; // Exemple
  const formattedDate = selectedDate.toISOString().split('T')[0];
  if (blockedDates.includes(formattedDate)) {
    return false;
  }

  return true;
}

// Définir la date minimale affichée dans le sélecteur
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date();
  const minDate = new Date();
  minDate.setDate(today.getDate() + 1);
  document.getElementById("datePicker").min = minDate.toISOString().split('T')[0];
  
  // Améliorer l'interaction avec le sélecteur de date
  const datePicker = document.getElementById("datePicker");
  datePicker.addEventListener("click", function() {
    this.showPicker();
  });
  
  // Gérer le changement de type de séance
  const sessionType = document.getElementById("sessionType");
  
  document.getElementById("bookButton").addEventListener("click", function() {
    const dateValue = document.getElementById("datePicker").value;
    const messageDiv = document.getElementById("message");
    const paypalButtonSingle = document.getElementById("paypalButtonSingle");
    const paypalButtonGuidance = document.getElementById("paypalButtonGuidance");
    const selectedType = sessionType.value;

    if (!dateValue) {
      messageDiv.textContent = "Veuillez sélectionner une date.";
      messageDiv.style.color = "#FFD140";
      paypalButtonSingle.style.display = "none";
      paypalButtonGuidance.style.display = "none";
      return;
    }

    if (isDateAvailable(dateValue)) {
      messageDiv.style.color = "#C8B071";
      
      if (selectedType === "single") {
        messageDiv.textContent = "Date disponible. Veuillez procéder au paiement de 70€ pour votre rencontre ponctuelle.";
        paypalButtonSingle.style.display = "block";
        paypalButtonGuidance.style.display = "none";
      } else {
        messageDiv.textContent = "Date disponible. Veuillez procéder au paiement de 450€ pour votre programme de guidance spirituelle.";
        paypalButtonSingle.style.display = "none";
        paypalButtonGuidance.style.display = "block";
      }
    } else {
      messageDiv.style.color = "#FFD140";
      messageDiv.textContent = "La date sélectionnée n'est pas disponible. Veuillez choisir une autre date.";
      paypalButtonSingle.style.display = "none";
      paypalButtonGuidance.style.display = "none";
    }
  });

  // Script pour le menu hamburger
  document.getElementById('hamburger-button').addEventListener('click', function(event) {
    event.stopPropagation();
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
  });
  
  document.addEventListener('click', function(event) {
    const hamburgerButton = document.getElementById('hamburger-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (!hamburgerButton.contains(event.target) && !mobileMenu.contains(event.target)) {
      mobileMenu.classList.add('hidden');
    }
  });
});
