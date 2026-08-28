/*
 * Drives the real built bundle outside a browser.
 *
 *     npm run build && npm run smoke
 *
 * A **virtual** control returns the element it wants rendered rather than
 * writing into a container, so these assertions read the props it passed down.
 * That is the better test of the two: the props are the control's decisions,
 * where the DOM is one rendering of them — and nothing here needs React to
 * reconcile anything.
 *
 * Why it exists alongside `npm start`: that shows you the happy path. What it
 * cannot put this control into is the states its rules were written for — a
 * Multi-Select Choice column restricted to one choice, a host with no column
 * metadata, a column the user may not read. Every one of those is a decision
 * this control makes differently from the obvious implementation, and each was
 * arrived at by getting it wrong first (see SPEC.md).
 *
 * Why no test framework: there is none in this repository, and adding one to
 * run a handful of assertions against a bundle would be a dependency, a config
 * file and a second build pipeline for something `node` already does. It also
 * runs the **built bundle**, which is the part worth checking — webpack, the
 * platform-library externals and the manifest all sit between the source and
 * what a form loads. CI runs it after the msbuild pack, so there it drives the
 * production bundle.
 *
 * **What passing here does NOT mean.** Every value below is supplied by this
 * file. It cannot tell you that a real form hands down what these fixtures
 * hand down, that the control looks right, that Fluent renders it, or that a
 * save persists anything. Keep those in SPEC.md under "Not verified".
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const dom = require('./dom.js');
const host = require('./host.js');
const clock = require('./clock.js');

const BUNDLE = path.join(root, 'out', 'controls', 'ChoicesPicker', 'bundle.js');

if (!fs.existsSync(BUNDLE)) {
    console.error('\n  No bundle at out/controls/ChoicesPicker. Run npm run build first.\n');
    process.exit(1);
}

/* ----------------------------------------------------------- the platform */

dom.install(global);

const time = clock.install(Date.UTC(2026, 0, 1, 12, 0, 0), global);

const registration = host.captureRegistration(global);

const source = fs.readFileSync(BUNDLE, 'utf8');

/*
 * The platform libraries, supplied under the names the bundle actually asks
 * for — read out of the bundle rather than written down here.
 *
 * A `<platform-library>` entry becomes a webpack external, and the global it
 * compiles to carries a version in its name. **That version is not the one the
 * manifest declares.** `pcf-scripts` maps a declared version onto the platform
 * build it supports, so Fluent 9 arrives as `FluentUIReactv940` and React
 * 16.14.0 as `Reactv16`. Hardcoding either is a trap that springs on the next
 * version bump, with a `ReferenceError` naming a global that appears nowhere in
 * the repository.
 */
const reactGlobals = [...new Set(source.match(/\bReactv[\w]*\b/g) || [])];
const fluentGlobals = [...new Set(source.match(/\bFluentUIReact[\w]*\b/g) || [])];

if (reactGlobals.length > 0) {
    const React = require(path.join(root, 'node_modules', 'react'));

    reactGlobals.forEach((name) => {
        global[name] = React;
    });
}

/*
 * Fluent is stubbed rather than loaded: every component resolves to its own
 * name as an element type, so `React.createElement(Button, …)` produces
 * `{ type: 'Button', props }` and the props the control passed survive for
 * inspection. These assertions are about the control's decisions, not about how
 * Fluent renders them — and Fluent 9 ships no UMD build, so there is nothing to
 * load in a browser either.
 */
const fluent = new Proxy({}, { get: (_t, name) => (typeof name === 'string' ? name : undefined) });

fluentGlobals.forEach((name) => {
    global[name] = fluent;
});

vm.runInThisContext(source, { filename: 'bundle.js' });

/* ---------------------------------------------------------------- harness */

const results = [];

function check(label, ok, detail) {
    results.push({ ok, label, detail });
}

const marked = (key) => `resx:${key}`;

const live = [];

function disposeAll() {
    while (live.length > 0) {
        live.pop().destroy();
    }
}

/**
 * Mount a fresh control in a given state and hand back its decisions.
 *
 * A new instance per state on purpose: `init` runs once per control on a real
 * form, so a suite that reused one would test a sequence the platform never
 * produces.
 */
function mount(options) {
    const context = host.createContext({ ...options, getString: marked });
    const instance = new registration.ctor();

    let notifications = 0;

    instance.init(context, () => {
        notifications += 1;
    });

    const element = instance.updateView(context);

    const handle = {
        instance,
        element,
        props: () => (element && element.props) || {},
        outputs: () => instance.getOutputs(),
        notifications: () => notifications,
        /** Re-render in a new state, as the platform does on every change. */
        update: (next) => instance.updateView(host.createContext({ ...options, ...next, getString: marked })),
        destroy: () => {
            instance.destroy();

            const at = live.indexOf(handle);

            if (at !== -1) {
                live.splice(at, 1);
            }
        },
    };

    live.push(handle);

    return handle;
}

