# From input to output

Validate a form submission with [cast](/concepts/validation/). Use a [Result](/concepts/result/) when the caller needs a reason for failure, or an [Option](/concepts/option/) when an optional field can be absent. Both are [tagged values](/concepts/tagged-data/).

Pass the validated input to the next function with [pipe](/concepts/composition/). Use [proc](/concepts/async/) for a sequence that includes asynchronous work, and [match](/concepts/match/) to choose a view for each variant.
