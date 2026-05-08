export interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  description?: string;
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
    date: "2025-05-24",
    time: "20:00",
    price: 1500,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "Experience the heartbeat of East Africa at Afrobeat Nights — a cinematic night of live music, electrifying DJ sets, and pure cultural immersion. Nairobi's finest artists take the stage in a celebration that fuses Afrobeats, Bongo Flava, and Amapiano into one unforgettable evening.",
    imageKey: "concert",
    featured: true,
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
    date: "2025-05-18",
    time: "10:00",
    price: 800,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "A groundbreaking exhibition featuring over 40 contemporary African artists exploring themes of identity, migration, and cultural memory through painting, sculpture, and multimedia installations. A must-see for anyone who believes art can change the world.",
    imageKey: "art",
    featured: true,
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
    date: "2025-05-20",
    time: "13:00",
    price: 500,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "Savour the diverse culinary landscape of Kenya at this curated food festival. From coastal Swahili cuisine to highland Kikuyu staples, meet the chefs and artisans who are reinventing East African food for a new generation.",
    imageKey: "food",
    featured: false,
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
    date: "2025-05-31",
    time: "15:00",
    price: 2000,
    currency: "KES",
    currencySymbol: "KSh",
    description:
      "The most ambitious cultural celebration in East Africa this year. Sauti Za Mataifa brings together traditional musicians, contemporary artists, and cultural historians for a two-day immersive festival of sound, story, and identity.",
    imageKey: "culture",
    featured: true,
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
    date: "2025-06-07",
    time: "18:00",
    price: 15000,
    currency: "NGN",
    currencySymbol: "₦",
    description:
      "The biggest music festival to hit Lagos this season. An explosive lineup of Afrobeats, Highlife, and Afropop superstars performing across three stages over two nights. This is not just a concert — it is a cultural moment.",
    imageKey: "concert",
    featured: false,
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
    date: "2025-06-14",
    time: "09:00",
    price: 50,
    currency: "GHS",
    currencySymbol: "GH₵",
    description:
      "A week-long celebration of Ghanaian and Pan-African art. From traditional Kente weaving demonstrations to cutting-edge digital art installations, Accra Art Week is a meeting point of the ancient and the future.",
    imageKey: "art",
    featured: false,
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
    date: "2025-05-29",
    time: "19:30",
    price: 50000,
    currency: "UGX",
    currencySymbol: "USh",
    description:
      "Uganda's funniest comedians take the stage for a night of unfiltered, culturally charged comedy. From political satire to everyday life observations, this is the show that Kampala has been waiting for.",
    imageKey: "culture",
    featured: false,
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
    date: "2025-05-23",
    time: "17:00",
    price: 10000,
    currency: "TZS",
    currencySymbol: "TSh",
    description:
      "As the Indian Ocean breeze rolls in, Dar es Salaam transforms into a culinary paradise. Over 60 food stalls, live Taarab music, and craft vendors make the Dar Night Market the most vibrant Saturday evening in the city.",
    imageKey: "food",
    featured: false,
    ticketTypes: [
      { id: "t1", name: "Entry", price: 10000, available: 500 },
    ],
  },
];

export const CATEGORIES = ["For You", "Music", "Art", "Food", "Heritage", "Comedy", "Sports", "Nightlife"] as const;

export const PURCHASED_TICKETS_DEFAULT = [
  {
    id: "ticket-001",
    eventId: "evt-001",
    ticketType: "General Admission",
    ticketNumber: "KTR-98321",
    purchaseDate: "2025-05-10",
    quantity: 2,
  },
];

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function getEventById(id: string): Event | undefined {
  return EVENTS.find((e) => e.id === id);
}

export const EVENT_IMAGES: Record<string, ReturnType<typeof require>> = {
  concert: require("@/assets/images/event_concert.png"),
  art: require("@/assets/images/event_art.png"),
  food: require("@/assets/images/event_food.png"),
  culture: require("@/assets/images/event_culture.png"),
};
