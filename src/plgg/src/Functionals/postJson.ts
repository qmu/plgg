import {
  Dict,
  Result,
  Datum,
  newOk,
  newErr,
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
      return newErr(
        new Error(
          `HTTP Error status: ${res.status}, body: ${await res.text()}`,
        ),
      );
    }
    return newOk(await res.json());
  };
