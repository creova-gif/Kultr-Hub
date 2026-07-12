import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import {
  useAuthOtpRequest,
  useAuthOtpVerify,
  useAuthLogin,
  useAuthSignup,
} from "@workspace/api-client-react";
import type { AuthResponse } from "@workspace/api-client-react";
import type { AuthUser } from "@/context/AppContext";

const LOGO_ICON = require("@/assets/images/logo-icon.png");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth, setOnboardingDone, userCountry } = useApp();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [selectedCode, setSelectedCode] = useState(userCountry.code);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();

  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [emailMode, setEmailMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (stepTimer.current) clearTimeout(stepTimer.current); };
  }, []);

  const country = EA_COUNTRIES.find((c) => c.code === selectedCode) ?? EA_COUNTRIES[0];

  const requestOtp = useAuthOtpRequest();
  const verifyOtp = useAuthOtpVerify();
  const emailLogin = useAuthLogin();
  const emailSignup = useAuthSignup();

  const animateStep = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    stepTimer.current = setTimeout(cb, 150);
  };

  const handleSendCode = () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Enter your phone number");
      return;
    }
    if (!/^\d{6,15}$/.test(trimmed.replace(/[\s\-()]/g, ""))) {
      setError("Enter a valid phone number (digits only)");
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

  const completeAuth = async (res: AuthResponse) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const user: AuthUser = {
      id: res.user.id,
      email: res.user.email,
      displayName: res.user.displayName,
      avatarUrl: res.user.avatarUrl ?? null,
      countryCode: res.user.countryCode,
      isCreator: res.user.isCreator,
      isAdmin: res.user.isAdmin,
    };
    await setAuth(res.token, user);
    // A signed-in user has nothing left to onboard for. router.back() used to
    // land here — fine if login was reached mid-onboarding-carousel, but the
    // front-door "Sign in" link on the splash screen pushes straight to
    // /login without ever marking onboarding done, so back() returned users
    // to the splash screen and the root redirect guard (isHydrated &&
    // !onboardingDone) sent them straight back to onboarding, stuck in a
    // loop despite being fully authenticated.
    await setOnboardingDone(true);
    router.replace("/(tabs)");
  };

  const errorStatus = (err: unknown): number | undefined =>
    typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: number }).status
      : undefined;

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
        onSuccess: completeAuth,
        onError: () => setError("Invalid or expired code. Try again."),
      }
    );
  };

  const handleEmailSubmit = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    if (emailMode === "signup") {
      if (!signupName.trim()) {
        setError("Enter your name");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (emailMode === "login") {
      emailLogin.mutate(
        { data: { email: trimmedEmail, password } },
        {
          onSuccess: completeAuth,
          onError: (err) =>
            setError(
              errorStatus(err) === 401
                ? "Invalid email or password."
                : "Couldn't sign in. Try again."
            ),
        }
      );
    } else {
      emailSignup.mutate(
        { data: { email: trimmedEmail, password, displayName: signupName.trim() } },
        {
          onSuccess: completeAuth,
          onError: (err) =>
            setError(
              errorStatus(err) === 409
                ? "Email already in use. Try signing in instead."
                : "Couldn't create your account. Try again."
            ),
        }
      );
    }
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
          accessibilityLabel={step === "otp" ? "Back to phone number entry" : "Go back"}
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.logoRow}>
          <Image source={LOGO_ICON} style={styles.logo} resizeMode="contain" />
        </View>

        <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
          {step === "phone" ? (
            <>
              <Text style={styles.eyebrow}>
                {authMethod === "email" && emailMode === "signup" ? "CREATE ACCOUNT" : "SIGN IN"}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {authMethod === "phone"
                  ? "Your number"
                  : emailMode === "signup"
                  ? "Create your account"
                  : "Welcome back"}
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                {authMethod === "phone"
                  ? "We'll send a verification code via SMS."
                  : emailMode === "signup"
                  ? "Sign up with your email and a password."
                  : "Sign in with your email and password."}
              </Text>

              {/* Phone / Email method toggle */}
              <View style={styles.methodToggleRow} accessibilityRole="tablist">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAuthMethod("phone");
                    setError("");
                  }}
                  style={[
                    styles.methodToggleBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: authMethod === "phone" ? "#FF6B00" : colors.muted,
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: authMethod === "phone" }}
                  accessibilityLabel="Sign in with phone number"
                >
                  <Text
                    style={[
                      styles.methodToggleText,
                      { color: authMethod === "phone" ? "#fff" : colors.foreground },
                    ]}
                  >
                    Phone
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAuthMethod("email");
                    setError("");
                  }}
                  style={[
                    styles.methodToggleBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: authMethod === "email" ? "#FF6B00" : colors.muted,
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: authMethod === "email" }}
                  accessibilityLabel="Sign in with email address"
                >
                  <Text
                    style={[
                      styles.methodToggleText,
                      { color: authMethod === "email" ? "#fff" : colors.foreground },
                    ]}
                  >
                    Email
                  </Text>
                </Pressable>
              </View>

              {authMethod === "phone" ? (
                <>
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
                    accessibilityLabel="Phone number"
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.muted,
                        borderColor: error ? colors.destructive : colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Email address"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError("");
                    }}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    accessibilityLabel="Email address"
                  />

                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.muted,
                        borderColor: error ? colors.destructive : colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError("");
                    }}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType={emailMode === "signup" ? "next" : "done"}
                    onSubmitEditing={emailMode === "login" ? handleEmailSubmit : undefined}
                    accessibilityLabel="Password"
                  />

                  {emailMode === "signup" && (
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.muted,
                          borderColor: error ? colors.destructive : colors.border,
                          color: colors.foreground,
                        },
                      ]}
                      placeholder="Your name"
                      placeholderTextColor={colors.mutedForeground}
                      value={signupName}
                      onChangeText={(t) => {
                        setSignupName(t);
                        setError("");
                      }}
                      autoComplete="name"
                      returnKeyType="done"
                      maxLength={50}
                      onSubmitEditing={handleEmailSubmit}
                      accessibilityLabel="Your name"
                    />
                  )}
                </>
              )}

              {!!error && (
                <Text
                  style={[styles.errorText, { color: colors.destructive }]}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
              )}

              <Pressable
                style={[
                  styles.primaryBtn,
                  (authMethod === "phone" ? requestOtp.isPending : emailLogin.isPending || emailSignup.isPending) &&
                    styles.btnDim,
                ]}
                onPress={authMethod === "phone" ? handleSendCode : handleEmailSubmit}
                disabled={authMethod === "phone" ? requestOtp.isPending : emailLogin.isPending || emailSignup.isPending}
              >
                {(authMethod === "phone" ? requestOtp.isPending : emailLogin.isPending || emailSignup.isPending) ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      {authMethod === "phone"
                        ? "Send Code"
                        : emailMode === "signup"
                        ? "Create Account"
                        : "Sign In"}
                    </Text>
                    <Feather
                      name={authMethod === "phone" ? "arrow-right" : emailMode === "signup" ? "user-plus" : "log-in"}
                      size={18}
                      color="#fff"
                    />
                  </>
                )}
              </Pressable>

              {authMethod === "email" && (
                <Pressable
                  style={styles.resendBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEmailMode((m) => (m === "login" ? "signup" : "login"));
                    setError("");
                  }}
                >
                  <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                    {emailMode === "login" ? "Don't have an account? " : "Already have an account? "}
                    <Text style={{ color: "#FF6B00", fontWeight: "700" }}>
                      {emailMode === "login" ? "Sign up" : "Sign in"}
                    </Text>
                  </Text>
                </Pressable>
              )}
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

              {devCode != null && __DEV__ && (
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
                maxLength={50}
                onSubmitEditing={() => handleVerify()}
              />

              {!!error && (
                <Text
                  style={[styles.errorText, { color: colors.destructive }]}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {error}
                </Text>
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
          By continuing you agree to our{" "}
          <Text
            style={styles.legalLink}
            accessibilityRole="link"
            onPress={() => router.push("/legal/terms")}
          >
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text
            style={styles.legalLink}
            accessibilityRole="link"
            onPress={() => router.push("/legal/privacy")}
          >
            Privacy Policy
          </Text>
          .
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

  methodToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  methodToggleBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodToggleText: {
    fontSize: 14,
    fontWeight: "700",
  },

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
  legalLink: { color: "#FF6B00", fontWeight: "700" },
});
