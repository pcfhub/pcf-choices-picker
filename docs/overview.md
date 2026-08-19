---
title: Overview
description: What Choices Picker does, and when to reach for it.
order: 1
---

# Choices Picker

A Choice or Multi-Select Choice column as a keyboard-accessible picker.

::image{src=media/logo.png alt="Choices Picker" zoom}

## Why this one

The out-of-the-box control for a Multi-Select Choice column is a dropdown that
hides what is selected behind a summary line. On a form where the selection *is*
the information — a status, a set of skills, a list of applicable regions —
that costs a click to read something that could simply be visible.

Choices Picker shows every option at once, as pills or as a stacked list, with
the selected ones marked. It reads the option colours you already set in
Dataverse, so a status column looks the same here as it does on a view.

It handles both column types with one control. Bind a Choice column for single
selection or a Multi-Select Choice column for multiple; the control works out
which from what you bound.

## What it does not do

It does not create, rename or reorder the choices themselves — those live on the
column in Dataverse. The `options` property can *narrow or relabel* what the
picker offers, but it changes nothing about the column.

## Supported hosts

- **Model-driven apps** — the column supplies its own options; nothing else to configure.
- **Canvas apps and custom pages** — supported, but there is no column metadata
  in a canvas app, so you must supply the option list yourself through the
  `options` property. See [Canvas apps](canvas.md).

**Not supported on Power Pages.** React controls that use platform libraries are
available to model-driven and canvas apps only. PCF is not supported
on-premises at all.

## Accessibility

Every option is reachable with the keyboard and activated with Space or Enter.
The pills are real buttons carrying `aria-pressed`, and the stacked list uses
Fluent's own checkbox and radio components, so a screen reader announces the
selection state and whether one or several options may be chosen.

Colours come from the host theme, so the control follows dark mode and themed
environments rather than fighting them.
