# plgg-http — Build an HTTP response

Use `textResponse` to return text from a handler. It sets status 200 by default and supplies a text content type. Use `jsonResponse` for JSON and `bytesResponse` for binary data. Pass the resulting `HttpResponse` to [plgg-server](/packages/plgg-server/) for delivery.

```ts
import { textResponse } from "plgg-http";

const response = textResponse("Atlas");
console.log(response.body); // Atlas
```
