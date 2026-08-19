---
title: Model-driven apps
description: Adding Choices Picker to a form, and what each setting does there.
order: 4
---

# Model-driven apps

This is the host the control is simplest in: the column already knows its own
options, so there is nothing to declare.

:::steps
1. Open the form in the form designer and select the Choice or Multi-Select
   Choice column.
2. Under **Components**, choose **Choices Picker**.
3. Leave **Options** empty — the column supplies them.
4. Save and publish.
:::

## Which property gets bound

The control declares two bound properties and exactly one of them is ever used:

| Column type | Bound property | Selection |
| --- | --- | --- |
| Choice | `choice` | One option |
| Multi-Select Choice | `choices` | Any number of options |

The form designer only offers the control for a column whose type matches, so
you cannot bind the wrong one. Leave the other unbound.

## Selection mode

**Selection mode** defaults to *Automatic*, which reads whichever of the two
columns is actually bound. It gets this right whenever the column has a value.

On an **empty** column of a record being created, there is no value to read
from, and the control falls back to inspecting which property the platform
described. In the rare case it guesses wrong — an empty multi-select column
rendering as single-select — set **Selection mode** to *Multiple* explicitly.
That setting always wins.

## Option colours

**Use option colours** is on by default. Each choice in Dataverse carries a
colour, and a selected pill is outlined in it. The label itself keeps the
theme's foreground colour rather than being painted over, so a dark option
colour cannot make the text unreadable.

Turn it off for a column whose colours were never configured — every choice
then falls back to the theme's accent, which looks deliberate where a row of
identical default greys does not.

## Narrowing the options on one form

Setting **Options** overrides the column's own list for that form only. It is
the same property canvas apps require, and it is useful in a model-driven app
when one form should offer a subset:

```json
[{"Value":1,"Label":"Draft"},{"Value":2,"Label":"In review"}]
```

This does not restrict what can be *stored* — it restricts what this control
offers. A value already on the record that is not in the list simply does not
appear as selected. Use business rules or column-level security if you need a
real constraint.
