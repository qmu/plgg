# plgg-ir-thesis — Check an argumentation model

Pass assertions and their relationships to `compileThesis`. A successful compilation returns `nodes`, normalized `canonical` text, and the `surviving` set computed from the attack graph. Violations of frame rules, such as cycles in a temporal frame, produce diagnostics with source ranges. Compare outcomes in the [worked proof example](/packages/plgg-ir-thesis-proof/).
