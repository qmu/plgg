# Inspect structures and errors

Use `asVecOf` for arrays whose elements share a validator. For records with known field names, combine `asObj` and `forProp` to specify a validator for each field, as in the [book example](/concepts/validation/).

An `InvalidError` in a failed Result carries an explanation in `content.message` and any accompanying errors in `content.sibling`. Use `printPlggError` to write the error and its children to the console.
