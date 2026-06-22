import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckinCelebration } from "@/components/CheckinCelebration";
import { shareEventToWhatsApp } from "@/utils/share";
import { EventCardCompact } from "@/components/EventCardCompact";
import { useApp } from "@/context/AppContext";
import {
  EVENT_IMAGES,
  formatDate,
  formatTime,
} from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { useCheckIn } from "@/hooks/useQuests";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { useEventDetail } from "@/hooks/useEventDetail";

// Avatar palette for the synthetic "who's going" stack.
const GOING_AVATARS = [
  { color: "#FF6B00", initial: "A" },
  { color: "#7B61FF", initial: "M" },
  { color: "#00C853", initial: "K" },
  { color: "#4F9DFF", initial: "J" },
  { color: "#E1306C", initial: "S" },
];

/** Deterministic "people going" count seeded from the event id (80–499). */
function seededGoing(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 80 + (h % 420);
}

function openDirections(venue: string, city: string): void {
  const query = encodeURIComponent(`${venue}, ${city}`);
  const appleUrl = `maps:?q=${query}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.canOpenURL(appleUrl).then((can) => {
    Linking.openURL(can ? appleUrl : googleUrl);
  });
}

const TRIBE_COMMENTS = [
  { emoji: "🔥", text: "This event is going to be legendary!" },
  { emoji: "🎶", text: "Can't wait for the music." },
  { emoji: "✈️", text: "Flying in from London for this one." },
  { emoji: "👑", text: "The lineup is insane this year." },
  { emoji: "🌍", text: "Representing the diaspora!" },
  { emoji: "💃", text: "Already got my outfit ready." },
  { emoji: "🎉", text: "Been waiting for this all year." },
  { emoji: "🙌", text: "The culture is calling." },
];

const TRIBE_AVATARS = [
  { color: "#FF6B00", initial: "K" },
  { color: "#7B61FF", initial: "A" },
  { color: "#00C853", initial: "J" },
  { color: "#E91E63", initial: "M" },
  { color: "#00BCD4", initial: "T" },
];

function getTribeComments(eventId: string): Array<{ emoji: string; text: string; avatar: typeof TRIBE_AVATARS[0]; name: string }> {
  let h = 0;
  for (let i = 0; i < eventId.length; i++) h = (h * 31 + eventId.charCodeAt(i)) >>> 0;
  const names = ["Kenji", "Amara", "Joelle", "Marcus", "Tiana", "Kofi", "Zara", "Dayo"];
  const count = 3 + (h % 3);
  return Array.from({ length: count }, (_, i) => ({
    emoji: TRIBE_COMMENTS[(h + i * 7) % TRIBE_COMMENTS.length].emoji,
    text: TRIBE_COMMENTS[(h + i * 7) % TRIBE_COMMENTS.length].text,
    avatar: TRIBE_AVATARS[(h + i * 3) % TRIBE_AVATARS.length],
    name: names[(h + i * 5) % names.length],
  }));
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSaved, tickets, authToken } = useApp();
  const [selectedTicketType, setSelectedTicketType] = useState(0);
  const { event, isLoading } = useEventDetail(id);
  const { events } = useEventCatalog();
  const checkIn = useCheckIn();
  const [celebration, setCelebration] = useState<{ visible: boolean; pointsEarned: number }>({
    visible: false,
    pointsEarned: 0,
  });

  const relatedEvents = useMemo(
    () =>
      event
        ? events
            .filter((e) => e.id !== event.id && (e.category === event.category || e.city === event.city))
            .slice(0, 4)
        : [],
    [event, events],
  );

  const goingCount = useMemo(() => (event ? seededGoing(event.id) : 0), [event]);
  const hasTicket = useMemo(
    () => !!event && tickets.some((t) => t.eventId === event.id),
    [event, tickets],
  );

  const handleCheckIn = () => {
    if (!event) return;
    if (!authToken) {
      router.push("/login");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkIn.mutate(event.id, {
      onSuccess: (res) => {
        if (res.alreadyCheckedIn) {
          Alert.alert("Already checked in", `You've already checked in to ${event.title}.`);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (res.legendAwarded) {
          Alert.alert("🏆 Kultr Legend unlocked!", "You've completed all quests!");
        }
        setCelebration({ visible: true, pointsEarned: res.pointsEarned });
      },
      onError: (e) =>
        Alert.alert("Check-in failed", e instanceof Error ? e.message : "Please try again."),
    });
  };

  if (isLoading && !event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Event not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isSaved(event.id);
  const image = EVENT_IMAGES[event.imageKey];
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CheckinCelebration
        visible={celebration.visible}
        eventTitle={event.title}
        eventVenue={`${event.venue}, ${event.city}`}
        pointsEarned={celebration.pointsEarned}
        onDismiss={() => setCelebration((s) => ({ ...s, visible: false }))}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {/* Hero Image */}
        <View style={styles.heroWrapper}>
          <Image source={image} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            locations={[0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Back & Save */}
          <View
            style={[
              styles.heroActions,
              {
                top:
                  (Platform.OS === "web"
                    ? Math.max(insets.top, 67)
                    : insets.top) + 8,
              },
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <View style={styles.heroRightBtns}>
              <Pressable
                style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleSaved(event.id);
                }}
                accessibilityLabel={saved ? "Unsave event" : "Save event"}
                accessibilityRole="button"
              >
                <Feather
                  name="heart"
                  size={20}
                  color={saved ? "#FF6B00" : "#fff"}
                />
              </Pressable>
              <Pressable
                style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await shareEventToWhatsApp({
                    id: event.id,
                    title: event.title,
                    city: event.city,
                    country: event.country ?? event.city,
                    date: event.date,
                    venue: event.venue,
                  });
                }}
                accessibilityLabel="Share event"
                accessibilityRole="button"
              >
                <Feather name="share-2" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Hero bottom info */}
          <View style={styles.heroBottom}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: "rgba(255,107,0,0.25)",
                  borderColor: "#FF6B00",
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: "#FF6B00" }]}>
                {event.category.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {event.subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {event.subtitle}
            </Text>
          )}

          {/* Info Row */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <InfoItem icon="calendar" label="Date" value={formatDate(event.date)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem icon="clock" label="Time" value={formatTime(event.time)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem
              icon="map-pin"
              label="Venue"
              value={`${event.venue}, ${event.city}`}
            />
          </View>

          {/* Who's going / Social check-in */}
          <View style={[styles.goingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.avatarStack}>
              {GOING_AVATARS.map((g, i) => (
                <View
                  key={i}
                  style={[
                    styles.goingAvatar,
                    {
                      backgroundColor: g.color,
                      marginLeft: i === 0 ? 0 : -10,
                      borderColor: colors.card,
                    },
                  ]}
                >
                  <Text style={styles.goingAvatarText}>{g.initial}</Text>
                </View>
              ))}
            </View>
            <View style={styles.goingInfo}>
              <Text style={[styles.goingCount, { color: colors.foreground }]}>
                {goingCount}+ going
              </Text>
              <Text style={[styles.goingSub, { color: colors.mutedForeground }]}>
                {hasTicket ? "You're on the list — check in at the venue" : "Join the tribe pulling up"}
              </Text>
            </View>
            {hasTicket && (
              <Pressable
                onPress={handleCheckIn}
                disabled={checkIn.isPending}
                style={[styles.eventCheckinBtn, { opacity: checkIn.isPending ? 0.6 : 1 }]}
                accessibilityLabel="Check in to this event"
                accessibilityRole="button"
              >
                <Feather name="map-pin" size={13} color="#fff" />
                <Text style={styles.eventCheckinText}>Check in</Text>
              </Pressable>
            )}
          </View>


          {/* Directions */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openDirections(event.venue, event.city);
            }}
            style={[styles.directionsBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            accessibilityLabel={`Get directions to ${event.venue}`}
            accessibilityRole="button"
          >
            <Feather name="navigation" size={14} color="#FF6B00" />
            <Text style={[styles.directionsBtnText, { color: colors.foreground }]}>
              Get Directions to {event.venue}
            </Text>
            <Feather name="external-link" size={12} color={colors.mutedForeground} />
          </Pressable>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {event.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}


          {/* Demand indicator — show when ≥1 ticket type has <30 left */}
          {event.ticketTypes.some((t) => t.available > 0 && t.available < 30) && (
            <View style={[styles.demandBanner, { backgroundColor: "rgba(255,107,0,0.08)", borderColor: "#FF6B00" + "40" }]}>
              <Feather name="trending-up" size={14} color="#FF6B00" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.demandTitle, { color: "#FF6B00" }]}>Selling Fast</Text>
                <Text style={[styles.demandSub, { color: colors.mutedForeground }]}>
                  {event.ticketTypes.filter((t) => t.available > 0 && t.available < 30).map((t) => `${t.name}: ${t.available} left`).join(" · ")}
                </Text>
              </View>
              <View style={styles.demandDot} />
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              About this Event
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {event.description}
            </Text>
          </View>

          {/* Lineup */}
          {event.lineup && event.lineup.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Lineup
              </Text>
              <View style={styles.lineupList}>
                {event.lineup.map((artist, i) => (
                  <View
                    key={i}
                    style={[
                      styles.lineupItem,
                      {
                        backgroundColor: colors.card,
                        borderColor:
                          i === 0 ? "#FF6B00" + "50" : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.lineupAvatar,
                        {
                          backgroundColor:
                            i === 0
                              ? "rgba(255,107,0,0.2)"
                              : colors.muted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lineupAvatarText,
                          { color: i === 0 ? "#FF6B00" : colors.foreground },
                        ]}
                      >
                        {artist.name?.[0] ?? "?"}
                      </Text>
                    </View>
                    <View style={styles.lineupInfo}>
                      <Text
                        style={[styles.lineupName, { color: colors.foreground }]}
                      >
                        {artist.name}
                      </Text>
                      <View style={styles.lineupMeta}>
                        <View
                          style={[
                            styles.lineupRoleBadge,
                            {
                              backgroundColor:
                                i === 0
                                  ? "rgba(255,107,0,0.15)"
                                  : colors.muted,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lineupRole,
                              { color: i === 0 ? "#FF6B00" : colors.mutedForeground },
                            ]}
                          >
                            {artist.role}
                          </Text>
                        </View>
                        {artist.origin && (
                          <View style={styles.lineupOriginRow}>
                            <Feather name="map-pin" size={10} color="#A0A0A0" />
                            <Text
                              style={[
                                styles.lineupOrigin,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {artist.origin}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {artist.time && (
                      <View
                        style={[
                          styles.lineupTime,
                          { backgroundColor: colors.muted },
                        ]}
                      >
                        <Feather name="clock" size={10} color="#FF6B00" />
                        <Text style={[styles.lineupTimeText, { color: colors.foreground }]}>
                          {artist.time}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ticket Types */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Tickets
            </Text>
            <View style={styles.ticketTypes}>
              {event.ticketTypes.map((type, i) => {
                const isSelected = selectedTicketType === i;
                const soldOut = type.available === 0;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      if (!soldOut) {
                        Haptics.selectionAsync();
                        setSelectedTicketType(i);
                      }
                    }}
                    style={[
                      styles.ticketTypeCard,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,107,0,0.1)"
                          : colors.card,
                        borderColor: isSelected ? "#FF6B00" : colors.border,
                        opacity: soldOut ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.ticketTypeLeft}>
                      <Text
                        style={[
                          styles.ticketTypeName,
                          { color: colors.foreground },
                        ]}
                      >
                        {type.name}
                      </Text>
                      {type.description && (
                        <Text
                          style={[
                            styles.ticketTypeDesc,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {type.description}
                        </Text>
                      )}
                      {soldOut && (
                        <Text style={[styles.soldOut, { color: "#D32F2F" }]}>
                          Sold out
                        </Text>
                      )}
                    </View>
                    <View style={styles.ticketTypeRight}>
                      <Text
                        style={[styles.ticketTypePrice, { color: "#FF6B00" }]}
                      >
                        {event.currencySymbol} {type.price.toLocaleString()}
                      </Text>
                      {!soldOut && (
                        <Text
                          style={[
                            styles.ticketAvail,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {type.available} left
                        </Text>
                      )}
                    </View>
                    {isSelected && !soldOut && (
                      <View
                        style={[
                          styles.selectedDot,
                          { backgroundColor: "#FF6B00" },
                        ]}
                      >
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>


          {/* Tribe Buzz */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Tribe Buzz
            </Text>
            <View style={styles.tribeComments}>
              {getTribeComments(event.id).map((comment, i) => (
                <View
                  key={i}
                  style={[styles.tribeComment, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.tribeAvatar, { backgroundColor: comment.avatar.color }]}>
                    <Text style={styles.tribeAvatarText}>{comment.avatar.initial}</Text>
                  </View>
                  <View style={styles.tribeCommentBody}>
                    <Text style={[styles.tribeCommentName, { color: colors.foreground }]}>{comment.name}</Text>
                    <Text style={[styles.tribeCommentText, { color: colors.mutedForeground }]}>
                      {comment.emoji} {comment.text}
                    </Text>
                  </View>
                </View>
              ))}
              <Pressable
                style={[styles.joinConversationBtn, { borderColor: colors.border }]}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                accessibilityLabel="Join the conversation"
                accessibilityRole="button"
              >
                <Text style={[styles.joinConversationText, { color: colors.mutedForeground }]}>
                  Join the conversation...
                </Text>
                <Feather name="send" size={14} color="#FF6B00" />
              </Pressable>
            </View>
          </View>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                You Might Also Like
              </Text>
              <FlatList
                horizontal
                data={relatedEvents}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => <EventCardCompact event={item} />}
                showsHorizontalScrollIndicator={false}
                scrollEnabled
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 12,
          },
        ]}
      >
        <View style={styles.ctaLeft}>
          <Text style={[styles.ctaLabel, { color: colors.mutedForeground }]}>
            From
          </Text>
          <Text style={[styles.ctaPrice, { color: "#FF6B00" }]}>
            {event.currencySymbol}{" "}
            {event.ticketTypes[selectedTicketType]?.price.toLocaleString() ??
              event.price.toLocaleString()}
          </Text>
        </View>
        <Pressable
          disabled={(event.ticketTypes[selectedTicketType]?.available ?? 1) === 0}
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              opacity: (event.ticketTypes[selectedTicketType]?.available ?? 1) === 0 ? 0.45 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              `/checkout/${event.id}?ticketTypeIndex=${selectedTicketType}`
            );
          }}
          accessibilityLabel={(event.ticketTypes[selectedTicketType]?.available ?? 1) === 0 ? "Sold out" : "Get tickets"}
        >
          <Text style={styles.ctaBtnText}>
            {(event.ticketTypes[selectedTicketType]?.available ?? 1) === 0 ? "Sold Out" : "Get Tickets"}
          </Text>
          {(event.ticketTypes[selectedTicketType]?.available ?? 1) > 0 && <Feather name="arrow-right" size={16} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.infoItem}>
      <Feather name={icon as any} size={14} color="#FF6B00" />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: { fontSize: 18, fontWeight: "600" },
  backBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { color: "#fff", fontWeight: "700" },
  heroWrapper: { height: 340, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },
  heroActions: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroRightBtns: { flexDirection: "row", gap: 8 },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  content: { padding: 16 },
  subtitle: { fontSize: 15, marginBottom: 16, lineHeight: 20 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    marginBottom: 16,
  },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 1, marginVertical: 4 },
  infoLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  goingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  avatarStack: { flexDirection: "row" },
  goingAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  goingAvatarText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  goingInfo: { flex: 1 },
  goingCount: { fontSize: 14, fontWeight: "800" },
  goingSub: { fontSize: 11, marginTop: 2 },
  eventCheckinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FF6B00",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eventCheckinText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: "500" },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  description: { fontSize: 14, lineHeight: 22 },
  lineupList: { gap: 10 },
  lineupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lineupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lineupAvatarText: { fontSize: 18, fontWeight: "800" },
  lineupInfo: { flex: 1 },
  lineupName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  lineupMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineupRoleBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lineupRole: { fontSize: 11, fontWeight: "600" },
  lineupOriginRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  lineupOrigin: { fontSize: 11 },
  lineupTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  lineupTimeText: { fontSize: 12, fontWeight: "700" },
  ticketTypes: { gap: 10 },
  ticketTypeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  ticketTypeLeft: { flex: 1 },
  ticketTypeName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  ticketTypeDesc: { fontSize: 12 },
  soldOut: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  ticketTypeRight: { alignItems: "flex-end" },
  ticketTypePrice: { fontSize: 16, fontWeight: "800" },
  ticketAvail: { fontSize: 11, marginTop: 2 },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  directionsBtnText: { flex: 1, fontSize: 13, fontWeight: "600" },
  demandBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  demandTitle: { fontSize: 13, fontWeight: "800" },
  demandSub: { fontSize: 11, marginTop: 2 },
  demandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
  },
  tribeComments: { gap: 10 },
  tribeComment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tribeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tribeAvatarText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  tribeCommentBody: { flex: 1 },
  tribeCommentName: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  tribeCommentText: { fontSize: 12, lineHeight: 17 },
  joinConversationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  joinConversationText: { fontSize: 13 },
  ctaBar: {
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
  ctaLeft: { gap: 2 },
  ctaLabel: { fontSize: 12 },
  ctaPrice: { fontSize: 22, fontWeight: "900" },
  ctaBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  ctaBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
