import { useApp } from "@/context/AppContext";
import { TRANSLATIONS } from "@/constants/translations";

export function useTranslation() {
  const { language } = useApp();
  return TRANSLATIONS[language];
}
