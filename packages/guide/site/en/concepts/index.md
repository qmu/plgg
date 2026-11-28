# From input to output

Validate a form submission with [cast](/concepts/validation/). Use a [Result](/concepts/result/) when the caller needs a reason for failure, or an [Option](/concepts/option/) when an optional field can be absent. Both are [tagged values](/concepts/tagged-data/).

Pass the validated input to the next function with [pipe](/concepts/composition/). Use [proc](/concepts/async/) for a sequence that includes asynchronous work, and [match](/concepts/match/) to choose a `view` for each variant.

## When the types do not line up

Use `Obj` for known fields and `Dict` for variable keys with one value type. See [collections](/concepts/collections/) for decoding both. Read [instances](/concepts/instances/) to pass validation behavior into an algorithm, and [narrowing](/concepts/narrowing/) to give the compiler the evidence it needs.
