# Style Controller

Latest release: **0.1.40**. See [release notes](RELEASE_NOTES.md) for the changes since 0.1.39.

Style Controller is an Obsidian plugin for managing reusable style profiles, path overrides, and visual settings through a native settings interface. It applies profile values as CSS custom properties consumed by the plugin's static stylesheet; it does not edit theme files, snippets, or notes.

Obsidian Appearance owns the base text font family and font size. Style Controller preserves legacy stored values for compatibility but no longer applies or exposes those overlapping controls. Its Line height control uses an explicit numeric value and unit, including a unitless ratio option.

## Safety warning

This plugin changes appearance by applying scoped CSS custom properties. Test profiles on a small set of notes before assigning broad path overrides. Blank/default controls remove the corresponding property and allow native Obsidian or theme behavior to continue.

## Features

- Reusable stored style profiles, including a built-in Default profile with native styling.
- Active global profile settings for typography, headings, links, tables, code, blockquotes, callouts, images, file explorer styling, and custom CSS.
- Independent native, upright, or italic font-style controls for bold and Markdown emphasis text.
- Path-specific overrides for folders, files, and path-contains matching.
- Static CSS rules with custom properties scoped to active Markdown views and matching file paths.
- Image controls for alignment, width, and whether explicit image sizes are respected.
- Status indicators for style fields: On, Off, and Error.
- Content-sized horizontal scrollers for long single-line text and resolved native font stacks.
- Import/export workflows for stored configurations.
- Named callout appearance presets and opt-in multi-column callout layouts.

## Profiles and Default behavior

The Default profile keeps native Obsidian styling. Each code background uses one compact color control: Off keeps Obsidian's resolved background while retaining `#fafafa` as the editable color shown in the control; entering a custom color automatically changes it to On, and clearing the field returns it to Off. Stored profiles can be applied to the global settings or used as path-specific overrides. The active profile for a note is resolved from the global settings plus matching enabled overrides in their saved order.

## Path overrides

Overrides can match folders, files, or paths containing specific text. Matching paths receive only the modules enabled for that override. Override ordering is preserved, and later matching overrides can layer additional non-blank profile values.

## Supported visual fields

Style Controller includes controls for base text, headings, links, tables, inline code, code blocks, blockquotes, callouts, images, file explorer entries, and custom CSS. Blank values produce no CSS declaration for that field; the current theme or Obsidian default remains in control.

## Section drafts and Apply/Revert

Each major settings section has one **Apply** button and one **Revert** button. Editing a control changes only that section's draft and preview; persisted settings, Markdown views, and other sections remain unchanged until **Apply** is selected. The section shows **Unsaved changes** while its draft differs from the last applied value.

**Apply** validates and saves only that section atomically, makes the saved values the new Revert baseline, updates relevant views, and shows a success notice. **Revert** restores the last successfully applied section values. Dirty sections must be applied or reverted before navigating to another settings section, applying a stored configuration, changing override structure, or leaving the settings tab. Path overrides use the same card-level draft transaction so their match settings, module switches, profile values, and file-explorer values stay isolated.

## Image controls

Image settings include alignment, width, and a control for respecting explicit image sizes. Blank image settings do not emit image CSS.

Under **Global Defaults → Images**, **Image rules** provides compact Note/Folder rules using the existing path-override engine. Each rule has independent Apply/Revert, width, alignment, and explicit-size handling. Empty fields inherit from earlier matching overrides/global settings; **Native** alignment and **On** explicit-size handling can explicitly replace inherited choices. Later matching overrides retain their existing precedence. Rules also appear in Overrides and are included in saved configurations.

Overrides, File Explorer Overrides, and Image Rules share fuzzy path autocomplete. Image Rules filter by Markdown note or folder and provide **Use current note**. The owner-window dropdown opens above or below as space permits, highlights matches, truncates long paths with full-path tooltips, and supports arrows, Page Up/Down, Home/End, Enter, and Escape. Only twelve results render; path indexing is deferred until the field is used.

## Callouts and layouts

Global callout style, global callout spacing, each named type, layout settings, and each advanced layout have independent Apply/Revert actions. Saving or reverting one leaves other drafts intact. New types/layouts and deletions remain drafts until their own Apply action; Revert cancels them. Existing IDs and note Markdown are preserved.

