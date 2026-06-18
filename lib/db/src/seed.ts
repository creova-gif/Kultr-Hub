import { db, eventsTable, ticketTypesTable } from "./index.js";

const SEED_EVENTS = [
  {
    creatorId: "00000000-0000-0000-0000-000000000001",
    title: "Afrobeat Nights",
    subtitle: "A Night of Pure Rhythm",
    description:
      "Experience the heartbeat of East Africa at Afrobeat Nights — a cinematic night of live music, electrifying DJ sets, and pure cultural immersion.",
    category: "Music" as const,
    venue: "Alchemist Bar",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    eventDate: new Date("2026-06-14T20:00:00Z"),
    imageKey: "concert",
    capacity: 800,
    tags: ["Live Music", "Afrobeats", "DJ Sets"],
    featured: true,
    status: "live" as const,
  },
  {
    creatorId: "00000000-0000-0000-0000-000000000001",
    title: "Echoes of Identity",
    subtitle: "Contemporary African Art Exhibition",
    description:
      "A landmark exhibition bringing together 30 artists from across the continent exploring African identity through mixed media, sculpture, and photography.",
    category: "Art" as const,
    venue: "GoDown Arts Centre",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    eventDate: new Date("2026-06-20T10:00:00Z"),
    imageKey: "art",
    capacity: 300,
    tags: ["Art", "Exhibition", "African Identity"],
    featured: false,
    status: "live" as const,
  },
  {
    creatorId: "00000000-0000-0000-0000-000000000001",
    title: "Lagos Afro Street Festival",
    subtitle: "Culture, Music & Food in the Heart of Lagos",
    description:
      "The biggest street festival in West Africa returns with Afrobeats, street food, fashion, and art from over 100 Nigerian creators.",
    category: "Music" as const,
    venue: "Eko Atlantic",
    city: "Lagos",
    country: "Nigeria",
    countryCode: "NG",
    eventDate: new Date("2026-07-05T14:00:00Z"),
    imageKey: "concert",
    capacity: 5000,
    tags: ["Festival", "Afrobeats", "Street Food", "Fashion"],
    featured: true,
    status: "live" as const,
  },
  {
    creatorId: "00000000-0000-0000-0000-000000000001",
    title: "Accra Jazz Night",
    subtitle: "West African Jazz Showcase",
    description:
      "Ghana's finest jazz musicians take the stage at Alliance Française for an intimate evening of Highlife-infused jazz.",
    category: "Music" as const,
    venue: "Alliance Française d'Accra",
    city: "Accra",
    country: "Ghana",
    countryCode: "GH",
    eventDate: new Date("2026-06-28T19:00:00Z"),
    imageKey: "concert",
    capacity: 200,
    tags: ["Jazz", "Highlife", "Live Music"],
    featured: false,
    status: "live" as const,
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const eventData of SEED_EVENTS) {
    const [event] = await db.insert(eventsTable).values(eventData).returning();
    await db.insert(ticketTypesTable).values([
      {
        eventId: event.id,
        name: "General Admission",
        price: "1500",
        currency: "KES",
        totalQuantity: 200,
      },
      {
        eventId: event.id,
        name: "VIP",
        description: "Includes priority access and welcome drink",
        price: "5000",
        currency: "KES",
        totalQuantity: 30,
      },
    ]);
    console.log(`  ✓ Seeded: ${event.title}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
