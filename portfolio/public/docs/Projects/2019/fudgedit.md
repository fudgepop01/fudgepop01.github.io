# Fudgedit

Fudgedit is a web-based hex editor that has a variety of options for displays of various types. It supports the display of binary, hexadecimal, and ASCII values. It supports the following options:

- max lines
- bytes per line
- bytes per group (hex/ASCII display)
  - places a divider between every nth byte
- bits per group (binary display)
  - places a divider between every nth bit
- ASCII inline
  - will show alphanumeric ASCII characters within the bytes themselves rather than displaying their hexadecimal value
- display binary/hex/ascii
  - toggles the rendering of each of these displays
- non-display character
  - configures the character that is shown in place of characters that don't have a corresponding commonly-rendered ASCII glyph
- non-display opacity
  - controls the opacity of the character configured in the option above
- region depth
  - controls how many layers deep the children of structures should go
- mode (region / select / no region)
  - region: displays regions. Regions can be hovered over for more information
  - select: displays regions but enables the selection of text, disabling a region's hover information
  - no region: enables the selection of text and disables the rendering of regions
- edit type (insert / overwrite / read only)
  - insert: inserts new bytes rather than overwriting existing ones
  - overwrite: overwrites bytes
  - read-only: prevents all new data entry into the file

## Learnings

There was a lot to learn to get to this point. After some searching, I found StencilJS which seemed to be perfect for my needs. StencilJS is effectively a transpiler that creates web components from code. It is an open source tool developed by those behind the [Ionic Framework](https://ionicframework.com/). Because they transpiled to [Native Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), they could be used in any browser that supported the standard (basically everything aside from Internet Explorer) regardless of any typical solutions such as Vue, Svelte, React, Angular, etc.

There were also many optimizations I had to make to ensure editing and rendering was performant in a browser. A hex editor may have hundreds of individual elements, so I didn't want any underlying operations to be too intensive. This was particularly concerning when it came to figuring out how to render the regions. The issue was that each div is potentially part of a region, and I did not want to have to attach an event listener to each one independantly then have it all function as a chunk by firing an event on hover. It might have been the first solution that comes to mind, but that would be horribly inefficient! Instead, the solution I came up with is using SVG Elements!

What are SVG elements? Well, they're normally images that are rendered through a series of mathematical commands rather than storing and rendering each individual pixel. However, browsers are able to render them just like regular HTML elements, and they use the same XML style as HTML - so they can just be slotted in alongside it. Because of the fact they're just mathematical functions, I am able to simply adjust the maths involved in drawing one to effectively allow an SVG element to conform to any shape I need - perfect for highlighting a large region of bytes with just a single element!

Like standard HTML Elements, I am also able to use javascript with them. I dynamically attach and detach event listeners whenever one is hovered over that:
  1. changes the region's color
  2. adjusts a CSS variable for the position of a tooltip. 

Why use a CSS variable? Well, instead of manually moving around a div I allow the browser to take care of the work of rendering a `position: fixed` element in the proper location. This keeps the javascript interpreter from doing any heavy lifting apart from simply setting the position in the first place. The browser engine itself is then able to read that CSS variable and position the tooltip with `left: var(--mouse-x)` and `top: var(--mouse-y)`, and render/respond to changes purely from the GPU.

## Benefits

I saw that there were no good, robust hex editors available online as a component that can be easily plugged in to another project. "010 Editor" was a product that was prohibitively expensive to other reverse engineering friends I had, and I also knew that with web technologies I could make something that blew the minds of folks that saw it.

...and I succeeded! It was one of a few components that landed me an internship. When I showed it to others in college they were pretty impressed too (albiet admittedly concerned that I was spending so much time in the study lounge rather than anywhere else).

I have used the editor in a number of projects to visualize and demonstrate how different parts of a file work. In another project, [kaitai_ide_vscode](./kaitai_ide_vscode.md), I create the visualization of a file's regions through a deep understanding of kaitai struct. It is able to help me not just understand, but visually verify file formats, allowing me and anyone else to reverse engineer them in a much smoother fasion.

Finally there was the matter of browser blending modes. If I had SVG rendering over the values within the view, it they would obscure the values behind them. To get around this I had to use some knowledge from digital art creation and set the element's blending mode to `multiply` through the `mix-blend-mode` CSS property. This allows it to have the colors "multiplied" with the elements behind it - meaning a color of all 0s (black) will remain all 0s (The inverse effect where the lighter color takes "priority" would be `screen`). Thanks to this I am able to use the CSS hover pseudoclasses to change its fill and focus on it when hovered. When the editor is in `select` mode, I simply add the `pointer-events: none` CSS property to the svg element's container and all events will pass through to the editor itself easily!


## Skills Learned/Applied

- StencilJS
- Typescript
- tsx
- typescript decorators
- red-black binary trees
- Piece trees
- creation and usage of dynamic SVG elements for performance
- browser blending modes
  - (enables regions to display atop one another properly) 
- optimization
- how binary editors work and various optimizations that must be considered
- the distribution of node packages through npm
- the importance of good tooling
- identification of a problem space and independently learning and working to create a solution

## Repo Link

- [fudgedit repo](https://github.com/fudgepop01/fudgedit)
  - [the hex editor itself + API](https://github.com/fudgepop01/fudgedit/tree/master/src/components/hex-editor)
- the tool I used to create it, [StencilJS](https://stenciljs.com/)
- a talk by [Angeal Berteni](https://twitter.com/angealbertini?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor) that helped me understand what could be done better with hex editors: [TR19: No More Dumb Hex!](https://youtu.be/264OmDG8m7M)
- vscode blogs that helped me learn:
  - a performant way to store edits in a large complicated document: [Text Buffer Reimplementation](https://code.visualstudio.com/blogs/2018/03/23/text-buffer-reimplementation)
    - red-black trees (and their drawbacks at scale)
    - Piece trees
  - about syntax highlighting and optimization with text: [Syntax highlighting in VSCode](https://code.visualstudio.com/blogs/2017/02/08/syntax-highlighting-optimizations)
