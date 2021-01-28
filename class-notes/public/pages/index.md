# Welcome to Dominick Reba (fudgepop01)'s Notes

This is where I'll be putting a bunch of my special notes up publicly as a resource for other students (and whoever else stumbles across this place) to use to learn and interact with. What makes these special? Well, for some classes - not so much. But for others -- particularly ones that deal with javascript, there will be interactive code blocks that you can execute and view the results of in (whatever I decide to code in along with) the browser's developer console. 

To Access the developer console in most browsers you can just right click on the page and press the "inspect element" button, then go over to the "Console" tab.

---

For those of you wondering what *this* - as in the site itself *is* - it's a framework I created for myself using [svelte](https://svelte.dev/) that I configured to be able to work with github pages. That way I don't actually have to pay for server hosting because everything dynamic is fully client-side! 

To render these pages I use a markdown engine called markedjs. I add special functionality to markedjs using its ability to override default formatting, and use it with code blocks. I create a custom "langauge" and then create parsers and handlers to do stuff with whatever I write inside that code block. Here's what it looks like under the hood: 

<pre><code>```handsontable
# OPTIONS
# COLUMNS
header 1
header 2
header 3
# DATA
left text | center text | right text
item 4 | item 5 | item 6
```
</code></pre>

and, using various libraries that are linked down below, that'll generate this:

```handsontable
# OPTIONS
# COLUMNS
header 1
header 2
header 3
# DATA
left text | center text | right text
item 4 | item 5 | item 6
```

I also add my own things to those features such as serialization and deserialization for those tables to make it so I can edit the table on the website where it's nice and easy and then copy and paste it instead of editing it in a purely text form where it's just plain awful. 

my github pages repo is private, but you can still see how a lot of this framework works by checking out this other repostiory I created: https://github.com/BrawlRE/BrawlRE.github.io. (here's that repo's corresponding website: https://brawlre.github.io/public/)

Just note that if you use this thing commercially, you're gonna legally need to purchase a license from whatever things require you to do so, such as with handsontable. Otherwise you'll need to do without that functionality.

I also probably won't maintain / help maintain things unless there's an issue that I have a high chance of running into so if you fork and use it then you're on your own for the most part ahahah

Still, I hope it's able to provide some insight and stuff into how this works and work well as a learning tool for the curious! :D

---

- markdown renderer with plugin support:
  - [markedjs](https://marked.js.org/)
- in-browser code editor:
  - [monaco editor](https://microsoft.github.io/monaco-editor/)
- fancy in-browser tables:
  - [handsontable](https://handsontable.com/examples?headers)