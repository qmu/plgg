# plgg-fetch — Read an HTTP response

Call `await get(url)` to receive a [plgg-http](/packages/plgg-http/) response inside a Result. A transport failure produces an `Err`. A 404 response still arrives in an `Ok`, so check the status before using the body.

Pass a validator to `decodeJsonBody` to read a JSON response. It reports both malformed JSON and a mismatch with the expected shape.
