import { Share, Platform } from "react-native";
import * as Linking from "expo-linking";

const APP_BASE_URL = process.env.EXPO_PUBLIC_SHARE_BASE_URL ?? "https://kultr.io";

export interface ShareableEvent {
  id: string;
  title: string;
  city: string;
  country: string;
  date: string;
  venue: string;
}

function buildEventUrl(eventId: string): string {
  return `${APP_BASE_URL}/e/${eventId}`;
}

function buildWhatsAppText(event: ShareableEvent): string {
  const url = buildEventUrl(event.id);
  return `🎵 *${event.title}*\n📍 ${event.venue}, ${event.city}\n📅 ${event.date}\n\nGet tickets 👉 ${url}`;
}

export async function shareEventToWhatsApp(event: ShareableEvent): Promise<void> {
  const text = buildWhatsAppText(event);
  const encoded = encodeURIComponent(text);

  const whatsappUrl =
    Platform.OS === "web"
      ? `https://wa.me/?text=${encoded}`
      : `whatsapp://send?text=${encoded}`;

  const canOpen = await Linking.canOpenURL(whatsappUrl);
  if (canOpen) {
    await Linking.openURL(whatsappUrl);
  } else {
    // Fall back to native share sheet if WhatsApp not installed
    await shareEvent(event);
  }
}

export async function shareEvent(event: ShareableEvent): Promise<void> {
  const url = buildEventUrl(event.id);
  const message = `${event.title} — ${event.venue}, ${event.city}\n${url}`;

  await Share.share(
    Platform.OS === "ios"
      ? { url, message }
      : { message: `${message}` },
    { dialogTitle: `Share ${event.title}` },
  );
}
