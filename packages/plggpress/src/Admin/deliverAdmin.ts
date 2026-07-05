import { type PromisedResult, ok, match } from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  htmlResponse,
} from "plggpress/framework";
import { renderToString } from "plgg-view";
import {
  type Cmd,
  cmdEffect$,
  cmdBatch$,
  cmdNone$,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type Scheduled,
  schedule,
  renderMode,
} from "plggmatic";
import { type Db } from "plgg-content";
import { type AccountStore } from "plgg-auth";
import { adminDeclaration } from "plggpress/Admin/adminDeclaration";

/**
 * Resolve a scheduled program's pending commands server-side
 * so the rendered scene reflects loaded data, not a spinner:
 * run each `CmdEffect`, feed its `Msg` back through `update`,
 * recurse (a depth guard bounds a pathological loop); flatten
 * a `CmdBatch`; stop on `CmdNone`. This is the read half of
 * the TEA runtime — enough to render; interaction is a URL
 * navigation (re-render) or an Action POST.
 */
const settle = (
  scheduled: Scheduled,
  model: ScheduledModel,
  cmd: Cmd<SchedulerMsg>,
  depth: number,
): Promise<ScheduledModel> =>
  depth > 8
    ? Promise.resolve(model)
    : match(cmd)(
        [
          cmdEffect$(),
          ({
            content,
          }: {
            content: () => Promise<SchedulerMsg>;
          }) =>
            content().then((msg) => {
              const [next, nextCmd] =
                scheduled.update(msg, model);
              return settle(
                scheduled,
                next,
                nextCmd,
                depth + 1,
              );
            }),
        ],
        [
          cmdBatch$(),
          ({
            content,
          }: {
            content: ReadonlyArray<
              Cmd<SchedulerMsg>
            >;
          }) =>
            content.reduce(
              (
                acc: Promise<ScheduledModel>,
                c: Cmd<SchedulerMsg>,
              ) =>
                acc.then((m) =>
                  settle(
                    scheduled,
                    m,
                    c,
                    depth + 1,
                  ),
                ),
              Promise.resolve(model),
            ),
        ],
        [
          cmdNone$(),
          () => Promise.resolve(model),
        ],
      );

/** Wrap a rendered admin body in a minimal HTML document. */
const page = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>plggpress admin</title></head><body>${body}</body></html>`;

/**
 * The admin UI served at `/admin` (D1/D10): each request
 * schedules {@link adminDeclaration}, restores the scene from
 * the request URL, settles its async sources server-side, and
 * renders it through the multi-column renderer to HTML — the
 * SAME declaration the parity spec draws in both modes. No
 * client bundle: this is the server-rendered read path (the
 * scheduler's model is derived from the URL). Mounted under
 * the auth-guarded `/admin` subtree, so it is admin-only.
 */
export const deliverAdmin = (
  db: Db,
  accounts: AccountStore,
): Web =>
  get(
    "/",
    (
      c: Context,
    ): PromisedResult<
      HttpResponse,
      HttpError
    > => {
      const scheduled = schedule(
        adminDeclaration(db, accounts),
      );
      const search = new URLSearchParams(
        c.req.query,
      ).toString();
      const [model0, cmd0] = scheduled.init({
        path: "/",
        search,
      });
      return settle(
        scheduled,
        model0,
        cmd0,
        0,
      ).then((model) =>
        ok(
          htmlResponse(
            page(
              renderToString(
                renderMode("multiColumn")(
                  scheduled.scene(model),
                ),
              ),
            ),
          ),
        ),
      );
    },
  )(web());
