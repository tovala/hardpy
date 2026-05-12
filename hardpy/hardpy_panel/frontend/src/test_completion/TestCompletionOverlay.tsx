// Copyright (c) 2025 Everypin
// GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import * as React from "react";
import { Classes } from "@blueprintjs/core";
import { TranslatedText } from "../TranslatedText";

interface FailedTestCase {
  moduleName: string;
  caseName: string;
  assertionMsg?: string;
}

interface TestCompletionOverlayProps {
  isVisible: boolean;
  testPassed: boolean;
  failedTestCases?: FailedTestCase[];
  onDismiss: () => void;
}

/**
 * Overlay component that displays test completion results with PASS/FAIL status
 */
const TestCompletionOverlay: React.FC<TestCompletionOverlayProps> = ({
  isVisible,
  testPassed,
  failedTestCases = [],
  onDismiss,
}) => {
  React.useEffect(() => {
    if (isVisible && testPassed) {
      // Auto-dismiss after 5 seconds only for PASS
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, testPassed, onDismiss]);

  React.useEffect(() => {
    if (!isVisible) {
      return;
    }

    // focus the overlay to capture key events
    const overlay = document.getElementById("test-completion-overlay");
    if (overlay) {
      overlay.focus();
    }

    // Only dismiss on confirm-style keys. Scroll keys (PageUp/Down, arrows,
    // Home/End) must be passed through so the operator can review a long list
    // of failed cases.
    const DISMISS_KEYS = new Set(["Enter", " ", "Spacebar", "Escape", "Esc"]);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (DISMISS_KEYS.has(e.key)) {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, testPassed, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: testPassed 
      ? "rgba(15, 153, 96, 0.95)"   // Green with transparency
      : "rgba(219, 55, 55, 0.95)",  // Red with transparency
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    cursor: "pointer",
    color: "white",
    textAlign: "center",
    padding: "40px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "120px",
    fontWeight: "bold",
    marginBottom: "20px",
    textShadow: "0 4px 8px rgba(0,0,0,0.3)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "48px",
    fontWeight: "bold",
    marginBottom: "40px",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  };

  const failedCasesStyle: React.CSSProperties = {
    maxHeight: "60vh",
    overflowY: "auto",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px",
    width: "80%",
    maxWidth: "800px",
    cursor: "default", // override the parent overlay's pointer cursor inside the scroll area
    scrollbarColor: "rgba(255,255,255,0.6) rgba(255,255,255,0.1)", // visible against the red/green backdrop
    scrollbarWidth: "auto",
  };

  const caseItemStyle: React.CSSProperties = {
    marginBottom: "15px",
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    paddingBottom: "10px",
  };

  const caseNameStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "5px",
  };

  const assertionStyle: React.CSSProperties = {
    fontSize: "14px",
    opacity: 0.9,
    fontStyle: "italic",
  };

  return (
    <div
      style={overlayStyle}
      onClick={onDismiss}
      className={Classes.DARK}
      // Dialog is used to ensure start/stop button doesnt get pressed when dismissing
      role="dialog"
      id="test-completion-overlay"
      tabIndex={-1}
    >
      <TranslatedText
        tKey={testPassed ? "app.completion.pass" : "app.completion.fail"}
        primaryStyle={titleStyle}
        secondaryStyle={subtitleStyle}
        noDefaultSecondaryStyle
      />

      {!testPassed && failedTestCases.length > 0 && (
        <div
          style={failedCasesStyle}
          // Stop click/touch/scroll events from bubbling to the overlay's
          // click-to-dismiss handler. Operator can scroll and select text
          // inside the failure list without dismissing the modal.
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "24px" }}>
            <TranslatedText
              tKey="app.completion.failedTestCasesHeader"
              args={{ count: failedTestCases.length }}
            />
          </h3>
          {failedTestCases.map((testCase, index) => (
            <div key={index} style={caseItemStyle}>
              <div style={caseNameStyle}>
                <TranslatedText value={testCase.moduleName} /> →{" "}
                <TranslatedText value={testCase.caseName} />
              </div>
              {testCase.assertionMsg && (
                <div style={assertionStyle}>
                  <TranslatedText value={testCase.assertionMsg} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        position: "absolute",
        bottom: "16px",
        right: "20px",
        fontSize: "12px",
        opacity: 0.7,
        whiteSpace: "nowrap",
      }}>
        <TranslatedText tKey="app.completion.clickToDismiss" />
      </div>
    </div>
  );
};

export default TestCompletionOverlay;