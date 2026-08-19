import * as React from 'react';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { ChoicesPickerControl, IProps } from './components/ChoicesPickerControl';
import { resolveMode, resolveOptions, SelectionMode } from './components/resolve';

type Theme = Record<string, string>;

/**
 * A virtual (React) field control: `updateView` returns the element to render
 * rather than mutating a container, so the platform owns reconciliation and
 * React and Fluent stay out of the bundle entirely.
 *
 * The control binds either a Choice column (`choice`) or a Multi-Select Choice
 * column (`choices`) — never both, since the platform only offers it for a
 * column whose type matches one of them.
 */
export class ChoicesPicker implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged!: () => void;
    private mode: SelectionMode = 'single';
    private selected: number[] = [];

    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const { choice, choices } = context.parameters;

        this.mode = resolveMode(context);
        this.selected = this.mode === 'multiple'
            ? choices.raw ?? []
            : choice.raw === null ? [] : [choice.raw];

        const bound = this.mode === 'multiple' ? choices : choice;

        // `security` is absent on hosts that do not apply column-level security,
        // so it is read defensively rather than assumed — and a column the user
        // may not read is masked rather than merely disabled.
        const disabled = context.mode.isControlDisabled || bound.security?.editable === false;

        const props: IProps = {
            options: resolveOptions(context),
            selected: this.selected,
            mode: this.mode,
            layout: context.parameters.layout.raw ?? 'pills',
            showColors: context.parameters.showColors.raw ?? true,
            disabled,
            masked: bound.security?.readable === false,
            label: bound.attributes?.DisplayName ?? '',
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
     * Only the property that is actually bound is returned. Emitting both keys
     * would ask the platform to write `null` into a column this control is not
     * bound to.
     */
    public getOutputs(): IOutputs {
        if (this.mode === 'multiple') {
            return { choices: this.selected };
        }

        return { choice: this.selected.length > 0 ? this.selected[0] : undefined };
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
