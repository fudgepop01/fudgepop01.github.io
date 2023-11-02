# Spark

Spark was an experiment in pushing the limits of my Javascript binary parsing prowess. At this point I was new to the wider Brawl Modding community, and I was curious about how something called Gecko Codes were created and how they worked under the hood.

Effectively, its goal was to create a web-based tool that enables the translation of gekko codes/GCT files to an intermediate language with a consistent format more intuitive.

gekko codes are effectivley instructions that were once passed to a special product that was able to read and write to a Nintendo Wii's memory at runtime. These were able to do quite a few things - from something as simple as writing a single value to memory every frame - to writing entire chunks of assemnbly code that the wii can execute. Naturally, this is difficult at a glance when it all looks like hexadecimal data. This project aimed to be a first step at fixing that!

## Learnings

To achieve my goal I studied pages upon pages of old documentation to create my own summaries of the important parts relevant to gecko code creation (and the history of Wii modding as a whole). These were originally written using [dynalist](https://dynalist.io/).

- [original dynalist form](https://dynalist.io/d/XfUd2tMt1AOjySJhIEkHq4NE)
- [markdown form (hosted in-repo)](./dynalistdocs.md)

## Benefits

This project allowed me to gain a rudimentary understanding of how assembly codes were written and the underlying logic behind them before a more permanent solution was devised to create and write gecko codes. 

## Skills Learned/Applied

- reading and archiving key datapoints
- breaking down complicated instructions into a more digestible form
- reading and understanding assembly documentation
- how CPU regsiters work, what they are, why they're so fast, etc
- javascript typed arrays 
- basic typescript binary parsing and the challenges that come with it
- how to use monaco editor within a web application

## Repo Link

- [Spark Main Repo](https://github.com/fudgepop01/spark)
- [consolidation of data into a standard format](https://github.com/fudgepop01/spark/tree/master/public/LabelFiles)
- [meat & potatoes of the project](https://github.com/fudgepop01/spark/tree/master/src/resources)
- [pre-kaitai struct parsing work](https://github.com/fudgepop01/spark/tree/master/src/resources/parse_brawl_file/parsers) 
- [folder of gecko powerpc assembly opcodes in a serialized form](https://github.com/fudgepop01/spark/tree/master/src/resources/parseGCT/ASM_opcodes)
- [file showing how powerpc assembly opcode files were generated directly from the documentation](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/ASM_opcodes/generateInstruction.ts)
- [how Instructions themselves are interpreted](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/ASM_opcodes/instruction.ts)
- [how non-ASM gecko codes are parsed](https://github.com/fudgepop01/spark/tree/master/src/resources/parseGCT/codetypes)
- [standalone file for invoking just the gecko code parser without needing a webserver](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/convertCode.ts)
- [core code that takes in a series of bytes and converts it to a text format](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/syntax.ts)
- [(flawed) example output of the parser](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/out.txt)
- [how gecko assembly codes are parsed](https://github.com/fudgepop01/spark/blob/master/src/resources/parseGCT/codetypes/ASMParam.ts)