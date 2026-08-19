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

### Accepted values

`selectionMode` and `layout` are manifest enums. A model-driven form offers them
as a dropdown of friendly names; a canvas app takes the underlying string, which
is what these are:

| Property | Value | Shown in the form designer as |
| --- | --- | --- |
| `selectionMode` | `auto` *(default)* | Automatic |
| | `single` | Single |
| | `multiple` | Multiple |
| `layout` | `pills` *(default)* | Pills |
| | `list` | Stacked list |

Note that the stacked layout's value is `list`, not `stacked list`.

Capitalisation and surrounding spaces are ignored, and an unrecognised value
falls back to the default rather than erroring — so a typo looks like the
setting being ignored rather than like a failure.

`showColors` is a Yes/No property; in a canvas app it takes `true` or `false`.

### One bound property

`value` is the control's only bound property. It uses a manifest **type group**
accepting `OptionSet` and `MultiSelectOptionSet`, so one binding covers both
column types and the control attaches to exactly one column.

### `selectionMode` resolution order

**The column is a ceiling, not a default.** `selectionMode` can only ever narrow
what the column allows, never widen it:

| Column | `auto` | `single` | `multiple` |
| --- | --- | --- | --- |
| Choice (`picklist`, `state`, `status`) | single | single | **single** — the setting is ignored |
| Multi-Select Choice (`multiselectpicklist`) | multiple | single | multiple |
| No metadata (canvas, demo) | from the value's shape | single | multiple |

A Choice column stores exactly one value, so a multi-select UI over one would
let a user pick several and silently keep one on save. The control refuses that
combination rather than half-implementing it. A Multi-Select Choice column is
the only one where both answers are real, and there the setting is honoured in
both directions.

With `auto` and no override, the order is:

1. The column's attribute type is `multiselectpicklist` → **multiple**
2. It is `picklist`, `state` or `status` → **single**
3. No attribute metadata, and `value` holds an array → **multiple**
4. Otherwise → **single**

Steps 1 and 2 answer every model-driven form, because the platform supplies the
column's own attribute type. Steps 3 and 4 are for hosts that supply no column
metadata — a canvas app, or the demo on this page — where only the value's shape
is left to go on.

:::callout{type=info}
The control deliberately does **not** use the property's `type` field for this.
On a type-grouped bound property the platform reports `MultiSelectOptionSet`
there for *every* binding, including single-select columns, so neither a loose
nor an exact test on it can tell them apart.
:::

In a canvas app there is no attribute metadata at all, so set **Selection mode**
explicitly rather than relying on `auto`.

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

The shape written back matches the **column**, not the selection mode:

| Column | Written |
| --- | --- |
| Choice | a number |
| Multi-Select Choice | an array of numbers — *including* when limited to single selection |

A Multi-Select Choice column restricted to one choice still stores an array, so
the control writes `[value]` there while offering a single-select UI. Writing a
bare number to it would hand the platform a value of the wrong shape for the
column.

### Records that already hold several values

Limiting a Multi-Select Choice column to a single choice does not change records
already saved with more. The control shows **every** stored value rather than
one of them, and enters a reconciling state until one remains:

- Selected options stay interactive and can be removed.
- Unselected options are disabled, so nothing new can be added.
- A note explains why, and **Clear selection** empties the column outright.
- The stacked layout renders checkboxes rather than radios meanwhile, since a
  radio group cannot show several selected.

Once one value remains, normal single-select behaviour resumes: picking a
different option replaces it.

Nothing is discarded on the control's initiative. Which of several values to
drop is the user's decision, and the record keeps all of them until they make
it — including if they never open the form.

Emptying the selection writes an empty array in `multiple` mode. In `single`
mode a radio cannot be unset by clicking it again, so the control shows a
**Clear selection** link once something is chosen; using it writes no value,
leaving the column empty.
