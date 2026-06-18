import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { EA_COUNTRIES } from "@/constants/currencies";
import { useAuthOtpRequest, useAuthOtpVerify } from "@workspace/api-client-react";
import type { AuthUser } from "@/context/AppContext";

const LOGO_ICON = require("@/assets/images/logo-icon.png");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth, userCountry } = useApp();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [selectedCode, setSelectedCode] = useState(userCountry.code);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const country = EA_COUNTRIES.find((c) => c.code === selectedCode) ?? EA_COUNTRIES[0];

  const requestOtp = useAuthOtpRequest();
  const verifyOtp = useAuthOtpVerify();

  const animateStep = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(cb, 150);
  };

  const handleSendCode = () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Enter your phone number");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestOtp.mutate(
      { data: { phone: trimmed, countryCode: selectedCode } },
      {
        onSuccess: (res) => {
          setDevCode(res.devCode);
          animateStep(() => setStep("otp"));
        },
        onError: () => setError("Couldn't send the code. Check your number and try again."),
      }
    );
  };

  const handleVerify = (codeOverride?: string) => {
    const trimmed = (codeOverride ?? otp).trim();
    if (trimmed.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    verifyOtp.mutate(
      {
        data: {
          phone: phone.trim(),
          countryCode: selectedCode,
          code: trimmed,
          displayName: name.trim() || undefined,
        },
      },
      {
        onSuccess: async (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const user: AuthUser = {
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.displayName,
            avatarUrl: res.user.avatarUrl ?? null,
            countryCode: res.user.countryCode,
            isCreator: res.user.isCreator,
          };
          await setAuth(res.token, user);
          router.back();
        },
        onError: () => setError("Invalid or expired code. Try again."),
      }
    );
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: "#0E0E0E" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 8, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => {
            if (step === "otp") {
              animateStep(() => setStep("phone"));
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoRow}>
          <Image source={LOGO_ICON} style={styles.logo} resizeMode="contain" />
        </View>

        <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
          {step === "phone" ? (
            <>
              <Text style={styles.eyebrow}>SIGN IN</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Your number</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                We'll send a verification code via SMS.
              </Text>

              {/* Country selector */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPicker((v) => !v);
                }}
                style={[styles.countrySelector, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={styles.flag}>{country.flag}</Text>
                <Text style={[styles.dialCode, { color: colors.foreground }]}>
                  {country.phonePrefix}
                </Text>
                <Text style={[styles.countryName, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {country.name}
                </Text>
                <Feather
                  name={showPicker ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {showPicker && (
                <ScrollView
                  style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
                  nestedScrollEnabled
                >
                  {EA_COUNTRIES.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCode(c.code);
                        setShowPicker(false);
                      }}
                      style={[
                        styles.pickerRow,
                        {
                          backgroundColor:
                            c.code === selectedCode ? "rgba(255,107,0,0.1)" : "transparent",
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.flag}>{c.flag}</Text>
                      <Text style={[styles.pickerName, { color: colors.foreground }]}>{c.name}</Text>
                      <Text style={[styles.pickerDial, { color: colors.mutedForeground }]}>
                        {c.phonePrefix}
                      </Text>
                      {c.code === selectedCode && (
                        <Feather name="check" size={13} color="#FF6B00" />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: error ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Phone number"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  setError("");
                }}
                autoComplete="tel"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />

              {!!error && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              )}

              <Pressable
                style={[styles.primaryBtn, requestOtp.isPending && styles.btnDim]}
                onPress={handleSendCode}
                disabled={requestOtp.isPending}
              >
                {requestOtp.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Code</Text>
                    <Feather name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>VERIFICATION</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Check your phone</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to{" "}
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {country.phonePrefix} {phone}
                </Text>
              </Text>

              {devCode != null && (
                <View
                  style={[
                    styles.devBanner,
                    {
                      backgroundColor: "rgba(255,107,0,0.08)",
                      borderColor: "rgba(255,107,0,0.25)",
                    },
                  ]}
                >
                  <Feather name="terminal" size={12} color="#FF6B00" />
                  <Text style={styles.devText}>
                    Dev mode — code:{" "}
                    <Text style={{ fontWeight: "800" }}>{devCode}</Text>
                  </Text>
                </View>
              )}

              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  {
                    backgroundColor: colors.muted,
                    borderColor: error ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setError("");
                  if (t.length === 6) handleVerify(t);
                }}
                autoComplete="one-time-code"
                autoFocus
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                returnKeyType="done"
                onSubmitEditing={() => handleVerify()}
              />

              {!!error && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              )}

              <Pressable
                style={[styles.primaryBtn, verifyOtp.isPending && styles.btnDim]}
                onPress={() => handleVerify()}
                disabled={verifyOtp.isPending}
              >
                {verifyOtp.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.resendBtn}
                onPress={() => {
                  setOtp("");
                  setError("");
                  animateStep(() => setStep("phone"));
                }}
              >
                <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                  Didn't receive it?{" "}
                  <Text style={{ color: "#FF6B00", fontWeight: "700" }}>Resend</Text>
                </Text>
              </Pressable>
            </>
          )}
        </Animated.View>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  backBtn: { padding: 10, alignSelf: "flex-start", marginBottom: 4, minWidth: 44, minHeight: 44, justifyContent: "center" },

  logoRow: { alignItems: "center", marginBottom: 32 },
  logo: { width: 72, height: 72 },

  stepWrap: { gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: "#FF6B00" },
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -0.5, marginBottom: 2 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 4 },

  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  flag: { fontSize: 22 },
  dialCode: { fontSize: 15, fontWeight: "700" },
  countryName: { flex: 1, fontSize: 14 },

  picker: {
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 220,
    marginTop: -4,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerName: { flex: 1, fontSize: 14, fontWeight: "600" },
  pickerDial: { fontSize: 13 },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    fontWeight: "500",
  },
  otpInput: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 10,
  },

  errorText: { fontSize: 13, fontWeight: "600" },

  primaryBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  btnDim: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  resendBtn: { alignItems: "center", paddingVertical: 6 },
  resendText: { fontSize: 14 },

  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  devText: { fontSize: 12, color: "#FF6B00" },

  legal: { fontSize: 11, textAlign: "center", marginTop: 36, lineHeight: 17 },
});
