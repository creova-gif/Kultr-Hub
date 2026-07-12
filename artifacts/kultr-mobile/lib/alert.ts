import { Alert as RNAlert, Platform } from "react-native";
import { alertStore, type AlertButtonSpec } from "./alertStore";

/**
 * react-native-web's Alert.alert is a no-op (`static alert() {}` — it
 * returns immediately and renders nothing), so every error, confirmation,
 * and success message in the app silently disappeared on web with no
 * indication anything happened. Native (iOS/Android) already has a real
 * Alert, so this only replaces the web path — with an actual on-screen
 * modal (AlertHost, mounted once in the root layout) rather than
 * window.alert/confirm, since several call sites (e.g. the event report
 * reason picker) pass more than two buttons, which confirm() can't express.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButtonSpec[]) {
    if (Platform.OS !== "web") {
      RNAlert.alert(title, message, buttons);
      return;
    }
    alertStore.show({ title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] });
  },
};
