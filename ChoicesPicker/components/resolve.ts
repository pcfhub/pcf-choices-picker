import { IInputs } from '../generated/ManifestTypes';

export type SelectionMode = 'single' | 'multiple';
type OptionMetadata = ComponentFramework.PropertyHelper.OptionMetadata;
type OptionSetMetadata = ComponentFramework.PropertyHelper.FieldPropertyMetadata.OptionSetMetadata;

/**
 * The bound property is type-grouped, so pcf-scripts types it as the base
 * `Property` — `raw: any`, `attributes` as the base `Metadata` without
 * `Options`. Both narrowings live here rather than being repeated at each use.
 */
export function boundValue(context: ComponentFramework.Context<IInputs>): ComponentFramework.PropertyTypes.Property {
    return context.parameters.value;
}

/**
 * Single or multiple, resolved from the column the maker actually bound.
 *
 * `selectionMode` wins when set, because it is the only answer that cannot be
 * wrong. Otherwise:
 *
 *   1. An array `raw` is proof of a multi-select column — only that arity
 *      produces one.
 *   2. `type` carries the type the type-group resolved to for this binding,
 *      which is the signal that still works on an *empty* column, where `raw`
 *      is null either way. Matched loosely because the exact spelling is the
 *      platform's to choose, and only one of the two members contains "multi".
 *   3. Single, because a Choice column is the commoner case and guessing wrong
 *      shows the right options with the wrong arity rather than nothing at all.
 */
/** Dataverse's own attribute type names, as `attributes.Type` reports them. */
const MULTI_ATTRIBUTE_TYPES = new Set(['multiselectpicklist']);
const SINGLE_ATTRIBUTE_TYPES = new Set(['picklist', 'state', 'status']);

/**
 * Dataverse's attribute type for the bound column — `picklist`,
 * `multiselectpicklist`, `state`, `status`.
 *
 * This is read off `attributes` even though the declared `Metadata` interface
 * does not include it. The runtime object carries considerably more than the
 * type definitions admit (`Behavior`, `DefaultValue`, `EntityLogicalName`,
 * `Format`, `Options`, `Precision`, `Timestamp`, `Type`), observed directly on
 * a model-driven form. Hence the cast, the `typeof` guard, and callers that
 * still work when it is missing.
 */
function attributeType(property: ComponentFramework.PropertyTypes.Property): string {
    const attributes = property.attributes as { Type?: unknown } | undefined;

    return typeof attributes?.Type === 'string' ? attributes.Type.toLowerCase() : '';
}

/** What the bound column is physically capable of storing. */
export type ColumnArity = 'single' | 'multiple' | 'unknown';

/**
 * What the column can hold, which is not the same question as how the control
 * should behave.
 *
 * `attributes.Type` is the discriminator, and it is the *only* one that works.
 * Two earlier attempts read `property.type` instead; both were wrong, because
 * on a type-grouped property the platform reports `"MultiSelectOptionSet"`
 * there for **every** binding — observed on a single-select
 * `address1_addresstypecode` column, which reports `attributes.Type:
 * "picklist"` and `type: "MultiSelectOptionSet"` at the same time.
 */
export function resolveColumnArity(property: ComponentFramework.PropertyTypes.Property): ColumnArity {
    const type = attributeType(property);

    if (MULTI_ATTRIBUTE_TYPES.has(type)) {
        return 'multiple';
    }

    if (SINGLE_ATTRIBUTE_TYPES.has(type)) {
        return 'single';
    }

    return 'unknown';
}

/**
 * How many options the user may pick.
 *
 * **The column is a ceiling, not a default.** A Choice column stores exactly one
 * value, so `selectionMode: multiple` on one is not a preference the control can
 * honour — it would offer a multi-select UI over a column that keeps only one of
 * the choices, losing the rest silently on save. That combination is refused
 * here rather than half-implemented.
 *
 * A Multi-Select Choice column is the only one where both answers are real: it
 * can hold many, so restricting it to one is a legitimate thing for a maker to
 * ask for. There `selectionMode` is honoured in both directions.
 */
export function resolveMode(context: ComponentFramework.Context<IInputs>): SelectionMode {
    const property = boundValue(context);
    const arity = resolveColumnArity(property);

    if (arity === 'single') {
        return 'single';
    }

    const declared = context.parameters.selectionMode.raw;

    if (declared === 'single' || declared === 'multiple') {
        return declared;
    }

    if (arity === 'multiple') {
        return 'multiple';
    }

    // No attribute metadata — a canvas app, or the hub's demo harness. Only the
    // value's shape is left, and an array can mean nothing else.
    if (Array.isArray(property.raw)) {
        return 'multiple';
    }

    // Single by default: the commoner column, and the safer wrong answer, since
    // it offers fewer choices than the column allows rather than more.
    return 'single';
}

/**
 * Whether the control is showing more selections than its mode allows.
 *
 * This is legacy data, not a bug: a Multi-Select Choice column can already hold
 * several values when a maker later limits the control to a single choice. The
 * record is not wrong — the configuration changed under it.
 */
export function isOverLimit(mode: SelectionMode, selected: number[]): boolean {
    return mode === 'single' && selected.length > 1;
}

