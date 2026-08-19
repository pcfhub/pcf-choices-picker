---
title: API reference
description: Properties and outputs, generated from the control manifest.
order: 5
---

# API reference

<!--
  Do not write the property tables by hand.

  `props-table` renders from what the hub parsed out of
  ControlManifest.Input.xml at the release being viewed, so it cannot drift from
  the control. A hand-written table is wrong the first time somebody adds a
  property and forgets this file, and a reader has no way to tell.

  There is no `kind=output` section: `value` is `usage="bound"`,
  so an output table would render empty, which reads as "no outputs" rather than
  as a missing directive.
-->

## Input properties

::props-table{kind=input}

## Bound properties

::props-table{kind=bound}

## Notes

### One bound property

`value` is the control's only bound property. It uses a manifest **type group**
accepting `OptionSet` and `MultiSelectOptionSet`, so one binding covers both
column types and the control attaches to exactly one column.

### `selectionMode` resolution order

`single` and `multiple` are absolute. `auto` resolves in this order, stopping at
the first that answers:

1. `value` holds an array → **multiple**
2. The bound column's reported type names a multi-select → **multiple**
3. Otherwise → **single**

Step 1 needs a value, so an empty column is answered by step 2 — the type the
type group resolved to for that binding. Set the property explicitly in a canvas
app, where there is no bound column to report a type at all.

### `options` format

Two accepted forms. JSON matches `ComponentFramework.PropertyHelper.OptionMetadata`
exactly, which is what the platform hands the control in a model-driven app:

```json
[{"Value":1,"Label":"Draft","Color":"#616161"}]
```

`Color` is optional. The shorter pair form drops it:

```
1:Draft, 2:In review, 3:Approved
```

`Value` must be the number the column stores. A malformed entry is skipped
rather than throwing, so one typo costs one option and not the whole picker.

When `options` is non-empty it **replaces** the column's list rather than
merging with it. Empty or unparseable, the control falls back to the column
metadata.

### What is written back

`single` writes a number and `multiple` writes an array of numbers, into the one
bound column. Arity has to match the column — writing an array to a Choice
column, or a bare number to a Multi-Select Choice column, hands the platform a
value it cannot store.

Emptying the selection writes an empty array in `multiple` mode. In `single`
mode a radio cannot be unset by clicking it again, so the control shows a
**Clear selection** link once something is chosen; using it writes no value,
leaving the column empty.
