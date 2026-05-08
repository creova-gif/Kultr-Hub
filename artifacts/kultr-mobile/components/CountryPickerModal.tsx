import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EA_COUNTRIES, type EACountry } from "@/constants/currencies";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Props {
  visible: boolean;
  currentCode: string;
  onSelect: (c: EACountry) => void;
  onClose: () => void;
}

export function CountryPickerModal({ visible, currentCode, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20, borderBottomColor: "#222" }]}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Your Location</Text>
            <Text style={[styles.sub, { color: "#555" }]}>
              Sets your currency and payment methods
            </Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: "#1C1C1C" }]}>
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Country grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 40 }]}
        >
          {EA_COUNTRIES.map((country) => {
            const isSelected = country.code === currentCode;
            return (
              <Pressable
                key={country.code}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(country);
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isSelected ? "rgba(255,107,0,0.1)" : "#1A1A1A",
                    borderColor: isSelected ? "#FF6B00" : "#2A2A2A",
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Feather name="check" size={10} color="#fff" />
                  </View>
                )}

                {/* Large flag */}
                <Text style={styles.flag}>{country.flag}</Text>

                {/* Name + currency */}
                <Text style={[styles.countryName, { color: colors.foreground }]}>
                  {country.name}
                </Text>
                <Text style={[styles.currencyLine, { color: "#555" }]}>
                  {country.currencySymbol} · {country.currencyCode}
                </Text>

                {/* Operator color dots */}
                <View style={styles.dots}>
                  {country.paymentMethods.slice(0, 4).map((m) => (
                    <View
                      key={m.id}
                      style={[styles.dot, { backgroundColor: m.color }]}
                    />
                  ))}
                </View>

                {/* Payment method count */}
                <Text style={[styles.methodCount, { color: "#444" }]}>
                  {country.paymentMethods.length} payment{country.paymentMethods.length > 1 ? "s" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  sub: { fontSize: 13 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "flex-start",
    position: "relative",
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  flag: { fontSize: 44, marginBottom: 10 },
  countryName: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  currencyLine: { fontSize: 12, marginBottom: 12, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 5, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  methodCount: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
});
