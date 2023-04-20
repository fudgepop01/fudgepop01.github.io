# PMData

This was a project that incorperated my understanding of string parsing alongside some tools that already existed for a game I played, [ProjectM](https://www.youtube.com/watch?v=vIxskj3UFV0). 

It effectively took two inputs:
1. the text form of game data related to how a fighter's moveset operated 
2. a gif of a fighter's hitboxes and hurtboxes throughout an attack

and it uses this to output a new gif with color overlays, text, and visuals that display different "sections" of the move, how strong different parts of the attack are, and more!

## Learnings

I had to learn to use asynchronous code with Javascript. Sure, I was _technically_ using it in floofy-bot already, but I had to explicitly learn the mechanics of javascript promises and how to go about using them. Otherwise, the process of overlaying information onto a frame of a gif one by one would have taken forever...

There was a whole pipeline- 
1. a parsing phase where it took a string and simulated various aspects of a move's script (even including things like some of the various loops involved for repeating hitboxes). 
2. a splitting gif phase
3. an asynchronous image processing phase
4. a "reconstruct gif from images" phase
5. a "upload gif to gfycat" phase, which I was able to leverage as a platform for fetching and sharing the urls

## Benefits

This not-only helped grow floofy bot, but it provided a great resource that was never really thought possible before without having to open a separate application to check for oneself. An enormous swath of individuals who also participate within the PM community were excited at the prospect of being able to just enter a text command and see everything they needed to know about a move right in front of them. 

## Skills Learned/Applied

- splitting gifs using a javascript GraphicsMagick library
- drawing on said gifs using said javascirpt GraphicsMagick library
- using an external API to upload and store data
- parsing complex strings and simulating various state machine-like features within them
- integrating the system into an existing project later on
- networking with others to get the bot setup in a multitude of smash-focused servers

## Repo Link

sadly this is another project that has been lost to time. It was created back when I used a macbook which is now long-gone, and it was never uploaded to github. However, here are some examples of what my pipeline was able to do:

- [Lucario forward aerial](https://gfycat.com/gargantuanicydikdik)
- [Toon Link neutral aerial](https://gfycat.com/finedampfishingcat)
- [Pikachu forward smash attack](https://gfycat.com/immensebluebrontosaurus)