# Kaitai Struct Typescript Integration

This was made around the time I was getting interested in reverse engineering. Essentially, I used to work on a MacOS rather than windows - and as such certain tools that had to do with creating mods for video games were unavailable at the time.

A major one, Brawlbox, was used to view assets and frame data from a mod of Super Smash Brothers Brawl named Project M. I wanted to use it but ran into various bugs and crashes along the way, so I started trying to reverse engineer binary data based on the C# library for brawl files, Brawllib.

Now that I knew about Kaitai Struct, [Bitdef](/Projects/2018/bitdef.md) felt redundant. The only issue is Kaitai Struct could only generate for Javscript, _not_ Typescript. This is notable because Typescript provides a gargantuan amount of features to make it easier to work with, such as autocompletion for types.

Javascript can only make vague assumptions about the types of variables, but thanks to typescript these are able to be made clear to the text editor of choice.

Kaitai Struct Typescript aimed to add Typescript as a compiler target, enabling the generation of typescriptparsers _with type information_ for a particular filetype.

## Learnings

Kaitai Struct is a framework/language written in scala. KSY (Kaitai Struct YAML) files are the input, and a parser in the langauge of choice is the output. Through working on this I had to learn a wide variety of things, such as:

- how typescripts types even work
- how javascript modules work
- how to generate what are effectively namespaces within classes that typescript can infer, allowing for minimal generate file size
- how to work with a github organization on a project that I did not own
- how to work and communicate with a team through gitter (effectively a chat message board for teams that preceded Microsoft Teams, Slack, and Discord)
- various aspects of Test-Driven-Development
- how to write Scala code and work within a given framework
- various ways of using/writing Regular Expressions

## Benefits

This sparked discussion among the Kaitai Struct organization about how best to go about introducing Typescript as a target.

## Skills Learned/Applied

- Scala
- Typescript
- Test Driven Development
- Team Building Skills
- The unquantifiable importance of communication among team members
- Javascript Module Development
- Regular Expressions
- The meaning of "Transpiler" and the many forms they can take
- how to generate files
  - the mere idea of doing so was still relatively new to me, so seeing it put into practice was really cool

## Repo Link

[Kaitai_Struct_Compiler (typescript integration branch)](https://github.com/kaitai-io/kaitai_struct_compiler/tree/TypeScriptIntegration)