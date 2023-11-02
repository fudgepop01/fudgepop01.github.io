# PPlus AI

Using the knowledge obtained by Reverse Engineering and creating extensions for my AI, I was able to finally put together a whole custom system for Artificial Intelligence in Project+. The development of this system involved a process of constant iteration and painstaking attention to detail.

This system is flexible and applies to every character in the game, with minimal character-specific coding. This enables me to focus on the core behavior without worrying too much about breaking something in a single character.

So... 

Builds On:
- [aiscriptpad editor](./aiscriptpad-editor.md)
- [ProjectMCodes](./ProjectMCodes.md)

### Traditional Game AI Has A Problem

Within video games, artificial intelligence agents are often presented to the player as an obstacle or challenge with little attention to how they go about achieving their goals so long as they accomplish them. They are simply a gameplay mechanic. While this works for most games, for multiplayer games this can create a significant divide in skillsets between the singleplayer campaign and the multiplayer campaign. While a player might find a way to exploit the AI behavior in the singleplayer side of things, the moment another player that knows what they are doing is introduced through multiplayer all those learnings about tactics might go entirely out the window.

From a player perspective, this can feel _bad_. It feels awful coming to learn that everything you have been doing, assuming it was productive, was quite the opposite. It presents an immediate divide between a player's expectations and reality, and can make them want to simply give up on any multiplayer potential a game might have.

If a developer tries to make the AI too good, they might underestimate the importance of including humanlike flaws in various aspects of gameplan. In the original base game of Super Smash Bros Brawl, AI opponents are regarded as good, but are absolutely not good to train against when it comes to competition with other human opponents. The reasons for this are behavior that can be extremely predictable driven by basic if else conditions, and a tendancy to perfectly react to player inputs regardless of how unrealistic it might be. There is effecitvely a bit of code that runs whenever a player takes a swing that (1) checks if they are about to get hit and (2) decides based on a coin flip whether or not they should dodge.

Clearly, this is not how a human thinks, and can lead to a player thinking certain options are simply unfeasible when fighting other players. These perfect reaction times are often referred to as "input reading." An example of these coin flips and hardcoded adaptations can also be found in the AI for Mortal Kombat 3, explored and explained in a video by Modern Vintage Gamer entitled "[How Mortal Kombat 2 cheats against you](https://youtu.be/KUttRUpVnq4)." It is an outdated idea leftover by a time where the goal was to provide entertainment, yes, but also eat the quarters of players who attempted to get through the game without understanding how these systems work.

To overcome some of these ideas, there is an excellent [video by AI and Games](https://youtu.be/4bOsJSRk0i8) that shows how the developers at 343 industries approach the behavioral section of AI habits. While the tried and true state machine and utility-based evaluation methods are used, there is a layer of imprecision introduced, and specific ideas that model humanlike behavior that would otherwise not typically emerge from bots (such as "hogging weapons" in multiplayer). This leads to AI that feels authentic to the multiplayer experience, and allows players to enjoy the skillsets they have developed over the main campaign and continuously evolve their own methods within a fun multiplayer "simulation" environment without any fear of pressure from irritable teammates or opponents.

That is great and all, but how about adaptation? An AI opponent will absolutely need to be able to adapt to new situations, otherwise a player might find themselves falling into mindless habits that just get the job done, but don't apply to situations they may encounter against a player with a brain. 

There is also a [video about Iron Galaxy's updates to Killer Instinct (2013)](https://youtu.be/9yydYjQ1GLg?t=531) that discusses how the "Shadow AI" of Killer Instinct is able to be directly trained by players and sent to other players as a kind of simulation of who that player is. It effectively records a replay of how a player reacts to the heuristics of a gamestate at various points and plays back the sequence of inputs that most closely match the gamestate at hand. It creates a robust system of simulating human behavior patterns, fully personalized to a particular competitor.

Back in 2020 this system was infeasible for custom AI in ProjectM, but I did strike a compromise:

I'll analyze the gamestate and use this information as weighted RNG inputs to branches in behaviors based on what the AI's target has done in the past to predict what they'll do next. This allows the AI to defend itself proactively, and only if it legitimately thinks the player is in range and might strike. I also program it with varying levels of technical consistency. At the lower levels, an AI opponent will have a much higher chance of sitting around and "thinking" about what to do next, giving its human player an opportunity to strike. It might also use less optimal combo routes, or move in an inefficient manner.

This feels significantly better to players, for every action the AI makes has a sort of logic behind it. This can even be analyzed in-game through various tools developed in the ProjectMCodes repository. [Here is a tweet](https://x.com/fudgepop01/status/1510965813720793097?s=20) discussing how that system works and demonstrates the AI behaving in a way that is appropriate given the chances presented.

There is also a layer of "personality" to the AI. I use these as well as a means of simulating behavioral patterns that a player might have over the course of a match. If the AI is hit by a move, the personality has a chance of being shuffled, changing how the AI prioritizes things and thus forcing the player to adapt to a new situation on the fly. [Here is a tweet](https://x.com/fudgepop01/status/1477692068579450887?s=20) I made discussing that idea with a video.

All in all, these systems come together to ensure the AI feels robust and fun to fight, keeping players from beating it in ways that would be unrealistic to expect to succeed against a real player and teaching them how the game fundamentally works against another human player by pure gameplay.

## Learnings


## Benefits


## Skills Learned/Applied

- C++
- Scripting Language Design
- Working within arbitrary memory constraints
- Memory-bound vs Compute-bound constraints
- Reverse Engineering via Ghidra
- Game AI development
- Machine Learning concepts and applications within the realm of AI
- Communicating with clients on the field through testing and observation
- A healthy competetive mindset and what I would want in terms of training tools as a player/competitor
- How good is "too good"
- Modeling humanlike behavior in Artificial Intelligence agents while working in the constraints of memory/computational bottlenecks

## Repo Link

- https://github.com/fudgepop01/aiscriptpad-editor
- an explaination about goals and how the extension worked from 3 years ago when this project was just getting started: https://www.reddit.com/r/SSBPM/comments/kgiwlj/comment/ggfskm9/
- the original AIScriptPad Editor 2.0 support thread: https://forums.kc-mm.com/index.php?topic=62818.0

- Project+ AI repository: 
  - character files: https://github.com/fudgepop01/PPlusAI/tree/master/Chars
  - shared resources folder: https://github.com/fudgepop01/PPlusAI/tree/master/Include/shared
  - mod for a frame data website I used to automate the processing and capturing of data for my AI: https://github.com/fudgepop01/PPlusAI/tree/master/rukaiDataMod