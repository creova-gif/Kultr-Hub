export type Language = "en" | "fr" | "sw";

export interface Translations {
  // Navigation
  nav: {
    home: string;
    discover: string;
    tickets: string;
    profile: string;
  };
  // Common actions
  actions: {
    search: string;
    save: string;
    share: string;
    buy: string;
    getTickets: string;
    viewTicket: string;
    browseEvents: string;
    createEvent: string;
    cancel: string;
    confirm: string;
    back: string;
    change: string;
    submit: string;
    loading: string;
  };
  // Event categories
  categories: {
    forYou: string;
    music: string;
    art: string;
    food: string;
    heritage: string;
    comedy: string;
    sports: string;
    nightlife: string;
  };
  // Event detail
  event: {
    from: string;
    soldOut: string;
    available: string;
    date: string;
    time: string;
    venue: string;
    about: string;
    lineup: string;
    tickets: string;
    relatedEvents: string;
    featuring: string;
    headliner: string;
  };
  // Checkout
  checkout: {
    title: string;
    ticketDetails: string;
    paymentMethod: string;
    orderSummary: string;
    serviceFee: string;
    total: string;
    processing: string;
    pay: string;
    securePayment: string;
    convertedNote: string;
    enterPhone: string;
  };
  // Ticket view
  ticket: {
    myTickets: string;
    noTickets: string;
    noTicketsSub: string;
    upcoming: string;
    past: string;
    bookingConfirmed: string;
    paymentSuccessful: string;
    presentQR: string;
    authentic: string;
    saveToPhone: string;
    getDirections: string;
    discoverMore: string;
  };
  // Profile
  profile: {
    title: string;
    savedEvents: string;
    myTickets: string;
    createEvent: string;
    notifications: string;
    settings: string;
    creator: string;
    member: string;
    totalRevenue: string;
    ticketsSold: string;
    liveEvents: string;
    edit: string;
  };
  // Discover
  discover: {
    title: string;
    searchPlaceholder: string;
    byCity: string;
    allEvents: string;
    resultsFor: string;
    noEvents: string;
    noEventsSub: string;
    paymentMethods: string;
    pricesIn: string;
    checkoutConverts: string;
  };
  // Empty states
  empty: {
    nothingSaved: string;
    nothingSavedSub: string;
    noTickets: string;
    noTicketsSub: string;
  };
  // Payment methods
  payments: {
    mobileMoney: string;
    bankTransfer: string;
    ussd: string;
    card: string;
    redirectSecure: string;
    bankDetails: string;
  };
}

const en: Translations = {
  nav: {
    home: "Home",
    discover: "Discover",
    tickets: "Tickets",
    profile: "Profile",
  },
  actions: {
    search: "Search",
    save: "Save",
    share: "Share",
    buy: "Buy",
    getTickets: "Get Tickets",
    viewTicket: "View Ticket",
    browseEvents: "Browse Events",
    createEvent: "Create Event",
    cancel: "Cancel",
    confirm: "Confirm",
    back: "Back",
    change: "Change",
    submit: "Submit",
    loading: "Loading...",
  },
  categories: {
    forYou: "For You",
    music: "Music",
    art: "Art",
    food: "Food",
    heritage: "Heritage",
    comedy: "Comedy",
    sports: "Sports",
    nightlife: "Nightlife",
  },
  event: {
    from: "From",
    soldOut: "Sold out",
    available: "left",
    date: "Date",
    time: "Time",
    venue: "Venue",
    about: "About this Event",
    lineup: "Lineup",
    tickets: "Tickets",
    relatedEvents: "You Might Also Like",
    featuring: "Featuring",
    headliner: "Headliner",
  },
  checkout: {
    title: "Checkout",
    ticketDetails: "Ticket Details",
    paymentMethod: "Payment Method",
    orderSummary: "Order Summary",
    serviceFee: "Service fee (5%)",
    total: "Total",
    processing: "Processing payment...",
    pay: "Pay",
    securePayment: "Your payment is secured with 256-bit encryption",
    convertedNote: "Converted · indicative rate",
    enterPhone: "Enter your mobile number",
  },
  ticket: {
    myTickets: "My Tickets",
    noTickets: "No tickets yet",
    noTicketsSub: "Discover and book events to see your tickets here",
    upcoming: "Upcoming",
    past: "Past",
    bookingConfirmed: "Booking Confirmed!",
    paymentSuccessful: "Payment successful! Your ticket is ready.",
    presentQR: "Present this QR code at the venue entrance",
    authentic: "AUTHENTIC TICKET · Do not share this ticket",
    saveToPhone: "Save to Phone",
    getDirections: "Get Directions",
    discoverMore: "Discover More Events",
  },
  profile: {
    title: "Profile",
    savedEvents: "Saved Events",
    myTickets: "My Tickets",
    createEvent: "Create Event",
    notifications: "Notifications",
    settings: "Settings",
    creator: "Kultr Creator",
    member: "Kultr Member",
    totalRevenue: "Revenue",
    ticketsSold: "Tickets Sold",
    liveEvents: "Live Events",
    edit: "Edit",
  },
  discover: {
    title: "Culture Compass",
    searchPlaceholder: "Search events, artists, cities...",
    byCity: "Browse by City",
    allEvents: "All Events",
    resultsFor: 'Results for',
    noEvents: "No events found",
    noEventsSub: "Try a different search or category",
    paymentMethods: "Payment Methods",
    pricesIn: "Viewing prices in event local currency · Checkout converts to",
    checkoutConverts: "Checkout converts to",
  },
  empty: {
    nothingSaved: "Nothing saved yet",
    nothingSavedSub: "Tap the heart on any event to save it for later",
    noTickets: "No tickets yet",
    noTicketsSub: "Discover and book events to see your tickets here",
  },
  payments: {
    mobileMoney: "Mobile Money",
    bankTransfer: "Bank Transfer",
    ussd: "USSD Code",
    card: "Card",
    redirectSecure: "You will be redirected to a secure 3D-secured payment page",
    bankDetails: "Bank account details will be sent to your email after confirming",
  },
};

