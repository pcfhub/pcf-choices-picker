# pcf-choices-picker — scaffolded, built, and verified

Adopted from `_template` and built end to end with Microsoft's actual toolchain:
`npm run check`, `npm run lint`, `npm run refreshTypes` and `npm run build` all
succeed, producing a real `out/controls/ChoicesPicker/bundle.js` of ~23 KB with
React and Fluent genuinely external. This file records what building it
corrected, so the next person does not rediscover it.

Picked to prove the paths nothing else in the pcfhub catalogue exercises: a
**field** control that is **react_virtual**, the first use of **Fluent** in any
of these repos, the first `OptionSet` / `MultiSelectOptionSet` / `Enum`
properties, and the first `demo.fidelity: "full"` with presets.

## What it does

Renders a Choice or Multi-Select Choice column as pills (hand-built `<button>`s
carrying `aria-pressed`) or as a stacked list (Fluent `Checkbox` /
`RadioGroup` + `Radio`). Option labels and colours come from the column's own
metadata, or from an `options` input property where the host has none.

## A loose `type` match made every column multi-select

**Reported from a model-driven form:** an `OptionSet` (single) column, with
Selection mode left on Automatic, rendered as a multi-select.

`resolveMode()` fell back to `/multi/i.test(property.type)` when the value was
null. The comment defending it said "only one of the two members contains
'multi'" — true of a member name, and not true of what the platform actually
reports for a **type-grouped** property, which is the group's accepted types.
That string names `MultiSelectOptionSet` whichever column is bound, so the test
matched always.

Fixed by leading with the value's own shape, which is proof rather than
inference, and comparing `type` **exactly**:

1. `raw` is an array → multiple (an empty multi-select still reports `[]`)
2. `raw` is a number → single
3. `type === 'MultiSelectOptionSet'` → multiple
4. otherwise → single

Exact comparison is right whichever way a host behaves: a definitive member name
is honoured, and the group string matches neither and falls through to the
default. The remaining undetectable case — a multi-select column with `null`
rather than `[]` on a host reporting the group string — resolves to single and
needs the `selectionMode` override, which is what it is for.

Verified by compiling `resolve.ts` and running ten bindings through it, covering
both spellings of `type`, both arities, empty and populated, and the override.
The old expression was confirmed to return `multiple` for the reported binding.

A lesson worth keeping: a substring test on a platform-supplied type string is a
guess about a format nobody documented. Compare exactly, and let the value's own
shape answer first.

## Two bound properties asked the maker a second question

**Reported from a real environment:** configure the control on a form, pick the
column, and the configuration pane then offers *another* column picker — for a
control that attaches to exactly one column.

The cause is not subtle once seen. A field control binds its **first** bound
property to the column it is placed on; every additional bound property is
rendered as its own column picker in the configuration pane. Declaring `choice`
(`OptionSet`) and `choices` (`MultiSelectOptionSet`) side by side therefore
guarantees a spurious second selector, whatever `required` says.

So the shape is back to a single type-grouped bound property — the arrangement
the section below records rejecting. The reasoning there was not wrong, it was
mis-weighted: those costs are a cast in one file and a cosmetic string on the
hub's API reference, while this one is a wrong question asked of every maker who
configures the control. The maker experience wins.

What changed with it:

- `selectionMode: auto` no longer picks *between* two properties. It reads the
  bound value's arity, then the type the type group resolved to — which is the
  signal that still works on an empty column. It stays as an override.
- `getOutputs()` returns a number or an array under one `value` key, decided by
  the resolved mode, because `IOutputs.value` is `any` for a type-grouped
  property.
- The `Choice_*` / `Choices_*` resource strings collapsed into `Value_*`, and the
  demo presets now set one `value` instead of two keys.

**Now unverified, and it was verified before:** whether a canvas app accepts a
type-grouped property. Microsoft's schema reference has been read as listing
`of-type-group` under model-driven apps only. Nothing in `pcf-scripts` enforces
that — its only type-group diagnostic is "references a non-existent
`<type-group>`" — and it has not been tested against a real canvas app. The
trade was made knowing this: a confirmed model-driven defect outweighs an
unconfirmed canvas restriction. Test it before promising canvas support.

