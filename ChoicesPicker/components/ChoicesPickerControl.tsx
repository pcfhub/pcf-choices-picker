import * as React from 'react';
import {
    Checkbox,
    FluentProvider,
    Radio,
    RadioGroup,
    webLightTheme,
} from '@fluentui/react-components';
import { isOverLimit, nextSelection, SelectionMode } from './resolve';

type OptionMetadata = ComponentFramework.PropertyHelper.OptionMetadata;

export interface IProps {
    options: OptionMetadata[];
    selected: number[];
    mode: SelectionMode;
    layout: 'pills' | 'list';
    showColors: boolean;
    disabled: boolean;
    masked: boolean;
    label: string;
    theme: Record<string, string> | undefined;
    getString: (id: string) => string;
    onChange: (next: number[]) => void;
}

/**
 * Selection lives in React state here rather than being read straight from
 * `context.parameters` on every render, and that is not a stylistic choice.
 *
 * On a real form the platform re-renders after `notifyOutputChanged()`, so
 * either approach works. In PCFHub's demo harness it does not:
 * `notifyOutputChanged()` posts `harness:outputChanged` to the parent window
 * and neither calls `renderView()` nor writes the value back into its own
 * `values` map. A control that rendered from `context.parameters` alone would
 * therefore look completely dead in its own published demo — every click
 * accepted, nothing visibly changing.
 *
 * The effect below resyncs when the platform hands down a genuinely different
 * value, so a form-driven change still wins over local state.
 */
export function ChoicesPickerControl(props: IProps): React.ReactElement {
    const { options, mode, layout, showColors, disabled, masked, label, getString } = props;

    const [selected, setSelected] = React.useState<number[]>(props.selected);

    // Compared by content, not identity: `props.selected` is a fresh array on
    // every updateView, so an identity dependency would reset local state on
    // every render and undo the user's click.
    const incoming = props.selected.join(',');

    React.useEffect(() => {
        setSelected(props.selected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incoming]);

    const commit = React.useCallback(
        (next: number[]): void => {
            setSelected(next);
            props.onChange(next);
        },
        [props],
    );

    const toggle = React.useCallback(
        (value: number): void => {
            const next = nextSelection(mode, selected, value);

            // `null` means the control refuses this interaction — adding a
            // value while still reducing legacy over-selection. Nothing changes
            // and nothing is written.
            if (next !== null) {
                commit(next);
            }
        },
        [commit, mode, selected],
    );

    // A Multi-Select Choice column can already hold several values when the
    // control is later limited to one. The record is not wrong, so it is shown
    // in full and the user reduces it; only adding is blocked meanwhile.
    const overLimit = isOverLimit(mode, selected);

    const theme = props.theme ?? webLightTheme;

    if (masked) {
        return (
            <FluentProvider theme={theme}>
                <div className="ChoicesPicker ChoicesPicker-masked">{getString('Masked')}</div>
            </FluentProvider>
        );
    }

    if (options.length === 0) {
        return (
            <FluentProvider theme={theme}>
                <div className="ChoicesPicker ChoicesPicker-empty">{getString('NoOptions')}</div>
            </FluentProvider>
        );
    }

    return (
        <FluentProvider theme={theme}>
            <div className={`ChoicesPicker ChoicesPicker-${layout}`}>
                {/*
                  Radios cannot represent several selected values, so while the
                  record still holds more than one the stacked layout falls back
                  to checkboxes. It returns to radios once one remains.
                */}
                {layout === 'pills'
                    ? renderPills()
                    : mode === 'single' && !overLimit
                      ? renderRadios()
                      : renderCheckboxes()}
                {renderClear()}
                {overLimit ? (
                    <div className="ChoicesPicker-notice" role="status">
                        {getString('OverLimit')}
                    </div>
                ) : null}
            </div>
        </FluentProvider>
    );

    /**
     * Toggle buttons rather than Fluent's InteractionTag, and `aria-pressed`
     * rather than `role="radio"` even in single-select.
     *
     * `role="radio"` would promise arrow-key navigation between the pills,
     * which plain buttons do not provide — announcing a keyboard contract the
     * control does not honour is worse than presenting an honest one. A row of
     * toggle buttons is reachable by Tab and activated by Space or Enter, which
     * is exactly what it looks like.
     */
    function renderPills(): React.ReactElement[] {
        return options.map((option) => {
            const isSelected = selected.includes(option.Value);

            // Left as a custom property so the stylesheet keeps control of
            // contrast rather than painting an arbitrary Dataverse colour
            // straight onto a background.
            const style =
                showColors && option.Color
                    ? ({ ['--ChoicesPicker-color']: option.Color } as React.CSSProperties)
                    : undefined;

            return (
                <button
                    key={option.Value}
                    type="button"
                    className={`ChoicesPicker-pill${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={label ? `${label}: ${option.Label}` : option.Label}
                    // While reducing legacy over-selection, only the values
                    // already chosen stay interactive — the rest are disabled
                    // rather than silently ignored, so the restriction is
                    // visible instead of being discovered by clicking.
                    disabled={disabled || (overLimit && !isSelected)}
                    style={style}
                    onClick={() => toggle(option.Value)}
                >
                    {option.Label}
                </button>
            );
        });
    }

    /**
     * Single-select needs an explicit way back to "nothing chosen": a radio,
     * and a pill standing in for one, cannot be unset by clicking it again, so
     * without this an optional Choice column could never be emptied once a
     * value had been picked. Multi-select needs no such affordance — unchecking
     * the last option already does it.
     */
    function renderClear(): React.ReactElement | null {
        if (mode !== 'single' || selected.length === 0 || disabled) {
            return null;
        }

        return (
            <button type="button" className="ChoicesPicker-clear" onClick={() => commit([])}>
                {getString('Clear')}
            </button>
        );
    }

    function renderRadios(): React.ReactElement {
        return (
            <RadioGroup
                value={selected.length > 0 ? String(selected[0]) : ''}
                disabled={disabled}
                aria-label={label || undefined}
                onChange={(_event, data) => commit([Number(data.value)])}
            >
                {options.map((option) => (
                    <Radio key={option.Value} value={String(option.Value)} label={option.Label} />
                ))}
            </RadioGroup>
        );
    }

    function renderCheckboxes(): React.ReactElement[] {
        return options.map((option) => {
            const isSelected = selected.includes(option.Value);

            return (
                <Checkbox
                    key={option.Value}
                    label={option.Label}
                    checked={isSelected}
                    disabled={disabled || (overLimit && !isSelected)}
                    onChange={() => toggle(option.Value)}
                />
            );
        });
    }
}
