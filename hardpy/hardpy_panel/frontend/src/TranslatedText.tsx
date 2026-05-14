// Copyright (c) 2026 Tovala
// GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import * as React from "react";
import { useTranslation } from "react-i18next";

const PREFIX = "i18n:";
const TESTS_NS = "tests";

interface LanguageContextValue {
  secondaryLang: string | null;
}

const LanguageContext = React.createContext<LanguageContextValue>({
  secondaryLang: null,
});

export const useSecondaryLanguage = (): string | null =>
  React.useContext(LanguageContext).secondaryLang;

interface LanguageProviderProps {
  secondaryLang: string | null;
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  secondaryLang,
  children,
}) => {
  const value = React.useMemo(() => ({ secondaryLang }), [secondaryLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

interface Parsed {
  literal?: string;
  key?: string;
  args?: Record<string, unknown>;
}

/**
 * Parse an i18n-prefixed value into { key, args }; non-prefixed values return
 * as { literal }.
 *
 * Format: `i18n:<dotted.key>{<json>}` — JSON suffix is optional.
 */
export function parseI18nValue(value: string): Parsed {
  if (!value.startsWith(PREFIX)) {
    return { literal: value };
  }
  const body = value.substring(PREFIX.length);
  const braceIdx = body.indexOf("{");
  if (braceIdx === -1) {
    return { key: body, args: {} };
  }
  const key = body.substring(0, braceIdx);
  try {
    const parsed = JSON.parse(body.substring(braceIdx));
    const args = typeof parsed === "object" && parsed !== null ? parsed : {};
    return { key, args: args as Record<string, unknown> };
  } catch {
    return { key, args: {} };
  }
}

export interface ResolvedI18n {
  primary: string;
  /** Secondary-language render. ``null`` when no secondary lang is configured
   * or when ``suppressDuplicate`` collapses an identical secondary. */
  secondary: string | null;
}

interface ResolveOptions {
  /** Static key used when no ``value`` is provided. Mirrors ``TranslatedText.tKey``. */
  tKey?: string;
  /** Interpolation args paired with ``tKey``. */
  args?: Record<string, unknown>;
  /** Namespace override. Defaults to ``tests`` for ``value`` calls,
   * ``translation`` for ``tKey`` calls. */
  ns?: string;
  /** Suppress secondary when identical to primary. Default ``true``. */
  suppressDuplicate?: boolean;
}

/**
 * Resolve an operator-facing string to primary/secondary-language renders.
 *
 * Used by ``TranslatedText`` internally and by call sites that need plain
 * strings (e.g. Blueprint ``Dialog`` title prop, text-width sizing math).
 */
export function useResolveI18nValue(
  value: string | null | undefined,
  options: ResolveOptions = {},
): ResolvedI18n {
  const { i18n } = useTranslation();
  const secondaryLang = useSecondaryLanguage();
  const { tKey, args, ns, suppressDuplicate = true } = options;

  let parsed: Parsed;
  let isDynamic = false;
  if (value !== undefined && value !== null) {
    parsed = parseI18nValue(value);
    isDynamic = true;
  } else if (tKey) {
    parsed = { key: tKey, args };
  } else {
    return { primary: "", secondary: null };
  }

  const effectiveNs = ns ?? (isDynamic ? TESTS_NS : "translation");

  const renderOne = (lang: string): string => {
    if (parsed.literal !== undefined) {
      return parsed.literal;
    }
    if (!parsed.key) {
      return "";
    }
    // getFixedT binds to a specific language regardless of the active one;
    // passing `lng` as an option to the hook's t() returns the literal key
    // when the requested language isn't currently active, which printed
    // "app.completion.pass" beneath the Chinese on midline-lab.
    const langT = i18n.getFixedT(lang, effectiveNs);
    return langT(parsed.key, parsed.args);
  };

  const primary = renderOne(i18n.language);
  if (!secondaryLang || secondaryLang === i18n.language) {
    return { primary, secondary: null };
  }
  const secondary = renderOne(secondaryLang);
  if (suppressDuplicate && secondary === primary) {
    return { primary, secondary: null };
  }
  return { primary, secondary };
}

interface TranslatedTextProps {
  /** Dynamic runtime string (may be ``i18n:`` prefixed or literal). */
  value?: string | null;
  /** Static translation key (chrome content); use for explicit ``t(k)`` sites. */
  tKey?: string;
  /** Interpolation args for ``tKey`` lookups (e.g. ``{{count}}`` substitution). */
  args?: Record<string, unknown>;
  /** react-i18next namespace override. Defaults to ``tests`` for ``value`` calls,
   * ``translation`` for ``tKey`` calls. */
  ns?: string;
  /** Style applied to the primary-language row. */
  primaryStyle?: React.CSSProperties;
  /** Style applied to the secondary-language row. Merges with default smaller/lighter
   * unless ``noDefaultSecondaryStyle`` is set. */
  secondaryStyle?: React.CSSProperties;
  /** Skip the default secondary styling (opacity / lighter weight / smaller font).
   * Use when the caller wants to fully control secondary rendering. */
  noDefaultSecondaryStyle?: boolean;
  /** Render primary and secondary side-by-side instead of stacked vertically. */
  inline?: boolean;
  /** Whether the secondary row may suppress when identical to primary. Default true. */
  suppressDuplicate?: boolean;
  className?: string;
}

/**
 * Render an operator-facing string in primary and (optionally) secondary
 * languages stacked vertically. Handles the ``i18n:`` prefix convention plus
 * fallback for plain strings.
 */
export const TranslatedText: React.FC<TranslatedTextProps> = ({
  value,
  tKey,
  args,
  ns,
  primaryStyle,
  secondaryStyle,
  noDefaultSecondaryStyle = false,
  inline = false,
  suppressDuplicate = true,
  className,
}) => {
  const { primary, secondary } = useResolveI18nValue(value, {
    tKey,
    args,
    ns,
    suppressDuplicate,
  });

  if (!primary && secondary === null) {
    return null;
  }

  const defaultSecondaryStyle: React.CSSProperties = noDefaultSecondaryStyle
    ? {}
    : { opacity: 0.85, fontSize: "0.75em" };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: inline ? "row" : "column",
        alignItems: inline ? "baseline" : "inherit",
        columnGap: inline ? "0.5em" : undefined,
      }}
    >
      <span style={primaryStyle}>{primary}</span>
      {secondary !== null && (
        <span style={{ ...defaultSecondaryStyle, ...secondaryStyle }}>{secondary}</span>
      )}
    </span>
  );
};
