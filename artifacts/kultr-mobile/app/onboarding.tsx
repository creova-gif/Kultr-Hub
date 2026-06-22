import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EA_COUNTRIES } from "@/constants/currencies";
import { useApp } from "@/context/AppContext";

const LOGO_ICON = require("@/assets/images/logo-icon.png");
const { width } = Dimensions.get("window");

// ─── Content data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: "🎶",
    accent: "#FF6B00",
    bg: "rgba(255,107,0,0.13)",
    title: "Discover Events",
    sub: "From Afrobeats concerts to art exhibitions — curated for you.",
    cards: [
      { emoji: "🎵", label: "Music" },
      { emoji: "🎨", label: "Art" },
      { emoji: "🍖", label: "Food" },
      { emoji: "🎬", label: "Film" },
    ],
  },
  {
    emoji: "👥",
    accent: "#7B61FF",
    bg: "rgba(123,97,255,0.13)",
    title: "Find Your Tribe",
    sub: "Connect with people who share your culture and your vibe.",
    cards: [
      { emoji: "🇰🇪", label: "Nairobi" },
      { emoji: "🇳🇬", label: "Lagos" },
      { emoji: "🇬🇭", label: "Accra" },
      { emoji: "🇪🇹", label: "Addis" },
    ],
  },
  {
    emoji: "⚡",
    accent: "#00C853",
    bg: "rgba(0,200,83,0.13)",
    title: "Earn as You Go",
    sub: "Check in, complete quests, level up. Culture pays back.",
    cards: [
      { emoji: "🏅", label: "Badges" },
      { emoji: "🔥", label: "Streaks" },
      { emoji: "⭐", label: "XP" },
      { emoji: "👑", label: "Ranks" },
    ],
  },
] as const;

const INTERESTS = [
  { id: "music",    label: "Music",    emoji: "🎵" },
  { id: "art",      label: "Art",      emoji: "🎨" },
  { id: "food",     label: "Food",     emoji: "🍖" },
  { id: "dance",    label: "Dance",    emoji: "💃" },
  { id: "film",     label: "Film",     emoji: "🎬" },
  { id: "fashion",  label: "Fashion",  emoji: "👗" },
  { id: "comedy",   label: "Comedy",   emoji: "😄" },
  { id: "tech",     label: "Tech",     emoji: "💡" },
  { id: "heritage", label: "Heritage", emoji: "🏛️" },
  { id: "sports",   label: "Sports",   emoji: "⚽" },
];

