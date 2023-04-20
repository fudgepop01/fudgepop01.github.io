_This is the README file written for EHMain, a service intended to make it easier for members of Engineering House to organize events, take event attendance, and use items on floor. It never was able to be put into motion, but this is still a good README regardless_

---

# EH-Main README

### Hi! I'm **Dominick Reba**! 

I'm a Second year Web and Mobile Development major that was a member of engineering house from 2018-2019. If you're reading this right now, you're likely either just curious or are the computer chairman (if that role is still around). Anyway, here is where I'll try to explain all I can about how EHMain works, and why I set things up the way I did. I'm going to try and write it as if this is your first time reading documentation sooo... there are going to be resources linked to relevant articles and information left and right.

If you're reading this README file, great! You're on your way to doing an excellent job as computer chairman or whatever your role is called.

Anyway, let's get started!

---

### History (yes, this is important too)

EH-Main started as a freshman project back in the year 2016 - before I got here. And it worked! ...for about two days until someone tried to update something and the entire thing came crashing down in a fireball that could illuminate a football field. I had a interest in web development, so when I came in as a freshman in 2017, I eventually said "y'know, I really like the idea and EHouse needs to be modernized a little" - so I tried using the framework the previous year provided. Long-story short, the workflow simply did not fit my style, so throughout my next year (2018-2019) I started from scratch and worked to try and create what hopefully is still around today. 

**The goal of EH-Main is to make managing floor easier for everyone involved. This includes:**

- automatic creation / distribution of evals
- an intuitive way of creating and organizing events
- a list of past and present members along with contact info if necessary
- an intuitive way of adding new members to this list
- easy distribution of house minutes (summaries of what happened at house meeting, run by the secretary)
- easy ways to organize the online filing cabinet via google drive.

While these things may sound easy in theory, programming it all in a way that's secure and follows the standards of Engineering House roles has proven to be a ton of work. There are many things that work together to make the metaphorical gears turn consistently. With so much going on, It may be confusing looking at the code for the first time, so I'm going to try and break things down as best I can.



## NodeJS & Node Package Manager (npm)

