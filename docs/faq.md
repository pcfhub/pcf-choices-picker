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

## It shows one selection when the column allows several

**Selection mode** is on *Automatic* and the column is empty, so there was no
value to infer the arity from. Set **Selection mode** to *Multiple* — an
explicit setting always wins over the inference.

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
