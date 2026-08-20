# Choices Picker

A Choice or Multi-Select Choice column as a keyboard-accessible picker.

[![Build](https://github.com/pcfhub/pcf-choices-picker/actions/workflows/build.yml/badge.svg)](https://github.com/pcfhub/pcf-choices-picker/actions/workflows/build.yml)
[![Release](https://github.com/pcfhub/pcf-choices-picker/actions/workflows/release.yml/badge.svg)](https://github.com/pcfhub/pcf-choices-picker/actions/workflows/release.yml)

Documentation lives on [PCFHub](https://pcfhub.dev/components/pcf-choices-picker), built
from the `docs/` directory in this repository. Edit the Markdown here; the hub
recompiles it.

## What it does

Renders a Choice or Multi-Select Choice column as Fluent pills or a stacked list,
optionally in the option's own colour, fully operable from the keyboard.

It binds through **one** property that accepts either column type. That matters in
the maker experience: a field control binds its first bound property to the column
it is placed on, and any further bound property shows up as a second column picker
in the configuration pane. Two properties would mean asking a maker to choose a
second column for a control that attaches to exactly one. A type-group is the only
shape that accepts both types through a single binding.

## Properties

| Property | Type | Usage | Default | What it controls |
| --- | --- | --- | --- | --- |
| `value` | OptionSet or MultiSelectOptionSet | bound, **required** | — | The choice column to render and write back |
| `options` | Multiple | input | — | Override option list; when empty the platform's own column metadata is used |
| `selectionMode` | Enum: `auto` · `single` · `multiple` | input | `auto` | Override for hosts where the resolved column type is unreliable |
| `layout` | Enum: `pills` · `list` | input | `pills` | Pills, or Fluent checkboxes stacked vertically |
| `showColors` | TwoOptions | input | `true` | Whether to paint each option in its configured colour |

`options` takes `ComponentFramework.PropertyHelper.OptionMetadata` verbatim:

```json
[{ "Value": 1, "Label": "Draft", "Color": "#616161" }]
```

Supplying it lets a maker relabel or narrow the choices without touching the column.
In a model-driven app it is usually unnecessary — the platform provides the list —
but a host with no column metadata has no other source.

Strings ship in English, Spanish, French, German and Japanese. Built on the
platform's own React 16.14 and Fluent 9 libraries, so neither is bundled into the
control.

## On the hub

The demo runs at **full** fidelity, which is a consequence of the manifest declaring
no `feature-usage` at all: this control renders and writes back a bound column and
does nothing else — no Web API, no device, no navigation. That absence is what lets
the sandbox run the real thing, and it is one fewer permission prompt for the maker
installing it. Four presets cover single, multi-select, the stacked list, and the
empty state.

## Install

Download the managed solution from the
[latest release](https://github.com/pcfhub/pcf-choices-picker/releases/latest), or from
the component's page on the hub, and import it into your environment.

## Develop

```bash
npm install
npm start          # the PCF test harness
npm run build
npm run lint
```

To pack the solution locally you need msbuild — either Visual Studio or the
Visual Studio Build Tools:

```bash
cd Solution
msbuild /t:build /restore /p:configuration=Release
```

Both zips land in `Solution/bin/Release`.

## Release

1. Bump the version in **three** places, in one commit — they are checked
   against each other in CI:
   - `ChoicesPicker/ControlManifest.Input.xml` → `<control version="…">`
   - `Solution/src/Other/Solution.xml` → `<Version>`
   - `package.json` → `"version"`
2. Tag it: `git tag v1.2.3 && git push --tags`

The release workflow builds, packs both solution types, and attaches them to a
GitHub Release. PCFHub picks the release up from its webhook within seconds, or
from the hourly sweep otherwise.

## Repository layout

| Path | What it is |
| --- | --- |
| `ChoicesPicker/` | The control: manifest, entry point, React components, CSS, localised strings |
| `Solution/` | The Dataverse solution that packages it |
| `SPEC.md` | What building this corrected, and what is verified versus read |
| `docs/` | The pages PCFHub publishes — see the comments in each file |
| `media/` | Images and video referenced from the docs |
| `pcfhub.json` | The hub's manifest: identity, links, docs path, demo |
| `scripts/` | Template setup and the CI guard that keeps it adopted |

## Licence

[MIT](LICENSE)