[Nodejs](https://nodejs.org/en/) is essentially a runtime that allows javascript code to be executed on a local machine without an internet browser involved. It makes coding basic scripts a lot more accessible to those with a web-development background, and can even interface with the operating system itself through its collection of [built-in libraries](https://nodejs.org/dist/latest-v11.x/docs/api/). To do this, it uses modules written in C and C++ that interface with the javascript process and do whatever is necessary. I'm not entirely sure about how they work in-depth, but I know what they do, and you can too by [reading the API documentation](https://nodejs.org/dist/latest-v11.x/docs/api/).

There are far too-many things on the web to learn *everything*. Use the API whenever you're unsure of how to do something yourself, or wonder if there's simply "a better way." Anyway, NodeJs is what runs the server-side of things, and, to some extent, is a component in what runs the frontend (what the user sees). 

[Node Package Manager](https://docs.npmjs.com/about-npm/) (abbreviated npm) is a [command-line tool](https://www.toptal.com/software/best-command-line-tools) that provides an exceptionally easy way to obtain and use things called "packages" - chunks of code that other people write and upload to the main website - in a fast and secure manner. These are downloaded and stored in the `node_modules` folder, where the compiler looks by-default to find external moduels.



### Why External Modules?

At some point you're likely going to hear about **DRY** - Don't Repeat Yourself. This not only applies to your own code, but also to the web of code shared and stored on npm. Unless you think you can make it better, why would you want to write a package that does something that already exists? This is the beauty of npm.

read the install and usage guide, or look up some video tutorials to know how to use it.



## Visual Studio Code (my editor of choice)

[Visual Studio Code](https://code.visualstudio.com/) is my personal favorite editor. It supports all kinds of extensions to serve whatever purpose you need. It's very customizable too, and is pretty darn fast despite being based on electron. It has syntax highlighting for a multitude of different languages, and even if it doesn't by-default there are likely one or more extensions to support that.

Its user interface is very intuitve to me, and it has a built-in terminal that defaults to the current directory making it extremely easy to use. 

It also has support for tooling for some of the most important parts of EH-Main, **[typescript](https://www.typescriptlang.org/)** and **[vuejs](https://vuejs.org/)**.



## Typescript

[Typescript](https://www.typescriptlang.org/) is a superset of javascript that adds static type-checking. In other words, it allows vscode to see exactly what functions and objects have exactly what elements and suggests them as an autocomplete widget. At first it may seem tedious to use - especially on small applications. However, on a larger scale such as this, it's crucial that maintainablility is kept in-mind. By using typescript, it allows myself and others to see and follow exactly how, what, and where something is expected to be used with exponentially more ease than vanilla javascript.

It is compiled down to javascript at runtime, but the developer nor user should ever need to worry about it thanks to a lovely thing called source maps. Source maps essentially "map" bits of the compiled code to the location at which it originated in the source code (in this case, the typescript). That way, instead of having something say "error on line 1" where "line 1" is just a giant string of garbled text, it can tell the exact line and location at which an error occurs - a lifesaver for debugging.

Due to these two traits, Typescript is extremely good for developing complex applications if other languages / platforms are not available; especially when a team or the future is involved.



## VueJs

[Vue](https://vuejs.org/) is a frontend framework for the web. There are alternatives, such as React and Angular, but for me, Vue is the easiest to use out of all that's out there. A "frontend framework" is a fancy way of saying "this makes it easier for developers to make the part of a web-based application that the user sees." This is especially true in webapps with lots of dynamic components, but even in something simple it's one way to cut-down on code repetition (though, there are definitely other solutions out there).

instead of using basic HTML, CSS, and Javascript, vue (generally) uses things called "Single-File Components," where everything is in the same file. The structure is as follows:

```vue
<template>
	...
</template>

<script lang="ts">
	...
</script>

<style lang="scss">
	...
</style>
```

Typescript goes in the `script` tag, scss goes in the style tag, and the template tag contains the chunks of HTML that make up what's visible. We're able to use languages other than the default with the `lang` attribute attached to the script and style tags. We can technically use it for the template tag too with a html preprocessor like pug, but EH-Main uses "vanilla" there.

I'll go into this more in-depth in the "EH-Main: Frontend" section.



## Structure

### Client & Server

Developing a webapp like this requires some sort of basic understanding of how data flows in a secure environment between client and server.

[Start with this video](https://youtu.be/L5BlpPU_muY) for an excellent explaination on the client-server model. It covers

- what a client is and what it does
- what a server is and their purpose

Next, watch [this video](https://www.youtube.com/watch?v=eesqK59rhGA) for an explaination on how client-server communication works through http requests and responses. Finally, [here is an explanation](https://www.youtube.com/watch?v=FOZtRzY5x8E) of RESTful APIs - what it means to be REST-ful and and how they work.



### Frontend v. Backend

This is confusing to many people when they're first developing a website or service of any kind. The "**Frontend**" is what the user sees in the end. This is where the CSS and HTML come into play to make things look pretty and feel intuitive to use. It provides support for a variety of different actions, and tries to account for actions that the developer may not expect. 

Remember: users are human too, with their own ideas and expectations. In this particular case, all users will be Engineering House members and Alumni - many of which will have little-to-no knowledge of how a computer works. As such, it's important for everything to be as simple and intuitive as possible. 

In summary, the frontend in this case is basically everything the user sees when they use chrome developer tools to look at the code, CSS, and underlying javascript.

<!-- people from the future, feel free to correct me if I'm wrong here -->

On the other hand, the **Backend** consists of everything under the hood so-to-speak. Most users will never end up seeing it - it's everything that actually makes the program run outside of user input. It is the data which is ultimately displayed to the end-user by the frontend. This is similar to the "model-view controller" design pattern from CS1 and CS2. This usually consists of things like:

- routing
- database access
- sending and recieving requests

Keeping the backend and frontend separate is extremely important, for otherwise there would be a multitude of security concerns. You all ***know*** that if *everyone* had raw access to the databases, that power would be abused and things would break constantly. The backend has actions that are explicitly defined and hidden from the user specifically for the purpose of keeping the data "sanitary" (follows a certain standard) so things don't break, and important data (such as passwords) don't get leaked.

To sum all of this up: The backend is responsible for actually interacting with and manipulating the data stored within the database used by the website. The frontend is simply a view of that data, often obtained by requesting it from the server.

In this README, the backend is discussed in the **EH-Main: Server** section. The frontend is disucssed in the **EH-Main: Frontend** section.



#### Remember:

Even though there are admin panels on EH-Main, these are still part of the frontend, for they allow the administrators to easily interact with the databases without manually inputting queries. Many others, even those in big corperations, confuse this and say it's part of the backend.

## Modularity

Here is perhaps the most important principal to understand about how this code works. Modern-day code written in nodejs and such is **modular**. What this means is code should be split-up based on function, and **imported** where it's necessary. This is done in typescript with the following syntax

```typescript
// imports EVERYTHING from 'bar.ts' into object 'foo'
import * as foo from './bar';

// imports the default export from 'bar.ts' as foo
import foo from './bar';

// imports the alpha, beta, and delta named-exports from './bar'
import {alpha, beta, delta} from './bar';

// looks in node_modules for one called 'bar' and imports.
// also renames 'delta' to 'derp'
import {alpha, beta, delta as derp} from 'bar';
```

All of these are ways of importing whatever is "exported" from those files. This allows you, the developer, to split code into relevant files and folders and make things significantly easier to follow. It gets *extremely* difficult to follow code that isn't chunked properly. If something is thousands of lines long, it's very easy to get lost and/or overwhelmed - hence why this method of code splitting exists.

here is how code is **exported**:

```typescript
import * as Members from './controllers/members'; // import from file
import * as Router from 'koa-router'; // import from module

const router = new Router();

router
	.get('/members', Members.getMembers)

// where the magic happens
export default router;

// variable that serves no purpose other than to show an example of named exports
export const derp = 7;
```

What this does is allow other files to import this file's instance of `router`. The function of `router` is unimportant here - all you need to know is that is has been modified from its basic form, and that the modified version can be imported into another file. 

`derp` can also be imported, but it must be named or get imported with everything. That's what `* as ___` and `{derp}` are for.

# EH-Main: Server

This is the section where I talk about the inner-workings of the server and how everything fits together. Hopefully, this prevents you from getting lost. Think of it as another layer of documentation.

Lets go over each important part one-by-one...

### Server.ts

---

_This is as far as was written_

