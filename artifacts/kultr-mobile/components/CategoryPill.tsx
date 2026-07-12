import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  categories: readonly string[];
  selected: string;
  onSelect: (cat: string) => void;
}

export function CategoryPills({ categories, selected, onSelect }: Props) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const active = cat === selected;
        return (
          <Pressable
            key={cat}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cat);
            }}
            style={[
              styles.pill,
              {
                backgroundColor: active ? "#FF6B00" : colors.muted,
                borderColor: active ? "#FF6B00" : colors.border,
              },
            ]}
          >
            <Text style={[styles.text, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    paddingVertical: 4,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});
