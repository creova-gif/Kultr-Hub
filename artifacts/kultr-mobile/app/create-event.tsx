import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert } from "@/lib/alert";
import { type CreatedEvent, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useCreateEvent, useUpdateEventStatus } from "@workspace/api-client-react";

const LOGO_ICON = require("@/assets/images/logo-icon.png");

const CATEGORIES = ["Music", "Art", "Food", "Heritage", "Comedy", "Sports", "Nightlife"] as const;
type Category = (typeof CATEGORIES)[number];

const TICKET_TIERS = [
  { id: "earlybird", name: "Early Bird", color: "#00C853" },
  { id: "regular", name: "Regular", color: "#FF6B00" },
  { id: "vip", name: "VIP", color: "#9C27B0" },
];

export default function CreateEventScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addCreatedEvent, userCountry, authToken } = useApp();
  const { mutateAsync: createEventApi } = useCreateEvent();
  const { mutateAsync: updateEventStatusApi } = useUpdateEventStatus();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 24) : insets.bottom;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Music");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [prices, setPrices] = useState({ earlybird: "", regular: "", vip: "" });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const isDateValid = (() => {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime()) && d > new Date();
  })();
  const isPriceValid = Object.values(prices).every((p) => p === "" || (!isNaN(parseFloat(p)) && parseFloat(p) >= 0));
  const isValid = title.trim().length > 2 && isDateValid && venue.trim().length > 0 && isPriceValid;

  const handlePublish = async () => {
    if (!isValid) {
      if (!isDateValid) {
        Alert.alert("Invalid Date", "Event date must be in the future (YYYY-MM-DD).");
      } else if (!isPriceValid) {
        Alert.alert("Invalid Price", "All prices must be valid numbers.");
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPublishing(true);

    const eventDate = `${date.trim()}T${time.trim() || "18:00"}:00`;
    const price = parseFloat(prices.regular || prices.earlybird || "0") || 0;

    // Build the local event for fallback / immediate optimistic state
    const localEvent: CreatedEvent = {
      id: `ce-${Date.now()}`,
      title: title.trim(),
      category,
      date: date.trim(),
      time: time.trim() || "18:00",
      venue: venue.trim(),
      city: city.trim() || userCountry.name,
      price,
      currency: userCountry.currencyCode,
      currencySymbol: userCountry.currencySymbol,
      description: description.trim(),
      ticketsSold: 0,
      revenue: 0,
      status: "live",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    // Attempt API creation when authenticated
    if (authToken) {
      const ticketTypes = TICKET_TIERS
        .filter((tier) => parseFloat(prices[tier.id as keyof typeof prices] || "0") > 0)
        .map((tier) => ({
          name: tier.name,
          price: parseFloat(prices[tier.id as keyof typeof prices]),
          currency: userCountry.currencyCode,
          totalQuantity: 500,
        }));

      if (ticketTypes.length === 0) {
        ticketTypes.push({ name: "General", price, currency: userCountry.currencyCode, totalQuantity: 500 });
      }

      let created: { id: string } | undefined;
      try {
        created = await createEventApi({
          data: {
            title: title.trim(),
            description: description.trim(),
            category: category as any,
            venue: venue.trim(),
            city: city.trim() || userCountry.name,
            country: userCountry.name,
            countryCode: userCountry.code,
            eventDate,
            imageUrl: coverImage ?? undefined,
            ticketTypes,
          },
        });
      } catch (err) {
        if (authToken) {
          setPublishing(false);
          Alert.alert(
            "Publish failed",
            "Couldn't reach the server. Please check your connection and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        // Fall through: add locally so the user isn't blocked (demo/unauthenticated mode)
        addCreatedEvent(localEvent);
        setPublishing(false);
        setPublished(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // The server always creates events as "draft". Submitting for review
      // is as far as a creator can push it themselves — an admin has to
      // approve it before it's actually live and publicly visible.
      try {
        await updateEventStatusApi({ id: created.id, data: { status: "pending_review" } });
      } catch (err) {
        setPublishing(false);
        Alert.alert(
          "Saved as draft",
          "Your event was created but couldn't be submitted for review yet. Try submitting it again from your event list.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/profile") }],
        );
        return;
      }
    } else {
      // Not authenticated — local only (demo mode)
      await new Promise((r) => setTimeout(r, 1200));
      addCreatedEvent(localEvent);
    }

    setPublishing(false);
    setPublished(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (published) {
    return (
      <View style={[styles.successScreen, { backgroundColor: "#0E0E0E" }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={40} color="#fff" />
        </View>
        <Text style={styles.successTitle}>
          {authToken ? "Submitted for Review" : "Event Published!"}
        </Text>
        <Text style={styles.successSub}>
          {authToken
            ? "We'll review your event shortly. You'll be able to share it once it's approved and live."
            : "Your event is now live. Share it with the world."}
        </Text>
        <View style={styles.successActions}>
          {!authToken && (
            <Pressable
              style={styles.successShare}
              onPress={() => {
                Haptics.selectionAsync();
              }}
            >
              <Feather name="share-2" size={16} color="#FF6B00" />
              <Text style={styles.successShareText}>Share Event</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.successDone}
            onPress={() => router.replace("/(tabs)/profile")}
          >
            <Text style={styles.successDoneText}>Go to Dashboard</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerBrand}>
          <Image source={LOGO_ICON} style={styles.headerLogoImg} resizeMode="contain" />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create Event</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {userCountry.flag} Listing in {userCountry.currencyCode}
            </Text>
          </View>
        </View>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Creator</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingBottom: botPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory(cat);
                }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: category === cat ? "rgba(255,107,0,0.15)" : colors.muted,
                    borderColor: category === cat ? "#FF6B00" : colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryPillText, { color: category === cat ? "#FF6B00" : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Event Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Nairobi Jazz Collective"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: title.length > 2 ? "#FF6B00" : colors.border }]}
          />
        </View>

        {/* Date + Time */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Date *</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Time</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            />
          </View>
        </View>

        {/* Venue + City */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1.5 }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Venue *</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Venue name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell attendees what makes this event special..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              styles.textArea,
              { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />
        </View>

        {/* Ticket Tiers */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Ticket Pricing</Text>
          <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
            Set prices in {userCountry.currencyCode} · Leave blank to skip a tier
          </Text>
          {TICKET_TIERS.map((tier) => (
            <View
              key={tier.id}
              style={[styles.tierRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.tierBadge, { backgroundColor: tier.color + "22" }]}>
                <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              </View>
              <View style={styles.tierInputWrapper}>
                <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>
                  {userCountry.currencySymbol}
                </Text>
                <TextInput
                  value={prices[tier.id as keyof typeof prices]}
                  onChangeText={(v) => setPrices((p) => ({ ...p, [tier.id]: v }))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.tierInput, { color: colors.foreground }]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Media upload */}
        <Pressable
          style={[styles.mediaUpload, { backgroundColor: colors.card, borderColor: coverImage ? "#FF6B00" : colors.border }]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // No cloud image storage is configured yet, so we read the picked
            // image back as a compressed (quality 0.8), resized-on-device JPEG
            // and inline it as a base64 data URI. The backend stores `imageUrl`
            // as a plain text column, so this reaches the server without any
            // backend changes. Tradeoff: larger payload / no CDN, fine for launch.
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled) {
              const asset = result.assets[0];
              if (asset.base64) {
                // The picker always returns base64 as JPEG data regardless of
                // the source file's original format (per expo-image-picker docs).
                setCoverImage(`data:image/jpeg;base64,${asset.base64}`);
              } else {
                setCoverImage(asset.uri);
              }
            }
          }}
        >
          {coverImage ? (
            <>
              <Image
                source={{ uri: coverImage }}
                style={{ width: "100%", height: 180, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Text style={[styles.mediaUploadSub, { color: colors.mutedForeground, marginTop: 8 }]}>
                Change Photo
              </Text>
            </>
          ) : (
            <>
              <Feather name="image" size={24} color={colors.mutedForeground} />
              <Text style={[styles.mediaUploadTitle, { color: colors.foreground }]}>Add Event Photo</Text>
              <Text style={[styles.mediaUploadSub, { color: colors.mutedForeground }]}>
                Tap to upload a cover image or video teaser
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 8 },
        ]}
      >
        <View>
          <Text style={[styles.publishNote, { color: colors.mutedForeground }]}>
            Platform fee: 5% per ticket sold
          </Text>
        </View>
        <Pressable
          onPress={handlePublish}
          style={[styles.publishBtn, { opacity: isValid ? 1 : 0.4 }]}
          disabled={!isValid || publishing}
        >
          {publishing ? (
            <Text style={styles.publishBtnText}>Publishing...</Text>
          ) : (
            <>
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.publishBtnText}>Publish Event</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerLogoImg: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#1A1A1A" },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  headerSub: { fontSize: 12, marginTop: 1 },
  liveChip: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.3)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6B00" },
  liveText: { fontSize: 11, fontWeight: "800", color: "#FF6B00" },

  form: { paddingHorizontal: 16, gap: 20, paddingTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  fieldHint: { fontSize: 11, marginTop: -4 },

  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 12 },

  categoryRow: { gap: 8 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryPillText: { fontSize: 13, fontWeight: "700" },

  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flex: 1,
  },
  tierDot: { width: 7, height: 7, borderRadius: 4 },
  tierName: { fontSize: 12, fontWeight: "800" },
  tierInputWrapper: { flexDirection: "row", alignItems: "center", gap: 4 },
  currencySymbol: { fontSize: 13, fontWeight: "600" },
  tierInput: { fontSize: 16, fontWeight: "700", minWidth: 80, textAlign: "right" },

  mediaUpload: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  mediaUploadTitle: { fontSize: 15, fontWeight: "700" },
  mediaUploadSub: { fontSize: 12, textAlign: "center" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  publishNote: { fontSize: 11 },
  publishBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#00C853",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 28, fontWeight: "900", color: "#fff" },
  successSub: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22 },
  successActions: { gap: 12, width: "100%", marginTop: 16 },
  successShare: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#FF6B00",
    paddingVertical: 14,
  },
  successShareText: { color: "#FF6B00", fontSize: 15, fontWeight: "700" },
  successDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 30,
    backgroundColor: "#FF6B00",
    paddingVertical: 14,
  },
  successDoneText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
