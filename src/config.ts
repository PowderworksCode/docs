export type PowderworksLocale = {
  code: string;
  name: string;
  searchLanguage?: string;
};

export type PowderworksNavLink = {
  text: string;
  url: string;
  external?: boolean;
};

export type PowderworksMark = {
  src: string;
  alt?: string;
};

export type PowderworksSiteConfig = {
  name: string;
  description: string;
  repository: string;
  branch?: string;
  siteUrl: string;
  mark?: PowderworksMark;
  locales: readonly [PowderworksLocale, ...PowderworksLocale[]];
  defaultLocale: string;
  links?: readonly PowderworksNavLink[];
  powderworksUrl?: string;
};

export function definePowderworksSite<const T extends PowderworksSiteConfig>(config: T): T {
  if (!config.locales.some((locale) => locale.code === config.defaultLocale)) {
    throw new Error(`default locale ${config.defaultLocale} is not present in locales`);
  }
  return config;
}

export function repositoryUrl(repository: string): string {
  return repository.startsWith("http") ? repository : `https://github.com/${repository}`;
}

export function localizePath(locale: string, url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || url === `/${locale}` || url.startsWith(`/${locale}/`)) {
    return url;
  }
  return `/${locale}${url}`;
}

