import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPills } from "@/components/CategoryPill";
import { CountryPickerModal } from "@/components/CountryPickerModal";
import { EventCardCompact } from "@/components/EventCardCompact";
import { useApp } from "@/context/AppContext";
import { CATEGORIES } from "@/constants/data";
import { EA_COUNTRIES } from "@/constants/currencies";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userCountry, setUserCountry } = useApp();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("For You");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const { events } = useEventCatalog();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filtered = events.filter((e) => {
    const matchesSearch =
      search.trim() === "" ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.country.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === "For You" || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const cities = [...new Set(events.map((e) => e.city))];

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Culture <Text style={{ color: "#FF6B00" }}>Compass</Text>
          </Text>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push("/culture-compass" as any); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,107,0,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,107,0,0.25)" }}
          >
            <Feather name="map" size={12} color="#FF6B00" />
            <Text style={{ color: "#FF6B00", fontSize: 12, fontWeight: "700" }}>Map View</Text>
          </Pressable>
          {/* Location chip — now tappable */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowCountryPicker(true); }}
            style={[styles.locationChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Text style={styles.locationFlag}>{userCountry.flag}</Text>
            <Text style={[styles.locationText, { color: colors.foreground }]}>
              {userCountry.name}
            </Text>
            <Feather name="chevron-down" size={13} color="#FF6B00" />
          </Pressable>
        </View>

        {/* Currency info strip */}
        <View style={[styles.currencyStrip, { backgroundColor: "rgba(255,107,0,0.08)", borderColor: "#FF6B00" + "30" }]}>
          <Feather name="refresh-cw" size={12} color="#FF6B00" />
          <Text style={[styles.currencyStripText, { color: colors.mutedForeground }]}>
            Viewing prices in event local currency · Checkout converts to{" "}
            <Text style={{ color: "#FF6B00", fontWeight: "700" }}>
              {userCountry.currencySymbol} {userCountry.currencyCode}
            </Text>
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search events, artists, cities..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <View style={styles.categories}>
          <CategoryPills
            categories={CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Cities quick filter */}
        {search.length === 0 && selectedCategory === "For You" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
              {cities.map((city) => {
                const country = events.find((e) => e.city === city);
                return (
                  <Pressable
                    key={city}
                    onPress={() => setSearch(city)}
                    style={[styles.cityChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  >
                    <Feather name="map-pin" size={11} color="#FF6B00" />
                    <Text style={[styles.cityText, { color: colors.foreground }]}>{city}</Text>
                    {country && (
                      <Text style={styles.cityFlag}>
                        {EA_COUNTRIES.find((c) => c.code === (
                          city === "Nairobi" ? "KE" :
                          city === "Lagos" ? "NG" :
                          city === "Accra" ? "GH" :
                          city === "Kampala" ? "UG" :
                          city === "Dar es Salaam" ? "TZ" : "KE"
                        ))?.flag ?? ""}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Payment methods for selected country */}
        {search.length === 0 && selectedCategory === "For You" && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {userCountry.flag} {userCountry.name} Payment Methods
              </Text>
              <Pressable onPress={() => setShowCountryPicker(true)}>
                <Text style={[styles.changeLink, { color: "#FF6B00" }]}>Change</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentRow}>
              {userCountry.paymentMethods.map((method) => {
                const typeLabel =
                  method.type === "mobile_money" ? "Mobile Money" :
                  method.type === "bank" ? "Bank Transfer" :
                  method.type === "ussd" ? "USSD Code" : "Card";
                const icon =
                  method.type === "mobile_money" || method.type === "ussd"
                    ? "smartphone"
                    : "credit-card";
                const initial = method.label.charAt(0).toUpperCase();
                return (
                  <View
                    key={method.id}
                    style={[
                      styles.paymentCard,
                      {
                        backgroundColor: method.color + "12",
                        borderColor: method.color + "35",
                      },
                    ]}
                  >
                    {/* Brand circle */}
                    <View style={[styles.paymentCardIcon, { backgroundColor: method.color + "22" }]}>
                      <View style={[styles.paymentCardIconInner, { backgroundColor: method.color }]}>
                        <Text style={styles.paymentCardInitial}>{initial}</Text>
                      </View>
                    </View>
                    {/* Label */}
                    <Text style={[styles.paymentCardLabel, { color: colors.foreground }]} numberOfLines={2}>
                      {method.label}
                    </Text>
                    {/* Type badge */}
                    <View style={[styles.paymentTypeBadge, { backgroundColor: method.color + "22" }]}>
                      <Feather name={icon as any} size={9} color={method.color} />
                      <Text style={[styles.paymentTypeText, { color: method.color }]}>{typeLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Results */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {search.length > 0
              ? `Results for "${search}"`
              : selectedCategory === "For You"
              ? "All Events"
              : selectedCategory}
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {"  "}({filtered.length})
            </Text>
          </Text>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="search" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try a different search or category
              </Text>
            </View>
          ) : (
            filtered.map((event) => (
              <EventCardCompact key={event.id} event={event} horizontal />
            ))
          )}
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={showCountryPicker}
        currentCode={userCountry.code}
        onSelect={(country) => {
          setUserCountry(country);
          setShowCountryPicker(false);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  locationFlag: { fontSize: 15 },
  locationText: { fontSize: 13, fontWeight: "600" },
  currencyStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyStripText: { fontSize: 12, flex: 1, lineHeight: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14 },
  categories: { marginBottom: 24 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  changeLink: { fontSize: 13, fontWeight: "600" },
  count: { fontSize: 14, fontWeight: "400" },
  cityRow: { gap: 8, paddingBottom: 4 },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityText: { fontSize: 13, fontWeight: "500" },
  cityFlag: { fontSize: 14 },
  paymentRow: { gap: 10, paddingBottom: 4 },
  paymentCard: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
  },
  paymentCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCardIconInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCardInitial: { color: "#fff", fontSize: 14, fontWeight: "900" },
  paymentCardLabel: { fontSize: 11, fontWeight: "700", textAlign: "center", lineHeight: 14 },
  paymentTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
  },
  paymentTypeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.3 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSub: { fontSize: 13, marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  countryRowFlag: { fontSize: 32 },
  countryRowInfo: { flex: 1 },
  countryRowName: { fontSize: 16, marginBottom: 2 },
  countryRowCurrency: { fontSize: 12, marginBottom: 8 },
  countryRowMethods: { flexDirection: "row", gap: 6 },
  methodPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodPillText: { fontSize: 10, fontWeight: "600" },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