const fr: Translations = {
  nav: {
    home: "Accueil",
    discover: "Découvrir",
    tickets: "Billets",
    profile: "Profil",
  },
  actions: {
    search: "Rechercher",
    save: "Sauvegarder",
    share: "Partager",
    buy: "Acheter",
    getTickets: "Obtenir des billets",
    viewTicket: "Voir le billet",
    browseEvents: "Parcourir les événements",
    createEvent: "Créer un événement",
    cancel: "Annuler",
    confirm: "Confirmer",
    back: "Retour",
    change: "Modifier",
    submit: "Soumettre",
    loading: "Chargement...",
  },
  categories: {
    forYou: "Pour vous",
    music: "Musique",
    art: "Art",
    food: "Gastronomie",
    heritage: "Patrimoine",
    comedy: "Comédie",
    sports: "Sports",
    nightlife: "Vie nocturne",
  },
  event: {
    from: "À partir de",
    soldOut: "Épuisé",
    available: "restants",
    date: "Date",
    time: "Heure",
    venue: "Lieu",
    about: "À propos de cet événement",
    lineup: "Programme",
    tickets: "Billets",
    relatedEvents: "Vous pourriez aussi aimer",
    featuring: "En vedette",
    headliner: "Tête d'affiche",
  },
  checkout: {
    title: "Paiement",
    ticketDetails: "Détails du billet",
    paymentMethod: "Mode de paiement",
    orderSummary: "Récapitulatif de la commande",
    serviceFee: "Frais de service (5%)",
    total: "Total",
    processing: "Traitement du paiement...",
    pay: "Payer",
    securePayment: "Votre paiement est sécurisé avec un chiffrement 256 bits",
    convertedNote: "Converti · taux indicatif",
    enterPhone: "Entrez votre numéro de téléphone",
  },
  ticket: {
    myTickets: "Mes billets",
    noTickets: "Pas encore de billets",
    noTicketsSub: "Découvrez et réservez des événements pour voir vos billets ici",
    upcoming: "À venir",
    past: "Passé",
    bookingConfirmed: "Réservation confirmée !",
    paymentSuccessful: "Paiement réussi ! Votre billet est prêt.",
    presentQR: "Présentez ce code QR à l'entrée du lieu",
    authentic: "BILLET AUTHENTIQUE · Ne partagez pas ce billet",
    saveToPhone: "Sauvegarder sur le téléphone",
    getDirections: "Obtenir l'itinéraire",
    discoverMore: "Découvrir plus d'événements",
  },
  profile: {
    title: "Profil",
    savedEvents: "Événements sauvegardés",
    myTickets: "Mes billets",
    createEvent: "Créer un événement",
    notifications: "Notifications",
    settings: "Paramètres",
    creator: "Créateur Kultr",
    member: "Membre Kultr",
    totalRevenue: "Revenus",
    ticketsSold: "Billets vendus",
    liveEvents: "Événements en cours",
    edit: "Modifier",
  },
  discover: {
    title: "Boussole Culturelle",
    searchPlaceholder: "Rechercher événements, artistes, villes...",
    byCity: "Parcourir par ville",
    allEvents: "Tous les événements",
    resultsFor: "Résultats pour",
    noEvents: "Aucun événement trouvé",
    noEventsSub: "Essayez une autre recherche ou catégorie",
    paymentMethods: "Modes de paiement",
    pricesIn: "Prix affichés en devise locale · Le paiement est converti en",
    checkoutConverts: "Le paiement est converti en",
  },
  empty: {
    nothingSaved: "Rien de sauvegardé",
    nothingSavedSub: "Appuyez sur le cœur d'un événement pour le sauvegarder",
    noTickets: "Pas encore de billets",
    noTicketsSub: "Découvrez et réservez des événements pour voir vos billets ici",
  },
  payments: {
    mobileMoney: "Mobile Money",
    bankTransfer: "Virement bancaire",
    ussd: "Code USSD",
    card: "Carte",
    redirectSecure: "Vous serez redirigé vers une page de paiement sécurisée 3D",
    bankDetails: "Les coordonnées bancaires vous seront envoyées par e-mail après confirmation",
  },
};

