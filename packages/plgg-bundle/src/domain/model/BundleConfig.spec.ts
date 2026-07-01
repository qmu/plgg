import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { applyFileName } from "plgg-bundle/domain/model/BundleConfig";

test("applyFileName substitutes name and format", () =>
  all([
    check(
      applyFileName(
        "[name].[format].js",
        "index",
        "es",
      ),
      toBe("index.es.js"),
    ),
    check(
      applyFileName(
        "[name].[format].js",
        "index",
        "cjs",
      ),
      toBe("index.cjs.js"),
    ),
    check(
      applyFileName(
        "[name].[format].js",
        "styleEntry",
        "es",
      ),
      toBe("styleEntry.es.js"),
    ),
  ]));
