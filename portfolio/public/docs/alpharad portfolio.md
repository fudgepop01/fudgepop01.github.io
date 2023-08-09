# Modding Portfolio

Mods created:

- Super Smash Bros. Brawl
  - [pioneered a C++ modding system](https://github.com/Fracture17/ProjectMCodes/tree/master)
    - initially created by Fracture17; he taught me how to use it and I picked up the language bit by bit from there and have been using C++ for the past 3 years long after Fracture disappeared.
  - wrote a custom in-game menu in C++
  - entirely new custom AI system for Project+
    - involved countless hours of reverse engineering
    - attempts to adapt to the target over time
    - attempts to find combos on their own
    - will be included in the main build someday
    - [created my own preprocessor for it, allowing things like variable names, macros, templates, and more](https://marketplace.visualstudio.com/items?itemName=fudgepops.aiscriptpad-editor)
    - [link to discord where builds can be found](https://discord.gg/tGCyeUQ8gE)
    - [link to overview tweet](https://twitter.com/i/status/1477692068579450887)
    - [showing off AI + combo trainer thing](https://twitter.com/fudgepop01/status/1614556823297851392?s=20)
  - input display
  - "turn green when actionable"
  - "play sound effect when actionable"
  - display various useful meters (hitlag, hitstun, DI angle, etc)
  - an old (now defunct) frame data display for discord:
    - [link to page talking about it](./Projects/2017/PMData.md)
- Rivals of Aether
  - made yet another AI system that was later used in popular mods such as [plusle and minun](https://steamcommunity.com/workshop/filedetails/?id=2502590772) (though I never fully finished the system, the base is still there)

Other notable things:

- [worked on Rivals 2](https://twitter.com/StudiosofAether/status/1433807000534650897?s=20)
  - created a scripting language from scratch from the compiler to the interpreter based on learnings from Brawl's vanilla AI system
  - contract paused until there is better funding
- created tools for mod creators such as
  - [RoABox](https://fudgepop01.github.io/RoABox/)
    - aimed to be a tool for Rivals workshop creators with an entirely custom UI and system fully accessible from the web
  - [Rivals of Aether GML](https://marketplace.visualstudio.com/items?itemName=fudgepops.rivals-of-aether-gml-support)
    - added text highlighting to vscode for Rivals workshop-specific GML and its features.
    - includes a way to visualize and simulate hitboxes similar to RoABox
  - [GCT RealMate Code Editor](https://marketplace.visualstudio.com/items?itemName=fudgepops.gctrm-editor)
    - added autocompletion and syntax highlighting for a tool another developer created for Brawl modding, known as GCT Realmate
  - [Kaitai Struct VSCode](https://marketplace.visualstudio.com/items?itemName=fudgepops.kaitai-struct-vscode)
    - a flexible way to display and analyze file formats using the powerful [Kaitai Struct](https://kaitai.io)
    - The hex view is entirely custom and flexible, with quite a few options
      - [see it here](https://fudgepop01.github.io/indev/index.html)
  - [BrawlRE.github.io](https://brawlre.github.io/public/)
    - a wiki-like system with a custom format for tables created from scratch running off github because all other systems out there were too cumbersome and/or difficult to edit
    - (it is the same system this current site is using)
  - [custom Rukaidata plugin for grabbing the ranges of moves](https://twitter.com/fudgepop01/status/1447618557555224578?s=20)