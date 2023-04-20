# Smashladder CSS

Unlike most other things in this, this took place before I even finished highschool!

Smashladder was/is a matchmaking hub for finding other players to play against in an online competetive fighting game before that kind of thing became the standard for smash games. The site owner was a really relaxed person and was also kind of learning things as he went - ([Here is his twitter!](https://twitter.com/anthrzy)). As someone with "entirely too much" free time I was on here very often.

Knowing that I wasn't there to cause any trouble, the site owner allowed me to try and find exploits in the site's systems. I wasn't sure how at first, but eventually I found out about the browser developer tools. After another user of the site showed off a custom theme they were working on, I was awestruck! I wanted to do something like that - it's super cool!!

So, eventually I learned about the `sources` panel, allowing me to actually find and make changes to the CSS that was loaded within the page. It's _very_ satisfying watching everything come together- and learning where to find out how to even read documentation in the first place was a mind-blowing experience.

The site owner eventually added the ability to add user-submitted custom themes to the site itself. [Here is the one I'm most proud of](https://www.smashladder.com/custom-stylesheets/edit/46) - a theme inspired by the pause menu UI of Kingdom Hearts 1. Sure, it is not something I would ever consider making these days, but there was a lot of learning involved in terms of styling websites and challenges I had to overcome.

## Learnings

I learned a few things - The browser developer tools may affect things purely on the client-side, but if a developer isn't careful a malicious user could make modifications in the client and use the site's own API to send unexpected data to its server. I also learned of the impact styling can have on a user's experience.

## Benefits

This was a start to many connections and inspirations that have helped me along my programming journey. Users of the site were impressed with the different themes I made, yet there were a few others in the site that were able to do so much more! I wanted to do _that_ stuff someday.

## Skills Learned/Applied

- how to use basic browser developer tools to make client-side modifications to a website
  - ("client-side" meaning that they only show up to the browser)
- how to use browser developer tools
  - sources panel for CSS
  - inspect element for element replacement/modification
  - how to change a form element from `hidden` to `visible` allowing for data that shouldn't be modified to then be modified
- _many_ CSS features
  - keyframes/animations
  - gradients
  - pseudo-selectors
  - `:after` and `:before` pseudo selectors (and their special `content` attribute, effectively allowing for text replacement)
- a bit of color theory/web design (some of the early themes I made looked TERRIBLE)

## Repo Link

[Smashladder (Anther's Ladder)](https://www.smashladder.com)