**Global callout spacing** and each **Named callout type** have shared spacing controls for outer margins, inner padding, title/body gap, and paragraph spacing. The advanced spacing group exposes directional adjustments. The spacing example switches between Reading View and Live Preview; **Separate settings by view** is optional and leaves existing shared values intact. Empty fields stay Off and show the selected view's measured native or inherited value without saving an override. Changes appear in the settings preview immediately, but affect notes only after **Apply**; **Revert** restores the last applied values.

CSS snippets and themes can intentionally take precedence. In particular, Obsidian Pro's optional `reading-view-match-editor` snippet uses `!important` on Reading View paragraph margins, so negative title/body or trailing paragraph margins cannot take effect there while that snippet is enabled. Style Controller does not override it with `!important`.

**Advanced Callout Layouts** is disabled by default. Enable it, add a Multi-column layout, then edit its Markdown identifier, column widths, gap, minimum width, wrapping, and breakpoint. The first layout uses `[!multi-column]`; later layouts use `[!multi-column1]`, `[!multi-column2]`, and so on. Each layout can be disabled, duplicated, deleted, or copied as Markdown independently. Deleting a layout removes only its styling; it never edits existing notes. Named callout presets control appearance, while layouts control structure.

The optional MCLMultiColumn snippet remains available. When it is enabled, Style Controller leaves `[!multi-column]` to MCL; custom layout identifiers can still be styled by Style Controller. Existing MCL metadata such as `wide-2`, `wide-3`, `no-wrap`, and `center-fixed` has limited support in Style Controller layouts, but other MCL-specific behaviors are not reproduced. Keep MCL enabled for notes that depend on those behaviors.

## Applied styles

The plugin uses the packaged `styles.css` for fixed rules and scoped runtime stylesheets for saved named callout types and enabled layouts. It applies scoped classes and CSS custom properties to each Markdown view, clears stale values before resolving a new file or profile, and removes its classes, properties, callout rules, and layout rules on unload.

## Code background smoke test

1. Reload Style Controller.
2. Confirm **Inline bg** has only one compact color control.
3. Confirm **Block bg** has only one compact color control.
4. Confirm no extra toggle or built-in-default description exists.
5. Confirm both show `#fafafa` and Off by default.
6. Confirm both previews retain the native Obsidian background while Off.
7. Type a custom **Inline bg** color and confirm it immediately becomes On.
8. Clear it and confirm it immediately becomes Off, shows `#fafafa` in the control, and returns to the native background.
9. Repeat for **Block bg**.
10. Test Reading view and Live Preview.
11. Restart Obsidian and confirm persistence.
12. Test light and dark themes.

## Code-block ownership diagnosis

The reproducible vault fixture is `Metadata class/Untitled 1.md`, whose fenced block begins at line 23 with `QMSE circuit`. Style Controller owns the background contribution only while the corresponding custom background is On. Off emits no plugin background variable or active class, preserving native `pre` rendering and native block-token colors. A blank Block text setting likewise emits no plugin text-color declaration, and an explicit Block text value is opt-in and scoped separately.

The code-block checks above and the automated tests validate selector ownership and configuration behavior. They do not claim a live Obsidian computed-style check.

## Heading/native syntax equivalence checklist

1. Open a Live Preview heading containing Markdown markers and inline LaTeX.
2. Capture the native appearance with Style Controller disabled.
3. Enable Style Controller with the relevant heading configuration.
4. Confirm `###` remains identical to native.
5. Confirm `$`, `H`, and other math syntax remain identical to native.
6. Confirm only intended semantic heading text changes.
7. Test inline code, links, tags, bold, and italic inside the same heading.
8. Test Reading view MathJax inside headings.
9. Turn heading color Off and confirm the entire heading becomes native.
10. Switch profiles and path overrides and confirm no stale styling.
11. Test light and dark themes.
12. Confirm code backgrounds remain native while Off and use the configured color only while On.

This checklist describes the manual equivalence checks; the release tests verify selector structure, variable cleanup, and profile isolation without claiming live UI equivalence.

## Bottom-left controls position checklist

1. Select **Native** and select **Apply**.
2. Confirm Help and Settings remain in their native position.
3. Select **Left** and select **Apply**.
4. Confirm Help and Settings move together to the left of the vault footer.
5. Confirm neither icon is obscured by the bottom status bar.
6. Confirm their internal order is unchanged.
7. Return to **Native** and confirm the original layout returns.
8. Disable Style Controller and confirm native placement returns.

