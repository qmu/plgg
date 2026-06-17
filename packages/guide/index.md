---
layout: home

hero:
  name: "plgg"
  text: "Web development as one typed pipeline"
  tagline: >-
    A TypeScript family built from scratch on a
    single idea — values flow through pure
    functions, errors are data, and the same
    program runs on the server and in the browser.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Core concepts
      link: /concepts/
    - theme: alt
      text: View on GitHub
      link: https://github.com/qmu/plgg

features:
  - title: Option, not null
    details: >-
      Absence is a value you must handle, never a
      null that slips through. The compiler keeps
      the gaps honest.
  - title: Result, not throw
    details: >-
      Errors travel as data through the pipeline and
      fold to one vocabulary at the edge, instead of
      unwinding the stack.
  - title: One pipeline, end to end
    details: >-
      pipe / cast / proc / flow compose validation,
      effects, and transforms into a single
      data-last expression.
  - title: Runtime-neutral core
    details: >-
      plgg-http models request/response as pure
      data; plgg-server and plgg-fetch are symmetric
      peers over the same model.
  - title: Server and client, one program
    details: >-
      plgg-view's Elm-Architecture Model/update/view
      renders both server-side (SSR) and in the
      browser (CSR) from the same source.
  - title: Built from scratch
    details: >-
      Every package — HTTP, router, view, SQL, AI
      orchestration — is built on plgg, so the same
      patterns hold across the whole family.
---
