import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  idleSubmission,
  pendingSubmission,
  isPending,
} from "plgg-cms/ui/Form/model/submission";

test("isPending distinguishes the two states", () =>
  all([
    check(
      isPending(idleSubmission()),
      toBe(false),
    ),
    check(
      isPending(pendingSubmission()),
      toBe(true),
    ),
  ]));