The authoritative Obsidian Pro snippet contains `.workspace-drawer-vault-actions { order: -1; }`. The plugin applies that exact group-level behavior within the left sidebar vault-profile/footer area. The current vault does not enable that snippet.

## Reading/editing layout checklist

1. In **Interface**, leave **Reading/editing layout** on **Native**, select **Apply**, and confirm Reading view and Live Preview retain their native horizontal layout.
2. Select **Matched**, select **Apply**, and compare body typography, inline-title height, Properties height, H1–H6 typography, and horizontal document geometry in both views.
3. Repeat with **Readable line length** enabled and disabled, and in narrow and split panes.
4. Confirm draft changes do not affect open notes before **Apply**, and that **Revert** restores the applied choice.
5. Return to **Native**, then disable Style Controller, and confirm no matched-layout class or override remains.
6. Confirm native paragraph margins, editable blank-line height, list markers, wrapping, cursor/selection behavior, scrolling, and LaTeX Suite behavior are unchanged. Visible Markdown syntax in Live Preview can occupy horizontal space while it is being edited.

## Long text field checklist

1. At normal and narrow settings widths, enter a long font stack and confirm only its field scrolls horizontally.
2. Drag the thin track, use horizontal trackpad or Shift-wheel scrolling, and use Home, End, and arrow keys to reach the complete value.
3. Confirm short values have no track, text stays on one line, and the settings page has no horizontal overflow.
4. Clear the field and confirm the grey resolved native stack remains scrollable while the input and saved profile stay blank.
5. Confirm selection, copy, paste, Apply, Revert, focus styling, and theme-driven native-value refresh continue to work.

## Italic size equivalence checklist

1. Open `Obsidian Pro/Cambridge/RSI/QC/Direct Variational Quantum Regression model.md` and locate the sentence containing “too *coarse*”.
2. With Style Controller disabled, compare `coarse` with adjacent normal words in the same sentence.
3. Enable Style Controller without explicitly configuring italic size or font and compare again.
4. Confirm italic text keeps the same effective size and native font metrics.
5. Set only italic color, select **Apply**, and confirm size and family do not change.
6. Set an explicit italic font or size, select **Apply**, and confirm only configured geometry changes.
7. Switch profiles and path overrides and confirm no stale italic geometry remains.

## Math and LaTeX Suite checklist

1. Open the reference fixture `Test/Test 6.md` with Style Controller disabled and compare inline `$dear_all$` and display `$$\text{Dr Christopher G Lester}$$`.
2. Repeat in Live Preview with the cursor outside and inside the math, then repeat in Reading view.
3. Confirm source delimiters and math tokens use native/LaTeX Suite syntax colors and rendered MathJax is unchanged.
4. `dear_all` is not a configured LaTeX Suite trigger. Test the configured inline triggers instead: `txt` expands automatically, while `te` requires the manual snippet trigger (Tab) inside math.
5. Compare `$dear_all$` with `$ dear_all $`; whitespace does not create an unconfigured snippet.
6. Confirm Style Controller does not intercept editor input, keyboard events, or LaTeX Suite context detection.

## Note-title checklist

1. In **Headings and title**, leave Title font, size, and weight Off and select **Apply**; confirm the inline note title is native.
2. Configure Title font/size/weight and select **Apply**; confirm only the Markdown note title changes.
3. Confirm H1, tab titles, file explorer names, and breadcrumbs remain independent.
4. Edit the title or H1 controls without applying, then use **Revert** and confirm the last applied state remains.
5. Switch profiles and heading path overrides, then disable Style Controller and confirm native title styling returns.

## Privacy and network behavior

Style Controller runs locally. It does not use telemetry, analytics, remote code, remote images, or remote fonts.

## Installation

Download the release assets from GitHub and place them in `.obsidian/plugins/style-controller/`:

- `main.js`
- `manifest.json`
- `styles.css`

Then enable the plugin in Obsidian settings.

## Development

```sh
npm ci
npm run build
```

The production build writes `main.js`.

