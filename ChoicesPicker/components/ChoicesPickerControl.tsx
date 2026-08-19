import * as React from 'react';

export interface Choice {
    value: number;
    label: string;
    color: string | null;
}

export interface IProps {
    choices: Choice[];
    selected: number[];
    multiple: boolean;
    layout: 'pills' | 'checkboxes';
    showColors: boolean;
    disabled: boolean;
    label: string;
    getString: (id: string) => string;
    onToggle: (value: number) => void;
    onClear: () => void;
}

/**
 * Rendered with real semantics rather than clickable divs, because the arity of
 * the bound column decides the correct role and a screen reader has no other way
 * to learn it: a multi-select column is a group of checkboxes, a single-select
 * column is a radio group. Getting this wrong is not cosmetic — it tells the
 * user they may pick several when they may pick one.
 *
 * Both layouts use the same underlying inputs. `pills` only changes how they are
 * painted, so keyboard behaviour cannot drift between the two.
 */
export function ChoicesPickerControl(props: IProps): React.ReactElement {
    const { choices, selected, multiple, layout, showColors, disabled, label, getString } = props;

    if (choices.length === 0) {
        return React.createElement(
            'div',
            { className: 'ChoicesPicker ChoicesPicker-empty' },
            getString('NoChoices'),
        );
    }

    const groupRole = multiple ? 'group' : 'radiogroup';

    return React.createElement(
        'div',
        {
            className: `ChoicesPicker ChoicesPicker-${layout}`,
            role: groupRole,
            'aria-label': label || undefined,
            'aria-disabled': disabled || undefined,
        },
        choices.map((choice) => {
            const isSelected = selected.includes(choice.value);

            // A selected pill is tinted with the option's own colour when
            // Dataverse supplies one. Left as a CSS custom property rather than
            // an inline background so the stylesheet keeps control of contrast.
            const style =
                showColors && choice.color
                    ? ({ ['--ChoicesPicker-color']: choice.color } as React.CSSProperties)
                    : undefined;

            return React.createElement(
                'label',
                {
                    key: choice.value,
                    className: [
                        'ChoicesPicker-option',
                        isSelected ? 'is-selected' : '',
                        disabled ? 'is-disabled' : '',
                    ]
                        .filter(Boolean)
                        .join(' '),
                    style,
                },
                React.createElement('input', {
                    type: multiple ? 'checkbox' : 'radio',
                    className: 'ChoicesPicker-input',
                    name: 'ChoicesPicker',
                    checked: isSelected,
                    disabled,
                    onChange: () => props.onToggle(choice.value),
                }),
                React.createElement('span', { className: 'ChoicesPicker-label' }, choice.label),
            );
        }),
        // A radio group cannot be emptied from the keyboard once a value is set,
        // so single-select needs an explicit way back to "nothing chosen".
        // Multi-select does not: unchecking the last box already does it.
        !multiple && selected.length > 0 && !disabled
            ? React.createElement(
                  'button',
                  {
                      type: 'button',
                      className: 'ChoicesPicker-clear',
                      onClick: props.onClear,
                  },
                  getString('Clear'),
              )
            : null,
    );
}