/**
 * What the selection becomes when the user activates `value`, or `null` when
 * the control should refuse the interaction and change nothing.
 *
 * Pure, and separate from the component, because the single-select rules are
 * where the interesting behaviour lives:
 *
 * - **Multiple** — a plain toggle.
 * - **Single, over limit** — the reconciling state. Existing values can be
 *   removed, and nothing new can be added, so the user walks the record down to
 *   one choice without the control ever discarding a value on their behalf.
 * - **Single, at limit** — picking a different option replaces the current one.
 *   Activating the option already chosen does nothing; emptying the column is
 *   the Clear affordance's job, so that a radio and a pill behave alike.
 */
export function nextSelection(
    mode: SelectionMode,
    selected: number[],
    value: number,
): number[] | null {
    const isSelected = selected.includes(value);

    if (mode === 'multiple') {
        return isSelected ? selected.filter((entry) => entry !== value) : [...selected, value];
    }

    if (isSelected) {
        // Only meaningful while reducing legacy data; otherwise Clear handles it.
        return isOverLimit(mode, selected) ? selected.filter((entry) => entry !== value) : null;
    }

    // Refuse to add a value that would have to displace several others. Which
    // of them to drop is not the control's decision to make silently.
    return isOverLimit(mode, selected) ? null : [value];
}

/**
 * Whether the bound column expects an array written back to it.
 *
 * Deliberately *not* the same as the selection mode. A Multi-Select Choice
 * column restricted to single selection still stores an array — writing it a
 * bare number would hand the platform a value of the wrong shape for the
 * column, which is the mirror of the bug this whole rule exists to prevent.
 *
 * With no metadata to go on, the UI's arity is the only available guess.
 */
export function writesArray(
    property: ComponentFramework.PropertyTypes.Property,
    mode: SelectionMode,
): boolean {
    const arity = resolveColumnArity(property);

    if (arity !== 'unknown') {
        return arity === 'multiple';
    }

    return mode === 'multiple';
}

/**
 * Normalise either arity to an array of option values, so the rest of the
 * control has one shape to deal with.
 *
 * A bare number is the documented shape, and it is not the only one that
 * arrives. A single-select column bound through this control's type group hands
 * over an object instead — observed on a real form as
 * `{ _label: 'Bill To', _val: 1, _state: -1, … }`, where `_val` carries the
 * option value. Reading only `typeof raw === 'number'` there yields an empty
 * selection: the control renders, and nothing looks selected.
 *
 * So each entry is unwrapped through the candidates below rather than assumed.
 * `_val` is a minified internal field and could be renamed by a platform
 * update, which is exactly why it is one candidate among several and why
 * failing to find a value drops that entry instead of throwing.
 */
export function toSelection(raw: unknown): number[] {
    if (raw === null || raw === undefined) {
        return [];
    }

    return (Array.isArray(raw) ? raw : [raw]).flatMap(toOptionValue);
}

function toOptionValue(entry: unknown): number[] {
    if (typeof entry === 'number') {
        return Number.isFinite(entry) ? [entry] : [];
    }

    if (typeof entry === 'string') {
        const parsed = Number(entry.trim());

        return entry.trim() !== '' && Number.isFinite(parsed) ? [parsed] : [];
    }

    if (entry !== null && typeof entry === 'object') {
        const candidates = entry as Record<string, unknown>;

        for (const key of ['_val', 'Value', 'value', 'val', 'id']) {
            const candidate = candidates[key];

            if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                return [candidate];
            }
        }
    }

    return [];
}

/**
 * Two sources, in priority order: the `options` input property, then the bound
 * column's own metadata.
 *
 * The override wins when set so a maker can relabel or narrow the list per
 * form. It is also the only source that exists in a host without column
 * metadata and in the hub's demo harness — the harness's `baseAttributes()`
 * returns `DisplayName`, `LogicalName`, `Description`, `IsSecured`,
 * `SourceType` and `RequiredLevel` and no `Options` at all, so a control that
 * read metadata alone would render an empty picker in its own demo.
 */
export function resolveOptions(context: ComponentFramework.Context<IInputs>): OptionMetadata[] {
    const override = parseOptions(context.parameters.options.raw);

    if (override.length > 0) {
        return override;
    }

    const attributes = boundValue(context).attributes as OptionSetMetadata | undefined;

    return attributes?.Options ?? [];
}

/**
 * Accepts the platform's own `OptionMetadata` shape as JSON, or the shorter
 * `1:Draft, 2:In review` pair form that a maker can type by hand.
 *
 * A malformed entry is skipped rather than thrown: a typo in one option should
 * cost that option, not blank the whole control.
 */
export function parseOptions(raw: string | null): OptionMetadata[] {
    const text = (raw ?? '').trim();

    if (text === '') {
        return [];
    }

    if (text.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(text);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.flatMap((entry) => {
                const record = entry as { Value?: unknown; Label?: unknown; Color?: unknown };

                return typeof record.Value === 'number' && typeof record.Label === 'string'
                    ? [{
                          Value: record.Value,
                          Label: record.Label,
                          Color: typeof record.Color === 'string' ? record.Color : '',
                      }]
                    : [];
            });
        } catch {
            return [];
        }
    }

    return text.split(',').flatMap((pair) => {
        const separator = pair.indexOf(':');

        if (separator < 0) {
            return [];
        }

        const value = Number(pair.slice(0, separator).trim());
        const label = pair.slice(separator + 1).trim();

        return Number.isFinite(value) && label !== ''
            ? [{ Value: value, Label: label, Color: '' }]
            : [];
    });
}
