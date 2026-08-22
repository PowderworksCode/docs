import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";

export const programmingLanguageGroup = "programming-language";

export function LanguageTabs(props: Omit<ComponentProps<typeof Tabs>, "groupId" | "persist">) {
  return <Tabs {...props} groupId={programmingLanguageGroup} persist />;
}

export function getPowderworksMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    Callout,
    LanguageTabs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getPowderworksMDXComponents;

