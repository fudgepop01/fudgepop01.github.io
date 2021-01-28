## Intro to Types in Javascript

unlike Java, which has types such as `int`, `String`, `char`, etc. javascript is a loosely-typed language. It has some basic types but any variable can be anything you want at any given time. 

This means in Java, a strongly typed language, this won't compile:

```java
int myVar = 42;
myVar = "forty-two";
```

but in javascript, this is just fine:

```javascript
let myVar = 42;
myVar = "forty-two";
```

If you're not careful, things will give you unexpected results:

```js-interactive
function add(a, b) {
  return a + b;
}

/// will print 3
console.log(add(1, 2)); 

/// will print "12"
console.log(add("1", 2));
```

this is due to javascript automatically converting the 2 to a string type via a process called "type coersion" - it just assumes that's what you want to do here. This is also important in if statements.

For instance:

```js-interactive
/// evaluates to true
if ("1" == 1) { 
  console.log("true");
} else {
  console.log("false");
}
/// evaluates to false
if ("1" === 1) { 
  console.log("true");
} else {
  console.log("false");
}
```

the difference here is that `==` allows for things of different types to be true if they are the same via type coersion, whereas `===` does not use any coersion at all.

## Objects

In javascript, everything that is not a basic primitive is an object. Objects are commonly represented as something like a data format called `JSON`.
Here's an example of JSON:

```json
{
  "name": "kel",
  "age": 17
}
```

and here's what an object looks like in javascript:
```javascript
let character = {
  name: "kel",
  age: 17
}
```

We can access an object's properties using dot notation - here we have `character.name` and `character.age`.
If you were to put them in a sentence you would do something like the following:

```js-interactive
// here's an object:
let character = {
  name: "kel",
  age: 17
};

/// here is our sentence:
// this will result in "hi my name is kel and I am 17 years old"
console.log("hi my name is " + character.name + " and I am " + character.age + " years old");
```

## other stuff talked about

visual studio code will be the main IDE of choice. This excellent code editor supports user-made extensions that can "extend" the functionality of the editor with all kinds of features. It's very powerful, and is completely free.
- download link: https://code.visualstudio.com/

apart from that he also mentioned nodejs, which is a way to run javascript without relying on an internet browser. This is useful in a variety of ways. We'll see how much he expects us to know, but for now here's where you can download and find a lot of info about it:
- https://nodejs.org/en/