The optional browser fixtures use the active Obsidian runtime CSS, not the app bundle's fallback CSS. Set `OBSIDIAN_ASAR_PATH` to the currently loaded `obsidian-<version>.asar` before running either fixture; the spacing fixture also needs `OBSIDIAN_PRO_SNIPPETS` pointing to Pro's `.obsidian/snippets` directory so it can load the enabled snippets from `appearance.json`. These fixtures verify computed styles in headless Chrome, not interactive behavior inside Obsidian.

## License

MIT License. See [LICENSE](LICENSE).

### Match Reading View to Live Preview

**Views & Export → Match Reading View to Live Preview** offers **On — match document appearance**, **Paragraphs only (0.1.35)**, native spacing, and inheritance. It is off by default. Saved 0.1.35 paragraph matching stays paragraphs only; it never opts users into document matching. Both controls use normal Base Text profile/path overrides and Apply/Revert.

Document matching measures native Live Preview heading typography and padding under the note's resolved profile and theme. Custom H1–H6 sizes are applied to the owning CodeMirror heading line, so Obsidian's inherited semantic text size honors the profile. Document matching follows the computed text typography under that same profile. Safe top-level paragraphs, headings, tables, lists and blockquotes use source-derived boundary spacing, with one blank line by default. Table boundaries also account for the editor widget's vertical padding. Markdown files remain unchanged.

