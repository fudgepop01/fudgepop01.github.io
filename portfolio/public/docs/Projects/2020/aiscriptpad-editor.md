# AI Scriptpad Editor

AI in Super Smash Bros Brawl was an area that extremely few individuals explored. To my knowledge, I am only the 5th person in the history of Brawl modding to really delve _deep_ into its systems. AIScriptPad was an editing tool for AI Files created by user Bero before text editors such as VSCode existed. It was a compiler for a DSL used to generate AI for individual characters in ProjectM.

For better or worse, by this point I had been thoroughly spoiled by VSCode, and as such I found the editor provided to be rather clunky - though it was highly advanced for its time (pre-editors such as atom or vscode).

I decided to apply my reverse engineering skillset to understanding the underlying compiler for AIScriptPad and from that created a command line app that called the compiler with proper arguments. This allowed me to separate the frontend from the backend and from there code my own text editor for everything I might need.

Initially I only created syntax highlighting, but as my project scaled up I needed to make things more maintainable. The AI system is very simple, using only 24 floating point values as scratch data. AIScriptPad had no means of naming these variables - they are referenced only as `var0` through `var23`. This was the first thing I remedied.

By writing `#let varName = var0`, each instance of `varName` from that point on would be run through the preprocessor and be replaced by `var0` automatically before being sent off to the compiler. Alongside this I added named constants. Instead of having to leave comments everywhere to remember how everything worked, there is a `globals.as` file that allows me to list every global variable and constant value I might need. In the other `.as` files I am able to simply use these names and have the text be replaced by the appropriate value automatically when necessary.

The AI system in Brawl also had no concept of sharing code between scripts, so there were various design patterns I followed to ensure each script could operate together. Due to this, I found myself repeating various chunks of code with very minimal changes. To remedy this, I created a macro system. These macros contained snippets of code that could be reused with ease and allowed me to pass arguments that would fill their respective spots.

A new problem arose when certain patterns got more cumbersome and couldn't be remedied by a simple find/replace operation. To deal with this I created a more powerful macro system in the form of javascript hooks that ran in the preprocessor that I could modify outside of the extension itself. It allowed me to take in a single line and output whatever text I desired in its place. These too can take arguments, allowing for extremely powerful code generating snippets.

After 6 months, I had a point where I was proud of the first character I created... but it was clear that if I wanted to expand to other characters I would need something even more powerful. For this issue I created a system of templates and snippets. There is a folder in the `include` section of my AI project's workspace that contains a `globals.as` file, a `macros.as` file, a `templates` folder, and a `snippets` folder.

`templates` are files that are used as a template and are automatically applied to every character I compile with my system. Within each file, there are spots for snippets of code that are replaced by the respective snippet provided by the files within each character's folder. The snippets in the include folder are those that are applied in the place of each snippet by default, with the ability for each individual character to override these.

Builds On:
- [ProjectMCodes](./ProjectMCodes.md)
- [GCTRM Editor](./GCTRM-Editor.md)

## Learnings


## Benefits


## Skills Learned/Applied

- typescript
- VSCode extension development
- preprocessor development
- CSharp
- code modularity
- working within memory constraints
- optimization
- scripting languages
- reverse engineering

## Repo Link

- https://github.com/fudgepop01/aiscriptpad-editor
- an explaination about goals and how the extension worked from 3 years ago when this project was just getting started: https://www.reddit.com/r/SSBPM/comments/kgiwlj/comment/ggfskm9/
- the original AIScriptPad Editor 2.0 support thread: https://forums.kc-mm.com/index.php?topic=62818.0

- Project+ AI repository: 
  - character files: https://github.com/fudgepop01/PPlusAI/tree/master/Chars
  - shared resources folder: https://github.com/fudgepop01/PPlusAI/tree/master/Include/shared
  - mod for a frame data website I used to automate the processing and capturing of data for my AI: https://github.com/fudgepop01/PPlusAI/tree/master/rukaiDataMod