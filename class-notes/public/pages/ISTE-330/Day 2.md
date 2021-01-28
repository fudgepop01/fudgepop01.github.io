## Values and Expressions 

explained well enough in lecture; check lecture slides in mycourses

## Primitive Data Types

Javascript has ~~6~~ 7 primitive data types:

- string
- number
- bigint
- boolean
- undefined
- symbol
- null

Each of these serve their own purpose. The most common ones you'll see are:

- string
- number
- boolean
- undefined
- null

with the `BigInt` and `Symbol` types being added in javascript versions ES2020 and ES2015/es6, respectively

> ***Sidenote***: 
> 
> javascript is a language which has evolved over the years, and as such has version numbers. However, this versioning is a bit inconsistent. Javascript was only named after java to capitalize on java's popularity. ES referrs to ECMAScript (explained in the article linked below). 2015 is when ES6 was released, and it just so happens that starting from then, versions would be referred to by the year they were released. ES2016 is es7, ES2017 is es8, etc.
> 
> Here's an article that explains more: [link](https://codeburst.io/javascript-wtf-is-es6-es8-es-2017-ecmascript-dca859e4821c)

for clarity, here is an example of what each primitive type looks like in javascript:

```js-interactive
/// string
console.log("hello world");
/// number
console.log(42);
/// boolean
console.log(true);
console.log(false);
/// undefined
console.log(undefined);
/// null
console.log(null);
```

`string`, `number`, and `boolean` work as you expect. `undefined` and `null` are a little bit confusing. According to [this Stackoverflow post](https://stackoverflow.com/questions/5076944/what-is-the-difference-between-null-and-undefined-in-javascript) (you'll be very familiar with that website if you aren't already), `null` is something that can be *assigned* as a value, wheras `undefined` is an actual primitive. `null` is just *called* a primitive because it effectively acts like one 99% of the time. Here's more information: https://developer.mozilla.org/en-US/docs/Glossary/null

`null` and `undefined` can *pretty much* be used the same way. One of the few times they are actually different is when

1. using the `typeof` operator on them
2. trying to compare them using `===` instead of `==`

`Symbol`s are unique - meaning

```js-interactive
let sym1 = Symbol("mySymbol");
let sym2 = Symbol("mySymbol");

/// displays false
console.log(sym1 === sym2)
```

will display "false" whereas something like:

```js-interactive
let string1 = "myString";
let string2 = "myString";

/// displays true
console.log(string1 === string2);
```

will display "true".

For more information on Symbols, here are the MDN web docs: https://developer.mozilla.org/en-US/docs/Glossary/symbol

## Objects

In javascript, if something is not a primitive then it is an Object, and will return as such with the `typeof` operator. 

**This includes Arrays.**

## I'm mentally exhausted from coding and writing this stuff so that's all for today but i'll be updating this day (Day 2) tomorrow

