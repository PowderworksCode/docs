"use client";

import { i18nProvider } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentProps, ReactNode } from "react";

type RootProps = ComponentProps<typeof RootProvider>;

export type PowderworksProviderProps = {
  lang: string;
  translations: Parameters<typeof i18nProvider>[0];
  children: ReactNode;
  search?: RootProps["search"];
  theme?: RootProps["theme"];
};

export function PowderworksProvider({
  lang,
  translations,
  children,
  search,
  theme,
}: PowderworksProviderProps) {
  return (
    <RootProvider
      search={search}
      i18n={i18nProvider(translations, lang)}
      theme={{ enableSystem: true, ...theme }}
    >
      {children}
    </RootProvider>
  );
}