The independent **Preserve extra blank lines** option retains additional whitespace-only source lines between supported top-level blocks. It works with document matching, paragraphs only, or native spacing. Renderer section ranges and the note buffer (or the hover target's cached source) supply line positions. Ordinary soft/hard line breaks remain native. Nested content, code, display math, callouts, images/embeds, footnotes and unsupported/missing source ranges retain native boundary rendering. Extra lines inside these structures and leading/trailing blank lines are deliberately not reproduced.

This is visual matching, not pixel equivalence: editor syntax, collapsed content, footnotes, table cell editing, wrapping widths, and complex plugin widgets can differ. No MutationObservers or `!important` overrides are added. Snippet `!important` margins still take precedence. Pro's backed-up `reading-view-match-editor` snippet now excludes only full-matching annotated top-level blocks; its nested, disabled and paragraph-only behavior remains intact. Other installations should make the same narrow exclusion, or disable that snippet, instead of increasing plugin CSS priority. The plugin never edits snippets itself.

Native verification: `npm run test:reading-pro` uses the active Pro note, temporary in-memory overrides and theme styles, restores the original panes/settings, and records before/after screenshots and computed measurements. It does not save `data.json`.

Heading regression verification: `node tests/heading-size-obsidian.mjs` compares actual H1–H6 text and the separate inline document title in equal-width Pro panes, with saved and alternate profile sizes in light/dark appearance. It captures computed styles and screenshots, then restores the original note, settings and panes.

### Live Preview-matched PDF export (0.1.38)

Under **Views & Export**, set **Match PDF export to Live Preview** to **On**, then **Apply**. Use Obsidian's normal **Export to PDF** dialog. The option defaults to native export and supports the same profile/path overrides and Apply/Revert as other Base Text fields. Existing saved configurations are not opted in. Use 100% export scale for the same CSS font sizes; page size, margins and filename inclusion remain native options.

The native exporter renders the entire Markdown document, including offscreen content. Style Controller scopes the exported document to its own resolved profile, measures Live Preview typography in the application document, and reuses Reading/View matching for headings and supported top-level spacing. The separate filename title uses Live Preview's inline-title typography. Body, emphasis, tables, callouts, code, links and image settings use existing profile variables and callout/layout styles. Current light/dark appearance is retained instead of the native forced-light print palette. No editor controls or virtualized editor DOM are printed.

Intentional extra blank lines are retained between supported top-level blocks unless **Preserve extra blank lines** explicitly resolves to **Off**. Native PDF lacks renderer section ranges, so export uses cached root source ranges only when they align with the complete native output. Missing/stale/unsupported metadata falls back to native boundary spacing; it never guesses blank-line positions or inserts line breaks. Ordinary soft breaks, nested content, math, callouts, embeds and footnotes keep native Markdown semantics. Filenames and source Markdown are never edited.

Pagination stays with Chromium/Obsidian. Tables can span pages with repeated headers, paragraphs have widow/orphan protection, and headings prefer to remain with following content. Oversized unbreakable equations, exceptionally wide tables, images taller than a printable page, raw HTML, third-party widgets and forceful snippet rules can still require source layout or print-option adjustments. Different printable widths inevitably change wrapping and page breaks. Export snapshots formatting at the start; settings changes apply to the next export. No PDF monkey-patches, new rendering engine, observers, or external snippet edits are used.

Pro verification: `node tests/pdf-export-obsidian.mjs` exercises native off/on export of the reference chemistry report in an isolated tab and a temporary comprehensive fixture, restores the original note/settings/panes, and writes real PDFs plus DOM measurements. `python3 tests/pdf-render-check.py <evidence-directory>` requires PyMuPDF, renders every page, checks page bounds, figures, heading sizes/colors and complete fixture sentinels. PDF text extraction may list MathJax glyph runs in a different paint order after pagination; validation also checks their complete character inventory.

The **Views & Export** tab follows **Configurations** and groups Reading View matching, extra blank lines, and PDF matching with shared Apply/Revert actions. These remain Base Text profile fields for inheritance; path overrides expose the same choices in their own Views & Export group. Ordinary Base Text typography and its preview are unchanged.

The seven main tabs stay visible above a compact subsection row. The active main tab uses the existing purple filled style; the active subsection uses purple text and a thin underline. The rows are 5 px apart, wrap at narrow widths, and remain stationary while the settings panel scrolls. Sections without subsections hide the second row. There are no breadcrumb paths or navigation headings.

Global Defaults and Callouts initialize only their selected subsection's controls and previews. Tab buttons remain mounted while browsing within a section, and repeated selection does not rebuild the panel. Subsection selection is session state; existing saved main-section preferences, independent Apply/Revert, and unsaved-change guards remain in place. Layouts' “Pin to top” option orders it before Named Types in the Callouts subsection row. The plugin's Obsidian sidebar item remains Style Controller, and its selection is managed by Obsidian.

The single content scroller extends to the panel bottom on long pages; compact end spacing scrolls with the controls rather than reserving a blank footer. Short pages retain their natural height. `SC_EVIDENCE_DIR=<directory> node tests/settings-bottom-layout-obsidian.mjs` verifies the layout in Obsidian Pro at 620, 720, and 1000 px. `SC_EVIDENCE_DIR=<directory> node tests/settings-interactions-obsidian.mjs` checks native sidebar selection, both tab rows and active states, independent drafts, persistence, and reload; temporary test settings are restored byte-for-byte.

Independently saved settings groups have a compact Revert/Apply row at the top. Native CSS sticky positioning keeps it beneath the existing navigation while its group is in view, then releases it at the group boundary. Named callout cards retain their original responsive grid and ordinary non-sticky actions, with their own saved-state indicators. Layout-wide options and individual layout cards keep separate sticky rows and draft boundaries.

Apply/Revert report their saved state in the action row instead of stacking success popups over settings buttons. Validation and error notices remain available.


## 0.1.40 regression checks

Run `npm test`, `npm run lint`, `npm run check`, `npm run build`, and `node --check main.js`. Computed-style browser fixtures use `OBSIDIAN_ASAR_PATH` for the active Obsidian runtime; the spacing and Reading View fixtures also use `OBSIDIAN_PRO_SNIPPETS` for the active snippet directory.

With Obsidian Pro open and no unsaved settings drafts, set `SC_EVIDENCE_DIR` to a temporary directory and run `tests/settings-sticky-actions-obsidian.mjs`, `tests/named-callout-grid-obsidian.mjs`, `tests/path-autocomplete-obsidian.mjs`, `tests/settings-interactions-obsidian.mjs`, and `tests/settings-bottom-layout-obsidian.mjs` with Node. They cover 620/720/1000px layouts, first-click actions, independent drafts, persistence, and cleanup. Native settings tests snapshot the latest live `data.json` at entry and restore those exact bytes, including existing Image Rules; never substitute an older development backup.

`SC_EVIDENCE_DIR=<temporary-directory> node tests/table-images-obsidian.mjs` checks the open `Cambridge/Appendix/pKa` note without editing it, including real image/cell selection, stable dimensions, resize handles, and lightbox. The test verifies note, settings, and linked attachment bytes remain unchanged. Its optional `SC_BASELINE_CSS` records a pre-fix comparison. Keep generated screenshots, PDFs, and measurement output outside the repository.
