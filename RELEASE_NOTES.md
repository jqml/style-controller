# Style Controller 0.1.39

This release brings the validated local changes developed in 0.1.35–0.1.38 to the public release, following 0.1.34.

- **Compact two-level settings navigation:** seven main tabs retain their filled selection style, with underlined contextual subsections directly below. Both selections stay visible, tabs wrap at narrow widths, and only the selected subsection's expensive controls and previews initialize. No breadcrumb paths or navigation headings.
- **Reliable settings interactions:** retain tab buttons during navigation, avoid focus-driven panel rebuilds and stale asynchronous previews, serialize saves, and prevent duplicate asynchronous actions. Correct Obsidian sidebar selection when switching to another plugin.
- **Independent Callout Apply/Revert:** global style, global spacing, each named type, layout settings, and each advanced layout save or revert separately. Other drafts, existing IDs, renaming, creation, deletion, and previews are preserved.
- **Views & Export:** Reading View matching, extra blank-line preservation, and PDF matching share a dedicated settings tab. Existing selections, profiles, path overrides, inheritance, and opt-in defaults are preserved.
- **Match Reading View to Live Preview:** optional document matching follows the resolved editor typography and supported top-level block spacing. Existing paragraph-only selections remain paragraph-only. Extra blank lines can be preserved independently without editing Markdown.
- **Correct explicitly configured H1–H6 sizes:** apply custom sizes to the owning CodeMirror heading line so semantic heading text inherits the configured value. Unconfigured headings retain native sizing; Reading View and PDF matching follow Live Preview.
- **Optional Live Preview-matched native PDF export:** preserve the resolved profile, current appearance, heading/title typography, callout spacing, and supported source gaps while retaining native complete-document rendering and pagination. Native export remains the default.
- **Natural settings scrolling:** remove the reserved empty bottom bar, retain natural short-page heights, and keep navigation stationary while long content scrolls.

Includes source-level regressions, computed-style browser fixtures, and Pro-only integration checks for matching, native PDF export, settings interactions, drafts, persistence, and layout at 620/720/1000px. Existing profile customization, overrides, saved configurations, and Page Preview styling are retained.

Matching covers supported content rather than pixel equivalence across different view or printable widths. Native semantics remain for unsupported blocks and complex widgets; strong theme/snippet overrides can still take precedence. See the README for scope and verification commands.
