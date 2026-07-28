import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr, matchResult } from "plgg";
import {
  type SlotStyle,
  slotStyle,
  asSlotStyle,
  slotStyleCss,
  slotCss,
} from "plggmatic/Style/usecase/slotCss";
import { defaultTheme } from "plggmatic/Style/model/theme";

const emit = slotStyleCss(defaultTheme);

test("a base slot style emits the framework selector and body", () =>
  check(
    emit(
      slotStyle({
        slot: "list",
        declarations: "border:none;",
      }),
    ),
    toBe(".pm-list{border:none;}"),
  ));

test("scope / state / within wrap the framework selector", () =>
  all([
    check(
      emit(
        slotStyle({
          slot: "btnPrimary",
          state: ":hover",
          declarations: "color:red;",
        }),
      ),
      toBe(".pm-btn-primary:hover{color:red;}"),
    ),
    check(
      emit(
        slotStyle({
          slot: "list",
          scope: ".bo-results",
          declarations: "border:none;",
        }),
      ),
      toBe(
        ".bo-results .pm-list{border:none;}",
      ),
    ),
    check(
      emit(
        slotStyle({
          slot: "rowLink",
          scope: ".bo-results",
          state: ":hover",
          within: ".bo-result-meta",
          declarations: "color:blue;",
        }),
      ),
      toBe(
        ".bo-results .pm-row-link:hover .bo-result-meta{color:blue;}",
      ),
    ),
  ]));

test("slotCss emits a theme's slots in order, and nothing for the default theme", () =>
  all([
    check(slotCss(defaultTheme), toBe("")),
    check(
      slotCss({
        ...defaultTheme,
        slots: [
          slotStyle({
            slot: "col",
            declarations: "height:auto;",
          }),
          slotStyle({
            slot: "pane",
            declarations: "padding-top:0.25rem;",
          }),
        ],
      }),
      toBe(
        ".pm-col{height:auto;}.pm-pane{padding-top:0.25rem;}",
      ),
    ),
  ]));

// Acceptance: a consumer-supplied component token, validated
// through the untrusted caster, reaches the emitted CSS.
test("a validated consumer slot token reaches the emitted CSS", () =>
  matchResult<SlotStyle, unknown, ReturnType<typeof check>>(
    () => check(true, toBe(false)),
    (style: SlotStyle) =>
      check(
        slotCss({
          ...defaultTheme,
          slots: [style],
        }).includes(
          ".pm-query{background:var(--pm-surface);}",
        ),
        toBe(true),
      ),
  )(
    asSlotStyle({
      slot: "query",
      declarations: "background:var(--pm-surface);",
    }),
  ));

test("asSlotStyle accepts a well-formed record", () =>
  check(
    isOk(
      asSlotStyle({
        slot: "list",
        scope: ".bo-results",
        declarations: "border:none;",
      }),
    ),
    toBe(true),
  ));

test("asSlotStyle rejects an unknown slot", () =>
  check(
    isErr(
      asSlotStyle({
        slot: "blurple",
        declarations: "x:1;",
      }),
    ),
    toBe(true),
  ));

test("asSlotStyle rejects empty or non-escape-safe declarations", () =>
  all([
    check(
      isErr(
        asSlotStyle({
          slot: "list",
          declarations: "",
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(
        asSlotStyle({
          slot: "list",
          declarations: "content:'<a>';",
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(
        asSlotStyle({
          slot: "list",
          declarations: "color:red}.evil{x:1;",
        }),
      ),
      toBe(true),
    ),
  ]));

test("asSlotStyle rejects a malformed context field", () =>
  check(
    isErr(
      asSlotStyle({
        slot: "list",
        scope: "{}",
        declarations: "x:1;",
      }),
    ),
    toBe(true),
  ));
