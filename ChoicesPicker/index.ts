import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { ChoicesPickerControl, IProps, Choice } from './components/ChoicesPickerControl';

/**
 * A virtual (React) field control. `updateView` returns the element to render
 * rather than mutating a container, so the platform owns reconciliation and
 * React stays out of the bundle.
 *
 * The bound property uses a `type-group`, which has a consequence worth knowing
 * before reading anything below: pcf-scripts generates a type-grouped property
 * as the *base* `ComponentFramework.PropertyTypes.Property`, not as
 * `OptionSetProperty` / `MultiSelectOptionSetProperty`. So `raw` arrives as
 * `any` and `attributes` as the base `Metadata` without `Options`. Both casts
 * in this file exist for that reason, and both are narrowed first.
 */
export class ChoicesPicker implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged!: () => void;
    private selected: number[] = [];
    private multiple = false;

    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const property = context.parameters.value;

        this.multiple = isMultiSelect(property);
        this.selected = toSelection(property.raw);

        const choices = resolveChoices(context);

        const props: IProps = {
            choices,
            selected: this.selected,
            multiple: this.multiple,
            layout: context.parameters.layout.raw ?? 'pills',
            showColors: context.parameters.showColors.raw ?? true,
            disabled: context.mode.isControlDisabled,
            label: property.attributes?.DisplayName ?? '',
            getString: (id: string): string => context.resources.getString(id),
            onToggle: (value: number): void => {
                this.selected = this.multiple ? toggle(this.selected, value) : [value];
                this.notifyOutputChanged();
            },
            onClear: (): void => {
                this.selected = [];
                this.notifyOutputChanged();
            },
        };

        return React.createElement(ChoicesPickerControl, props);
    }

    /**
     * A single-select column round-trips a bare number, a multi-select an array.
     * Returning the wrong arity writes a value the platform cannot store.
     */
    public getOutputs(): IOutputs {
        if (this.multiple) {
            return { value: this.selected };
        }

        return { value: this.selected.length > 0 ? this.selected[0] : null };
    }

    public destroy(): void {
        // Nothing to release: no listeners, timers or subscriptions are created
        // outside React, which the platform unmounts itself.
    }
}

/**
 * `raw` is `null` on an empty column in both arities, so `Array.isArray` alone
 * cannot answer this — hence the `type` check as well. `type` carries the
 * manifest type name, which for the two members of this type-group contains
 * "Multi" in exactly one case. The array test is kept first because it is a
 * fact about the value in hand rather than about a string whose exact spelling
 * is the platform's to choose.
 */
function isMultiSelect(property: ComponentFramework.PropertyTypes.Property): boolean {
    return Array.isArray(property.raw) || /multi/i.test(property.type ?? '');
}

function toSelection(raw: unknown): number[] {
    if (Array.isArray(raw)) {
        return raw.filter((entry): entry is number => typeof entry === 'number');
    }

    return typeof raw === 'number' ? [raw] : [];
}

function toggle(selected: number[], value: number): number[] {
    return selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value];
}

/**
 * Two sources, in priority order.
 *
 * Dataverse column metadata is the right answer when it is there, but
 * `attributes` is genuinely optional on the platform's own property types
 * (`attributes?: OptionSetMetadata | undefined`), and it is absent wherever the
 * host has no column metadata to give — canvas apps and the hub's demo harness
 * among them. The `options` input property is the escape hatch, and it wins when
 * set so that a maker can always override a label without touching the column.
 */
function resolveChoices(context: ComponentFramework.Context<IInputs>): Choice[] {
    const override = parseOptions(context.parameters.options.raw);

    if (override.length > 0) {
        return override;
    }

    const attributes = context.parameters.value
        .attributes as ComponentFramework.PropertyHelper.FieldPropertyMetadata.OptionSetMetadata | undefined;

    return (attributes?.Options ?? []).map((option) => ({
        value: option.Value,
        label: option.Label,
        color: option.Color || null,
    }));
}

/**
 * Accepts either a JSON array — `[{ "value": 1, "label": "New" }]` — or the
 * shorter `1:New, 2:In progress` pair form. The short form is what a maker
 * types by hand, so a malformed entry is skipped rather than throwing: a typo in
 * one option should not blank the whole picker.
 */
function parseOptions(raw: string | null): Choice[] {
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
                const record = entry as { value?: unknown; label?: unknown; color?: unknown };

                return typeof record.value === 'number' && typeof record.label === 'string'
                    ? [{ value: record.value, label: record.label, color: typeof record.color === 'string' ? record.color : null }]
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

        return Number.isFinite(value) && label !== '' ? [{ value, label, color: null }] : [];
    });
}
