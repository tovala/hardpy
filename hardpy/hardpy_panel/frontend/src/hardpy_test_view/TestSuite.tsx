// Copyright (c) 2024 Everypin
// GNU General Public License v3.0 (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import * as React from "react";
import {
  Callout,
  Collapse,
  Button,
  H4,
  Classes,
  Icon,
  Tag,
} from "@blueprintjs/core";
import _, { Dictionary } from "lodash";
import DataTable, { TableColumn } from "react-data-table-component";
import { LoadingOutlined } from "@ant-design/icons";
import { StartConfirmationDialog, WidgetType } from "./DialogBox";
import { withTranslation, WithTranslation } from "react-i18next";

import { TestNumber } from "./TestNumber";
import { TestName } from "./TestName";
import { TestStatus } from "./TestStatus";
import TestData from "./TestData";
import RunTimer from "./RunTimer";
import { TranslatedText } from "../TranslatedText";

import "./TestSuite.css";
import { Spin } from "antd";

interface WidgetDescription {
  info: Record<string, unknown>;
  type: WidgetType;
}

interface ImageInfo {
  base64?: string;
  format?: string;
  width?: number;
  border?: number;
}

interface HTMLInfo {
  code_or_url?: string;
  is_raw_html?: boolean;
  width?: number;
  border?: number;
}

interface DialogBoxProps {
  title_bar?: string;
  dialog_text: string;
  widget?: WidgetDescription;
  image?: ImageInfo;
  visible: boolean;
  id: string;
  font_size?: number;
  html?: HTMLInfo;
}

interface Measurement {
  name?: string;
  result?: boolean;
  type: string;
  value: number | string;
  unit?: string;
  comparison_value?: number | string;
  operation?: string;
  lower_limit?: number;
  upper_limit?: number;
}

interface Case {
  status: string;
  name: string;
  start_time: number;
  stop_time: number;
  assertion_msg: string | null;
  msg: string[] | null;
  measurements: Measurement[];
  artifact: Record<string, unknown>;
  dialog_box: DialogBoxProps;
}

type Cases = Dictionary<Case>;

export interface TestItem {
  status: string;
  name: string;
  start_time: number;
  stop_time: number;
  artifact: Record<string, unknown>;
  cases: Cases;
}

type Props = {
  index: number;
  test: TestItem;
  defaultOpen: boolean;
  commonTestRunStatus: string | undefined;
  autoScroll?: boolean;
} & WithTranslation;

type State = {
  isOpen: boolean;
  prevIsOpen: boolean;
  automaticallyOpened: boolean;
};

const LOADING_ICON_MARGIN = 30;

// Module-level tracker for the most recent user-driven scroll event.
// Auto-scroll suppresses itself for a short window after any user scroll input
// so it doesn't yank the operator away from content they're inspecting.
let lastUserScrollTime = 0;
let userScrollListenersInstalled = false;

const SCROLL_KEYS = new Set([
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
]);

function installUserScrollListeners(): void {
  if (userScrollListenersInstalled) return;
  userScrollListenersInstalled = true;
  const mark = () => {
    lastUserScrollTime = Date.now();
  };
  window.addEventListener("wheel", mark, { passive: true });
  window.addEventListener("touchmove", mark, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (SCROLL_KEYS.has(e.key)) mark();
  });
}

/**
 * TestSuite component displays a collapsible test suite with test cases.
 * It includes functionality to render test names, statuses, and data.
 */
export class TestSuite extends React.Component<Props, State> {
  private static readonly LOADING_ICON = (
    <div style={{ margin: LOADING_ICON_MARGIN }}>
      <LoadingOutlined spin />
    </div>
  );

  // Auto-scroll tuning
  private static readonly USER_SCROLL_SUPPRESS_MS = 3000;
  private static readonly COLLAPSE_ANIMATION_MS = 300;
  private static readonly SCROLL_DELAY_MS = 100;

