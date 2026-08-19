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

## One column, one binding

The control declares **a single bound property**, `value`, which accepts either
a Choice or a Multi-Select Choice column. It attaches to the column you placed
it on and asks you for nothing else — there is no second column picker in the
configuration pane.

| Column type | Selection |
| --- | --- |
| Choice | One option |
| Multi-Select Choice | Any number of options |

## Selection mode

**Selection mode** defaults to *Automatic* and takes single-or-multiple from the
bound column itself, so it is normally correct with nothing configured.

It is an override, not a required setting. On a model-driven form the platform
supplies the column's own Dataverse attribute type — `picklist` or
`multiselectpicklist` — which is definitive, so *Automatic* is correct for both
column types whether or not the column has a value.

:::callout{type=info}
**On a Choice column the setting does nothing.** That column stores exactly one
value, so setting *Multiple* would offer a picker that lets a user choose
several and keeps one of them on save. The control ignores it and stays
single-select.

Setting *Single* on a **Multi-Select Choice** column does work — that column can
hold many, so limiting it to one is a real thing to ask for. It still stores an
array behind the scenes, so nothing else on the form has to change.
:::

### Existing records with several values

Limiting the control does not rewrite records already saved with more than one
value. Those open showing **all** of them, with the unselected options disabled
and a note explaining why: the user removes options until one remains, and then
the field behaves as a normal single choice.

The control never drops values by itself. A record left alone keeps everything
it had, which matters if the restriction is later reversed.

The override is mainly for canvas apps, where there is no column metadata at
all, and as an escape hatch if a future platform change breaks the detection.

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
