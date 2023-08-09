# KSY Schema

A schema file is a (usually json) structured data format that, in it of itself, describes the layout/structure of another structured data file. In this case, KSY stands for Kaitai Struct YAML. YAML stands for "Yet Another Markup Language" and is effectively an alternative to JSON that makes writing said structured documents significantly nicer.

[But what can the schema file do?](#benefits)

## Learnings

For some reason I had thought that a schema file would be one of the first priorities with a standardized format, but I was incorrect. It is easy for such a thing to be ignored until later, for the main developer of a project might have little need for it with how much experience they have with their own tool. This overlooks how useful supporting infrastructure is for adopters of such a tool. Therefor, if wide adoption is a target, supporting infrastructure like a schema is very useful.

## Benefits

Schema files can be used by software to validate the content of a file that supports them. They can also be used by editors to provide autocompletion support alongside any documentation for a property that may be included. the KSY Schema therefor is a tool that allows for the ease of writing said YAML files without the need to constantly cross-reference documentation of another source, allowing for semantic validation of formats.

## Skills Learned/Applied

- the creation of schema files
- how regular expressions can be optimized
- reading and understanding meaning within documentation
  - this might sound funny, and yes it is, but I swear this is an actual skill that can take time to develop
- asking questions of more experienced individuals for clarification

## Repo Link

- main repo: [kaitai-io/ksy_schema](https://github.com/kaitai-io/ksy_schema)
- repo at the final commit I contributed: [kaitai-io/ksy_schema](https://github.com/kaitai-io/ksy_schema/tree/d60cf2401aa88bb1aeb32a66d22dd7d3a8364638)