check('bundle registered a control', typeof registration.ctor === 'function');

if (typeof registration.ctor !== 'function') {
    report();
}

/* ------------------------------------------------------- what it hands down */

const plain = mount({});

check('returns an element rather than writing into a container', plain.element !== undefined && plain.element !== null);

check(
    'passes the column metadata options down',
    plain.props().options.length === 3 && plain.props().options[0].Label === 'Draft',
    JSON.stringify(plain.props().options.map((o) => o.Label)),
);

check('and the current selection', JSON.stringify(plain.props().selected) === '[2]', JSON.stringify(plain.props().selected));

check('the label comes from the column, not the .resx', plain.props().label === 'Status', plain.props().label);

/*
 * A single-select column bound through the type group hands over an object
 * rather than a number — observed on a real form as
 * `{ _label: 'Bill To', _val: 1, _state: -1 }`. Reading only
 * `typeof raw === 'number'` there yields an empty selection: the control
 * renders, and nothing looks selected.
 */
check(
    'unwraps the object shape a real form sends for a single-select column',
    JSON.stringify(mount({ value: { _label: 'In review', _val: 2, _state: -1 } }).props().selected) === '[2]',
    JSON.stringify(mount({ value: { _label: 'In review', _val: 2, _state: -1 } }).props().selected),
);

check(
    'and drops an entry it cannot read a value out of, rather than throwing',
    JSON.stringify(mount({ value: { nothing: 'useful' } }).props().selected) === '[]',
);

/* ------------------------------------------------------------- the arity */

/*
 * **The rule this control exists to get right.**
 *
 * A Multi-Select Choice column restricted to a single choice offers a
 * single-select UI and still stores an array. Arity has to follow the *column*,
 * not the UI — writing a bare number there hands the platform a value of the
 * wrong shape.
 */
const restricted = mount({ column: 'multi-choice', value: [3], selectionMode: 'single' });

check('a multi-select column restricted to one choice renders single-select', restricted.props().mode === 'single', restricted.props().mode);

check(
    'and still writes an array back to it',
    Array.isArray(restricted.outputs().value) && restricted.outputs().value.length === 1,
    JSON.stringify(restricted.outputs()),
);

check(
    'a Choice column writes a bare number',
    mount({ column: 'choice', value: 2 }).outputs().value === 2,
    JSON.stringify(mount({ column: 'choice', value: 2 }).outputs()),
);

/*
 * The column is a ceiling, not a default: a Choice column stores one value, so
 * `selectionMode: multiple` on one would offer a multi-select UI over a column
 * that keeps only one choice, losing the rest silently on save.
 */
check(
    'multiple is refused on a column that can only hold one',
    mount({ column: 'choice', selectionMode: 'multiple' }).props().mode === 'single',
    mount({ column: 'choice', selectionMode: 'multiple' }).props().mode,
);

/*
 * `attributes.Type` is the discriminator and `property.type` is not: the
 * platform reports "MultiSelectOptionSet" there for every binding of a
 * type-grouped property. `dev/host.js` supplies exactly that misleading value,
 * so a control reading it would fail this.
 */
check(
    'reads attributes.Type rather than the type-grouped property type',
    mount({ column: 'choice' }).props().mode === 'single',
    'host reports type: MultiSelectOptionSet for both columns',
);

/* ------------------------------------------------------------- clearing */

/*
 * **A cleared column has to produce something the platform can act on.**
 *
 * The generated outputs type everything as optional, so `undefined` type-checks
 * cleanly and means the opposite of what a clear needs: the platform reads it
 * as "no change" and the column keeps its old value. The control ships a Clear
 * button that commits an empty selection, so this is the path behind it.
 */
const cleared = mount({ column: 'choice', value: 2 });

cleared.props().onChange([]);

check(
    'clearing a Choice column produces an output the platform can act on, not "no change"',
    cleared.outputs().value !== undefined,
    `getOutputs() returned ${JSON.stringify(cleared.outputs())}`,
);

const clearedMulti = mount({ column: 'multi-choice', value: [1, 2] });

clearedMulti.props().onChange([]);

check(
    'and clearing a Multi-Select column writes an empty array',
    Array.isArray(clearedMulti.outputs().value) && clearedMulti.outputs().value.length === 0,
    JSON.stringify(clearedMulti.outputs()),
);

