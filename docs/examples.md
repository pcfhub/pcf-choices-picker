---
title: Examples
description: Worked configurations for common cases.
order: 6
---

# Examples

Each example is complete in itself rather than a change to the one before it.

## A status column on a model-driven form

The commonest case, and the one needing least configuration. A Choice column
called *Status* with four options, each given a colour in Dataverse.

| Property | Value |
| --- | --- |
| Choice column | `Status` |
| Options | *(leave empty)* |
| Selection mode | Automatic |
| Layout | Pills |
| Use option colours | Yes |

The options and their colours come from the column. Selecting a pill writes the
value; **Clear selection** empties it again.

## Skills on a contact, as a multi-select

A Multi-Select Choice column where the whole point is seeing every selection at
once.

| Property | Value |
| --- | --- |
| Choice column | `Skills` |
| Options | *(leave empty)* |
| Selection mode | Automatic |
| Layout | Pills |
| Use option colours | Yes |

Each pill toggles independently. Unchecking the last one leaves the column
empty; no Clear link appears, because it would do nothing the pills cannot.

## A long list, in a stacked layout

Pills wrap, and past a dozen or so options that wrapping costs more than it
gains. The stacked list renders Fluent checkboxes in a column instead.

| Property | Value |
| --- | --- |
| Choice column | `Regions` |
| Layout | Stacked list |
| Use option colours | No |

Option colours are switched off here because a checkbox has no pill to tint —
the setting only affects the pill layout.

## A canvas app with a fixed list

No Dataverse column involved: the options are supplied outright.

| Property | Value |
| --- | --- |
| Options | `1:Low, 2:Medium, 3:High` |
| Selection mode | `single` |
| Layout | Pills |

Read the answer from `ChoicesPicker1.choice`. Set **Selection mode** explicitly —
`auto` has no bound column to inspect in a canvas app.

## Narrowing a column's options on one form

An *Approval status* column carries six options, but the form a submitter sees
should only offer the first two.

| Property | Value |
| --- | --- |
| Choice column | `ApprovalStatus` |
| Options | `[{"Value":1,"Label":"Draft"},{"Value":2,"Label":"Submitted"}]` |
| Selection mode | Automatic |

:::callout{type=info}
This narrows what the control **offers**, not what the column can **store**. A
record already set to *Approved* shows nothing selected here. Use a business
rule if the restriction has to be enforced.
:::
