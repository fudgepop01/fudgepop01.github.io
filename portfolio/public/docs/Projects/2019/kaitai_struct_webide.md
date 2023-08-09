# Kaitai Struct Web IDE

This is the web-based Integrated Development Environment for Kaitai Struct. The live version is hosted [here](https://ide.kaitai.io).

This aimed to switch from the ace editor to monaco editor, that which is used to power Visual Studio Code. Doing so would have provided me with a sense of familiarity and extra features of such a powerful editor.

## Learnings

I learned some about a few different build systems and gave me an opportunity to look at how a more experienced developer uses typescript. It also taught me about how Kaitai Struct itself works under the hood, and what it creates when it is cross compiled from scala (its original language) to javascript (so that it may run in the browser).

This ended up directly inspiring how I go about making a custom hex editor in the future.

## Benefits

While this custom version never really saw the light of day, it _did_ end up assisting in the development of the kaitai struct schema - that is, a file that contains a definition of what is and is not allowed according to specification within a JSON-like format.

## Skills Learned/Applied

- more typescript techniques
- various build tools
- how to use and setup [monaco editor](https://microsoft.github.io/monaco-editor/) in a web application

## Repo Link

[fudgepop01/kaitai_struct_webide](https://github.com/fudgepop01/kaitai_struct_webide/commits/master)