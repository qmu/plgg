# plgg-kit — Request structured model output

Pass a provider, a `userPrompt`, and an output `schema` to `generateObject`. The provider value selects OpenAI, Anthropic, or Google. The success value is typed as `unknown`, so [validate it](/concepts/validation/) before using it in your application. Supply a `post` function to test with a fixed response.
