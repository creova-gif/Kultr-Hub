// Minimal external store (subscribe/getSnapshot) for the web Alert modal —
// same pattern React itself recommends for state that lives outside a
// component tree (useSyncExternalStore). One alert on screen at a time,
// matching how the native Alert API behaves.
export interface AlertButtonSpec {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AlertState {
  title: string;
  message?: string;
  buttons: AlertButtonSpec[];
}

let current: AlertState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const alertStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): AlertState | null {
    return current;
  },
  show(state: AlertState) {
    current = state;
    emit();
  },
  dismiss() {
    current = null;
    emit();
  },
};
