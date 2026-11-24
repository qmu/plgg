// Serve the package directory after building. Run each real page inside
// an independently sized viewport, with its emitted CSS and island module.
const sizes = [
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1680, 1050],
];
const results =
  document.querySelector("#results");
function assert(condition, message) {
  if (!condition) throw Error(message);
}
const wait = () =>
  new Promise((resolve) =>
    requestAnimationFrame(resolve),
  );
for (const slug of [
  "routes",
  "layers",
  "rooms",
]) {
  const url = new URL(
    "../dist/samples/" + slug + "/index.html",
    import.meta.url,
  );
  const response = await fetch(url);
  assert(
    response.ok,
    "Build the gallery before opening this test.",
  );
  const html = (await response.text()).replaceAll(
    '"/assets/islands/',
    '"' +
      new URL(
        "../dist/assets/islands/",
        import.meta.url,
      ).href,
  );
  for (const [width, height] of sizes) {
    const iframe =
      document.createElement("iframe");
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.srcdoc = html;
    document.body.append(iframe);
    try {
      const deadline = performance.now() + 15000;
      while (
        !iframe.contentDocument?.querySelector(
          ".board-controls",
        ) &&
        performance.now() < deadline
      )
        await wait();
      await wait();
      await wait();
      const doc = iframe.contentDocument;
      const rect = (selector) => {
        const el = doc.querySelector(selector);
        assert(el, selector + " missing");
        return el.getBoundingClientRect();
      };
      const panel = () => rect(".stage .dsl");
      const board = rect(".canvas-wrap");
      const tools = rect(".toolbar");
      const landscape = height < 500;
      const phone = width < 760;
      const near = (a, b) => Math.abs(a - b) < 2;
      assert(
        board.height > height * 0.7 &&
          board.width > width * 0.5,
        "Board dimensions",
      );
      assert(
        doc.documentElement.scrollHeight <=
          height + 1 &&
          doc.documentElement.scrollWidth <=
            width + 1,
        "Page overflow",
      );
      if (phone || landscape) {
        assert(
          near(
            rect(".vp-mobilebar").height,
            landscape ? 40 : 48,
          ),
          "Header height",
        );
        assert(
          near(
            landscape
              ? panel().width
              : panel().height,
            44,
          ),
          "Closed handle",
        );
        assert(
          landscape
            ? near(tools.height, board.height)
            : near(tools.width, board.width),
          "Tool strip span",
        );
        if (phone)
          assert(
            tools.height <= 46,
            "Tools wrapped",
          );
        const handle = doc.querySelector(
          ".dsl-handle",
        );
        handle.click();
        await wait();
        await wait();
        assert(
          landscape
            ? near(
                panel().width,
                board.width * 0.5,
              )
            : near(
                panel().height,
                board.height * 0.45,
              ),
          "Half sheet",
        );
        handle.click();
        await wait();
        await wait();
        assert(
          landscape
            ? near(
                panel().width,
                board.width * 0.5,
              )
            : near(
                panel().height,
                board.height * 0.85,
              ),
          "Full sheet",
        );
      } else {
        assert(
          near(
            panel().width,
            width < 900
              ? 28
              : width < 1100
                ? 280
                : 320,
          ),
          "Right cover",
        );
        if (width < 1100) {
          doc
            .querySelector(".dsl-handle")
            .click();
          await wait();
          assert(
            near(
              panel().width,
              width < 900 ? 280 : 28,
            ),
            "Tablet fold",
          );
        }
      }
      results.textContent +=
        slug +
        " " +
        width +
        " × " +
        height +
        " passed\n";
    } catch (error) {
      results.textContent +=
        slug +
        " " +
        width +
        " × " +
        height +
        " FAILED " +
        error +
        "\n";
    } finally {
      iframe.remove();
    }
  }
}
