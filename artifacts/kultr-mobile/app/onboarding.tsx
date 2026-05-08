import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
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

const LOGO = require("@/assets/images/logo.png");

const { width } = Dimensions.get("window");

const INTERESTS = [
  { id: "music", label: "Music", icon: "music" },
  { id: "art", label: "Art", icon: "image" },
  { id: "food", label: "Food & Drink", icon: "coffee" },
  { id: "heritage", label: "Heritage", icon: "globe" },
  { id: "comedy", label: "Comedy", icon: "smile" },
  { id: "sports", label: "Sports", icon: "activity" },
  { id: "nightlife", label: "Nightlife", icon: "moon" },
  { id: "film", label: "Film", icon: "film" },
  { id: "fashion", label: "Fashion", icon: "star" },
  { id: "dance", label: "Dance", icon: "zap" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setOnboardingDone, setUserInterests, setUserCountry } = useApp();
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("KE");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === "web" ? Math.max(insets.bottom, 24) : insets.bottom;

  const goToStep = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(next), 180);
  };

  const toggleInterest = (id: string) => {
    Haptics.selectionAsync();
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const finish = () => {
    const country = EA_COUNTRIES.find((c) => c.code === selectedCountryCode)!;
    setUserInterests(selectedInterests);
    setUserCountry(country);
    setOnboardingDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= step ? "#FF6B00" : "#2A2A2A", width: i === step ? 24 : 8 },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <View style={styles.step}>
            <View style={styles.welcomeCenter}>
              {/* Logo image */}
              <View style={styles.logoContainer}>
                <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.brand}>KULTR</Text>
              <Text style={styles.tagline}>Bold Culture.{"\n"}Timeless Impact.</Text>
              <Text style={styles.welcomeSub}>
                Discover the most vibrant events across{"\n"}East Africa — made for you.
              </Text>

              {/* Feature pills */}
              <View style={styles.featurePills}>
                {[
                  { icon: "map-pin", text: "7 Countries" },
                  { icon: "credit-card", text: "Local Payments" },
                  { icon: "tag", text: "Instant Tickets" },
                ].map((f) => (
                  <View key={f.text} style={styles.featurePill}>
                    <Feather name={f.icon as any} size={12} color="#FF6B00" />
                    <Text style={styles.featurePillText}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.ctaArea, { paddingBottom: botPad + 16 }]}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  goToStep(1);
                }}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </Pressable>
              <Pressable onPress={finish} style={styles.skipBtn}>
                <Text style={styles.skipText}>Skip personalisation</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Step 1: Interests ── */}
        {step === 1 && (
          <View style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepEyebrow}>STEP 1 OF 2</Text>
              <Text style={styles.stepTitle}>What moves you?</Text>
              <Text style={styles.stepSub}>
                Pick your interests so we can surface the right events.
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.interestsGrid}
            >
              {INTERESTS.map((item) => {
                const selected = selectedInterests.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleInterest(item.id)}
                    style={[
                      styles.interestChip,
                      {
                        backgroundColor: selected ? "rgba(255,107,0,0.15)" : "#1A1A1A",
                        borderColor: selected ? "#FF6B00" : "#2A2A2A",
                      },
                    ]}
                  >
                    <Feather name={item.icon as any} size={16} color={selected ? "#FF6B00" : "#666"} />
                    <Text style={[styles.interestLabel, { color: selected ? "#FF6B00" : "#aaa" }]}>
                      {item.label}
                    </Text>
                    {selected && (
                      <View style={styles.interestCheck}>
                        <Feather name="check" size={9} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.ctaArea, { paddingBottom: botPad + 16 }]}>
              <Pressable
                style={[styles.primaryBtn, selectedInterests.length === 0 && styles.primaryBtnDim]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  goToStep(2);
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {selectedInterests.length === 0 ? "Skip" : `Continue (${selectedInterests.length})`}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Step 2: Region ── */}
        {step === 2 && (
          <View style={styles.step}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepEyebrow}>STEP 2 OF 2</Text>
              <Text style={styles.stepTitle}>Where are you?</Text>
              <Text style={styles.stepSub}>Sets your currency and payment methods.</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.countryList}>
              {EA_COUNTRIES.map((country) => {
                const selected = selectedCountryCode === country.code;
                return (
                  <Pressable
                    key={country.code}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedCountryCode(country.code);
                    }}
                    style={[
                      styles.countryRow,
                      {
                        backgroundColor: selected ? "rgba(255,107,0,0.08)" : "#1A1A1A",
                        borderColor: selected ? "#FF6B00" : "#222",
                      },
                    ]}
                  >
                    {selected && <View style={styles.countrySelectedBar} />}
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <View style={styles.countryRowText}>
                      <Text style={[styles.countryName, { color: selected ? "#FF6B00" : "#fff" }]}>
                        {country.name}
                      </Text>
                      <Text style={styles.countryCurrency}>
                        {country.currencySymbol} · {country.currencyCode}
                      </Text>
                    </View>
                    {selected ? (
                      <View style={styles.checkCircle}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.radioEmpty, { borderColor: "#333" }]} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.ctaArea, { paddingBottom: botPad + 16 }]}>
              <Pressable
                style={styles.primaryBtn}
                onPress={finish}
              >
                <Text style={styles.primaryBtnText}>Start Exploring</Text>
                <Feather name="zap" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0E0E0E" },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dot: { height: 8, borderRadius: 4 },

  stepContainer: { flex: 1 },
  step: { flex: 1 },

  welcomeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 0,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#1A1A1A",
  },
  logoImage: { width: 80, height: 80 },
  logoMark_UNUSED: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoK: { fontSize: 36, fontWeight: "900", color: "#fff" },
  brand: { fontSize: 13, fontWeight: "900", letterSpacing: 8, color: "#FF6B00", marginBottom: 20 },
  tagline: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 16,
  },
  welcomeSub: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  featurePills: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.25)",
  },
  featurePillText: { fontSize: 11, fontWeight: "700", color: "#FF6B00" },

  stepHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 6 },
  stepEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: "#FF6B00" },
  stepTitle: { fontSize: 30, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  stepSub: { fontSize: 14, color: "#666", lineHeight: 20 },

  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    position: "relative",
  },
  interestLabel: { fontSize: 14, fontWeight: "600" },
  interestCheck: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },

  countryList: { flex: 1, paddingHorizontal: 16 },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  countrySelectedBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#FF6B00",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  countryFlag: { fontSize: 30 },
  countryRowText: { flex: 1 },
  countryName: { fontSize: 16, fontWeight: "800" },
  countryCurrency: { fontSize: 12, color: "#666", marginTop: 1 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },

  ctaArea: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  primaryBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnDim: { opacity: 0.7 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { color: "#555", fontSize: 14 },
});
