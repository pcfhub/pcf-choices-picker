/*
 * The platform, stood in for: everything this control reads off `context`,
 * built from a set of switches.
 *
 * ---
 *
 * **Why this exists when `npm start` already hosts a field control.**
 *
 * `pcf-start` gives you a property panel and a real render, and for the happy
 * path it is the better tool. What it cannot put this control into is the
 * states its interesting decisions live in:
 *
 *   - **a Multi-Select Choice column restricted to one choice** — the case the
 *     whole arity rule exists for, where the UI is single-select and the column
 *     still stores an array;
 *   - **`attributes.Type` vs `type`** — the platform reports
 *     `"MultiSelectOptionSet"` in `type` for *every* binding of a type-grouped
 *     property, so only `attributes.Type` distinguishes the columns. Two
 *     earlier versions of this control read the wrong one;
 *   - **a host with no column metadata** — a canvas app and the hub's demo
 *     harness both, where `Options` is absent and the control has to fall back
 *     to the `options` input or render an empty picker;
 *   - **field-level security** — `readable === false` masks rather than
 *     disables, and arrives as `raw === null`.
 *
 * ---
 *
 * **A stub must never be more capable than the thing it stands in for.**
 *
 * `attributes` is `undefined` on canvas. `Options` is absent from the demo
 * harness's metadata even where `attributes` exists — its `baseAttributes()`
 * returns DisplayName, LogicalName, Description, IsSecured, SourceType and
 * RequiredLevel and nothing else — so `metadata: 'no-options'` reproduces that
 * exactly rather than approximating it. `security` is absent on a column with
 * no FLS profile, which is the common case and the one unguarded code breaks
 * on.
 */

