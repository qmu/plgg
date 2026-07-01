import {
  Dict,
  Result,
  Datum,
  ok,
  err,
} from "plgg/index";

export const postJson =
  ({
    url,
    headers,
  }: {
    url: string;
    headers: Dict;
  }) =>
  async (
    data: Datum,
  ): Promise<Result<unknown, Error>> => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
      // never auto-follow a redirect: custom auth headers (e.g. an LLM
      // `x-api-key`) survive a same-site redirect and would leak to the target.
      redirect: "manual",
    });
    if (
      res.type === "opaqueredirect" ||
      res.status === 0
    ) {
      return err(
        new Error(
          "HTTP redirect not followed (manual redirect policy)",
        ),
      );
    }
    if (!res.ok) {
      // truncate the upstream body so prompt/PII content can't bloat logs
      const body = await res.text();
      const snippet =
        body.length > 500
          ? `${body.slice(0, 500)}…`
          : body;
      return err(
        new Error(
          `HTTP Error status: ${res.status}, body: ${snippet}`,
        ),
      );
    }
    return ok(await res.json());
  };
