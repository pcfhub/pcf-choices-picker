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

  There is no `kind=output` section: both `choice` and `choices` are `usage="bound"`,
  so an output table would render empty, which reads as "no outputs" rather than
  as a missing directive.
-->

## Input properties

::props-table{kind=input}

## Bound properties

::props-table{kind=bound}

## Notes

### Bind exactly one of `choice` and `choices`

`choice` takes a Choice column, `choices` a Multi-Select Choice column. The form
designer only offers the control for a column matching one of them, so exactly
one is bound and the other stays empty. The bound one is also the one written
back.

### `selectionMode` resolution order

`single` and `multiple` are absolute. `auto` resolves in this order, stopping at
the first that answers:

1. `choices` holds an array → **multiple**
2. `choice` holds a number → **single**
3. `choices` was described by the platform and `choice` was not → **multiple**
4. Otherwise → **single**

Steps 1 and 2 need a value, so an empty column falls to step 3. Set the property
explicitly rather than relying on `auto` in a canvas app, where no column is
described at all.

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

`single` writes a number, `multiple` writes an array of numbers, and only the
bound property is written — never both, since only one of them is bound.

Emptying the selection writes an empty array in `multiple` mode. In `single`
mode a radio cannot be unset by clicking it again, so the control shows a
**Clear selection** link once something is chosen; using it writes no value,
leaving the column empty.
