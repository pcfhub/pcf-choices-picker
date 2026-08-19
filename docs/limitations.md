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

## `Selection mode` on an empty column

`auto` reads whichever bound column has a value. An empty column on a new record
has none, so it falls back to inspecting which property the platform described.
That is reliable on a real form and not reliable everywhere, so an empty
multi-select column can render as single-select. Setting **Selection mode** to
*Multiple* fixes it, and always wins.

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

## Not verified against a live environment

Version 0.1.0 builds, lints, and packs, and its behaviour is verified against
the platform's own type definitions. It has **not** yet been imported into a
Dataverse environment, so one thing remains a reading rather than an
observation: whether the form designer offers a control declaring two *optional*
bound properties for both a Choice and a Multi-Select Choice column. If it turns
out to offer only one, a later version will split them. This is recorded in
`SPEC.md` rather than hidden.
