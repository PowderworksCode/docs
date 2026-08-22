import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import type { PowderworksSiteConfig } from "./config";
import { localizePath, repositoryUrl } from "./config";

export function createPowderworksBaseOptions(
  site: PowderworksSiteConfig,
  locale: string,
): BaseLayoutProps {
  const links: NonNullable<BaseLayoutProps["links"]> = [
    ...(site.links ?? []).map((link) => ({
      text: link.text,
      url: link.external ? link.url : localizePath(locale, link.url),
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
    i18n: site.locales.length > 1,
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
      url: `/${locale}`,
    },
    links,
    githubUrl: repositoryUrl(site.repository),
  };
}