(function (root, factory) {
    'use strict';

    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.__pcfHost = api;
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    /*
     * What `context.resources.getString` answers.
     *
     * The keys are the ones in `strings/ChoicesPicker.1033.resx`, and a key
     * that is not here falls back to the key itself — which is what the
     * platform does for a key missing from the .resx, so a typo looks here the
     * way it looks in production rather than throwing.
     */
    var STRINGS = {
        ChoicesPicker_Name: 'Choices Picker',
        NoOptions: 'No options to show.',
        Masked: 'You do not have access to this value.',
        Clear: 'Clear',
        OverLimit: 'This record holds more choices than the control allows.',
    };

    /**
     * The two hosts, and the difference that matters.
     *
     * A model-driven form hands down column metadata; a canvas app does not.
     * Anything the control reads with `?.` is reading across this line.
     */
    var HOSTS = {
        'model-driven': { label: 'model-driven form', publishesMetadata: true },
        canvas: { label: 'canvas app', publishesMetadata: false },
    };

    /**
     * How the column's field-level security is configured.
     *
     * `none` is the common case and the one worth defaulting to: a column with
     * no FLS profile reports `security === undefined`, not an object with every
     * flag true.
     */
    var SECURITY = {
        none: undefined,
        'read-only': { editable: false, readable: true, secured: true },
        'no-access': { editable: false, readable: false, secured: true },
    };

    /**
     * `attributes.Type` — Dataverse's own attribute type name, and the only
     * discriminator that works.
     *
     * `picklist` is a Choice column, `multiselectpicklist` a Multi-Select
     * Choice one. `state` and `status` are single-valued too. The control reads
     * this rather than `property.type`, because a type-grouped property reports
     * `"MultiSelectOptionSet"` in `type` for every binding — verified on a
     * single-select `address1_addresstypecode` column, which carries
     * `attributes.Type: "picklist"` and `type: "MultiSelectOptionSet"` at the
     * same time.
     */
    var ATTRIBUTE_TYPES = {
        choice: 'picklist',
        'multi-choice': 'multiselectpicklist',
        state: 'state',
    };

    var OPTIONS = [
        { Value: 1, Label: 'Draft', Color: '#7A7574' },
        { Value: 2, Label: 'In review', Color: '#0F6CBD' },
        { Value: 3, Label: 'Approved', Color: '#0E700E' },
    ];

    var DEFAULTS = {
        host: 'model-driven',
        /**
         * Which kind of column is bound. `choice` stores one value,
         * `multi-choice` stores an array — and that difference, not the
         * selection mode, is what decides the shape written back.
         */
        column: 'choice',
        /**
         * What the column holds.
         *
         * A bare number is the documented shape for a Choice column and is not
         * the only one that arrives: bound through this control's type group, a
         * real form hands over `{ _label, _val, _state }` instead. Pass an
         * object here to exercise that.
         */
        value: 2,
        /**
         * Column metadata: `full` carries Options, `no-options` carries the
         * attributes the hub's demo harness actually supplies and no Options at
         * all. Ignored on canvas, which publishes no attributes whatever.
         */
        metadata: 'full',
        /** The `options` input property, as the raw string a maker typed. */
        options: null,
        selectionMode: 'auto',
        layout: 'pills',
        showColors: true,
        label: 'Status',
        visible: true,
        /** The form's read-only state. Not the column's — see `security`. */
        disabled: false,
        security: 'none',
    };

    /**
     * Build a `context` for this control.
     *
     * Anything not named in `options` comes from DEFAULTS, so a caller states
     * only the state it is interested in.
     */
    function createContext(options) {
        var o = Object.assign({}, DEFAULTS, options || {});
        var host = HOSTS[o.host] || HOSTS['model-driven'];
        var security = SECURITY[o.security];

        var getString =
            o.getString
            || function (key) {
                return STRINGS[key] !== undefined ? STRINGS[key] : key;
            };

        var attributes;

        if (host.publishesMetadata) {
            attributes = {
                DisplayName: o.label,
                LogicalName: 'statuscode',
                Type: ATTRIBUTE_TYPES[o.column],
            };

            // The demo harness's metadata stops here. A control that reads
            // `attributes.Options` alone renders an empty picker in its own
            // demo, which is what this switch exists to catch.
            if (o.metadata === 'full') {
                attributes.Options = OPTIONS;
            }
        }

        return {
            parameters: {
                value: {
                    raw: o.value,
                    attributes: attributes,
                    security: security,
                    /*
                     * Deliberately the *wrong-looking* value, because it is what
                     * the platform reports. A type-grouped property carries
                     * "MultiSelectOptionSet" here for every binding, including a
                     * single-select column. A control narrowing on this is
                     * reading a field that cannot distinguish the two.
                     */
                    type: 'MultiSelectOptionSet',
                },
                options: { raw: o.options, type: 'Multiple' },
                selectionMode: { raw: o.selectionMode, type: 'Enum' },
                layout: { raw: o.layout, type: 'Enum' },
                showColors: { raw: o.showColors, type: 'TwoOptions' },
            },

            mode: {
                isVisible: o.visible,
                isControlDisabled: o.disabled,
                label: o.label,
            },

            resources: { getString: getString },

            /*
             * Absent, always — and that is not laziness.
             *
             * `fluentDesignLanguage` is missing from
             * @types/powerapps-component-framework entirely, and missing from
             * the hub's demo harness at runtime. The control reaches it through
             * a cast and falls back to Fluent's own light theme when it is not
             * there, which is the path every visitor to the demo takes. Adding
             * it here would test the branch nobody is on.
             */
            fluentDesignLanguage: undefined,

            userSettings: { isRTL: false, languageId: 1033 },
        };
    }

    /**
     * Capture the constructor the bundle registers when it loads.
     *
     * `pcf-scripts` emits `registerControl('PCFHub.ChoicesPicker', ctor)` —
     * **two arguments**, the namespace and the constructor name already joined
     * into one string. Reading the constructor from a third parameter gets
     * `undefined`, and the failure surfaces later as "registered is not a
     * constructor" rather than here.
     */
    function captureRegistration(global) {
        var box = { name: null, ctor: null };

        global.ComponentFramework = global.ComponentFramework || {};
        global.ComponentFramework.registerControl = function (fullName, ctor) {
            box.name = fullName;
            box.ctor = ctor;
        };

        return box;
    }

    return {
        HOSTS: HOSTS,
        SECURITY: SECURITY,
        STRINGS: STRINGS,
        DEFAULTS: DEFAULTS,
        OPTIONS: OPTIONS,
        createContext: createContext,
        captureRegistration: captureRegistration,
    };
});
