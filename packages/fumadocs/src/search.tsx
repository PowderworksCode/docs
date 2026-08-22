"use client";

import { create } from "@orama/orama";
import { useDocsSearch } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useI18n } from "fumadocs-ui/contexts/i18n";

export type PowderworksSearchProps = SharedProps & {
  localeMap?: Readonly<Record<string, string>>;
};

export function PowderworksSearchDialog({ localeMap = { en: "english" }, ...props }: PowderworksSearchProps) {
  const { locale } = useI18n();
  const localeKey = locale ?? "en";
  const language = localeMap[localeKey] ?? "english";
  const { search, setSearch, query } = useDocsSearch({
    client: oramaStaticClient({
      initOrama: () => create({ schema: { _: "string" }, language: language as "english" }),
      locale: localeKey,
    }),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
