import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { PowderworksSiteConfig } from "./config";
import { localizePath, repositoryUrl } from "./config";

function identity(url: string): string {
  return url;
}

export function createPowderworksBaseOptions(
  site: PowderworksSiteConfig,
  locale: string,
): BaseLayoutProps {
  // A single-locale site has no locale routing: URLs stay unprefixed and
  // the language switcher has nothing to switch.
  const localized =
    site.locales.length > 1 ? (url: string) => localizePath(locale, url) : identity;
  const multiLocale = site.locales.length > 1;

  const links: NonNullable<BaseLayoutProps["links"]> = [
    ...(site.links ?? []).map((link) => ({
      text: link.text,
      url: link.external ? link.url : localized(link.url),
      active: link.external ? "none" as const : "nested-url" as const,
      external: link.external,
    })),
    {
      text: "Powderworks",
      url: site.powderworksUrl ?? "https://powderworks.dev",
      active: "none",
      external: true,
      secondary: true,
    },
  ];

  return {
    i18n: multiLocale,
    nav: {
      title: (
        <span className="pw-nav-title">
          {site.mark ? (
            <img className="pw-nav-mark" src={site.mark.src} alt={site.mark.alt ?? ""} />
          ) : (
            <span className="pw-nav-stamp" aria-hidden="true">PW</span>
          )}
          <span>{site.name}</span>
        </span>
      ),
      url: multiLocale ? `/${locale}` : "/",
    },
    links,
    githubUrl: repositoryUrl(site.repository),
  };
}

