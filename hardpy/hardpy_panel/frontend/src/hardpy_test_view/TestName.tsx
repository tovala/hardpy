// Copyright (c) 2024 Everypin
// GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import * as React from "react";
import { TranslatedText } from "../TranslatedText";

interface Props {
  name: string;
}

/**
 * Renders a test name, translating any ``i18n:`` prefixed value via the
 * catalog and stacking primary + secondary languages when configured.
 */
export function TestName(props: Readonly<Props>): React.ReactElement {
  return <TranslatedText value={props.name} />;
}

export default TestName;
