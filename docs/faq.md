---
title: FAQ
description: Questions that come up when configuring Choices Picker.
order: 8
---

# FAQ

## The picker says "No options are available for this column"

Three causes, in order of likelihood:

1. **You are in a canvas app** and have not set `Options`. A canvas app supplies
   no column metadata, so the list has to come from that property. See
   [Canvas apps](canvas.md).
2. **`Options` is set but unparseable.** The control falls back to the column's
   own options when the value cannot be read, so this only shows as empty if
   there is no column metadata either. Check the JSON, or use the simpler
   `1:Draft, 2:In review` form.
3. **The column genuinely has no choices defined** in Dataverse.

## I set Selection mode to Multiple and it still only lets me pick one

The bound column is a **Choice** column, which stores exactly one value. The
control ignores *Multiple* there on purpose: it would otherwise let you pick
several and keep one of them on save, losing the rest without telling you.

To allow several, the column itself has to be a **Multi-Select Choice** column.
That is a change to the column in Dataverse, not to this control.

## Can I limit a Multi-Select Choice column to one answer?

Yes — set **Selection mode** to *Single*. That direction is honoured, because
the column can hold many and you are choosing to use fewer. It still stores an
array, so nothing else reading the column has to change.

## An old record shows several options and I cannot add another

That record was saved before the field was limited to one choice, and the
control is showing you everything it actually holds rather than hiding some of
it. Remove options until one is left; the other options become available again
at that point.

The control does not silently drop the extra values — which of them to keep is
your decision, and records nobody opens keep all of them.

## The control does not appear for my column

It is offered for **Choice** and **Multi-Select Choice** columns only. It will
not appear for a Yes/No column (that is Two Options), a lookup, or a text column
holding choice-like text.

If the column is the right type and it still does not appear, the solution may
not be published — publish all customizations after importing.

## Why are my option colours not showing?

Either **Use option colours** is off, or the layout is **Stacked list**, where
the setting has no effect — Fluent's checkboxes and radios take their colour
from the host theme. Switch to **Pills** to see them.

If the layout is already Pills and colours are on, check that the choices
actually carry colours in Dataverse; a column whose options were never given one
gets the theme's accent for every selection.

## Can I stop people picking certain options?

`Options` narrows what the picker *offers* on that form, which is enough to
guide most users. It does not stop a value being stored by any other route —
a business rule, a workflow, or another form can still set one. If the
restriction has to hold, enforce it with a business rule as well.

## Does it need a premium licence?

No. The control declares no external service usage and calls no third-party
endpoint, so it does not carry the premium flag.

## Does it work offline in the mobile app?

Untested. The control makes no network calls of its own — it renders whatever
the platform hands it — so it has no reason to fail offline, but that is
reasoning rather than a result, and it has not been run in the mobile app.
