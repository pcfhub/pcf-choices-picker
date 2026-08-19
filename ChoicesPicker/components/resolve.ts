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
export function resolveMode(context: ComponentFramework.Context<IInputs>): SelectionMode {
    const declared = context.parameters.selectionMode.raw;

    if (declared === 'single' || declared === 'multiple') {
        return declared;
    }

    const property = boundValue(context);

    if (Array.isArray(property.raw)) {
        return 'multiple';
    }

    return /multi/i.test(property.type ?? '') ? 'multiple' : 'single';
}

/** Normalise either arity to an array, so the rest of the control has one shape. */
export function toSelection(raw: unknown): number[] {
    if (Array.isArray(raw)) {
        return raw.filter((entry): entry is number => typeof entry === 'number');
    }

    return typeof raw === 'number' ? [raw] : [];
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
