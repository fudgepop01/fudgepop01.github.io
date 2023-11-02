# Project M Codes

A repository started in late 2020 dedicated to using a once-new technology for creating modifications for a mod of [Super Smash Bros. Brawl](https://en.wikipedia.org/wiki/Super_Smash_Bros._Brawl) called [ProjectM](https://en.wikipedia.org/wiki/Project_M). This is done through building chunks of assembly code and binary data through C++ using a compiler for the Wii's PowerPC-Gekko architecture.

This enables the creation of all kinds of gameplay changes and research methods previously only dreamed of by the mod developers. it provides:

- consistent ways of documenting gameplay structures with header files
- a method of hooking into arbitrary memory offsets, jumping to custom C++ or assembly code, and returning
- the near-full power of GCC including inline `asm` statements
- an extraordinary opportunity for me to learn the inner-workings of C++ at an extremely low leve
- _zero_ standard library apart from what the game provides
  - (this is a good thing because it forces me to learn how so many things work at a fundamental level)

My pride and joy is a training pack I've been working on ever since I discovered how to write to the graphics pipe and render arbitrary polygons. There are many features no one has ever fathomed being feasibly possible, and it's all thanks to C++ making it more accessible for me to create things and understand how PowerPC assembly works.

Alongside this, a modding friend created a ghidra repository and taught me how to use it. With this I have been able to analyze many low level ideas such as how "Dynamic Dispatch" works, what inheritance _really is_ and how it works in C++, what vtables are, how static members work, and so much more.

## Learnings

## Benefits

## Skills Learned/Applied

- highly in-depth C++
  - vtables
  - dynamic dispatch
  - appropriate usage of macros
  - templates
  - inheritance
  - classes
  - static functions
- Bare Metal Programming Concepts
  - interrupts
  - hardware pipes
- PowerPC Assembly
  - quantization/dequantization
  - how floats work in assembly
  - registers
- CMake
- Reverse Engineering via [Ghidra](https://ghidra-sre.org)
- Java
  - to automate the process of finding/documenting vtables in Ghidra
- Asynchronous teamwork across multiple years

## Repo Link

- repo: https://github.com/Fracture17/ProjectMCodes/
- My Main Contribution: [SuperTraining](https://github.com/Fracture17/ProjectMCodes/tree/master/Codes/SuperTraining)
- Structures that exist within Brawl that have been reverse engineered: https://github.com/Fracture17/ProjectMCodes/tree/master/Libraries
- How everything is built: https://github.com/Fracture17/ProjectMCodes/tree/master/BuildSystem