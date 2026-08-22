import { defineI18n } from "fumadocs-core/i18n";
import { uiTranslations } from "fumadocs-ui/i18n";
import type { PowderworksLocale } from "./config";

export function definePowderworksI18n(
  locales: readonly [PowderworksLocale, ...PowderworksLocale[]],
  defaultLanguage: string,
) {
  const languages = locales.map((locale) => locale.code);
  const i18n = defineI18n({
    defaultLanguage,
    languages,
    hideLocale: "never",
  });
  const names = Object.fromEntries(
    locales.map((locale) => [locale.code, { displayName: locale.name }]),
  );
  const translations = i18n.translations().extend(uiTranslations()).add(names);

  return { i18n, translations };
}

