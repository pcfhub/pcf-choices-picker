---
title: Installation
description: Import the solution and make the control available.
order: 2
---

# Installation

<!--
  Do not link to the release assets by hand. The hub serves the managed and
  unmanaged downloads for the version the reader is viewing, and a hard-coded
  link goes stale on the next release.
-->

:::steps
1. Download the **managed** solution for your environment.
2. In the Power Platform admin centre, import the solution.
3. Publish all customizations.
4. Enable **Code components for canvas apps** if this control is used there.
:::

:::callout{type=warning}
Import the managed solution into production. The unmanaged one is for a
development environment where you intend to change the control itself — it
cannot be cleanly uninstalled.
:::

## Requirements

- A Dataverse environment with code components enabled.
- For canvas apps and custom pages, **Code components for canvas apps** must be
  switched on in the environment's feature settings. Model-driven apps need
  nothing extra.

No premium licence is required. The control declares no external service usage
and calls no third-party endpoint, so it does not carry the premium flag that
`external-service-usage` would apply.

## Adding it to a form

Once the solution is imported, the control appears in the form designer for any
**Choice** or **Multi-Select Choice** column. Select the column, choose
**Choices Picker** as the control, and save and publish.

See [Model-driven apps](model-driven.md) for the per-column settings, and
[Canvas apps](canvas.md) for the one extra property canvas requires.
