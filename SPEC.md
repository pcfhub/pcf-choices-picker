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

## Enum values were documented by their labels, not their values

**Reported:** configuring `Layout` in a canvas app, where the property is a
string, with no way to find out what strings it accepts.

Two failures, one in the docs and one in the code.

The docs described these properties by the friendly names a model-driven form
shows in its dropdown — *Pills*, *Stacked list* — and never stated the values
underneath. A canvas maker types the value, so `Stacked list` looks like the
answer and `list` is. The hub's own API reference would not have rescued them
either: `ControlManifestParser::allowedValues()` does capture each `<value>`,
but its label is the `display-name-key` **verbatim**, so the table renders
`Layout_Pills_Name` rather than *Pills*. The accepted values are now stated
outright in `docs/api.md` and `docs/canvas.md`.

The code then made a near-miss worse than it needed to be. `layout.raw` was
passed straight through, so `"List"` reached the component, failed
`layout === 'pills'`, rendered the stacked branch, and emitted
`class="ChoicesPicker-List"` — which matches no CSS, giving an unstyled control
rather than an ignored setting. `matchEnum()` now trims, lower-cases and matches
against the declared values, falling back to the default. `selectionMode` gets
the same treatment, so `"Multiple"` no longer silently means `auto`.

The generated type says `raw` is `"pills" | "list"`, which is true of a
model-driven form and not of a canvas app, where the value is whatever the maker
typed. A generated union describes the manifest, not the host.

Also fixed here: `docs/canvas.md` and `docs/examples.md` still told readers to
read `ChoicesPicker1.choice` / `.choices`, output names that stopped existing
when the two bound properties became one. It is `ChoicesPicker1.Value`.

## Legacy records: show what is stored, refuse to add, never drop

**Reported:** a Multi-Select Choice column already holding several values, on a
control later limited to a single choice. It rendered one option, not the three
the record actually contained.

That was the clamp added with the ceiling rule — `stored.slice(0, 1)` in
`updateView()`. It was reasoned about as "don't contradict the UI the maker asked
for", which got the priority backwards: showing one of three values
misrepresents the record, and any subsequent edit would have written that one
value back and destroyed the other two. A configuration change is not a reason
to hide data, and the record is not wrong — the configuration changed under it.

The control now shows everything the column holds and enters a **reconciling
state** whenever the selection exceeds the mode:

- Selected options stay interactive and can be removed.
- Unselected options are **disabled**, so nothing can be added — visible rather
  than discovered by clicking.
- A `role="status"` note explains why; **Clear selection** still empties outright.
- The stacked layout falls back from radios to checkboxes meanwhile, because a
  radio group cannot represent several selected values.
- Once one value remains, ordinary single-select behaviour resumes.

The decisions live in two pure functions in `resolve.ts` — `isOverLimit()` and
`nextSelection()` — rather than inside the component, so the rules are testable
without a renderer. `nextSelection()` returns `null` for a refused interaction,
which is what keeps "refuse" distinct from "select nothing".

The principle worth carrying: **a control may refuse an edit, but it must not
silently discard stored data to satisfy its own configuration.** Which of
several values to drop is the user's decision, and a record nobody opens keeps
all of them — which matters if the restriction is later reversed.

Fifteen cases through the compiled module cover the reconciling ladder, the
refusals, the return to normal single-select, and that multiple mode is never
over-limit.

## The column is a ceiling, and UI arity is not storage arity

**Reported:** a Choice column with `selectionMode: multiple` offered multi-select
and then stored only one of the chosen options.

`resolveMode()` treated the override as absolute — `if (declared) return
declared` before looking at anything else. That is wrong in one direction and
only one: a maker can reasonably ask a Multi-Select Choice column to accept a
single answer, but asking a Choice column to accept several is asking for
something the column cannot do. The control now refuses it and stays
single-select, rather than offering a picker whose extra choices vanish on save.

So the column's capability is a **ceiling**, and `selectionMode` may only narrow
it:

| Column | `auto` | `single` | `multiple` |
| --- | --- | --- | --- |
| `picklist` / `state` / `status` | single | single | **single** — ignored |
| `multiselectpicklist` | multiple | single | multiple |
| no metadata | value shape | single | multiple |

