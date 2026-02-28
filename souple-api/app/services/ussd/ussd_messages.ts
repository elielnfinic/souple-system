// ─── Multilingual USSD Strings ────────────────────────────────────────────────
//
// All user-facing text for the USSD menu flow in four languages:
//   fr — French (default)
//   en — English
//   ln — Lingala
//   sw — Swahili
//
// USSD screens are capped to ~182 characters per response by Africa's Talking.
// Keep each string concise. Newline-separated options use \n.

export type SupportedLocale = 'fr' | 'en' | 'ln' | 'sw'

export interface UssdMessageSet {
  welcome: string
  enterFrom: string
  enterTo: string
  enterDate: string
  noTrips: string
  selectSeats: string
  selectPayment: string
  enterPhone: string
  paymentSent: string
  enterBookingCode: string
  invalidInput: string
  cityNotFound: string
  goodbye: string
  myBookingsStub: string
  languageMenu: string
}

export const ussdMessages: Record<SupportedLocale, UssdMessageSet> = {
  fr: {
    welcome:
      'Bienvenue chez Souple!\n1. Chercher un trajet\n2. Mes réservations\n3. Statut réservation\n4. Langue\n0. Quitter',
    enterFrom: 'Entrez la ville de départ:',
    enterTo: "Entrez la ville d'arrivée:",
    enterDate: 'Entrez la date (JJ/MM):',
    noTrips: 'Aucun trajet trouvé.\n0. Menu principal',
    selectSeats: '1. 1 place\n2. 2 places\n3. 3 places\n0. Retour',
    selectPayment:
      'Payer avec:\n1. MTN Mobile Money\n2. Orange Money\n3. Airtel Money\n0. Annuler',
    enterPhone: 'Entrez votre numéro MTN (09XXXXXXXX):',
    paymentSent:
      'Demande de paiement envoyée.\nVous recevrez un SMS avec votre code.\n0. Menu principal',
    enterBookingCode: 'Entrez votre code de réservation:',
    invalidInput: 'Entrée invalide. Réessayez.',
    cityNotFound: 'Ville non trouvée. Essayez: Kinshasa, Lubumbashi, Goma, Bukavu...',
    goodbye: "Merci d'utiliser Souple! Au revoir.",
    myBookingsStub: 'Réservations récentes: (non disponible via USSD)\n0. Retour',
    languageMenu: 'Langue / Language:\n1. Français\n2. English\n3. Lingala\n4. Kiswahili',
  },

  en: {
    welcome:
      'Welcome to Souple!\n1. Search a trip\n2. My bookings\n3. Check booking\n4. Language\n0. Exit',
    enterFrom: 'Enter departure city:',
    enterTo: 'Enter destination city:',
    enterDate: 'Enter travel date (DD/MM):',
    noTrips: 'No trips found.\n0. Main menu',
    selectSeats: '1. 1 seat\n2. 2 seats\n3. 3 seats\n0. Back',
    selectPayment:
      'Pay with:\n1. MTN Mobile Money\n2. Orange Money\n3. Airtel Money\n0. Cancel',
    enterPhone: 'Enter your MTN number (09XXXXXXXX):',
    paymentSent:
      'Payment request sent.\nYou will receive an SMS with your booking code.\n0. Main menu',
    enterBookingCode: 'Enter your booking code:',
    invalidInput: 'Invalid input. Please try again.',
    cityNotFound: 'City not found. Try: Kinshasa, Lubumbashi, Goma, Bukavu...',
    goodbye: 'Thank you for using Souple! Goodbye.',
    myBookingsStub: 'Recent bookings: (not available via USSD)\n0. Back',
    languageMenu: 'Langue / Language:\n1. Français\n2. English\n3. Lingala\n4. Kiswahili',
  },

  ln: {
    // Lingala
    welcome:
      'Boyei malamu na Souple!\n1. Koluka mobembo\n2. Bilukeli na ngai\n3. Talela bilukeli\n4. Lokota\n0. Kobima',
    enterFrom: 'Tiya ville ya kokima:',
    enterTo: 'Tiya ville ya kosika:',
    enterDate: 'Tiya tango (JJ/MM):',
    noTrips: 'Mobembo ezalaka te.\n0. Menu ya liboso',
    selectSeats: '1. Fauteuil 1\n2. Fauteuil 2\n3. Fauteuil 3\n0. Zonga',
    selectPayment:
      'Lipa na:\n1. MTN Mobile Money\n2. Orange Money\n3. Airtel Money\n0. Sila',
    enterPhone: 'Tiya numero ya MTN (09XXXXXXXX):',
    paymentSent:
      'Bomei ya lipay etindami.\nOkozua SMS na code na yo.\n0. Menu ya liboso',
    enterBookingCode: 'Tiya code ya bilukeli na yo:',
    invalidInput: 'Ndakisa mabe. Kozongela lisusu.',
    cityNotFound: 'Ville ezwami te. Kozela: Kinshasa, Lubumbashi, Goma...',
    goodbye: 'Asante ko Souple! Tokomonana.',
    myBookingsStub: 'Bilukeli ya suka: (ezali te na USSD)\n0. Zonga',
    languageMenu: 'Lokota / Language:\n1. Français\n2. English\n3. Lingala\n4. Kiswahili',
  },

  sw: {
    // Swahili
    welcome:
      'Karibu Souple!\n1. Tafuta safari\n2. Uhifadhi wangu\n3. Angalia uhifadhi\n4. Lugha\n0. Toka',
    enterFrom: 'Ingiza mji wa kuanzia:',
    enterTo: 'Ingiza mji wa kwenda:',
    enterDate: 'Ingiza tarehe (DD/MM):',
    noTrips: 'Hakuna safari.\n0. Menyu kuu',
    selectSeats: '1. Kiti 1\n2. Viti 2\n3. Viti 3\n0. Rudi',
    selectPayment:
      'Lipa kwa:\n1. MTN Mobile Money\n2. Orange Money\n3. Airtel Money\n0. Ghairi',
    enterPhone: 'Ingiza namba ya MTN (09XXXXXXXX):',
    paymentSent:
      'Ombi la malipo limetumwa.\nUtapokea SMS na nambari yako.\n0. Menyu kuu',
    enterBookingCode: 'Ingiza nambari ya uhifadhi wako:',
    invalidInput: 'Ingizo baya. Jaribu tena.',
    cityNotFound: 'Mji haukupatikana. Jaribu: Kinshasa, Lubumbashi, Goma...',
    goodbye: 'Asante kwa kutumia Souple! Kwa heri.',
    myBookingsStub: 'Uhifadhi wa hivi karibuni: (haipatikani kwa USSD)\n0. Rudi',
    languageMenu: 'Lugha / Language:\n1. Français\n2. English\n3. Lingala\n4. Kiswahili',
  },
}
