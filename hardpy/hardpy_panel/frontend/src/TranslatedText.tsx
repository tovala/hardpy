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
  suppressDuplicate = true,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const secondaryLang = useSecondaryLanguage();

  let parsed: Parsed;
  let isDynamic = false;
  if (value !== undefined && value !== null) {
    parsed = parseI18nValue(value);
    isDynamic = true;
  } else if (tKey) {
    parsed = { key: tKey, args };
  } else {
    return null;
  }

  const defaultNs = isDynamic ? TESTS_NS : "translation";
  const effectiveNs = ns ?? defaultNs;

  const renderOne = (lang: string): string => {
    if (parsed.literal !== undefined) {
      return parsed.literal;
    }
    if (!parsed.key) {
      return "";
    }
    return t(parsed.key, { ...parsed.args, lng: lang, ns: effectiveNs });
  };

  const primary = renderOne(i18n.language);
  const shouldShowSecondary = secondaryLang && secondaryLang !== i18n.language;
  const secondary = shouldShowSecondary ? renderOne(secondaryLang) : null;
  const displaySecondary = secondary !== null && (!suppressDuplicate || secondary !== primary);

  if (!primary && !displaySecondary) {
    return null;
  }

  const defaultSecondaryStyle: React.CSSProperties = noDefaultSecondaryStyle
    ? {}
    : { opacity: 0.85, fontSize: "0.75em" };

  return (
    <span
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "inherit" }}
    >
      <span style={primaryStyle}>{primary}</span>
      {displaySecondary && (
        <span style={{ ...defaultSecondaryStyle, ...secondaryStyle }}>{secondary}</span>
      )}
    </span>
  );
};