check('a change notifies the platform exactly once', cleared.notifications() === 1, String(cleared.notifications()));

/* -------------------------------------------------------- the option list */

/*
 * The `options` input wins over metadata so a maker can relabel per form — and
 * it is the only source that exists in a host without column metadata. The
 * hub's demo harness supplies attributes *without* `Options`, so a control
 * reading metadata alone renders an empty picker in its own demo.
 */
check(
    'the options input overrides column metadata',
    mount({ options: '1:Low, 2:High' }).props().options.map((o) => o.Label).join(',') === 'Low,High',
    JSON.stringify(mount({ options: '1:Low, 2:High' }).props().options.map((o) => o.Label)),
);

check(
    'a host with metadata but no Options falls back to the input',
    mount({ metadata: 'no-options', options: '1:Low' }).props().options.length === 1,
);

check(
    'and renders no options rather than throwing when neither exists',
    mount({ metadata: 'no-options' }).props().options.length === 0,
);

check(
    'a malformed option costs that option, not the whole list',
    mount({ options: '1:Low, rubbish, 2:High' }).props().options.length === 2,
    JSON.stringify(mount({ options: '1:Low, rubbish, 2:High' }).props().options.map((o) => o.Label)),
);

check(
    'JSON options are accepted as well as the shorthand',
    mount({ options: '[{"Value":9,"Label":"Nine","Color":"#000"}]' }).props().options[0].Label === 'Nine',
);

/* ------------------------------------------------------------- the states */

/*
 * Field-level security is not the form's read-only state, and conflating them
 * is a real information bug: a column the user cannot *read* has to be masked,
 * not merely disabled, or the control renders "nothing selected" where the
 * truth is "not allowed to see it".
 */
check('a read-only column disables the control on an editable form', mount({ security: 'read-only' }).props().disabled === true);

check('a column the user cannot read is masked, not just disabled', mount({ security: 'no-access', value: null }).props().masked === true);

check('and an ordinary column is neither', plain.props().disabled === false && plain.props().masked === false);

check('the form read-only state disables it too', mount({ disabled: true }).props().disabled === true);

/*
 * Enum inputs are matched forgivingly because a canvas app supplies whatever
 * the maker typed — `" List "` and `"list"` both arrive, and an unknown value
 * would otherwise reach the class name and match no CSS.
 */
check('layout tolerates the spacing and case a canvas formula sends', mount({ layout: ' List ' }).props().layout === 'list', mount({ layout: ' List ' }).props().layout);

check('and falls back rather than passing a typo through', mount({ layout: 'pilsl' }).props().layout === 'pills');

/*
 * Legacy data, not a bug: a Multi-Select column can already hold several values
 * when a maker later limits the control to one. The record is not wrong, so the
 * control shows everything the column holds rather than silently dropping two.
 */
check(
    'a column holding more than the mode allows still shows everything it holds',
    JSON.stringify(mount({ column: 'multi-choice', value: [1, 2, 3], selectionMode: 'single' }).props().selected) === '[1,2,3]',
    JSON.stringify(mount({ column: 'multi-choice', value: [1, 2, 3], selectionMode: 'single' }).props().selected),
);

/*
 * The theme is absent from the type definitions and from the hub's demo
 * harness, so the fallback is the path every demo visitor takes.
 */
check('takes no position on the theme when the host publishes none', plain.props().theme === undefined);

/* --------------------------------------------------- what destroy owes */

/*
 * **Keep this when the rest of the file changes.** It needs no knowledge of
 * what this control takes.
 *
 * Both numbers are zero today — the control's own `destroy` says so in a
 * comment, and this is what turns that comment into something that fails if it
 * stops being true.
 */
disposeAll();

const timersBefore = time.pending();
const listeners = () => Object.values(dom.document.listeners).reduce((total, list) => total + list.length, 0);
const listenersBefore = listeners();

mount({}).destroy();

check('destroy() releases every timer the control took', time.pending() === timersBefore, `${timersBefore} → ${time.pending()}`);

check('and every document-level listener', listeners() === listenersBefore, `${listenersBefore} → ${listeners()}`);

disposeAll();

report();

function report() {
    const failed = results.filter((result) => !result.ok);

    for (const result of results) {
        const detail = result.detail ? `  — ${result.detail}` : '';

        console.log(`  ${result.ok ? 'ok  ' : 'FAIL'}  ${result.label}${detail}`);
    }

    console.log(
        failed.length > 0
            ? `\n  ${failed.length} of ${results.length} failed\n`
            : `\n  ${results.length} passed — the control's own decisions only; see SPEC.md for what a real form still has to confirm\n`,
    );

    process.exit(failed.length > 0 ? 1 : 0);
}
