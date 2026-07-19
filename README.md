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

The Default profile keeps native Obsidian styling except that inline-code and fenced-code backgrounds use Style Controller's built-in `#fafafa`. Each code background control stores a custom color independently from its On/Off state: Off renders `#fafafa`, while On renders the stored custom override. Turning Off retains the custom color so turning On again restores it. Stored profiles can be applied to the global settings or used as path-specific overrides. The active profile for a note is resolved from the global settings plus matching enabled overrides in their saved order.

## Path overrides

Overrides can match folders, files, or paths containing specific text. Matching paths receive only the modules enabled for that override. Override ordering is preserved, and later matching overrides can layer additional non-blank profile values.

## Supported visual fields

Style Controller includes controls for base text, headings, links, tables, inline code, code blocks, blockquotes, callouts, images, file explorer entries, and custom CSS. Blank values produce no CSS declaration for that field; the current theme or Obsidian default remains in control.

## Image controls

Image settings include alignment, width, and a control for respecting explicit image sizes. Blank image settings do not emit image CSS.

## Applied styles

The plugin uses the packaged `styles.css`; it does not create runtime stylesheets. It applies scoped classes and CSS custom properties to each Markdown view, clears stale values before resolving a new file or profile, and removes its classes and properties on unload.

## Code background smoke test

1. Reload Style Controller 0.1.5.
2. Confirm **Inline bg** shows `#fafafa` and Off.
3. Confirm **Block bg** shows `#fafafa` and Off.
4. Confirm both previews actually render `rgb(250, 250, 250)`.
5. Confirm real inline and fenced code also render `rgb(250, 250, 250)`.
6. Turn **Inline bg** On and change it to an obvious custom color.
7. Confirm only inline code changes.
8. Turn **Inline bg** Off.
9. Confirm it returns to `#fafafa`, not `#ffffff`.
10. Turn it On again and confirm the custom color returns.
11. Repeat for **Block bg**.
12. Restart Obsidian and confirm states persist.
13. Test Reading view and Live Preview.
14. Test light and dark themes.
15. Test two notes using different path overrides.

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
