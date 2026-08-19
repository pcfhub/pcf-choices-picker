import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { ChoicesPickerControl, IProps } from './components/ChoicesPickerControl';
import {
    boundValue,
    resolveMode,
    resolveOptions,
    toSelection,
    writesArray,
    SelectionMode,
} from './components/resolve';

type Theme = Record<string, string>;

/**
 * A virtual (React) field control: `updateView` returns the element to render
 * rather than mutating a container, so the platform owns reconciliation and
 * React and Fluent stay out of the bundle entirely.
 *
 * It binds exactly one column, which may be a Choice or a Multi-Select Choice
 * column — one type-grouped bound property rather than two, because a field
 * control renders every bound property beyond the first as an extra column
 * picker in the maker's configuration pane.
 */
export class ChoicesPicker implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged!: () => void;
    private mode: SelectionMode = 'single';
    private selected: number[] = [];

    /**
     * Whether the bound *column* stores an array, which is not the same as
     * whether the control offers multiple selection — a Multi-Select Choice
     * column restricted to one choice still stores an array.
     */
    private storesArray = false;

    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const property = boundValue(context);

        this.mode = resolveMode(context);
        this.storesArray = writesArray(property, this.mode);

        // Everything the column holds, even when that is more than the current
        // mode allows. A Multi-Select Choice column limited to a single choice
        // after the fact still contains whatever was stored before, and showing
        // one of three values would misrepresent the record — the reconciling
        // state in ChoicesPickerControl handles reducing it.
        this.selected = toSelection(property.raw);

        // `security` is absent on hosts that do not apply column-level security,
        // so it is read defensively rather than assumed — and a column the user
        // may not read is masked rather than merely disabled.
        const disabled = context.mode.isControlDisabled || property.security?.editable === false;

        const props: IProps = {
            options: resolveOptions(context),
            selected: this.selected,
            mode: this.mode,
            layout: context.parameters.layout.raw ?? 'pills',
            showColors: context.parameters.showColors.raw ?? true,
            disabled,
            masked: property.security?.readable === false,
            label: property.attributes?.DisplayName ?? '',
            theme: resolveTheme(context),
            getString: (id: string): string => context.resources.getString(id),
            onChange: this.onChange,
        };

        return React.createElement(ChoicesPickerControl, props);
    }

    private onChange = (next: number[]): void => {
        this.selected = next;
        this.notifyOutputChanged();
    };

    /**
     * Arity has to match the **column**, not the UI: a Multi-Select Choice
     * column stores an array of values and a Choice column a bare number.
     * Writing the wrong shape hands the platform a value it cannot store.
     *
     * So this reads `storesArray` rather than `mode`. A Multi-Select Choice
     * column restricted to one choice offers a single-select UI and still
     * writes `[value]`.
     *
     * `IOutputs.value` is `any` because the property is type-grouped — the
     * generated type cannot know which arity a given binding resolved to, so
     * this method is where that is decided.
     */
    public getOutputs(): IOutputs {
        if (this.storesArray) {
            return { value: this.selected };
        }

        return { value: this.selected.length > 0 ? this.selected[0] : undefined };
    }

    public destroy(): void {
        // Nothing to release: no listeners, timers or subscriptions are created
        // outside React, and the platform unmounts the tree itself.
    }
}

/**
 * `context.fluentDesignLanguage` carries the host's Fluent v9 theme, but it is
 * absent from `@types/powerapps-component-framework` (grepping the installed
 * 1.3.x definitions for it returns nothing), so reaching it needs a cast. It is
 * also absent in the hub's demo harness, which is why the caller falls back to
 * Fluent's own light theme rather than rendering unthemed.
 */
function resolveTheme(context: ComponentFramework.Context<IInputs>): Theme | undefined {
    const design = (context as unknown as { fluentDesignLanguage?: { tokenTheme?: Theme } })
        .fluentDesignLanguage;

    return design?.tokenTheme;
}