const sw: Translations = {
  nav: {
    home: "Nyumbani",
    discover: "Gundua",
    tickets: "Tikiti",
    profile: "Wasifu",
  },
  actions: {
    search: "Tafuta",
    save: "Hifadhi",
    share: "Shiriki",
    buy: "Nunua",
    getTickets: "Pata Tikiti",
    viewTicket: "Angalia Tikiti",
    browseEvents: "Angalia Matukio",
    createEvent: "Unda Tukio",
    cancel: "Ghairi",
    confirm: "Thibitisha",
    back: "Rudi",
    change: "Badilisha",
    submit: "Wasilisha",
    loading: "Inapakia...",
  },
  categories: {
    forYou: "Kwako",
    music: "Muziki",
    art: "Sanaa",
    food: "Chakula",
    heritage: "Urithi",
    comedy: "Vichekesho",
    sports: "Michezo",
    nightlife: "Usiku",
  },
  event: {
    from: "Kuanzia",
    soldOut: "Imeisha",
    available: "zilizobaki",
    date: "Tarehe",
    time: "Saa",
    venue: "Mahali",
    about: "Kuhusu Tukio hili",
    lineup: "Wasanii",
    tickets: "Tikiti",
    relatedEvents: "Unaweza Kupenda Pia",
    featuring: "Likiwa na",
    headliner: "Msanii Mkuu",
  },
  checkout: {
    title: "Malipo",
    ticketDetails: "Maelezo ya Tikiti",
    paymentMethod: "Njia ya Malipo",
    orderSummary: "Muhtasari wa Agizo",
    serviceFee: "Ada ya huduma (5%)",
    total: "Jumla",
    processing: "Inachakata malipo...",
    pay: "Lipa",
    securePayment: "Malipo yako yanalindwa kwa usimbaji fiche wa biti 256",
    convertedNote: "Imebadilishwa · kiwango cha dalili",
    enterPhone: "Ingiza nambari yako ya simu",
  },
  ticket: {
    myTickets: "Tikiti Zangu",
    noTickets: "Bado hakuna tikiti",
    noTicketsSub: "Gundua na uhifadhi matukio ili uone tikiti zako hapa",
    upcoming: "Inakuja",
    past: "Imepita",
    bookingConfirmed: "Uhifadhi Umethibitishwa!",
    paymentSuccessful: "Malipo yamefanikiwa! Tikiti yako iko tayari.",
    presentQR: "Onyesha msimbo huu wa QR kwenye mlango wa ukumbi",
    authentic: "TIKITI HALISI · Usishiriki tikiti hii",
    saveToPhone: "Hifadhi kwenye Simu",
    getDirections: "Pata Mwelekeo",
    discoverMore: "Gundua Matukio Zaidi",
  },
  profile: {
    title: "Wasifu",
    savedEvents: "Matukio Yaliyohifadhiwa",
    myTickets: "Tikiti Zangu",
    createEvent: "Unda Tukio",
    notifications: "Arifa",
    settings: "Mipangilio",
    creator: "Muunda wa Kultr",
    member: "Mwanachama wa Kultr",
    totalRevenue: "Mapato",
    ticketsSold: "Tikiti Zilizouzwa",
    liveEvents: "Matukio Yanayoendelea",
    edit: "Hariri",
  },
  discover: {
    title: "Dira ya Utamaduni",
    searchPlaceholder: "Tafuta matukio, wasanii, miji...",
    byCity: "Vinjari kwa Mji",
    allEvents: "Matukio Yote",
    resultsFor: "Matokeo ya",
    noEvents: "Hakuna matukio yaliyopatikana",
    noEventsSub: "Jaribu utafutaji mwingine au aina tofauti",
    paymentMethods: "Njia za Malipo",
    pricesIn: "Bei zinaonyeshwa kwa sarafu ya tukio · Malipo yanabadilishwa hadi",
    checkoutConverts: "Malipo yanabadilishwa hadi",
  },
  empty: {
    nothingSaved: "Hakuna kilichohifadhiwa",
    nothingSavedSub: "Gonga moyo kwenye tukio lolote kulihifadhi kwa baadaye",
    noTickets: "Bado hakuna tikiti",
    noTicketsSub: "Gundua na uhifadhi matukio ili uone tikiti zako hapa",
  },
  payments: {
    mobileMoney: "Pesa ya Simu",
    bankTransfer: "Uhamisho wa Benki",
    ussd: "Nambari ya USSD",
    card: "Kadi",
    redirectSecure: "Utaelekezwa kwenye ukurasa salama wa malipo wa 3D",
    bankDetails: "Maelezo ya akaunti ya benki yatatumwa kwa barua pepe yako baada ya kuthibitisha",
  },
};

export const TRANSLATIONS: Record<Language, Translations> = { en, fr, sw };
