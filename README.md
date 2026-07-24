# Style Controller

Style Controller is an Obsidian plugin for managing reusable style profiles, path overrides, and visual settings through a native settings interface. It applies profile values as CSS custom properties consumed by the plugin's static stylesheet; it does not edit theme files, snippets, or notes.

## Safety warning

This plugin changes appearance by applying scoped CSS custom properties. Test profiles on a small set of notes before assigning broad path overrides. Most blank/default controls remove the corresponding property and allow native Obsidian or theme behavior to continue. Inline and block code backgrounds instead use the Style Controller built-in `#fafafa` background whenever their custom override is Off.

## Features

- Reusable stored style profiles, including a built-in Default profile with native styling plus `#fafafa` code backgrounds.
- Active global profile settings for typography, headings, links, tables, code, blockquotes, callouts, images, file explorer styling, and custom CSS.
- Path-specific overrides for folders, files, and path-contains matching.
- Static CSS rules with custom properties scoped to active Markdown views and matching file paths.
- Image controls for alignment, width, and whether explicit image sizes are respected.
- Status indicators for style fields: On, Off, and Error.
- Import/export workflows for stored configurations.

## Profiles and Default behavior

The Default profile keeps native Obsidian styling except that inline-code and fenced-code backgrounds use Style Controller's built-in `#fafafa`. Each code background uses one compact color control: Off displays and renders `#fafafa`, entering a custom color automatically changes it to On, and clearing the field automatically returns it to Off and `#fafafa`. Stored profiles can be applied to the global settings or used as path-specific overrides. The active profile for a note is resolved from the global settings plus matching enabled overrides in their saved order.

## Path overrides

Overrides can match folders, files, or paths containing specific text. Matching paths receive only the modules enabled for that override. Override ordering is preserved, and later matching overrides can layer additional non-blank profile values.

## Supported visual fields

Style Controller includes controls for base text, headings, links, tables, inline code, code blocks, blockquotes, callouts, images, file explorer entries, and custom CSS. Blank values produce no CSS declaration for that field; the current theme or Obsidian default remains in control.

## Section drafts and Apply/Revert

Each major settings section has one **Apply** button and one **Revert** button. Editing a control changes only that section's draft and preview; persisted settings, Markdown views, and other sections remain unchanged until **Apply** is selected. The section shows **Unsaved changes** while its draft differs from the last applied value.

**Apply** validates and saves only that section atomically, makes the saved values the new Revert baseline, updates relevant views, and shows a success notice. **Revert** restores the last successfully applied section values. Dirty sections must be applied or reverted before navigating to another settings section, applying a stored configuration, changing override structure, or leaving the settings tab. Path overrides use the same card-level draft transaction so their match settings, module switches, profile values, and file-explorer values stay isolated.

## Image controls

Image settings include alignment, width, and a control for respecting explicit image sizes. Blank image settings do not emit image CSS.

## Applied styles

The plugin uses the packaged `styles.css`; it does not create runtime stylesheets. It applies scoped classes and CSS custom properties to each Markdown view, clears stale values before resolving a new file or profile, and removes its classes and properties on unload.

## Code background smoke test

1. Reload Style Controller.
2. Confirm **Inline bg** has only one compact color control.
3. Confirm **Block bg** has only one compact color control.
4. Confirm no extra toggle or built-in-default description exists.
5. Confirm both show `#fafafa` and Off by default.
6. Confirm both previews render `#fafafa`.
7. Type a custom **Inline bg** color and confirm it immediately becomes On.
8. Clear it and confirm it immediately becomes Off and returns to `#fafafa`.
9. Repeat for **Block bg**.
10. Test Reading view and Live Preview.
11. Restart Obsidian and confirm persistence.
12. Test light and dark themes.

## Code-block ownership diagnosis

The reproducible vault fixture is `Metadata class/Untitled 1.md`, whose fenced block begins at line 23 with `QMSE circuit`. In the affected configuration, Style Controller owns the background contribution: its scoped `pre`/Live Preview code-background selectors load after native Obsidian CSS and resolve the approved Off/default `#fafafa` variable. The fix leaves the background behavior intact while keeping the native `pre code` transparency and native block-token colors. A blank Block text setting emits no plugin text-color declaration, and an explicit Block text value is opt-in and scoped separately.

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
12. Confirm code backgrounds still use the approved `#fafafa` behavior.

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

## Italic size equivalence checklist

1. Open `Obsidian Pro/Cambridge/RSI/QC/Direct Variational Quantum Regression model.md` and locate the sentence containing “too *coarse*”.
2. With Style Controller disabled, compare `coarse` with adjacent normal words in the same sentence.
3. Enable Style Controller without explicitly configuring italic size or font and compare again.
4. Confirm italic text keeps the same effective size and native font metrics.
5. Set only italic color, select **Apply**, and confirm size and family do not change.
6. Set an explicit italic font or size, select **Apply**, and confirm only configured geometry changes.
7. Switch profiles and path overrides and confirm no stale italic geometry remains.

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

## License

MIT License. See [LICENSE](LICENSE).
