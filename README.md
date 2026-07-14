# Style Controller

Style Controller is an Obsidian plugin for managing reusable style profiles, path overrides, and visual settings through a native settings interface. It generates runtime CSS inside Obsidian; it does not edit theme files, snippets, or notes.

## Safety warning

This plugin changes appearance by generating runtime CSS. Test profiles on a small set of notes before assigning broad path overrides. Blank/default controls emit no CSS declaration and allow native Obsidian or theme behavior to continue.

## Features

- Reusable stored style profiles, including a built-in Default profile for native styling.
- Active global profile settings for typography, headings, links, tables, code, blockquotes, callouts, images, file explorer styling, and custom CSS.
- Path-specific overrides for folders, files, and path-contains matching.
- Runtime CSS generation scoped to active Markdown views and matching file paths.
- Image controls for alignment, width, and whether explicit image sizes are respected.
- Status indicators for style fields: On, Off, and Error.
- Import/export workflows for stored configurations.

## Profiles and Default behavior

The Default profile represents native Obsidian styling with no Style Controller CSS. Stored profiles can be applied to the global settings or used as path-specific overrides. The active profile for a note is resolved from the global settings plus matching enabled overrides in their saved order.

## Path overrides

Overrides can match folders, files, or paths containing specific text. Matching paths receive only the modules enabled for that override. Override ordering is preserved, and later matching overrides can layer additional non-blank profile values.

## Supported visual fields

Style Controller includes controls for base text, headings, links, tables, inline code, code blocks, blockquotes, callouts, images, file explorer entries, and custom CSS. Blank values produce no CSS declaration for that field; the current theme or Obsidian default remains in control.

## Image controls

Image settings include alignment, width, and a control for respecting explicit image sizes. Blank image settings do not emit image CSS.

## Generated CSS

The plugin installs runtime style elements while enabled and removes them on unload. Generated CSS is rebuilt when layout or active Markdown views change and is scoped to Style Controller containers as narrowly as the current feature allows.

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