## Why the first attempt at `of-type-group` was rejected

The manifest originally used a type-group to accept both column types through
one bound property:

```xml
<type-group name="choice">
  <type>OptionSet</type>
  <type>MultiSelectOptionSet</type>
</type-group>
<property name="value" of-type-group="choice" usage="bound" required="true" />
```

It built, and it is what the control ships with today — but not before being
rejected for the three reasons below and then reinstated. They are kept because
two of them are real costs the control still pays, and the third turned out to
be weaker evidence than it was treated as:

1. **It erases the property type.** `npm run refreshTypes` generated
   `value: ComponentFramework.PropertyTypes.Property` — the *base* interface,
   with `raw: any` and `attributes?: Metadata` carrying no `Options` — and
   `IOutputs` as `{ value?: any }`. Every read would have needed a cast.
   Two separate bound properties generate `OptionSetProperty` and
   `MultiSelectOptionSetProperty`, and `IOutputs` as
   `{ choice?: number; choices?: number[] }`.
2. **PCFHub flattens it.** `ControlManifestParser::property()` does
   `implode(' | ', $typeGroups[$groupName])`, so the published API reference
   would have read `OptionSet | MultiSelectOptionSet` as the property's type,
   and the demo panel's editor inference would have fallen through to a plain
   text box.
3. **It is said to be model-driven only.** This was the reason that actually
   decided it, and it is the weakest of the three: a reading of Microsoft's
   property schema reference, taken second-hand and never confirmed against a
   canvas app. `pcf-scripts` enforces nothing of the kind — its only type-group
   diagnostic is "references a non-existent `<type-group>`".

Costs 1 and 2 are real and the control pays them: `resolve.ts` casts
`attributes` to `OptionSetMetadata` and `index.ts` decides the output arity,
both in one place; the hub's API reference will show the flattened type string.

Cost 3 remains genuinely open. It should have been labelled that way from the
start rather than being allowed to outweigh a maker-facing defect.

## `control.type` is `virtual`, not `field`

`pcfhub.json` says `"type": "virtual"` even though this binds a single column,
because that is what the hub itself will record. `ControlType` is a three-case
enum — `field`, `dataset`, `virtual` — and `ControlManifestParser::controlType()`
resolves it as: dataset wins, then virtual, then field. A non-dataset
`control-type="virtual"` control is therefore `Virtual` on the hub whatever this
file claims, and a disagreement between the two is exactly the silent mismatch
nothing validates.

`pcf-tag-list` says `"dataset"` and is also virtual — consistent, because
dataset wins over virtual.

## Fluent 9 and React 16.8.6 cannot be installed together

The skill and `pcf-tag-list` both use `<platform-library name="React"
version="16.8.6" />`. Adding Fluent to that fails outright:

```
peer react@">=16.14.0 <19.0.0" from @fluentui/react-components@9.46.2
Found: react@16.8.6
```

`node_modules/pcf-scripts/PlatformLibraryVersions.json` explains why it does not
matter at runtime and does matter at install time:

| Declared | Platform actually serves | Alias |
| --- | --- | --- |
| React `16.8` – `16.14.0` | **16.14.0** | `Reactv16` |
| React `18` – `18.3.1` | 18.3.1 | `Reactv18` |
| Fluent 9 `9.0.0` – `9.68.0` | **9.68.0** | `FluentUIReactv940` |

The declared version is a floor mapped onto a platform build, so `16.8.6` and
`16.14.0` both resolve to the same `Reactv16`. But npm resolves the *devDependency*
literally, and Fluent's peer range starts at 16.14.0. This repo therefore
declares and installs **React 16.14.0**.

Note the alias `FluentUIReactv940` names 9.4.0 while the table serves 9.68.0 —
misleading, but it is the platform's name and the bundle must match it.

`pcf-scripts` does **not** validate platform-library names or versions at build
time: a manifest declaring Fluent built cleanly with `@fluentui/react-components`
not installed at all. A wrong version here fails in the host, not in CI.

