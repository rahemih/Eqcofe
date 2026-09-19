import { faIR } from "./fa-IR";

export const DEFAULT_LOCALE = "fa-IR" as const;
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type Messages = typeof faIR;

const messagesByLocale: Record<Locale, Messages> = {
  "fa-IR": faIR,
};

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return messagesByLocale[locale];
}
