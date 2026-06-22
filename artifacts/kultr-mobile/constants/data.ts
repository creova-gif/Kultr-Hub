export interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  description?: string;
}

export interface LineupArtist {
  name: string;
  role: string;
  time?: string;
  origin?: string;
}

export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  category: "Music" | "Art" | "Food" | "Heritage" | "Comedy" | "Sports" | "Nightlife";
  venue: string;
  city: string;
  country: string;
  date: string;
  time: string;
  price: number;
  currency: string;
  currencySymbol: string;
  description: string;
  imageKey: "concert" | "art" | "food" | "culture";
  featured?: boolean;
  ticketTypes: TicketType[];
  latitude?: number;
  longitude?: number;
  matchScore?: number;
  lineup?: LineupArtist[];
  tags?: string[];
  capacity?: number;
}

export const EVENTS: Event[] = [
  {
    id: "evt-001",
    title: "Afrobeat Nights",
    subtitle: "A Night of Pure Rhythm",
    category: "Music",
    venue: "Alchemist Bar",
    city: "Nairobi",
    country: "Kenya",
    date: "2026-06-14",
    time: "20:00",
    price: 1500,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "Experience the heartbeat of East Africa at Afrobeat Nights — a cinematic night of live music, electrifying DJ sets, and pure cultural immersion. Nairobi's finest artists take the stage in a celebration that fuses Afrobeats, Bongo Flava, and Amapiano into one unforgettable evening.",
    imageKey: "concert",
    featured: true,
    capacity: 800,
    tags: ["Live Music", "Afrobeats", "DJ Sets", "Dancing", "Bar"],
    lineup: [
      { name: "DJ Fatxo", role: "Headliner", time: "22:00", origin: "Kenya" },
      { name: "Ssaru", role: "Featured Artist", time: "21:00", origin: "Kenya" },
      { name: "Bensoul", role: "Live Performance", time: "20:00", origin: "Kenya" },
      { name: "DJ Mpendwa", role: "Opening Set", time: "19:30", origin: "Kenya" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 1500, available: 200 },
      { id: "t2", name: "VIP Table", price: 5000, available: 20, description: "Includes bottle service" },
      { id: "t3", name: "Early Bird", price: 1000, available: 0, description: "Sold out" },
    ],
  },
  {
    id: "evt-002",
    title: "Echoes of Identity",
    subtitle: "Contemporary African Art Exhibition",
    category: "Art",
    venue: "GoDown Arts Centre",
    city: "Nairobi",
    country: "Kenya",
    date: "2026-05-30",
    time: "10:00",
    price: 800,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "A groundbreaking exhibition featuring over 40 contemporary African artists exploring themes of identity, migration, and cultural memory through painting, sculpture, and multimedia installations. A must-see for anyone who believes art can change the world.",
    imageKey: "art",
    featured: true,
    capacity: 400,
    tags: ["Art", "Exhibition", "Contemporary", "African Artists", "Culture"],
    lineup: [
      { name: "Wangechi Mutu", role: "Headlining Artist", origin: "Kenya/USA" },
      { name: "Cyrus Kabiru", role: "Sculpture & Installation", origin: "Kenya" },
      { name: "Michael Armitage", role: "Painting", origin: "Kenya/UK" },
      { name: "Zanele Muholi", role: "Photography", origin: "South Africa" },
    ],
    ticketTypes: [
      { id: "t1", name: "Day Pass", price: 800, available: 150 },
      { id: "t2", name: "Weekend Pass", price: 1500, available: 80, description: "Access all days" },
    ],
  },
  {
    id: "evt-003",
    title: "Flavors of Kenya",
    subtitle: "Nairobi Food & Culture Festival",
    category: "Food",
    venue: "Karen Blixen Museum Gardens",
    city: "Nairobi",
    country: "Kenya",
    date: "2026-06-06",
    time: "13:00",
    price: 500,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "Savour the diverse culinary landscape of Kenya at this curated food festival. From coastal Swahili cuisine to highland Kikuyu staples, meet the chefs and artisans who are reinventing East African food for a new generation.",
    imageKey: "food",
    featured: false,
    capacity: 1200,
    tags: ["Food", "Culture", "Chef", "Street Food", "Family Friendly"],
    lineup: [
      { name: "Chef Ali Mandhry", role: "Swahili Cuisine Demo", origin: "Kenya" },
      { name: "Chef Raphael Odero", role: "Modern Kenyan", origin: "Kenya" },
      { name: "Mama Oliech", role: "Traditional Luo", origin: "Kenya" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Entry", price: 500, available: 300 },
      { id: "t2", name: "Tasting Package", price: 2000, available: 50, description: "10 tasting tokens included" },
    ],
  },
  {
    id: "evt-004",
    title: "Sauti Za Mataifa",
    subtitle: "A Celebration of African Music and Culture",
    category: "Heritage",
    venue: "KICC Grounds",
    city: "Nairobi",
    country: "Kenya",
    date: "2026-05-23",
    time: "15:00",
    price: 2000,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "The most ambitious cultural celebration in East Africa this year. Sauti Za Mataifa brings together traditional musicians, contemporary artists, and cultural historians for a two-day immersive festival of sound, story, and identity.",
    imageKey: "culture",
    featured: true,
    capacity: 5000,
    tags: ["Heritage", "Traditional Music", "Festival", "Cultural", "Multi-Day"],
    lineup: [
      { name: "Ayub Ogada", role: "Nyatiti Performance", time: "17:00", origin: "Kenya" },
      { name: "Fadhilee Itulya", role: "Roots Music", time: "16:00", origin: "Kenya" },
      { name: "Mawazo Collective", role: "Contemporary Fusion", time: "18:30", origin: "Kenya/Tanzania" },
      { name: "Safaricom Youth Choir", role: "Choral Performance", time: "15:30", origin: "Kenya" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 2000, available: 500 },
      { id: "t2", name: "VIP Access", price: 7500, available: 30, description: "VIP lounge + artist meet & greet" },
      { id: "t3", name: "Two-Day Pass", price: 3500, available: 100 },
    ],
  },
  {
    id: "evt-005",
    title: "Lagos Groove Festival",
    subtitle: "Where Lagos Comes Alive",
    category: "Music",
    venue: "Eko Convention Centre",
    city: "Lagos",
    country: "Nigeria",
    date: "2026-06-20",
    time: "18:00",
    price: 15000,
    currency: "NGN",
    currencySymbol: "₦",
    description:
      "The biggest music festival to hit Lagos this season. An explosive lineup of Afrobeats, Highlife, and Afropop superstars performing across three stages over two nights. This is not just a concert — it is a cultural moment.",
    imageKey: "concert",
    featured: false,
    capacity: 8000,
    tags: ["Afrobeats", "Highlife", "Afropop", "Multi-Stage", "Festival"],
    lineup: [
      { name: "Burna Boy", role: "Headliner", time: "22:00", origin: "Nigeria" },
      { name: "Wizkid", role: "Co-Headliner", time: "20:30", origin: "Nigeria" },
      { name: "Tems", role: "Featured Artist", time: "19:00", origin: "Nigeria" },
      { name: "Rema", role: "Support", time: "18:00", origin: "Nigeria" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 15000, available: 1000 },
      { id: "t2", name: "VIP", price: 45000, available: 100 },
    ],
  },
  {
    id: "evt-006",
    title: "Accra Art Week",
    subtitle: "Ghana's Premiere Art Event",
    category: "Art",
    venue: "National Museum of Ghana",
    city: "Accra",
    country: "Ghana",
    date: "2026-07-04",
    time: "09:00",
    price: 50,
    currency: "GHS",
    currencySymbol: "GH₵",
    description:
      "A week-long celebration of Ghanaian and Pan-African art. From traditional Kente weaving demonstrations to cutting-edge digital art installations, Accra Art Week is a meeting point of the ancient and the future.",
    imageKey: "art",
    featured: false,
    capacity: 600,
    tags: ["Art", "Ghana", "Kente", "Digital Art", "Cultural Heritage"],
    lineup: [
      { name: "Serge Attukwei Clottey", role: "Installation Art", origin: "Ghana" },
      { name: "Amoako Boafo", role: "Portraiture", origin: "Ghana/Austria" },
      { name: "El Anatsui", role: "Sculpture", origin: "Ghana" },
    ],
    ticketTypes: [
      { id: "t1", name: "Day Pass", price: 50, available: 200 },
      { id: "t2", name: "Full Week Pass", price: 200, available: 60 },
    ],
  },
  {
    id: "evt-007",
    title: "Kampala Comedy Night",
    subtitle: "Laugh Until You Can't Breathe",
    category: "Comedy",
    venue: "Serena Hotel Ballroom",
    city: "Kampala",
    country: "Uganda",
    date: "2026-06-12",
    time: "19:30",
    price: 50000,
    currency: "UGX",
    currencySymbol: "USh",
    description:
      "Uganda's funniest comedians take the stage for a night of unfiltered, culturally charged comedy. From political satire to everyday life observations, this is the show that Kampala has been waiting for.",
    imageKey: "culture",
    featured: false,
    capacity: 300,
    tags: ["Comedy", "Stand-Up", "Satire", "Nightlife", "Entertainment"],
    lineup: [
      { name: "Anne Kansiime", role: "Headliner", time: "21:00", origin: "Uganda" },
      { name: "Salvador Idringi", role: "Co-Headliner", time: "20:00", origin: "Uganda" },
      { name: "Reign Jemba", role: "Featured Act", time: "19:30", origin: "Uganda" },
    ],
    ticketTypes: [
      { id: "t1", name: "Standard", price: 50000, available: 120 },
      { id: "t2", name: "Premium (Front Row)", price: 100000, available: 30 },
    ],
  },
  {
    id: "evt-008",
    title: "Dar Night Market",
    subtitle: "Street Food & Live Music Under the Stars",
    category: "Food",
    venue: "Coco Beach Waterfront",
    city: "Dar es Salaam",
    country: "Tanzania",
    date: "2026-05-16",
    time: "17:00",
    price: 10000,
    currency: "TZS",
    currencySymbol: "TSh",
    description:
      "As the Indian Ocean breeze rolls in, Dar es Salaam transforms into a culinary paradise. Over 60 food stalls, live Taarab music, and craft vendors make the Dar Night Market the most vibrant Saturday evening in the city.",
    imageKey: "food",
    featured: false,
    capacity: 2000,
    tags: ["Street Food", "Taarab Music", "Crafts", "Waterfront", "Family"],
    lineup: [
      { name: "Bi Kidude Ensemble", role: "Taarab Music", time: "19:00", origin: "Tanzania" },
      { name: "Diamond Platnumz Band", role: "Live Set", time: "21:00", origin: "Tanzania" },
    ],
    ticketTypes: [
      { id: "t1", name: "Entry", price: 10000, available: 500 },
    ],
  },
  {
    id: "evt-d01",
    title: "Kingston Carnival",
    subtitle: "Jamaica's Greatest Street Party",
    category: "Heritage",
    venue: "Kingston Waterfront",
    city: "Kingston",
    country: "Jamaica",
    date: "2026-08-03",
    time: "16:00",
    price: 3500,
    currency: "JMD",
    currencySymbol: "J$",
    description:
      "Kingston Carnival is the heartbeat of Jamaican culture — a vibrant explosion of dancehall, reggae, and masquerade that fills the streets with colour, rhythm, and island pride. Join thousands as Kingston Waterfront transforms into the Caribbean's most electrifying cultural celebration.",
    imageKey: "culture",
    featured: true,
    capacity: 10000,
    tags: ["carnival", "jamaican", "dancehall", "diaspora"],
    lineup: [
      { name: "Sizzla Kalonji", role: "Headliner", time: "20:00", origin: "Jamaica" },
      { name: "Etana", role: "Featured Artist", time: "18:30", origin: "Jamaica" },
      { name: "Protoje", role: "Live Performance", time: "17:00", origin: "Jamaica" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 3500, available: 150 },
      { id: "t2", name: "VIP", price: 12000, available: 30, description: "VIP enclosure with premium views" },
    ],
  },
  {
    id: "evt-d02",
    title: "Notting Hill Carnival After-Party",
    subtitle: "London's Afrobeats Night",
    category: "Nightlife",
    venue: "Fabric London EC1A 1PJ",
    city: "London",
    country: "United Kingdom",
    date: "2026-08-25",
    time: "21:00",
    price: 35,
    currency: "GBP",
    currencySymbol: "£",
    description:
      "After the floats and mas bands take their final bow, London's diaspora descends on Fabric for the ultimate Afrobeats after-party. World-class DJs spin Afrobeats, Afro-swing, and UK drill through the night in one of Europe's most legendary venues.",
    imageKey: "concert",
    featured: false,
    capacity: 1500,
    tags: ["uk", "afrobeats", "diaspora", "london"],
    lineup: [
      { name: "DJ Cuppy", role: "Headliner", time: "23:00", origin: "Nigeria/UK" },
      { name: "Yaw Darko", role: "Support DJ", time: "21:00", origin: "Ghana/UK" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 35, available: 150 },
      { id: "t2", name: "VIP", price: 85, available: 30, description: "VIP lounge access" },
    ],
  },
  {
    id: "evt-d03",
    title: "Afrobeats NYC",
    subtitle: "Africa Comes to the Big Apple",
    category: "Music",
    venue: "Madison Square Garden",
    city: "New York",
    country: "United States",
    date: "2026-09-13",
    time: "20:00",
    price: 65,
    currency: "USD",
    currencySymbol: "$",
    description:
      "The biggest Afrobeats event ever to land in New York City. Madison Square Garden hosts a night of chart-topping African artists, bringing the sounds of Lagos, Accra, and Nairobi to the heart of Manhattan for an unforgettable cultural experience.",
    imageKey: "concert",
    featured: true,
    capacity: 20000,
    tags: ["nyc", "afrobeats", "diaspora", "afrobeat"],
    lineup: [
      { name: "Davido", role: "Headliner", time: "22:00", origin: "Nigeria" },
      { name: "Fireboy DML", role: "Co-Headliner", time: "21:00", origin: "Nigeria" },
      { name: "Amaarae", role: "Featured Artist", time: "20:00", origin: "Ghana/USA" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 65, available: 150 },
      { id: "t2", name: "VIP", price: 180, available: 30, description: "Floor VIP with exclusive access" },
    ],
  },
  {
    id: "evt-d04",
    title: "Toronto Caribbean Festival",
    subtitle: "Canada's Largest Caribbean Celebration",
    category: "Heritage",
    venue: "Exhibition Place",
    city: "Toronto",
    country: "Canada",
    date: "2026-08-01",
    time: "14:00",
    price: 25,
    currency: "CAD",
    currencySymbol: "C$",
    description:
      "Toronto's beloved Caribbean Festival brings the warmth and spirit of the islands to Lake Ontario's shores. Experience traditional mas costumes, soca, calypso, Caribbean cuisine, and the jubilant Grand Parade in one of North America's most vibrant cultural festivals.",
    imageKey: "culture",
    featured: false,
    capacity: 50000,
    tags: ["caribbean", "toronto", "diaspora", "culture"],
    lineup: [
      { name: "Machel Montano", role: "Headliner", time: "18:00", origin: "Trinidad" },
      { name: "Destra Garcia", role: "Featured Artist", time: "16:30", origin: "Trinidad" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 25, available: 150 },
      { id: "t2", name: "VIP", price: 90, available: 30, description: "VIP grandstand seating" },
    ],
  },
  {
    id: "evt-d05",
    title: "Paris Afropolis",
    subtitle: "The Afro-Cultural Capital of Europe",
    category: "Music",
    venue: "La Villette",
    city: "Paris",
    country: "France",
    date: "2026-10-04",
    time: "19:00",
    price: 45,
    currency: "EUR",
    currencySymbol: "€",
    description:
      "La Villette's iconic Grande Halle hosts Paris Afropolis — a fusion of Afrobeats, Afro-jazz, spoken word, and visual art celebrating the African diaspora in Europe. A sophisticated evening where music, art, and cultural dialogue meet under the Paris lights.",
    imageKey: "concert",
    featured: false,
    capacity: 3000,
    tags: ["paris", "afro", "diaspora", "europe"],
    lineup: [
      { name: "Aya Nakamura", role: "Headliner", time: "21:00", origin: "Mali/France" },
      { name: "Soolking", role: "Featured Artist", time: "20:00", origin: "Algeria/France" },
      { name: "Dadju", role: "Special Guest", time: "19:30", origin: "DRC/France" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 45, available: 150 },
      { id: "t2", name: "VIP", price: 120, available: 30, description: "VIP terrace with champagne" },
    ],
  },
  {
    id: "evt-d06",
    title: "Trinidad Soca Monarch",
    subtitle: "The Crown of Caribbean Music",
    category: "Music",
    venue: "Queen's Park Savannah",
    city: "Port of Spain",
    country: "Trinidad",
    date: "2026-02-14",
    time: "18:00",
    price: 250,
    currency: "TTD",
    currencySymbol: "TT$",
    description:
      "The Trinidad Soca Monarch is the most prestigious title in Caribbean music. Queens Park Savannah becomes a battleground of rhythm as the island's finest soca artists compete for the crown, delivering powerhouse performances that ignite the carnival season.",
    imageKey: "concert",
    featured: false,
    capacity: 30000,
    tags: ["soca", "trinidadian", "carnival", "caribbean"],
    lineup: [
      { name: "Machel Montano", role: "Defending Champion", time: "22:00", origin: "Trinidad" },
      { name: "Bunji Garlin", role: "Competitor", time: "20:30", origin: "Trinidad" },
      { name: "Voice", role: "Competitor", time: "19:00", origin: "Trinidad" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 250, available: 150 },
      { id: "t2", name: "VIP", price: 800, available: 30, description: "VIP grandstand with premium seating" },
    ],
  },
  {
    id: "evt-d07",
    title: "Barbados Crop Over",
    subtitle: "The Sweetest Festival on Earth",
    category: "Heritage",
    venue: "National Stadium",
    city: "Bridgetown",
    country: "Barbados",
    date: "2026-07-28",
    time: "15:00",
    price: 50,
    currency: "BBD",
    currencySymbol: "Bds$",
    description:
      "Crop Over is Barbados's grandest cultural tradition — a harvest festival reborn as the Caribbean's most joyful celebration. From the Pic-O-De-Crop calypso finals to the Grand Kadooment Day parade, Bridgetown explodes in colour, music, and Bajan pride.",
    imageKey: "culture",
    featured: false,
    capacity: 15000,
    tags: ["barbados", "crop-over", "caribbean", "heritage"],
    lineup: [
      { name: "Edwin Yearwood", role: "Headliner", time: "19:00", origin: "Barbados" },
      { name: "Rupee", role: "Featured Artist", time: "17:30", origin: "Barbados" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 50, available: 150 },
      { id: "t2", name: "VIP", price: 180, available: 30, description: "VIP grandstand with bar access" },
    ],
  },
  {
    id: "evt-d08",
    title: "Afro Nation Portugal",
    subtitle: "Europe's Premier Afrobeats Festival",
    category: "Music",
    venue: "Praia da Rocha",
    city: "Portimão",
    country: "Portugal",
    date: "2026-07-10",
    time: "17:00",
    price: 120,
    currency: "EUR",
    currencySymbol: "€",
    description:
      "Set on the golden beaches of the Algarve, Afro Nation Portugal is Europe's most anticipated Afrobeats festival. Three days of world-class performances, with the Atlantic Ocean as your backdrop and the diaspora united under the summer sun.",
    imageKey: "concert",
    featured: true,
    capacity: 40000,
    tags: ["portugal", "afrobeats", "diaspora", "festival"],
    lineup: [
      { name: "Wizkid", role: "Headliner", time: "22:00", origin: "Nigeria" },
      { name: "Tems", role: "Co-Headliner", time: "20:30", origin: "Nigeria" },
      { name: "Black Sherif", role: "Featured Artist", time: "18:30", origin: "Ghana" },
    ],
    ticketTypes: [
      { id: "t1", name: "General Admission", price: 120, available: 150 },
      { id: "t2", name: "VIP", price: 350, available: 30, description: "VIP beach area with premium bar" },
    ],
  },
];

export const CATEGORIES = ["For You", "Music", "Art", "Food", "Heritage", "Comedy", "Sports", "Nightlife"] as const;

// Passing `undefined` lets Intl use the device locale, so dates/times render in
// each user's regional convention (e.g. "20 Jul 2026" / "20/07", 24h clocks)
// instead of being hardcoded to en-US. Callers may pass an explicit locale.
export function formatDate(dateStr: string, locale?: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string, locale?: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function getEventById(id: string): Event | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function getRelatedEvents(event: Event, limit = 3): Event[] {
  return EVENTS.filter(
    (e) => e.id !== event.id && (e.category === event.category || e.city === event.city)
  ).slice(0, limit);
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateStr + "T00:00:00");
  const diff = eventDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// `require()` returns `any` at runtime; the explicit cast to `any` lets every
// Image component accept these values without per-site casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const EVENT_IMAGES: Record<"concert" | "art" | "food" | "culture", any> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  concert: require("@/assets/images/event_concert.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  art: require("@/assets/images/event_art.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  food: require("@/assets/images/event_food.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  culture: require("@/assets/images/event_culture.png"),
};