  private containerRef = React.createRef<HTMLDivElement>();
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  static defaultProps: Partial<Props> = {
    defaultOpen: true,
  };

  componentDidMount(): void {
    installUserScrollListeners();
  }

  componentWillUnmount(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
  }

  /**
   * Schedule a smooth scroll to the currently-running case within this suite.
   * Debounces pending scrolls, respects the user-scroll suppression window,
   * and extends the delay when the Collapse animation needs to finish first.
   */
  private scheduleScrollToRunning(
    block: ScrollLogicalPosition,
    waitForCollapse: boolean,
  ): void {
    if (this.props.autoScroll === false) return;
    if (!this.containerRef.current) return;

    const runningIdx = Object.values(this.props.test.cases).findIndex(
      (c) => c.status === "run"
    );
    if (runningIdx === -1) return;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }

    if (Date.now() - lastUserScrollTime < TestSuite.USER_SCROLL_SUPPRESS_MS) {
      return;
    }

    const delay = waitForCollapse
      ? TestSuite.COLLAPSE_ANIMATION_MS + 100
      : TestSuite.SCROLL_DELAY_MS;

    this.scrollTimeout = setTimeout(() => {
      const allRows = this.containerRef.current?.querySelectorAll(".rdt_TableRow");
      if (allRows && allRows[runningIdx]) {
        allRows[runningIdx].scrollIntoView({
          behavior: "smooth",
          block,
        });
      }
      this.scrollTimeout = null;
    }, delay);
  }

  /**
   * Renders the TestSuite component.
   * @returns {React.ReactElement} The rendered component.
   */
  render(): React.ReactElement {
    const { t, i18n } = this.props;

    if (!i18n?.isInitialized) {
      return <div>{t("testSuite.loading")}</div>;
    }
    return (
      <div ref={this.containerRef}>
        <Callout style={{ padding: 0, borderRadius: 0 }} className="test-suite">
          <div style={{ display: "flex" }}>
            <div style={{ flex: "1 1 0%" }}>
              <Button
                style={{ margin: "2px" }}
                minimal={true}
                onClick={this.handleClick}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <TestStatus
                    status={
                      this.props.commonTestRunStatus != "run" &&
                      (this.props.test.status == "run" ||
                        this.props.test.status == "ready")
                        ? "stucked"
                        : this.props.test.status
                    }
                  />
                  <Icon
                    style={{ marginRight: "10px", marginLeft: "10px" }}
                    icon={this.state.isOpen ? "chevron-down" : "chevron-right"}
                  ></Icon>
                  <span>
                    {this.renderName(this.props.test.name, this.props.index + 1)}
                  </span>
                </div>
              </Button>
            </div>
            {this.renderTestSuiteRightPanel(this.props.test)}
          </div>
          <Collapse
            isOpen={this.state.isOpen}
            keepChildrenMounted={true}
            className="test-suite-content"
          >
            {this.props.test.status != "busy" ? (
              this.renderTests(this.props.test.cases)
            ) : (
              <Spin indicator={TestSuite.LOADING_ICON} />
            )}
          </Collapse>
        </Callout>
      </div>
    );
  }

  // When this.props.test has any that is run or failed, set open to true
  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    if (this.props.test === prevProps.test) {
      return;
    }

    // Detect a new run starting: all cases have just reset to "ready" (or empty)
    // while the previous render had at least one active/completed case. Reset
    // expand state to defaultOpen so a suite kept open by last run's failure
    // doesn't carry that state into the new run.
    const allCurrentReady = Object.values(this.props.test.cases).every(
      (c) => !c.status || c.status === "ready"
    );
    const prevHadActivity =
      !!prevProps.test?.cases &&
      Object.values(prevProps.test.cases).some(
        (c) => c.status && c.status !== "ready"
      );
    if (allCurrentReady && prevHadActivity) {
      this.setState({
        isOpen: false,
        prevIsOpen: this.state.isOpen,
        automaticallyOpened: false,
      });
      return;
    }

    const anyRunningOrFailed = Object.values(this.props.test.cases).some(
      (test_case) => test_case.status === "run" || test_case.status === "failed"
    );
    // "Active" = the suite isn't done yet. Includes "ready" so we don't auto-close
    // in the gap between one case finishing and the next starting within the same suite.
    const anyActiveOrFailed = Object.values(this.props.test.cases).some(
      (test_case) =>
        test_case.status === "run" ||
        test_case.status === "failed" ||
        test_case.status === "ready"
    );

    if (anyRunningOrFailed && !this.state.isOpen && !this.state.automaticallyOpened) {
      this.setState({ isOpen: true, prevIsOpen: this.state.isOpen, automaticallyOpened: true });
      // Schedule scroll to the running case once the Collapse animation finishes.
      // (The normal scroll block below won't catch this because state.isOpen is
      // still false synchronously, and by the next prop update justOpened will be
      // false and runningIndex unchanged.)
      this.scheduleScrollToRunning("center", true);
      return;
    }

    // Only auto-close when the suite is genuinely done (no run/failed/ready left).
    // Failed cases keep the suite open even after the run finishes.
    if (!anyActiveOrFailed && this.state.isOpen && this.state.automaticallyOpened) {
      this.setState({ isOpen: false, prevIsOpen: this.state.isOpen, automaticallyOpened: false });
      return;
    }

    // Scroll to running test case within the suite (if enabled via config)
    if (this.props.autoScroll !== false && this.state.isOpen && this.containerRef.current) {
      const caseEntries = Object.entries(this.props.test.cases);
      const runningIndex = caseEntries.findIndex(
        ([_, test_case]) => test_case.status === "run"
      );

      const prevCaseEntries = prevProps.test.cases ? Object.entries(prevProps.test.cases) : [];
      const prevRunningIndex = prevCaseEntries.findIndex(
        ([_, test_case]) => test_case.status === "run"
      );

      const justOpened = !prevState.isOpen && this.state.isOpen;

      // Detect when the currently running case appended new measurements / messages
      // (e.g. a long-running test that streams data). The row grows downward and the
      // newest content can fall off the bottom of the viewport unless we re-scroll.
      const runningCase = runningIndex !== -1 ? caseEntries[runningIndex][1] : null;
      const prevRunningCase = prevRunningIndex !== -1 ? prevCaseEntries[prevRunningIndex][1] : null;
      const sameRunningCase =
        runningIndex !== -1 && runningIndex === prevRunningIndex && prevRunningCase != null;
      const runningCaseGrew =
        sameRunningCase &&
        !!runningCase &&
        (
          (runningCase.measurements?.length ?? 0) > (prevRunningCase!.measurements?.length ?? 0) ||
          (runningCase.msg?.length ?? 0) > (prevRunningCase!.msg?.length ?? 0)
        );

      if (
        runningIndex !== -1 &&
        (runningIndex !== prevRunningIndex || justOpened || runningCaseGrew)
      ) {
        // 'end' for row-growth (keep newest measurement visible);
        // 'center' for new running case / just-opened.
        const scrollBlock: ScrollLogicalPosition =
          runningCaseGrew && !justOpened && runningIndex === prevRunningIndex
            ? "end"
            : "center";
        this.scheduleScrollToRunning(scrollBlock, justOpened);
      }
    }
  }

  /**
   * Constructs the TestSuite component.
   * @param {Props} props - The properties passed to the component.
   */
  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: props.defaultOpen,
      prevIsOpen: props.defaultOpen,
      automaticallyOpened: false,
    };

    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Renders the name of the test suite.
   * @param {string} name - The name of the test suite.
   * @param {number} test_number - The number of the test suite.
   * @returns {React.ReactElement} The rendered name element.
   */
  private renderName(name: string, test_number: number): React.ReactElement {
    const is_loading = _.isEmpty(name);

    return (
      <H4 className={`test-suite-name ${is_loading ? Classes.SKELETON : ""}`}>
        {<span className={Classes.TEXT_DISABLED}>{test_number}</span>}
        {
          <span style={{ marginLeft: "0.5em" }}>
            {is_loading ? this.props.t("testSuite.stubName") : <TranslatedText value={name} />}
          </span>
        }
      </H4>
    );
  }

  /**
   * Renders the test cases within the test suite.
   * @param {Cases} test_topics - The test cases to render.
   * @returns {React.ReactElement} The rendered test cases.
   */
  private renderTests(test_topics: Cases): React.ReactElement {
    let case_names: string[] = [];

    if (test_topics) {
      case_names = Object.keys(test_topics);
    }

    const case_array: Case[] = case_names.map((n) => test_topics[n]);

    const columns: TableColumn<string>[] = [
      {
        id: "status",
        name: "",
        selector: (row) => row,
        cell: this.cellRendererStatus.bind(this, case_array),
        grow: 0.5,
        width: "10px",
      },
      {
        id: "test_number",
        name: "",
        selector: (row) => row,
        cell: this.cellRendererNumber.bind(this, case_array),
        grow: 0.5,
        width: "65px",
      },
      {
        id: "name",
        name: this.props.t("testSuite.nameColumn"),
        selector: (row) => row,
        cell: this.cellRendererName.bind(this, case_array),
        grow: 6,
      },
      {
        id: "data",
        name: this.props.t("testSuite.dataColumn"),
        selector: (row) => row,
        cell: this.cellRendererData.bind(this, case_array),
        grow: 18,
      },
    ];

    const conditionalRowStyles = [
      {
        when: (row: string, index: number) => case_array[index]?.status === 'run',
        style: {
          backgroundColor: '#fffacd',
          borderLeft: '4px solid #ffa500',
        },
      },
    ];

    return (
      // compensation for 1px shadow of Table
      <div style={{ margin: "3px", paddingBottom: "4px", borderRadius: "2px" }}>
        <DataTable
          noHeader={true}
          columns={columns}
          data={case_names}
          highlightOnHover={true}
          dense={true}
          conditionalRowStyles={conditionalRowStyles}
        />
      </div>
    );
  }

  /**
   * Renders the right panel of the test suite.
   * @param {TestItem} test_topics - The test item containing cases.
   * @returns {React.ReactElement} The rendered right panel.
   */
  private renderTestSuiteRightPanel(test_topics: TestItem): React.ReactElement {
    return (
      <div
        className={Classes.ALIGN_RIGHT}
        style={{ display: "flex", padding: "5px" }}
      >
        {!this.state.isOpen && (
          <>
            {Object.entries(test_topics.cases).map(([_key, value]) => {
              return (
                <span key={value.name} style={{ margin: "2px" }}>
                  <TestStatus status={value.status} />
                </span>
              );
            })}
          </>
        )}

        <Tag minimal={true} style={{ margin: "2px", minWidth: "15px" }}>
          {"ready" != test_topics.status && (
            <RunTimer
              status={test_topics.status}
              commonTestRunStatus={this.props.commonTestRunStatus}
              start_time={test_topics.start_time}
              stop_time={test_topics.stop_time}
            />
          )}
        </Tag>
      </div>
    );
  }

  /**
   * Common method to render a cell with optional loading skeleton.
   * @param {React.ReactElement} cell_content - The content to render in the cell.
   * @param {string} key - The unique key for the cell.
   * @param {boolean} is_loading - Whether to show a loading skeleton.
   * @returns {React.ReactElement} The rendered cell.
   */
  private commonCellRender(
    cell_content: React.ReactElement,
    key: string,
    is_loading: boolean = false
  ): React.ReactElement {
    return (
      <div
        className={is_loading ? Classes.SKELETON : undefined}
        key={key}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {cell_content}
      </div>
    );
  }

  /**
   * Renders the test number in a cell.
   * @param {Case[]} test_topics - The test cases.
   * @param {string} row_ - The row data.
   * @param {number} rowIndex - The index of the row.
   * @returns {React.ReactElement} The rendered test number cell.
   */
  private cellRendererNumber(
    test_topics: Case[],
    row_: string,
    rowIndex: number
  ): React.ReactElement {
    return this.commonCellRender(
      <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
        <TestNumber val={rowIndex + 1} />
      </div>,
      `number_${rowIndex}_${row_}}`
    );
  }

  /**
   * Renders the test name in a cell.
   * @param {Case[]} test_topics - The test cases.
   * @param {string} row_ - The row data.
   * @param {number} rowIndex - The index of the row.
   * @returns {React.ReactElement} The rendered test name cell.
   */
  private cellRendererName(
    test_topics: Case[],
    row_: string,
    rowIndex: number
  ): React.ReactElement {
    const test = test_topics[rowIndex];
    return this.commonCellRender(
      <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
        <TestName name={test.name} />
      </div>,
      `name_${rowIndex}_${row_}`
    );
  }

  /**
   * Renders the test data in a cell.
   * @param {Case[]} test_topics - The test cases.
   * @param {string} row_ - The row data.
   * @param {number} rowIndex - The index of the row.
   * @returns {React.ReactElement} The rendered test data cell.
   */
  private cellRendererData(
    test_topics: Case[],
    row_: string,
    rowIndex: number
  ): React.ReactElement {
    const test = test_topics[rowIndex];

    return this.commonCellRender(
      <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
        <TestData assertion_msg={test.assertion_msg} msg={test.msg} measurements={test.measurements} />
      </div>,
      `data_${rowIndex}_${row_}`
    );
  }

  /**
   * Renders the test status in a cell.
   * @param {Case[]} test_topics - The test cases.
   * @param {string} row_ - The row data.
   * @param {number} rowIndex - The index of the row.
   * @returns {React.ReactElement} The rendered test status cell.
   */
  private cellRendererStatus(
    test_topics: Case[],
    row_: string,
    rowIndex: number
  ): React.ReactElement {
    const test = test_topics[rowIndex];
    const { info: widget_info, type: widget_type } =
      test.dialog_box.widget || {};
    const {
      base64: image_base64,
      width: image_width,
      border: image_border,
    } = test.dialog_box.image || {};

    return this.commonCellRender(
      <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
        {test.dialog_box.dialog_text &&
          test.status === "run" &&
          this.props.commonTestRunStatus === "run" &&
          test.dialog_box.visible && (
            <StartConfirmationDialog
              title_bar={test.dialog_box.title_bar ?? test.name}
              dialog_text={test.dialog_box.dialog_text}
              widget_info={widget_info}
              widget_type={widget_type}
              image_base64={image_base64}
              image_width={image_width}
              image_border={image_border}
              is_visible={test.dialog_box.visible}
              id={test.dialog_box.id}
              font_size={test.dialog_box.font_size}
              html_code={
                test.dialog_box.html?.is_raw_html
                  ? test.dialog_box.html?.code_or_url
                  : undefined
              }
              html_url={
                !test.dialog_box.html?.is_raw_html
                  ? test.dialog_box.html?.code_or_url
                  : undefined
              }
              html_width={test.dialog_box.html?.width}
              html_border={test.dialog_box.html?.border}
              pass_fail={test.dialog_box.pass_fail}
            />
          )}
        <TestStatus
          status={
            this.props.commonTestRunStatus !== "run" &&
            (test.status === "run" || test.status === "ready")
              ? "stucked"
              : test.status
          }
        />
      </div>,
      `status_${rowIndex}_${row_}`
    );
  }

  /**
   * Handles the click event to toggle the collapse state of the test suite.
   */
  private readonly handleClick = () =>
    this.setState((state: State) => ({ isOpen: !state.isOpen }));
}

TestSuite.defaultProps = {
  defaultOpen: true,
};

const TestSuiteComponent = withTranslation()(TestSuite);
export { TestSuiteComponent };
