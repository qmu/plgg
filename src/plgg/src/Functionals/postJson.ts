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
    });
    if (!res.ok) {
      return err(
        new Error(
          `HTTP Error status: ${res.status}, body: ${await res.text()}`,
        ),
      );
    }
    return ok(await res.json());
  };