const MEMBER_COUNTS: Record<string, string> = {
  KE: "3.2K members",
  TZ: "1.8K members",
  UG: "1.1K members",
  RW: "920 members",
  ET: "2.1K members",
  NG: "8.4K members",
  GH: "4.7K members",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingDone, setUserInterests, setUserCountry } = useApp();

  const [step, setStep]                       = useState(0);
  const [featureIdx, setFeatureIdx]           = useState(0);
  const [selectedInterests, setSelected]      = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("KE");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 24) : insets.bottom;

  // ── Welcome entrance animations ──
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const headOpacity = useRef(new Animated.Value(0)).current;
  const headSlide   = useRef(new Animated.Value(28)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const ctaOpacity  = useRef(new Animated.Value(0)).current;
  const ctaSlide    = useRef(new Animated.Value(32)).current;

  // ── Cross-step transition ──
  const pageFade  = useRef(new Animated.Value(1)).current;
  const pageSlide = useRef(new Animated.Value(0)).current;

  // ── Chip bounce anims ──
  const chipBounce = useRef(INTERESTS.map(() => new Animated.Value(1))).current;

  const featureListRef = useRef<FlatList>(null);

  // Run entrance sequence on mount (welcome step)
  useEffect(() => {
    Animated.sequence([
      // 1. Glow + logo appear
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 80,  useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450,             useNativeDriver: true }),
        Animated.spring(glowScale,   { toValue: 1, friction: 5, tension: 40,  useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 600,             useNativeDriver: true }),
      ]),
      // 2. Headline rises
      Animated.parallel([
        Animated.timing(headOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(headSlide,   { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // 3. Subtext
      Animated.timing(subOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      // 4. CTA rises
      Animated.parallel([
        Animated.timing(ctaOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(ctaSlide,   { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Transitions ──────────────────────────────────────────────────────────

  const goTo = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(pageFade,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(pageSlide, { toValue: -18, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      pageSlide.setValue(18);
      Animated.parallel([
        Animated.timing(pageFade,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(pageSlide, { toValue: 0,  duration: 280, useNativeDriver: true }),
      ]).start();
    });
  };

  const finish = async () => {
    const country = EA_COUNTRIES.find((c) => c.code === selectedCountry) ?? EA_COUNTRIES[0];
    await setUserInterests(selectedInterests);
    setUserCountry(country);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setOnboardingDone(true);
    router.replace("/(tabs)");
  };

  const toggleInterest = (id: string, idx: number) => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(chipBounce[idx], { toValue: 0.90, duration: 70,  useNativeDriver: true }),
      Animated.spring(chipBounce[idx], { toValue: 1,    friction: 4,   tension: 300, useNativeDriver: true }),
    ]).start();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const onFeatureScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setFeatureIdx(idx);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  STEP 0 — CINEMATIC WELCOME                             ║
          ╚══════════════════════════════════════════════════════════╝ */}
      {step === 0 && (
        <View style={StyleSheet.absoluteFill}>
          {/* Decorative orange glow behind logo */}
          <Animated.View
            style={[
              styles.glowBlob,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          {/* Bottom-left cool tint blob */}
          <View style={styles.tintBlob} />

          {/* Top-right "Skip" — always accessible (Fitts: large hit area) */}
          <Pressable
            onPress={finish}
            style={[styles.skipTopBtn, { top: topPad + 16 }]}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.skipTopText}>Skip</Text>
          </Pressable>

          {/* Central hero */}
          <View style={styles.welcomeCenter}>
            <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
              <View style={styles.logoRing}>
                <Image source={LOGO_ICON} style={styles.logoImg} resizeMode="contain" />
              </View>
            </Animated.View>

            <Animated.Text
              style={[
                styles.tagline,
                { opacity: headOpacity, transform: [{ translateY: headSlide }] },
              ]}
            >
              {"Your Culture.\nYour Tribe.\nYour Story."}
            </Animated.Text>

            <Animated.Text style={[styles.welcomeSub, { opacity: subOpacity }]}>
              The boldest events across Africa —{"\n"}made for people who truly feel it.
            </Animated.Text>

            {/* Social proof pills — Von Restorff: stand out with colour */}
            <Animated.View style={[styles.proofRow, { opacity: subOpacity }]}>
              {[
                { icon: "map-pin",    text: "7 Countries" },
                { icon: "users",      text: "24K Members" },
                { icon: "credit-card", text: "M-Pesa Ready" },
              ].map((p) => (
                <View key={p.text} style={styles.proofPill}>
                  <Feather name={p.icon as any} size={11} color="#FF6B00" />
                  <Text style={styles.proofPillText}>{p.text}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Bottom CTA — Fitts: full-width, 56px tall */}
          <Animated.View
            style={[
              styles.welcomeCta,
              { paddingBottom: botPad + 28, opacity: ctaOpacity, transform: [{ translateY: ctaSlide }] },
            ]}
          >
            <Pressable
              style={styles.primaryBtn}
              onPress={() => goTo(1)}
              accessibilityRole="button"
              accessibilityLabel="Start your journey"
            >
              <Text style={styles.primaryBtnText}>Start Your Journey</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>

            <Pressable
              onPress={() => router.push("/login" as any)}
              style={styles.signinLink}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.signinText}>
                Already a member?{"  "}
                <Text style={styles.signinAccent}>Sign in</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  STEPS 1–3 — ANIMATED CONTENT AREA                     ║
          ╚══════════════════════════════════════════════════════════╝ */}
      {step > 0 && (
        <Animated.View
          style={[
            styles.pageWrap,
            { opacity: pageFade, transform: [{ translateY: pageSlide }] },
          ]}
        >
          {/* Segmented progress bar — Zeigarnik: shows commitment */}
          <View style={styles.progressBar}>
            {([1, 2, 3] as const).map((s) => (
              <View
                key={s}
                style={[
                  styles.progressSeg,
                  s < step  && styles.progressSegDone,
                  s === step && styles.progressSegActive,
                ]}
              />
            ))}
          </View>

          {/* ── STEP 1: Feature Carousel ─────────────────────────── */}
          {step === 1 && (
            <View style={styles.flex1}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>WHAT YOU GET</Text>
                <Text style={styles.stepTitle}>{"Everything\nyou need."}</Text>
              </View>

              {/* Paging FlatList — swipe to explore each feature */}
              <FlatList
                ref={featureListRef}
                data={FEATURES}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onFeatureScroll}
                renderItem={({ item }) => (
                  <View style={[styles.featureSlide, { width }]}>
                    {/* Emoji hero with coloured blob */}
                    <View style={[styles.featureEmojiWrap, { backgroundColor: item.bg }]}>
                      <Text style={styles.featureEmoji}>{item.emoji}</Text>
                    </View>

                    <Text style={[styles.featureTitle, { color: item.accent }]}>
                      {item.title}
                    </Text>
                    <Text style={styles.featureSub}>{item.sub}</Text>

                    {/* Mini preview cards */}
                    <View style={styles.featureCardRow}>
                      {(item.cards as ReadonlyArray<{ emoji: string; label: string }>).map((c) => (
                        <View key={c.label} style={[styles.featureCard, { borderColor: item.accent + "33" }]}>
                          <Text style={styles.featureCardEmoji}>{c.emoji}</Text>
                          <Text style={[styles.featureCardLabel, { color: item.accent }]}>{c.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              />

              {/* Slide dots */}
              <View style={styles.dotsRow}>
                {FEATURES.map((f, i) => (
                  <Pressable
                    key={i}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    onPress={() => {
                      featureListRef.current?.scrollToIndex({ index: i, animated: true });
                      setFeatureIdx(i);
                    }}
                  >
                    <View
                      style={[
                        styles.dot,
                        featureIdx === i && { backgroundColor: FEATURES[i].accent, width: 20 },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>

              <View style={[styles.ctaArea, { paddingBottom: botPad + 20 }]}>
                <Pressable style={styles.primaryBtn} onPress={() => goTo(2)}>
                  <Text style={styles.primaryBtnText}>
                    {featureIdx < FEATURES.length - 1 ? "Next" : "Continue"}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── STEP 2: Interests ────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.flex1}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>PERSONALISE YOUR FEED</Text>
                <Text style={styles.stepTitle}>{"What moves\nyou?"}</Text>
                <Text style={styles.stepSub}>
                  Select all that call to you.{" "}
                  <Text style={{ color: "#FF6B00" }}>No pressure.</Text>
                </Text>
              </View>

              {/* Interest grid — 2 columns, large tappable cards */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.interestGrid}
              >
                {INTERESTS.map((item, idx) => {
                  const on = selectedInterests.includes(item.id);
                  return (
                    <Animated.View
                      key={item.id}
                      style={[
                        styles.interestCardWrap,
                        { transform: [{ scale: chipBounce[idx] }] },
                      ]}
                    >
                      <Pressable
                        onPress={() => toggleInterest(item.id, idx)}
                        style={[styles.interestCard, on && styles.interestCardOn]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={item.label}
                      >
                        {on && (
                          <View style={styles.checkBadge}>
                            <Feather name="check" size={9} color="#fff" />
                          </View>
                        )}
                        <Text style={styles.interestEmoji}>{item.emoji}</Text>
                        <Text style={[styles.interestLabel, on && styles.interestLabelOn]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>

              <View style={[styles.ctaArea, { paddingBottom: botPad + 20 }]}>
                {selectedInterests.length > 0 && (
                  <Text style={styles.selectionHint}>
                    {selectedInterests.length} selected · great taste 🔥
                  </Text>
                )}
                <Pressable style={styles.primaryBtn} onPress={() => goTo(3)}>
                  <Text style={styles.primaryBtnText}>
                    {selectedInterests.length === 0 ? "Skip for now" : "Continue"}
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── STEP 3: Location ─────────────────────────────────── */}
          {step === 3 && (
            <View style={styles.flex1}>
              <View style={styles.stepHeader}>
                <Text style={styles.eyebrow}>YOUR SCENE</Text>
                <Text style={styles.stepTitle}>{"Where are\nyou based?"}</Text>
                <Text style={styles.stepSub}>
                  Sets your currency and surfaces nearby events first.
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.locationList}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
              >
                {EA_COUNTRIES.map((country) => {
                  const on      = selectedCountry === country.code;
                  const members = MEMBER_COUNTS[country.code] ?? "Coming soon";
                  return (
                    <Pressable
                      key={country.code}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCountry(country.code);
                      }}
                      style={[styles.locationRow, on && styles.locationRowOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                    >
                      {on && <View style={styles.locationBar} />}

                      <Text style={styles.locationFlag}>{country.flag}</Text>

                      <View style={styles.locationInfo}>
                        <Text style={[styles.locationName, on && styles.locationNameOn]}>
                          {country.name}
                        </Text>
                        <View style={styles.locationMeta}>
                          <Text style={styles.locationCurrency}>
                            {country.currencySymbol} · {country.currencyCode}
                          </Text>
                          <View style={styles.metaDot} />
                          <Feather name="users" size={10} color="#555" />
                          <Text style={styles.locationMembers}>{members}</Text>
                        </View>
                      </View>

                      {on ? (
                        <View style={styles.checkCircle}>
                          <Feather name="check" size={11} color="#fff" />
                        </View>
                      ) : (
                        <View style={styles.radioCircle} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={[styles.ctaArea, { paddingBottom: botPad + 20 }]}>
                <Pressable style={styles.primaryBtn} onPress={finish}>
                  <Text style={styles.primaryBtnText}>Start Exploring</Text>
                  <Feather name="zap" size={18} color="#fff" />
                </Pressable>
                <Text style={styles.legalNote}>
                  By continuing you agree to our{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={() => router.push("/legal/terms" as any)}
                  >
                    Terms
                  </Text>
                  {" "}and{" "}
                  <Text
                    style={styles.legalLink}
                    onPress={() => router.push("/legal/privacy" as any)}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD_W = (width - 20 * 2 - 12) / 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808" },
  flex1: { flex: 1 },

  // ── Welcome background blobs ──────────────────────────────────────────────
  glowBlob: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#FF6B00",
    opacity: 0.14,
    top: "20%",
    alignSelf: "center",
    // Blur emulated with large border radius — real blur requires expo-blur
  },
  tintBlob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#7B61FF",
    opacity: 0.06,
    bottom: "10%",
    left: -60,
  },

  // ── Welcome skip (top-right) ──────────────────────────────────────────────
  skipTopBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  skipTopText: { color: "#777", fontSize: 13, fontWeight: "600" },

  // ── Welcome center hero ───────────────────────────────────────────────────
  welcomeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 0,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoImg: { width: 72, height: 72 },

  tagline: {
    fontSize: 40,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 18,
  },
  welcomeSub: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },

  // Social proof pills
  proofRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  proofPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,0,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.22)",
  },
  proofPillText: { fontSize: 11, fontWeight: "700", color: "#FF6B00" },

  // ── Welcome CTA ───────────────────────────────────────────────────────────
  welcomeCta: { paddingHorizontal: 20, gap: 14 },

  signinLink: { alignItems: "center", paddingVertical: 4 },
  signinText: { fontSize: 13, color: "#555" },
  signinAccent: { color: "#FF6B00", fontWeight: "700" },

  // ── Steps 1-3 page wrapper ────────────────────────────────────────────────
  pageWrap: { flex: 1 },

  // Segmented progress bar (3 segments = 3 steps)
  progressBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#1E1E1E",
  },
  progressSegDone:   { backgroundColor: "#FF6B00" },
  progressSegActive: { backgroundColor: "#FF6B00", opacity: 0.5 },

  // ── Step header ───────────────────────────────────────────────────────────
  stepHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, gap: 6 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "#FF6B00",
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  stepSub: { fontSize: 14, color: "#666", lineHeight: 20, marginTop: 2 },

  // ── Feature Carousel ──────────────────────────────────────────────────────
  featureSlide: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  featureEmojiWrap: {
    width: 120,
    height: 120,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  featureEmoji: { fontSize: 56 },
  featureTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginBottom: 10, textAlign: "center" },
  featureSub: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  featureCardRow: { flexDirection: "row", gap: 10 },
  featureCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    gap: 4,
  },
  featureCardEmoji: { fontSize: 22 },
  featureCardLabel: { fontSize: 11, fontWeight: "700" },

  // Slide dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A2A2A",
  },

  // ── Interests Grid ────────────────────────────────────────────────────────
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  interestCardWrap: { width: CARD_W },
  interestCard: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: "#111",
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
  interestCardOn: {
    backgroundColor: "rgba(255,107,0,0.12)",
    borderColor: "#FF6B00",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  interestEmoji: { fontSize: 32 },
  interestLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#777",
  },
  interestLabelOn: { color: "#FF6B00" },

  // Selection hint
  selectionHint: {
    fontSize: 12,
    color: "#FF6B00",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },

  // ── Location list ─────────────────────────────────────────────────────────
  locationList: { flex: 1 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1A1A1A",
    backgroundColor: "#0F0F0F",
    padding: 14,
    marginBottom: 8,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  locationRowOn: {
    backgroundColor: "rgba(255,107,0,0.07)",
    borderColor: "#FF6B00",
  },
  locationBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: "#FF6B00",
  },
  locationFlag: { fontSize: 28 },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: "800", color: "#ccc" },
  locationNameOn: { color: "#FF6B00" },
  locationMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  locationCurrency: { fontSize: 11, color: "#555" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#333" },
  locationMembers: { fontSize: 11, color: "#555" },

  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2A2A2A",
    flexShrink: 0,
  },

  // ── Shared CTA area ───────────────────────────────────────────────────────
  ctaArea: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  primaryBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // Subtle shadow for depth (Aesthetic-Usability Effect)
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  legalNote: { fontSize: 11, color: "#444", textAlign: "center", lineHeight: 17 },
  legalLink: { color: "#FF6B00", fontWeight: "700" },
});
