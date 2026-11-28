# plgg-fetch — Read an HTTP response

Call `await get(url)` to receive a [plgg-http](/packages/plgg-http/) response inside a Result. A transport failure produces an `Err`. A 404 response still arrives in an `Ok`, so check the status before using the body.

Pass a validator to `decodeJsonBody` to read a JSON response. It reports both malformed JSON and a mismatch with the expected shape.

## Working with the API

`decodeJsonBody(caster)(response) → Result<T, InvalidError>`

Transport, HTTP status and decoding are separate decisions. Unwrap the transport result, inspect the status, then run the decoder. Passing a binary body to the JSON decoder returns Err.

```ts
import { asStr } from "plgg";
import {
  jsonResponse,
  textResponse,
} from "plgg-http";
import { decodeJsonBody } from "plgg-fetch";

const title = decodeJsonBody(asStr);
console.log(title(jsonResponse("Atlas")).__tag);
console.log(title(textResponse("{")).__tag);
```

## Match the reader to the response mode

Choose bytes for an image you need in memory and call `readBytes`(response) to obtain a Uint8Array. For incremental transfer, select stream and iterate the successful value of `readStream` asynchronously. `readText` does not transcode a byte response.
