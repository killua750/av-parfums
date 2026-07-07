import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const LANGUAGES = [
  { code: "fr", label: "FR", dir: "ltr" },
  { code: "ar", label: "ع", dir: "rtl" },
  { code: "en", label: "EN", dir: "ltr" },
] as const;

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: localStorage.getItem("av-lang") ?? "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("av-lang", lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
});
document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";

export default i18n;
