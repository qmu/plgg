# plgg-http — Build an HTTP response

Use `textResponse` to return text from a handler. It sets status 200 by default and supplies a text content type. Use `jsonResponse` for JSON and `bytesResponse` for binary data. Pass the resulting `HttpResponse` to [plgg-server](/packages/plgg-server/) for delivery.

```ts
import { textResponse } from "plgg-http";

const response = textResponse("Atlas");
console.log(response.body); // Atlas
```

## Working with the API

`textResponse(body, status?, headers?) → HttpResponse`

A handler test can inspect body and headers without opening a socket. For images or other bytes use bytesResponse directly. Keep the host Request outside domain functions.

## Set the status independently of the body

Pass statusOf and a header dictionary to return 201 and the location of a newly created resource. To override the default media type, use the lowercase content-type key. The constructor preserves a value already present under that key.

```ts
import {
  jsonResponse,
  statusOf,
} from "plgg-http";

const created = jsonResponse(
  { title: "Atlas" },
  statusOf(201),
  {
    location: "/books/1",
  },
);
console.log(
  created.status,
  created.headers,
  created.body,
);
```