## The demo harness never supplies `attributes.Options`

`resources/js/demo-harness/context/Parameters.ts`'s `baseAttributes()` returns
`DisplayName`, `LogicalName`, `Description`, `IsSecured`, `SourceType` and
`RequiredLevel` — and no `Options`. A control reading option metadata alone
would render an empty picker in its own published demo.

This is why `options` exists as an input property, and why it is not a demo-only
hack: a canvas app has no column metadata either, so the demo exercises exactly
the code path a canvas maker uses in production. `demo.fidelity: "full"` is
honest on that basis — nothing is stubbed, and no user-visible path leaves the
browser.

`demo.datasetFixture` is not an option here: it seeds datasets only, and this is
a field control.

## `notifyOutputChanged()` does not re-render in the demo

The first implementation rendered straight from `context.parameters` and held
selection on the control instance. On a real form that works, because the
platform re-renders after `notifyOutputChanged()`. In the hub's harness it does
not: `main.ts`'s `notifyOutputChanged()` posts `harness:outputChanged` to the
parent window and neither calls `renderView()` nor writes the value back into
its `values` map.

The published demo would have looked completely dead — every click accepted,
nothing visibly changing. Selection now lives in React state inside
`ChoicesPickerControl`, seeded from props and resynced by an effect keyed on the
*content* of `props.selected` (it is a fresh array each `updateView`, so an
identity-keyed effect would reset state on every render and undo the click).

## A manifest `default-value` reaches the harness as a string

`ControlManifestParser` stores `default-value` as the raw XML attribute, and
`Parameters.ts` does `raw: Boolean(raw)` for `TwoOptions`. So
`default-value="false"` arrives as `Boolean("false")` — `true`. The same class
of problem applies to numeric types.

Not worked around in the control: coercing strings in production code to suit a
harness would be the wrong fix. Instead **every demo preset sets every input
property explicitly**, which removes the question. Worth reporting upstream.

## ESLint had no react-hooks plugin

`_template`'s `.eslintrc.json` carries no React plugins, so the first
`eslint-disable react-hooks/exhaustive-deps` failed the build with
"Definition for rule was not found". Added `eslint-plugin-react-hooks` with
`rules-of-hooks: error` and `exhaustive-deps: warn`, plus
`parserOptions.ecmaFeatures.jsx`. A React control needs this; the template does
not ship it. Backport candidate.

## `context.fluentDesignLanguage` is not in the type definitions

Grepping the installed `@types/powerapps-component-framework` for `fluent`,
`designLanguage` or `theme` returns nothing, so reaching the host's Fluent theme
needs an `as unknown as` cast. The harness does not supply it either, so the
control falls back to `webLightTheme` rather than rendering unthemed.

## Pills are toggle buttons, not radios

`role="radio"` would promise arrow-key navigation between pills, which plain
buttons do not provide. Announcing a keyboard contract the control does not
honour is worse than presenting an honest one, so the pills are `<button>`s with
`aria-pressed`: reachable by Tab, activated by Space or Enter. The stacked list
uses Fluent's `RadioGroup`/`Checkbox`, which do provide the full pattern.

Single-select needs an explicit **Clear selection** affordance, because neither a
radio nor a pill standing in for one can be unset by clicking it again — without
it an optional Choice column could never be emptied.

## Verified, and not

**Verified by running:** `npm run check`, `npm run lint`, `npm run refreshTypes`,
`npm run build`; the bundle carries `external "Reactv16"` and
`external "FluentUIReactv940"` with zero occurrences of bundled React or Griffel
internals; 23,543 bytes against the 5,242,880-byte web-resource ceiling; every
path in `pcfhub.json` (`demo.bundle`, `demo.styles`, `media.logo`) resolves; all
five `.resx` files carry an identical 22-key set.

**Not verified:** solution import into a Dataverse environment; the two-optional-
bound-properties question above; how the control looks, since nothing here can
render it; PCFHub ingestion, which needs a repository and a release that do not
exist yet.
