## Arrays and Loops in Javascript

Arrays and Loops are things you'll use in javascript all the time. 

### Arrays

An array is a structure used to hold a series of values. In javascript, these values can be anything from numbers to objects to strings. You can even store arrays *within* arrays!

Here is an example of an Array in javascript:

```js-interactive
/// an array is a sequence of values
const myNumericArray = [72, 34, 69, 420];
console.log(myNumericArray);

/// arrays can contain multiple types
const myMultitypeArray = [1, 2, 3, "A", "B", "C"];
console.log(myMultitypeArray);
```

#### Accessing Elements

An element in an array can be accessed like so:

> `myArray[index to access goes here]`

One thing to keep in mind is arrays count up from *zero* rather than one. That means that to access the first entry (often also referred to as an *element*) of an array, you would type 

> `myArray[0]`

for instance:

```js-interactive
const myArray = ["first element", "second element", "third element"];
console.log(myArray);

/// accessing the first element in the array:
console.log("myArray[0] = " + myArray[0]);

/// other elements can be accessed in the same way:
console.log("myArray[1] = " + myArray[1]);
console.log("myArray[2] = " + myArray[2]);
```

#### Convenient Things about Arrays

So arrays are basically just fancy objects. When you create them, you can *kind of* think of them like this:

```js
const myArrayLookalike = {
    0: "first element",
    1: "second element",
    2: "third element",
    length: 3
};
```

as a matter-of-fact, you can actually convert that *into* an array using a helper method:

```js-interactive
const myArrayLookalike = {
    0: "first element",
    1: "second element",
    2: "third element",
    length: 3
};

// Array.from() will auto-create an array from the array lookalike we have
const myActualArray = Array.from(myArrayLookalike);

/// this should be an actual array
console.log(myActualArray);

/// and this (our original lookalike) should be an object
console.log(myArrayLookalike);

/// it's basically magic :^)
```

#### Manipulating Arrays

arrays have a bunch of various helpful methods built-in. From my experience, the most common ones you'll find are `push()` and `pop()`. These names come from the operation names used when manipulating a data structure called a `stack`. You don't really need to know what that is for now (ask fudge if you want more info about it) - but that's where the names come from.

By using these methods, you'll be able to add and subtract data from the end of the array, like so:

```js-interactive
const myArray = ["first", "second", "third"];

/// here is the original array
console.log(myArray);

/// use the push method to "push" an element onto the end of the array
myArray.push("fourth");
console.log(myArray);

// use the pop method to "pop" an element off of the end of the array
myArray.pop();

/// after the pop operation
console.log(myArray);

// "pop" also happens to return a value, that being what the value was that was removed from the end of the array
const poppedValue = myArray.pop();

/// this should be "third" (because we already popped from myArray once before)
console.log(poppedValue);
```

#### Nested Arrays and "Chaining" Accessors

Finally, arrays can be "nested" - that is, set within another array or object so that they're not immediately accessible. For instance:

```js
const spamReferences = {
    "spam": ["eggs", "ton"]
};
```

so how would we get "ton" from `spamReferences`? We'd do the following:

```js-interactive
const spamReferences = {
    "spam": ["eggs", "ton"]
};

/// this should be "ton"
console.log("spamReferences.spam[1] = " + spamReferences.spam[1]);
```

We "chained" the accessors to access the nested element! the chain was `spamReferences ==> spam ==> 1`.

### Arrays *and* Loops 

Ok so remember the `length` property in the object from earlier? Well, we can use this to our advantage when we want to loop over each element in the array. This is useful because if we go past the end of the array we'll get an error-- so the `length` property can tell us when to stop!

For example, we can use a for-loop to iterate over each element in an array and print out the value instead of printing one at a time like before:

```js-interactive
const myArray = ["first", "second", "third"];

// "i" is just a common letter used as the index tracker thingy for quick loops
for (let i = 0; i < myArray.length; i++) {
	console.log(myArray[i]);
}
```

> note: the way we access an array element can also work on objects. Basically, `[whatever]` is a common way of accessing a value of an object dynamically:
>
> ```js
> const spamReferences = {
>     "spam": ["eggs", "ton"]
> };
> // like before, spamReferences.spam[1] will work, but so will spamReferences["spam"][1]
> ```

Another way we can use the length property is to know when an array is empty. Logically speaking, if an array has a length of 0, then it is empty, right? So we'd want to stop a loop when it is empty. Say we wanted to only go through a list of students or something and give each of the ones in the list get a point whereas the others don't. We'd iterate through the list of students that get a point while clearing it out with `pop` to save space, like so:

```js-interactive
const studentPoints = {
	"spamton": 0,
	"Britney": 0,
	"Fudge": 0,
	"Luxx": 1,
	"Dominick": 0
};

/// student points before the loop
console.log(studentPoints);

// here's the array of students
const pointsToGive = ["Luxx", "Fudge", "spamton"];

while (pointsToGive.length > 0) {
	let target = pointsToGive.pop();
	// using the dynamic accessor like in the note above
	studentPoints[target] += 1;
}

/// student points after the loop
console.log(studentPoints);
```

#### For-Of loop

There are also different types of loops as well. This one in particular goes through and goes through each element automatically, giving it to you instead of making the coder use `myArray[i]`. It's called the `for-of` loop and looks like this:

```js-interactive
const myArray = ["first", "second", "third"];
for (const element of myArray) {
	console.log(myArray);
}
```