Fixing that surfaced a second bug that had not been reported yet, and would
have been worse: **the shape written back follows the column, not the UI.** A
Multi-Select Choice column limited to single selection still stores an array,
and `getOutputs()` was returning `this.selected[0]` whenever the *mode* was
single — a bare number into a column expecting an array. `writesArray()` now
answers that question separately from `resolveMode()`, and `getOutputs()` reads
it instead of the mode. With no metadata to go on, the UI's arity is the only
available guess and is used as one.

`updateView()` briefly clamped the displayed selection to one in single mode.
That was wrong and is covered in the next section.

Twelve bindings through the compiled module cover it, including both observed
payloads, `picklist + override multiple` refusing to widen, and
`multiselectpicklist + override single` producing a single UI with array
storage.

## `property.type` cannot tell the two columns apart at all

Two attempts at reading `property.type` were wrong, and the second was wrong for
a reason the first hid. Runtime payloads captured from a real model-driven form
settled it:

| | Single-select | Multi-select |
| --- | --- | --- |
| Column | `address1_addresstypecode` | `cll_painpoints` |
| `type` | `"MultiSelectOptionSet"` | `"MultiSelectOptionSet"` |
| `attributes.Type` | `"picklist"` | `"multiselectpicklist"` |
| `raw` | `{ _label: 'Bill To', _val: 1, … }` | `null` |

**`type` is `"MultiSelectOptionSet"` for both.** On a type-grouped bound property
the platform does not report the resolved member there — so no test on it, loose
or exact, can separate the two. The exact-match fix was still broken; it just
failed for a different reason than the substring version.

`attributes.Type` is the discriminator, and it is definitive on a model-driven
form. It is **not in `@types/powerapps-component-framework`**: the declared
`Metadata` interface has six fields, and the runtime object carries `Behavior`,
`DefaultValue`, `EntityLogicalName`, `Format`, `Options`, `Precision`,
`Timestamp` and `Type` besides. Hence the cast and `typeof` guard in
`attributeType()`, and a fallback path for hosts that supply no metadata.

**`raw` is not always a number.** The single-select column handed over an object
carrying the value in `_val`, not the documented `number | null`. The previous
`typeof raw === 'number'` test therefore produced an *empty selection* — the
control would have rendered with nothing selected even once the mode was right.
`toSelection()` now unwraps `number`, numeric string, and objects via
`_val`/`Value`/`value`/`val`/`id`, dropping anything it cannot read rather than
throwing. `_val` is a minified internal field that a platform update could
rename, which is why it is one candidate among several.

Verified by compiling `resolve.ts` and running both captured payloads through it
verbatim, plus ten synthetic bindings covering array-of-objects, `status`
columns, absent metadata and the override. The single-select case now resolves
`single` with selection `[1]`; before, `multiple` with `[]`.

The lesson, stated more carefully than last time: **a type-grouped property
tells you nothing about which member it resolved to.** Get the arity from the
data source's own metadata, and treat the documented value shape as a hint
rather than a contract.

## The first symptom: a loose `type` match made every column multi-select

**Reported from a model-driven form:** an `OptionSet` (single) column, with
Selection mode left on Automatic, rendered as a multi-select.

`resolveMode()` fell back to `/multi/i.test(property.type)` when the value was
null. The comment defending it said "only one of the two members contains
'multi'" — true of a member name, and not true of what the platform actually
reports for a **type-grouped** property, which is the group's accepted types.
That string names `MultiSelectOptionSet` whichever column is bound, so the test
matched always.

The first fix led with the value shape and compared `type` **exactly**:

1. `raw` is an array → multiple (an empty multi-select still reports `[]`)
2. `raw` is a number → single
3. `type === 'MultiSelectOptionSet'` → multiple
4. otherwise → single

That was still wrong — see the section above, which supersedes it. `type` names no resolved member at all, so step 3 fired for every binding.

The harness that checked this only ever fed it invented `type` strings, so it confirmed the new logic against an assumption rather than against the platform. Real captured payloads were what actually settled it.

A lesson worth keeping: a test written against an invented fixture proves only that the code matches the invention. Capture the real payload first.

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
  bound column's Dataverse attribute type, falling back to the value's shape
  where no metadata exists — see the section above for why the property's own
  `type` cannot be used. It stays as an override.
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
