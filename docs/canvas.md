---
title: Canvas apps
description: Using Choices Picker in a canvas app, where you must supply the options yourself.
order: 3
---

# Canvas apps

The control works in canvas apps and custom pages, with one difference that is
not optional:

:::callout{type=warning}
**A canvas app has no column metadata, so the control cannot discover the
options.** You must supply them through the `Options` property. Leave it empty
and the picker renders "No options are available for this column."
:::

This is not a limitation of this control — a canvas app never hands a code
component the `attributes.Options` a model-driven form does. Every choice picker
in a canvas app supplies its list explicitly.

## Setup

:::steps
1. Enable **Code components for canvas apps** in the environment.
2. **Insert → Get more components → Code**, then add **Choices Picker**.
3. Set `Options` to the list you want to offer.
4. Set `SelectionMode` to `"single"` or `"multiple"` — do not rely on `"auto"` here.
5. Set `Layout` to `"pills"` or `"list"`.
:::

### The values these properties accept

A model-driven form shows a dropdown of friendly names for these; a canvas app
takes the underlying string. The strings are:

| Property | Accepted values | Default |
| --- | --- | --- |
| `SelectionMode` | `"auto"`, `"single"`, `"multiple"` | `"auto"` |
| `Layout` | `"pills"`, `"list"` | `"pills"` |
| `ShowColors` | `true`, `false` | `true` |

`"list"` is the stacked layout — the model-driven dropdown calls it *Stacked
list*, but the value to type here is `list`.

Surrounding spaces and capitalisation are ignored, so `"List"` and `" list "`
both work. Anything the control does not recognise falls back to the default
rather than raising an error, so a typo shows up as the setting apparently being
ignored.

## Supplying the options

Either form works. JSON matches the shape Dataverse itself uses:

```
"[{""Value"":1,""Label"":""Draft"",""Color"":""#616161""},{""Value"":2,""Label"":""In review"",""Color"":""#0F6CBD""}]"
```

The short form is easier to read in the formula bar when you do not need
colours:

```
"1:Draft, 2:In review, 3:Approved"
```

Doubled quotes are Power Fx's escaping inside a string literal, not part of the
JSON.

### From a real choice column

If the options exist on a Dataverse column, build the string rather than typing
it, so the app and the column cannot drift:

```
Concat(
    Choices(Accounts.'Status Reason'),
    """" & Value & """:""" & Value & """",
    ", "
)
```

Adjust to your table and column. Values must be the numeric option values the
column stores.

## Reading the selection

There is one output, `Value`, and `SelectionMode` decides its shape:

| Mode | Read | Type |
| --- | --- | --- |
| `"single"` | `ChoicesPicker1.Value` | A number |
| `"multiple"` | `ChoicesPicker1.Value` | A table of numbers |

Set `SelectionMode` explicitly. `"auto"` decides from the bound column's
metadata, and a canvas app supplies none.

## Sizing

Canvas gives the control whatever width and height you set on it. The pills wrap
onto as many rows as they need, so give it enough height for the longest
selection, or use the stacked list layout where the height is predictable.
