# DOM events and keyed editor hosts (draft, #249)

This source change is not an npm release or a corpd deployment. The existing
`on`, `onInput`, `onChange`, `onSubmit` string APIs remain available.

## Exports

`plgg-view` exports `onEvent`, `managedHost`, `HostLifecycle`, and their attribute
matchers. `plgg-view/client` exports `makeRenderer` and its callable `Renderer`
type with `dispose()`. The internal `Wiring` type gains host bookkeeping; callers
constructing that low-level type must adapt. No DOM constructor runs during an
SSR import.

`onEvent(name, decode)` gives `decode` the original `Event`, synchronously and
without string conversion. Narrow with `instanceof InputEvent`,
`CompositionEvent`, `KeyboardEvent`, `DragEvent` or `HTMLInputElement`; return
`some(msg)` to dispatch or `none()` to suppress it. Extract the values needed by
the message before the callback returns (`currentTarget` is transient). The
consumer decides which IME keys produce a message. A decoder can synchronously
call `preventDefault()` or `stopPropagation()`. A submit handler still prevents
the browser default. Removing that handler restores the default. Last attribute
wins when both legacy and event decoders name the same event; `mapHtml` maps the
message inside `Option`.

```ts
onEvent("change", (event) =>
  event.target instanceof HTMLInputElement
    ? some({ kind: "Files", files: event.target.files })
    : none(),
);
onEvent("keydown", (event) =>
  event instanceof KeyboardEvent &&
  event.key === "Enter" && !event.isComposing
    ? some({ kind: "Submit" })
    : none(),
);
```

## Editor ownership and identity

`managedHost(key, attributes, lifecycle)` returns a keyed `div` with no managed
children. The renderer owns the wrapper and its declared attributes. The editor
owns **all** child DOM, listeners, input/selection/attachment state, and network
policy. No child reconciliation, innerHTML replacement or input-value sync runs
inside the island. This is a client effect boundary, not raw HTML rendering.

`HostLifecycle<Msg>` has two required callbacks:

- `mount(element, dispatch) -> cleanup`: runs once **after** the wrapper is
  inserted into its container. It may install the editor and node-local listeners.
- `update(element, dispatch)`: runs after subsequent committed renders/reorders
  of the same key/tag, using the latest lifecycle descriptor. The adapter must
  preserve drafts/IME/selection on unrelated updates and refresh any model- or
  dispatch-dependent callbacks it stores (including a changed `mapHtml` mapping).
- The cleanup returned by that mount runs exactly once when the owner is dropped,
  replaced, its key changes, ownership changes back to ordinary children, or
  `renderer.dispose()` removes the tree. It must unsubscribe editor-owned
  listeners and release resources. Its child DOM still exists during cleanup.

A host's identity is its key within its parent plus its wrapper tag. Keep keys
unique and stable; key the enclosing composer/column too when that wrapper is
reordered. During a keyed reorder the renderer moves siblings around the active
subtree rather than detaching/reinserting that subtree, preserving focus and
selection without a focus-restoration workaround.

Mount/update dispatch is queued until the current DOM commit finishes. A mount
can dispatch an initial message that immediately replaces its own host: cleanup
is installed before that next render runs. Callback exceptions remain consumer
errors; lifecycle callbacks should complete normally.

For an animated exit, logical removal ends ownership: cleanup and renderer event
listener detachment happen **before** the exit starts. The DOM may remain visible
until the animation promise settles. Settlement only removes the DOM; it must
not clean up again. `dispose()` is idempotent and releases hosts even if an exit
is still pending. The caller that owns the container must call it before removing
that container; arbitrary external DOM deletion is outside the renderer contract.
Disposal is terminal: subsequent render/dispatch calls are ignored. Cleanup cannot
recreate hosts through dispatch. A disposal requested inside mount/update waits
until that commit installs cleanup; no queued message escapes teardown. Create a
new renderer to mount another tree.

SSR emits the empty wrapper and safe attributes only. No host callback, event
handler, FileList or DOM instance is serialized; client creation mounts once.
This patch does not add hydration.

## Verification and remaining gates

`src/Program/usecase/composer.spec.ts` covers decoder suppression/replacement/
removal/disposal, legacy mapping, keyed host identity, connected focus, cleanup,
key/tag/ownership transitions, reentrant mount dispatch, SSR and animated exits.

After building plgg and plgg-view, serve the repository read-only, then open
`packages/plgg-view/browser-tests/composer249.html`. Its result contains 16
checks using real browser File/FileList/DataTransfer/selection/focus and synthetic
native CompositionEvent/InputEvent/KeyboardEvent/DragEvent. Two editor hosts
complete Tab mentions, retain different files through unrelated renders and
reorder, suppress composing Enter, retain the draft on a failed-send-style
redraw, and release listeners on removal. No upload/backend is invoked.

Real operating-system Japanese IME interaction is **not verified** by synthetic
browser events. A corpd consumer integration with its actual mention editor,
upload/failed-send handling and OS IME remains required before release. No
package version/publish or consumer dependency change is included.

The existing #248 unkeyed→all-keyed sibling transition defect is not absorbed
here. Keep the containing sibling list consistently keyed. This PR does not
change raw/SVG behavior from #216. These are separate review/release gates.
