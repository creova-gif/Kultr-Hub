import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { alertStore, type AlertState } from "@/lib/alertStore";

/**
 * Renders lib/alert.ts's queued alert as an actual on-screen dialog on web.
 * Mounted once in the root layout — native platforms never show this
 * (lib/alert.ts routes them to the real Alert.alert instead), so it's a
 * no-op tree on iOS/Android.
 */
export function AlertHost() {
  if (Platform.OS !== "web") return null;
  return <WebAlertHost />;
}

function WebAlertHost() {
  const colors = useColors();
  const [state, setState] = React.useState<AlertState | null>(alertStore.getSnapshot());

  React.useEffect(() => alertStore.subscribe(() => setState(alertStore.getSnapshot())), []);

  if (!state) return null;

  const handlePress = (button: AlertState["buttons"][number]) => {
    alertStore.dismiss();
    button.onPress?.();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => alertStore.dismiss()}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => alertStore.dismiss()} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.cardForeground }]}>{state.title}</Text>
          {state.message ? (
            <Text style={[styles.message, { color: colors.mutedForeground }]}>{state.message}</Text>
          ) : null}
          <View style={styles.buttonRow}>
            {state.buttons.map((button, i) => (
              <Pressable
                key={`${button.text}-${i}`}
                onPress={() => handlePress(button)}
                style={[
                  styles.button,
                  { borderColor: colors.border },
                  button.style === "destructive" && { backgroundColor: colors.destructive },
                  button.style === "default" || !button.style
                    ? { backgroundColor: colors.primary }
                    : null,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.mutedForeground },
                    button.style === "destructive" && { color: colors.destructiveForeground },
                    (button.style === "default" || !button.style) && { color: colors.primaryForeground },
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
