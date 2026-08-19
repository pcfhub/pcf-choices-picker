---
title: Limitations
description: What Choices Picker deliberately does not do, and where it cannot help.
order: 7
---

# Limitations

## Canvas apps must supply the option list

A canvas app hands a code component no column metadata, so the control cannot
discover the choices. The `options` property is required there — without it the
picker renders its empty state. This is a property of the host, not of this
control; see [Canvas apps](canvas.md).

The same is true of the demo on this page: the option lists in its presets are
supplied through `options`, because the demo harness has no Dataverse behind it
either. That is the same code path a canvas app uses in production.

## It does not manage the choices themselves

Adding, renaming, reordering or recolouring the options is a change to the
column in Dataverse. `options` can narrow or relabel what this control *offers*
on one form, but it stores nothing and constrains nothing — a value already on
the record that is not in the list simply shows as unselected.

## `Selection mode` on an empty multi-select column

`auto` reads the value's shape first, which is proof — an array means
multi-select, a number means single. An empty multi-select column normally still
reports an empty array, so that usually answers it too.

Where it cannot: a multi-select column whose value is `null` rather than `[]`,
on a host that reports a type-grouped property's type as the group's accepted
types rather than the resolved one. The control resolves that to single-select.
Set **Selection mode** to *Multiple*; the explicit setting always wins.

The reverse — a single-select column rendering as multi-select — was a real bug
in 0.1.0's detection and is fixed. If you see it, the control is stale.

## Option colours only apply to pills

`Use option colours` tints the pill layout. The stacked list uses Fluent's own
checkbox and radio components, which take their colour from the host theme and
offer no per-item tint. The setting is simply inert there.

To keep a dark option colour from making a label unreadable, the colour is used
for the pill's outline rather than a filled background — so a very light option
colour is subtle rather than invisible.

## Not available on Power Pages

React controls that use platform libraries are supported in model-driven and
canvas apps only. PCF is not supported on-premises at all.

## Single-select cannot be cleared by clicking

A radio, and a pill standing in for one, cannot be unset by clicking it again.
The control shows a **Clear selection** link once a value is chosen. Multi-select
needs no equivalent — unchecking the last option empties the column.

## Canvas support is unconfirmed for the type group

The single bound property uses a manifest **type group**, which is what lets one
binding accept both column types. Microsoft's property schema reference has been
read as listing `of-type-group` under model-driven apps only; that has not been
confirmed against a real canvas app here, and the toolchain imposes no such
restriction.

If a canvas app will not accept the control, that is the reason, and this page
will say so plainly once it has been tested either way. Model-driven use is
confirmed working.
