import { IInputs } from '../generated/ManifestTypes';

export type SelectionMode = 'single' | 'multiple';

type OptionMetadata = ComponentFramework.PropertyHelper.OptionMetadata;

/**
 * Which of the two bound properties is live.
 *
 * `selectionMode` is honoured first because it is the only answer that cannot
 * be wrong. The `auto` ladder below is a convenience, and it is ordered by how
 * much each signal actually proves:
 *
 *   1. A non-null `raw` is proof — only a bound column has a value.
 *   2. `attributes` is present only where the platform has a column to describe
 *      it from, so on a real form the unbound property has none. This is the
 *      signal that resolves an *empty* column, which `raw` cannot.
 *   3. Single, because a Choice column is the commoner case and picking wrong
 *      here shows the right options with the wrong arity rather than nothing.
 *
 * Step 2 does not discriminate inside the hub's demo harness, which fabricates
 * `attributes` for every declared property — which is why every demo preset
 * sets `selectionMode` explicitly instead of relying on `auto`.
 */
export function resolveMode(context: ComponentFramework.Context<IInputs>): SelectionMode {
    const declared = context.parameters.selectionMode.raw;

    if (declared === 'single' || declared === 'multiple') {
        return declared;
    }

    const { choice, choices } = context.parameters;

    if (Array.isArray(choices.raw)) {
        return 'multiple';
    }

    if (typeof choice.raw === 'number') {
        return 'single';
    }

    if (choices.attributes && !choice.attributes) {
        return 'multiple';
    }

    return 'single';
}

/**
 * Two sources, in priority order: the `options` input property, then the bound
 * column's own metadata.
 *
 * The override wins when set so a maker can relabel or narrow the list per
 * form. It is also the only source that exists in a canvas app and in the hub's
 * demo harness — the harness's `baseAttributes()` returns `DisplayName`,
 * `LogicalName`, `Description`, `IsSecured`, `SourceType` and `RequiredLevel`
 * and no `Options` at all, so a control that read metadata alone would render
 * an empty picker in its own demo.
 */
export function resolveOptions(context: ComponentFramework.Context<IInputs>): OptionMetadata[] {
    const override = parseOptions(context.parameters.options.raw);

    if (override.length > 0) {
        return override;
    }

    return (
        context.parameters.choices.attributes?.Options ??
        context.parameters.choice.attributes?.Options ??
        []
    );
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
