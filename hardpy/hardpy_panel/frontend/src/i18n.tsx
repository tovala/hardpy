// Copyright (c) 2025 Everypin
// GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

const TESTS_NS = "tests";

interface HardpyFrontendConfig {
  language?: string;
  secondary_display_language?: string | null;
}

interface HardpyConfig {
  frontend?: HardpyFrontendConfig;
}

/**
 * Languages that the test-content catalog has translations for. Populated by
 * ``loadTestsNamespace`` after fetching ``/api/translations``. Driven by the
 * fixture's TOML catalog — any language with entries becomes selectable in
 * the cog-menu language picker.
 */
let testCatalogLanguages: string[] = [];

export function getTestCatalogLanguages(): string[] {
  return [...testCatalogLanguages];
}

async function loadTestsNamespace(): Promise<void> {
  try {
    const res = await fetch("/api/translations");
    if (!res.ok) {
      return;
    }
    const catalog = await res.json();
    if (!catalog || typeof catalog !== "object") {
      return;
    }
    const langs: string[] = [];
    for (const [lang, bundle] of Object.entries(catalog)) {
      if (bundle && typeof bundle === "object") {
        i18n.addResourceBundle(lang, TESTS_NS, bundle, true, true);
        langs.push(lang);
      }
    }
    testCatalogLanguages = langs;
    i18n.emit("hardpyCatalogLoaded", langs);
  } catch (e) {
    console.warn("Failed to load /api/translations:", e);
  }
}

const initializeI18n = async () => {
  let primaryLang = "en";
  let secondaryLang: string | null = null;

  try {
    const res = await fetch("/api/hardpy_config");
    const data: HardpyConfig = await res.json();
    primaryLang = data.frontend?.language ?? "en";
    secondaryLang = data.frontend?.secondary_display_language ?? null;
  } catch (e) {
    console.error("Failed to read hardpy_config for i18n init:", e);
  }

  const preload = secondaryLang && secondaryLang !== primaryLang
    ? [primaryLang, secondaryLang, "en"]
    : [primaryLang, "en"];

  await i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      lng: primaryLang,
      fallbackLng: "en",
      ns: ["translation", TESTS_NS],
      defaultNS: "translation",
      preload,
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      backend: {
        loadPath: "/locales/{{lng}}/translation.json",
      },
    });

  await loadTestsNamespace();
  console.log("i18n initialized with:", i18n.language, "secondary:", secondaryLang);
};

initializeI18n();

export default i18n;
