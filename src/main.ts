// @ts-nocheck
import {
  Plugin,
  PluginSettingTab,
  MarkdownRenderer,
  Notice,
  Setting,
  TFolder,
  prepareFuzzySearch,
  normalizePath,
  Modal,
  setIcon
} from "obsidian";

const SETTINGS_SCHEMA_VERSION = 9;
const DEFAULT_CODE_BACKGROUND = "#fafafa";
const LEGACY_AUTOMATIC_LINK_DEFAULTS = {
  linkColor: "#00ff33",
  linkHoverColor: "#ff6b9f",
  internalLinkColor: "#6eb47c",
  externalLinkColor: "#66d9ef"
};
const LEGACY_AUTOMATIC_HEADING_DEFAULTS = {
  h1Size: "32px",
  h1Weight: "700",
  h2Size: "24px",
  h2Weight: "700",
  h3Size: "20px",
  h3Weight: "650",
  h4Size: "18px",
  h4Weight: "650",
  h5Size: "16px",
  h5Weight: "600",
  h6Size: "14px",
  h6Weight: "600"
};
const LEGACY_AUTOMATIC_CALLOUT_DEFAULTS = {
  borderWidth: "2px",
  radius: "8px",
  titleSize: "18px",
  multiColumnBorderColor: "#000000",
  multiColumnBorderWidth: "1px",
  multiColumnBorderStyle: "groove"
};
const SIZE_UNITS = ["px", "rem", "em", "%", "pt"];
const BORDER_STYLES = ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "none"];
const VALID_BORDER_STYLES = [...BORDER_STYLES, "hidden"];
const CALLOUT_SPACING_GROUPS = [
  { label: "Outer margin", prefix: "margin", selector: "" },
  { label: "Inner padding", prefix: "padding", selector: "" },
  { label: "Title padding", prefix: "titlePadding", selector: " > .callout-title" },
  { label: "Body padding", prefix: "bodyPadding", selector: " > .callout-content" }
];
const CALLOUT_SPACING_DIRECTIONS = ["Top", "Right", "Bottom", "Left"];
const CALLOUT_SPACING_FIELDS = CALLOUT_SPACING_GROUPS.flatMap(({ prefix }) =>
  CALLOUT_SPACING_DIRECTIONS.map((direction) => `${prefix}${direction}`)
).concat(["bodyFirstMarginTop", "bodyLastMarginBottom", "bodyBlockGap"]);
const CALLOUT_SPACING_COMMON = [
  ["marginTop", "Outer space above"], ["marginBottom", "Outer space below"],
  ["paddingTop", "Inner padding top"], ["paddingRight", "Inner padding right"],
  ["paddingBottom", "Inner padding bottom"], ["paddingLeft", "Inner padding left"],
  ["bodyFirstMarginTop", "Title/body gap"], ["bodyBlockGap", "Extra paragraph spacing"]
];
const CALLOUT_SPACING_ADVANCED = [
  ["marginLeft", "Outer space left"], ["marginRight", "Outer space right"],
  ["titlePaddingTop", "Title padding top"], ["titlePaddingLeft", "Title padding left"],
  ["titlePaddingRight", "Title padding right"], ["bodyPaddingLeft", "Body padding left"],
  ["bodyPaddingRight", "Body padding right"]
];
const CALLOUT_SPACING_LEGACY = [
  ["titlePaddingBottom", "Title padding bottom"], ["bodyPaddingTop", "Body padding top"],
  ["bodyPaddingBottom", "Body padding bottom"], ["bodyLastMarginBottom", "Last block bottom margin"]
];
const CALLOUT_SPACING_PREVIEW_TITLE = "Spacing preview";
const CALLOUT_SPACING_PREVIEW_BODY = "The first paragraph shows the space below the title.\n\nThe second paragraph shows the space between paragraphs.";
const CALLOUT_SPACING_VIEWS = ["reading", "live"];
const DEFAULT_LAYOUT_WIDTH = { mode: "ratio", value: "1" };
const DEFAULT_LAYOUT_OPTIONS = {
  columnCount: 2,
  widths: [{ ...DEFAULT_LAYOUT_WIDTH }, { ...DEFAULT_LAYOUT_WIDTH }],
  gap: "1em",
  minWidth: "200px",
  wrap: "wrap",
  responsive: "auto-fit",
  breakpoint: "600px"
};
const DEFAULT_ADVANCED_LAYOUTS = {
  enabled: false,
  pinToTop: false,
  layouts: []
};
const ADVANCED_LAYOUT_TEMPLATES = [{
  id: "multi-column",
  name: "Multi-column",
  markdownPrefix: "multi-column",
  isValidMarkdownId: (type) => /^multi-column(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(type),
  createOptions: () => normalizeLayoutOptions(),
  normalizeOptions: (options) => normalizeLayoutOptions(options),
  migrateLegacyOptions: (defaults, options) => materializeLegacyMultiColumnOptions(defaults, options),
  validateOptions: (options, label) => validateLayoutOptions(options, label),
  buildCss: (layout, scope) => buildSingleLayoutCss(layout, scope),
  markdownSample: (layout) => multiColumnMarkdownSample(layout),
  renderOptions: (tab, parent, layout, callouts, onChange) => tab.renderMultiColumnOptions(parent, layout.options, callouts, onChange)
}];
const LINE_HEIGHT_UNITS = ["unitless", ...SIZE_UNITS];
const HEADING_SPACE_ABOVE_UNITS = [...SIZE_UNITS];
const FONT_STYLE_VALUES = ["normal", "italic"];
const BOTTOM_LEFT_CONTROLS_POSITION_NATIVE = "native";
const BOTTOM_LEFT_CONTROLS_POSITION_LEFT = "left";
const READING_EDITING_LAYOUT_NATIVE = "native";
const READING_EDITING_LAYOUT_MATCHED = "matched";
const LEGACY_SETTINGS_ICON_POSITION_THEMEPRO = "themepro";
const DEFAULT_INTERFACE_SETTINGS = {
  bottomLeftControlsPosition: BOTTOM_LEFT_CONTROLS_POSITION_NATIVE,
  readingEditingLayout: READING_EDITING_LAYOUT_NATIVE
};
const CODE_BACKGROUND_CUSTOM_FIELDS = {
  codeBackground: {
    enabled: "codeBackgroundCustomEnabled",
    value: "codeBackgroundCustomValue"
  },
  codeBlockBackground: {
    enabled: "codeBlockBackgroundCustomEnabled",
    value: "codeBlockBackgroundCustomValue"
  }
};

const DEFAULT_PROFILE = {
  fontFamily: "",
  textSize: "",
  textWeight: "",
  boldFontFamily: "",
  boldFontStyle: "",
  boldWeight: "",
  boldColor: "",
  italicFontFamily: "",
  italicFontStyle: "",
  italicSize: "",
  italicWeight: "",
  italicColor: "",
  lineHeight: "",
  lineHeightValue: "",
  lineHeightUnit: "unitless",
  textColor: "",
  backgroundColor: "",
  accentColor: "",
  linkColor: "",
  linkHoverColor: "",
  internalLinkColor: "",
  externalLinkColor: "",
  titleFontFamily: "",
  titleSize: "",
  titleWeight: "",
  h1FontFamily: "",
  h1Size: "",
  h1Weight: "",
  h1Color: "",
  h2FontFamily: "",
  h2Size: "",
  h2Weight: "",
  h2Color: "",
  h3FontFamily: "",
  h3Size: "",
  h3Weight: "",
  h3Color: "",
  h4FontFamily: "",
  h4Size: "",
  h4Weight: "",
  h4Color: "",
  h5FontFamily: "",
  h5Size: "",
  h5Weight: "",
  h5Color: "",
  h6FontFamily: "",
  h6Size: "",
  h6Weight: "",
  h6Color: "",
  tableHeaderBackground: "",
  tableHeaderColor: "",
  tableBorderColor: "",
  tableRowAltBackground: "",
  codeFontFamily: "",
  codeBackground: "",
  codeBackgroundCustomEnabled: false,
  codeBackgroundCustomValue: DEFAULT_CODE_BACKGROUND,
  codeColor: "",
  codeBlockFontFamily: "",
  codeBlockBackground: "",
  codeBlockBackgroundCustomEnabled: false,
  codeBlockBackgroundCustomValue: DEFAULT_CODE_BACKGROUND,
  codeBlockColor: "",
  blockquoteBorderColor: "",
  blockquoteBackground: "",
  imageAlignment: "",
  imageWidth: "",
  imageRespectExplicitSize: "",
  customCss: ""
};

for (let level = 1; level <= 6; level += 1) {
  DEFAULT_PROFILE[`h${level}SpaceAboveEnabled`] = false;
  DEFAULT_PROFILE[`h${level}SpaceAboveValue`] = "0";
  DEFAULT_PROFILE[`h${level}SpaceAboveUnit`] = "px";
}

const DEFAULT_OVERRIDE_MODULES = {
  baseText: false,
  boldItalic: false,
  links: false,
  headings: false,
  tablesCodeQuotes: false,
  images: false,
  advancedCss: false,
  fileExplorer: false
};

const DEFAULT_FILE_EXPLORER_STYLE = {
  folderColor: "",
  fileColor: "",
  hoverColor: "",
  hoverBackground: "",
  activeBackground: "",
  indentLineColor: "",
  collapseIconColor: "",
  focusBorderColor: "",
  fontFamily: "",
  fontWeight: "",
  prefix: ""
};

const LEGACY_FILE_EXPLORER_PRESET_STYLE = {
  folderColor: "#a83232",
  fileColor: "#d94f4f",
  hoverColor: "#7f1d1d",
  hoverBackground: "#f4dada",
  activeBackground: "#efd4d8",
  indentLineColor: "#e9b9bf",
  collapseIconColor: "#8e44ad",
  focusBorderColor: "#d7a6ad",
  fontFamily: "SF Pro Display, Arial, sans-serif",
  fontWeight: "700",
  prefix: ""
};

const BASE_TEXT_SELECTORS = [
  ".markdown-preview-view",
  ".markdown-source-view.mod-cm6 .cm-content"
];
const NOTE_BACKGROUND_SELECTORS = [
  ".markdown-preview-view",
  ".markdown-source-view.mod-cm6"
];
const INLINE_CODE_SELECTORS = [
  ".markdown-preview-view :not(pre) > code",
  ".markdown-source-view.mod-cm6 .cm-line:not(.HyperMD-codeblock) .cm-inline-code"
];
const BLOCK_CODE_BACKGROUND_SELECTORS = [
  ".markdown-rendered pre",
  ".markdown-source-view.mod-cm6 .HyperMD-codeblock-bg"
];
const BLOCK_CODE_TEXT_SELECTORS = [
  ".markdown-rendered pre",
  ".markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock"
];

const HEADING_NATIVE_TOKEN_EXCLUSIONS = [
  ".cm-formatting",
  ".cm-formatting-header",
  ".cm-math",
  ".cm-inline-code",
  ".cm-link",
  ".cm-url",
  ".cm-hmd-internal-link",
  ".cm-hashtag",
  ".cm-tag",
  ".cm-comment",
  ".cm-html-embed",
  '[class*="cm-html-"]',
  ".cm-embed",
  ".cm-widgetBuffer",
  ".cm-foldPlaceholder",
  ".cm-hmd-frontmatter",
  ".cm-hmd-orgmode-markup",
  ".cm-property"
];

function headingSemanticTokenSuffix() {
  return `:not(${HEADING_NATIVE_TOKEN_EXCLUSIONS.join(", ")})`;
}

function headingSelectors(level) {
  return [
    `.markdown-preview-view h${level}`,
    `.markdown-source-view.mod-cm6 .cm-line.HyperMD-header-${level} > .cm-header-${level}${headingSemanticTokenSuffix()}`
  ];
}

function titleSelectors() {
  return [
    ".markdown-preview-view .inline-title:not([data-level])",
    ".markdown-source-view.mod-cm6 .inline-title:not([data-level])"
  ];
}

const EMPHASIS_SOURCE_SELECTORS = {
  bold: ".markdown-source-view.mod-cm6 .cm-strong:not(.cm-formatting)",
  italic: ".markdown-source-view.mod-cm6 .cm-em:not(.cm-formatting)"
};

function fieldDefinition(type, group, variable, selectors, property = null, options = {}) {
  return {
    type,
    group,
    variable,
    selectors,
    property,
    blankAllowed: true,
    emitsCss: true,
    ...options
  };
}

const STYLE_FIELD_REGISTRY = {
  textWeight: fieldDefinition("weight", "baseText", "--osc-text-weight", BASE_TEXT_SELECTORS, "font-weight"),
  boldFontFamily: fieldDefinition("font", "boldItalic", "--osc-bold-font-family", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "font-family"),
  boldFontStyle: fieldDefinition("style", "boldItalic", "--osc-bold-font-style", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "font-style"),
  boldWeight: fieldDefinition("weight", "boldItalic", "--osc-bold-weight", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "font-weight"),
  boldColor: fieldDefinition("color", "boldItalic", "--osc-bold-color", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "color"),
  italicFontFamily: fieldDefinition("font", "boldItalic", "--osc-italic-font-family", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-family"),
  italicFontStyle: fieldDefinition("style", "boldItalic", "--osc-italic-font-style", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-style"),
  italicSize: fieldDefinition("size", "boldItalic", "--osc-italic-size", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-size"),
  italicWeight: fieldDefinition("weight", "boldItalic", "--osc-italic-weight", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-weight"),
  italicColor: fieldDefinition("color", "boldItalic", "--osc-italic-color", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "color"),
  lineHeight: fieldDefinition("size", "baseText", "--osc-line-height", BASE_TEXT_SELECTORS, "line-height"),
  textColor: fieldDefinition("color", "baseText", "--osc-text-color", BASE_TEXT_SELECTORS, "color"),
  backgroundColor: fieldDefinition("color", "baseText", "--osc-background-color", NOTE_BACKGROUND_SELECTORS, "background-color"),
  accentColor: fieldDefinition("color", "baseText", "--interactive-accent", [], null, { selectors: [], emitsCss: false }),
  linkColor: fieldDefinition("color", "links", "--osc-link-color", [".markdown-preview-view a", ".markdown-source-view.mod-cm6 .cm-link", ".markdown-source-view.mod-cm6 .cm-url"], "color"),
  linkHoverColor: fieldDefinition("color", "links", "--osc-link-hover-color", [
    ".markdown-preview-view a:hover",
    ".markdown-preview-view .internal-link:hover",
    ".markdown-preview-view .external-link:hover",
    ".markdown-source-view.mod-cm6 .cm-link:hover",
    ".markdown-source-view.mod-cm6 .cm-hmd-internal-link:hover",
    ".markdown-source-view.mod-cm6 .cm-hmd-internal-link:hover .cm-underline",
    ".markdown-source-view.mod-cm6 .cm-link.cm-url:hover"
  ], "color"),
  internalLinkColor: fieldDefinition("color", "links", "--osc-internal-link-color", [
    ".markdown-preview-view .internal-link",
    ".markdown-source-view.mod-cm6 .cm-hmd-internal-link",
    ".markdown-source-view.mod-cm6 .cm-hmd-internal-link .cm-underline"
  ], "color"),
  externalLinkColor: fieldDefinition("color", "links", "--osc-external-link-color", [".markdown-preview-view .external-link", ".markdown-source-view.mod-cm6 .cm-link.cm-url"], "color"),
  titleFontFamily: fieldDefinition("font", "headings", "--osc-title-font-family", titleSelectors(), "font-family", { allowShortStack: true }),
  titleSize: fieldDefinition("size", "headings", "--osc-title-size", titleSelectors(), "font-size"),
  titleWeight: fieldDefinition("weight", "headings", "--osc-title-weight", titleSelectors(), "font-weight"),
  tableHeaderBackground: fieldDefinition("color", "tablesCodeQuotes", "--osc-table-header-background", [".markdown-preview-view th", ".markdown-source-view.mod-cm6 .cm-table-widget th"], "background"),
  tableHeaderColor: fieldDefinition("color", "tablesCodeQuotes", "--osc-table-header-color", [".markdown-preview-view th", ".markdown-source-view.mod-cm6 .cm-table-widget th"], "color"),
  tableBorderColor: fieldDefinition("color", "tablesCodeQuotes", "--osc-table-border-color", [
    ".markdown-preview-view table",
    ".markdown-preview-view th",
    ".markdown-preview-view td",
    ".markdown-source-view.mod-cm6 .cm-table-widget table",
    ".markdown-source-view.mod-cm6 .cm-table-widget th",
    ".markdown-source-view.mod-cm6 .cm-table-widget td"
  ], "border-color"),
  tableRowAltBackground: fieldDefinition("color", "tablesCodeQuotes", "--osc-table-row-alt-background", [".markdown-preview-view tbody tr:nth-child(even)"], "background"),
  codeFontFamily: fieldDefinition("font", "inlineCode", "--osc-code-font-family", INLINE_CODE_SELECTORS, "font-family"),
  codeBackground: fieldDefinition("color", "inlineCode", "--osc-code-background", INLINE_CODE_SELECTORS, "background-color"),
  codeColor: fieldDefinition("color", "inlineCode", "--osc-code-color", INLINE_CODE_SELECTORS, "color"),
  codeBlockFontFamily: fieldDefinition("font", "blockCode", "--osc-code-block-font-family", BLOCK_CODE_TEXT_SELECTORS, "font-family"),
  codeBlockBackground: fieldDefinition("color", "blockCode", "--osc-code-block-background", BLOCK_CODE_BACKGROUND_SELECTORS, "background-color"),
  codeBlockColor: fieldDefinition("color", "blockCode", "--osc-code-block-color", BLOCK_CODE_TEXT_SELECTORS, "color"),
  blockquoteBorderColor: fieldDefinition("color", "tablesCodeQuotes", "--osc-blockquote-border-color", [".markdown-preview-view blockquote", ".markdown-source-view.mod-cm6 .HyperMD-quote"], "border-color"),
  blockquoteBackground: fieldDefinition("color", "tablesCodeQuotes", "--osc-blockquote-background", [".markdown-preview-view blockquote", ".markdown-source-view.mod-cm6 .HyperMD-quote"], "background"),
  imageAlignment: fieldDefinition("text", "images", null, [], null, { emitsCss: false }),
  imageWidth: fieldDefinition("size", "images", null, [], null, { emitsCss: false }),
  imageRespectExplicitSize: fieldDefinition("text", "images", null, [], null, { emitsCss: false }),
  customCss: fieldDefinition("text", "advancedCss", null, [], null, { emitsCss: false })
};

for (let level = 1; level <= 6; level += 1) {
  STYLE_FIELD_REGISTRY[`h${level}FontFamily`] = fieldDefinition("font", "headings", `--osc-h${level}-font-family`, headingSelectors(level), "font-family");
  STYLE_FIELD_REGISTRY[`h${level}Size`] = fieldDefinition("size", "headings", `--osc-h${level}-size`, headingSelectors(level), "font-size");
  STYLE_FIELD_REGISTRY[`h${level}Weight`] = fieldDefinition("weight", "headings", `--osc-h${level}-weight`, headingSelectors(level), "font-weight");
  STYLE_FIELD_REGISTRY[`h${level}Color`] = fieldDefinition("color", "headings", `--osc-h${level}-color`, headingSelectors(level), "color");
}
Object.entries(STYLE_FIELD_REGISTRY).forEach(([key, meta]) => {
  meta.key = key;
});

const PROFILE_GROUP_FIELDS = Object.entries(STYLE_FIELD_REGISTRY).reduce((groups, [key, meta]) => {
  const group = meta.group === "inlineCode" || meta.group === "blockCode" ? "tablesCodeQuotes" : meta.group;
  groups[group] = groups[group] || [];
  groups[group].push(key);
  return groups;
}, {});

const HEADING_SPACE_ABOVE_FIELDS = Array.from({ length: 6 }, (_, index) => {
  const level = index + 1;
  return [
    `h${level}SpaceAboveEnabled`,
    `h${level}SpaceAboveValue`,
    `h${level}SpaceAboveUnit`
  ];
}).flat();
PROFILE_GROUP_FIELDS.headings.push(...HEADING_SPACE_ABOVE_FIELDS);
PROFILE_GROUP_FIELDS.baseText.push("lineHeightValue", "lineHeightUnit");
PROFILE_GROUP_FIELDS.tablesCodeQuotes.push(
  "codeBackgroundCustomEnabled",
  "codeBackgroundCustomValue",
  "codeBlockBackgroundCustomEnabled",
  "codeBlockBackgroundCustomValue"
);

const PROFILE_SECTION_FIELDS = {
  baseText: [
    "textWeight", "lineHeight", "lineHeightValue", "lineHeightUnit", "textColor", "backgroundColor", "accentColor"
  ],
  boldItalic: [
    "boldFontFamily", "boldFontStyle", "boldWeight", "boldColor",
    "italicFontFamily", "italicFontStyle", "italicSize", "italicWeight", "italicColor"
  ],
  headings: ["titleFontFamily", "titleSize", "titleWeight"].concat(Array.from({ length: 6 }, (_, index) => [
    `h${index + 1}FontFamily`, `h${index + 1}Size`, `h${index + 1}Weight`, `h${index + 1}Color`,
    `h${index + 1}SpaceAboveEnabled`, `h${index + 1}SpaceAboveValue`, `h${index + 1}SpaceAboveUnit`
  ]).flat()),
  links: ["linkColor", "linkHoverColor", "internalLinkColor", "externalLinkColor"],
  tables: ["tableHeaderBackground", "tableHeaderColor", "tableBorderColor", "tableRowAltBackground"],
  code: [
    "codeFontFamily", "codeBackground", "codeBackgroundCustomEnabled", "codeBackgroundCustomValue", "codeColor",
    "codeBlockFontFamily", "codeBlockBackground", "codeBlockBackgroundCustomEnabled", "codeBlockBackgroundCustomValue", "codeBlockColor"
  ],
  quotes: ["blockquoteBorderColor", "blockquoteBackground"],
  images: ["imageAlignment", "imageWidth", "imageRespectExplicitSize"]
};

const FILE_EXPLORER_FIELDS = [
  "folderColor", "fileColor", "hoverColor", "hoverBackground", "activeBackground", "indentLineColor",
  "collapseIconColor", "focusBorderColor", "fontFamily", "fontWeight", "prefix"
];

function cloneDraftValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function draftValuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

class SectionDraftManager {
  constructor() {
    this.entries = new Map();
    this.objectEntries = new WeakMap();
  }

  get(key, source) {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        key,
        value: cloneDraftValue(source),
        baseline: cloneDraftValue(source),
        dirty: false,
        updateUi: null
      };
      this.entries.set(key, entry);
    } else if (!entry.dirty) {
      entry.value = cloneDraftValue(source);
      entry.baseline = cloneDraftValue(source);
    }
    this.bind(entry);
    return entry;
  }

  bind(entry) {
    const seen = new Set();
    const visit = (value) => {
      if (!value || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      this.objectEntries.set(value, entry);
      Object.values(value).forEach(visit);
    };
    visit(entry.value);
  }

  mark(value) {
    const entry = this.objectEntries.get(value);
    if (!entry) return null;
    entry.dirty = !draftValuesEqual(entry.value, entry.baseline);
    entry.updateUi?.();
    return entry;
  }

  hasDirty() {
    return [...this.entries.values()].some((entry) => entry.dirty);
  }

  dirtyEntries() {
    return [...this.entries.values()].filter((entry) => entry.dirty);
  }

  revert(key, source) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    entry.value = cloneDraftValue(source);
    entry.baseline = cloneDraftValue(source);
    entry.dirty = false;
    this.bind(entry);
    entry.updateUi?.();
    return entry;
  }

  remove(key) {
    this.entries.delete(key);
  }
}

function validateProfileSection(profile, fields) {
  const errors = [];
  if (fields.includes("lineHeightValue") && hasActiveValue(profile.lineHeightValue)) {
    if (!isValidLineHeightValue(profile.lineHeightValue)) errors.push("Line height must be a finite number greater than zero");
    if (!LINE_HEIGHT_UNITS.includes(profile.lineHeightUnit)) errors.push(`Line height unit must be ${LINE_HEIGHT_UNITS.join(", ")}`);
  }
  fields.forEach((field) => {
    const value = profile[field];
    const meta = STYLE_FIELD_REGISTRY[field];
    if (!meta || value === undefined || value === null || String(value).trim() === "") return;
    if (meta.type === "color" && !normalizeHexColor(value)) errors.push(`${field} must be a valid hex color`);
    if (meta.type === "font" && !validateFont(value, meta).valid) errors.push(`${field} must be a valid font family`);
    if (meta.type === "style" && !normalizeFontStyle(value)) errors.push(`${field} must be normal or italic`);
    if (meta.type === "weight" && !validateFontWeight(value).valid) errors.push(`${field} must be a valid font weight`);
    if (meta.type === "size" && !normalizeCssSizeText(value)) errors.push(`${field} must be a valid CSS size`);
  });
  for (let level = 1; level <= 6; level += 1) {
    const enabledField = `h${level}SpaceAboveEnabled`;
    if (!fields.includes(enabledField) || profile[enabledField] !== true) continue;
    const value = String(profile[`h${level}SpaceAboveValue`] ?? "").trim();
    const unit = String(profile[`h${level}SpaceAboveUnit`] ?? "").trim();
    if (!isValidHeadingSpaceAboveValue(value)) errors.push(`H${level} Space above must be a finite non-negative number`);
    if (!HEADING_SPACE_ABOVE_UNITS.includes(unit)) errors.push(`H${level} Space above unit must be ${HEADING_SPACE_ABOVE_UNITS.join(", ")}`);
  }
  Object.entries(CODE_BACKGROUND_CUSTOM_FIELDS).forEach(([field, stateFields]) => {
    if (!fields.includes(field) || profile[stateFields.enabled] !== true) return;
    if (!normalizeHexColor(profile[stateFields.value])) errors.push(`${field} custom value must be a valid hex color`);
  });
  return errors;
}

function validateCalloutSection(callouts) {
  const errors = [];
  ["borderWidth", "radius", "titleSize", "multiColumnBorderWidth"].forEach((field) => {
    if (hasActiveValue(callouts[field]) && !normalizeCssSizeText(callouts[field])) errors.push(`${field} must be a valid CSS size`);
  });
  errors.push(...validateCalloutSpacingValues(callouts, "Global callout"));
  ["multiColumnBorderColor"].forEach((field) => {
    if (hasActiveValue(callouts[field]) && !normalizeHexColor(callouts[field])) errors.push(`${field} must be a valid hex color`);
  });
  (callouts.presets || []).forEach((preset, index) => {
    errors.push(...validateCalloutSpacingValues(preset, `Preset ${index + 1}`));
    ["color", "titleColor", "backgroundColor"].forEach((field) => {
      if (hasActiveValue(preset[field]) && !normalizeHexColor(preset[field])) errors.push(`preset ${index + 1} ${field} must be a valid hex color`);
    });
  });
  errors.push(...validateAdvancedLayouts(callouts.advancedLayouts));
  return errors;
}

function validateCalloutSpacingValues(settings, label) {
  const errors = [];
  for (const [mode, values] of [["shared", settings], ...CALLOUT_SPACING_VIEWS.map((view) => [view, settings?.spacingByView?.[view]])]) {
    CALLOUT_SPACING_FIELDS.forEach((field) => {
      if (hasActiveValue(values?.[field]) && !validCalloutSpacingValue(field, values[field])) {
        errors.push(`${label} ${mode} ${field} must be a valid CSS size (padding cannot be negative)`);
      }
    });
  }
  return errors;
}

function validateFileExplorerSection(style) {
  const errors = [];
  FILE_EXPLORER_FIELDS.filter((field) => field.endsWith("Color") || field.endsWith("Background")).forEach((field) => {
    if (hasActiveValue(style[field]) && !normalizeHexColor(style[field])) errors.push(`${field} must be a valid hex color`);
  });
  if (hasActiveValue(style.fontFamily) && !validateFont(style.fontFamily).valid) errors.push("fontFamily must be a valid font family");
  if (hasActiveValue(style.fontWeight) && !validateFontWeight(style.fontWeight).valid) errors.push("fontWeight must be a valid font weight");
  return errors;
}

function validateOverrideSection(override) {
  const errors = [];
  if (!hasActiveValue(override.name)) errors.push("override name is required");
  if (!hasActiveValue(override.pattern)) errors.push("path pattern is required");
  errors.push(...validateProfileSection(override.profile || {}, Object.keys(STYLE_FIELD_REGISTRY)));
  errors.push(...validateFileExplorerSection(override.fileExplorer || {}));
  return errors;
}

async function applyDraftAtomically({ draft, normalize, validate, commit, persist, rollback }) {
  const candidate = normalize(cloneDraftValue(draft));
  const errors = validate(candidate);
  if (errors.length) return { applied: false, errors, candidate };
  try {
    commit(candidate);
    await persist();
    return { applied: true, candidate };
  } catch (error) {
    rollback?.();
    throw error;
  }
}

const DEFAULT_SETTINGS = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  enabled: true,
  activeSettingsTab: "global",
  interface: DEFAULT_INTERFACE_SETTINGS,
  global: DEFAULT_PROFILE,
  callouts: {
    advancedLayouts: DEFAULT_ADVANCED_LAYOUTS,
    ...Object.fromEntries(CALLOUT_SPACING_FIELDS.map((field) => [field, ""])),
    spacingByView: { enabled: false, reading: {}, live: {} },
    borderWidth: "",
    radius: "",
    titleSize: "",
    titleFontFamily: "",
    previewTitle: "Global callout preview",
    previewBody: "ss",
    multiColumnBorderColor: "",
    multiColumnBorderWidth: "",
    multiColumnBorderStyle: "",
    presets: [
      { type: "email", color: "#008293", titleColor: "#008293", backgroundColor: "#ecf6f3", icon: "lucide-mail", hideIcon: false },
      { type: "smartphone-nfc", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-smartphone-nfc", hideIcon: false },
      { type: "phone", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-phone", hideIcon: false },
      { type: "location", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-map-pin", hideIcon: false },
      { type: "book-check", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-book-check", hideIcon: false },
      { type: "mail", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "mail", hideIcon: false },
      { type: "white", color: "#008293", titleColor: "#0b0029", backgroundColor: "#ffffff", icon: "none", hideIcon: true },
      { type: "std", color: "#008293", titleColor: "#30005f", backgroundColor: "#ffffff", icon: "none", hideIcon: true }
    ]
  },
  storedConfigurations: [],
  overrides: []
};

const OBSIDIAN_PRO_CONFIGURATION = {
  id: "builtin-obsidian-pro",
  name: "Obsidian Pro",
  description: "Imported from the Obsidian Pro vault snippets that map to Style Controller settings.",
  data: {
    enabled: true,
    global: {
      ...DEFAULT_PROFILE,
      fontFamily: "",
      textSize: "",
      textWeight: "",
      boldWeight: "500",
      italicFontFamily: "Times New Roman, Times, serif",
      italicSize: "18px",
      italicWeight: "400",
      italicColor: "#ac38de",
      lineHeight: "",
      linkColor: "#1804f3",
      linkHoverColor: "#0aa1ff",
      internalLinkColor: "#1804f3",
      externalLinkColor: "#1804f3",
      titleFontFamily: "Georgia, sans-serif",
      titleSize: "40px",
      titleWeight: "400",
      h1FontFamily: "Lucida Handwriting, cursive, serif",
      h1Size: "30px",
      h1Weight: "700",
      h1Color: "#02001f",
      h2FontFamily: "Georgia, serif, sans-serif",
      h2Size: "24px",
      h2Weight: "700",
      h2Color: "#a63871",
      h3FontFamily: "SF Pro Display, Inter, sans-serif",
      h3Size: "22px",
      h3Weight: "650",
      h3Color: "#08005c",
      h4FontFamily: "SF Pro Display, Inter, sans-serif",
      h4Size: "20px",
      h4Weight: "650",
      h4Color: "#046c06",
      h5FontFamily: "",
      h5Size: "19px",
      h5Weight: "600",
      h5Color: "#db5d1e",
      h6FontFamily: "SF Pro Display, Inter, sans-serif",
      h6Size: "18px",
      h6Weight: "600",
      h6Color: "#750000",
      codeFontFamily: "SFMono-Regular, Consolas, monospace",
      codeBackground: "#e0efff",
      codeBackgroundCustomEnabled: true,
      codeBackgroundCustomValue: "#e0efff",
      codeColor: "#1f2328",
      codeBlockFontFamily: "",
      codeBlockBackground: DEFAULT_CODE_BACKGROUND,
      codeBlockBackgroundCustomEnabled: false,
      codeBlockBackgroundCustomValue: DEFAULT_CODE_BACKGROUND,
      codeBlockColor: "",
      tableHeaderBackground: "",
      tableHeaderColor: "",
      tableBorderColor: "",
      tableRowAltBackground: "",
      blockquoteBorderColor: "",
      blockquoteBackground: ""
    },
    callouts: {
      borderWidth: "2px",
      radius: "8px",
      titleSize: "18px",
      titleFontFamily: "",
      previewTitle: "Global callout preview",
      previewBody: "ss",
      multiColumnBorderColor: "#000000",
      multiColumnBorderWidth: "1px",
      multiColumnBorderStyle: "groove",
      presets: [
        { type: "email", color: "#008293", titleColor: "#008293", backgroundColor: "#ecf6f3", icon: "lucide-mail", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "smartphone-nfc", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-smartphone-nfc", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "phone", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-phone", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "location", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-map-pin", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "book-check", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "lucide-book-check", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "mail", color: "#008293", titleColor: "", backgroundColor: "#ecf6f3", icon: "mail", hideIcon: false, previewTitle: "Hello", previewBody: "ss" },
        { type: "white", color: "#008293", titleColor: "#0b0029", backgroundColor: "#ffffff", icon: "none", hideIcon: true, previewTitle: "Hello", previewBody: "ss" },
        { type: "std", color: "#008293", titleColor: "#30005f", backgroundColor: "#ffffff", icon: "none", hideIcon: true, previewTitle: "Hello", previewBody: "ss" }
      ]
    },
    overrides: []
  }
};

const NATIVE_DEFAULT_CONFIGURATION = {
  id: "builtin-native-default",
  name: "Default",
  description: "Native Obsidian styling with no Style Controller note-property overrides.",
  data: createNativeConfigurationData()
};

const PROFILE_FIELDS = Object.entries(STYLE_FIELD_REGISTRY)
  .filter(([, meta]) => meta.variable)
  .map(([key, meta]) => [key, meta.variable]);

const STYLE_SCOPE_CLASS = "osc-style-scope";
const STYLE_FIELD_ACTIVE_CLASS_PREFIX = "style-controller-field-";
const STYLE_FIELD_ACTIVE_CLASS_SUFFIX = "-active";
const STYLE_IMAGE_ALIGNMENT_CLASSES = [
  "style-controller-image-align-left",
  "style-controller-image-align-center",
  "style-controller-image-align-right"
];
const STYLE_IMAGE_WIDTH_CLASS = "style-controller-image-width";
const STYLE_IMAGE_RESPECT_EXPLICIT_CLASS = "style-controller-respect-explicit-image-size";
const STYLE_IMAGE_IGNORE_EXPLICIT_CLASS = "style-controller-ignore-explicit-image-size";
const STYLE_HEADING_COLOR_ACTIVE_CLASS = "style-controller-heading-color-active";
const STYLE_HEADING_COLOR_CLASSES = Array.from({ length: 6 }, (_, index) => `style-controller-h${index + 1}-color-active`);
const STYLE_HEADING_SPACE_ABOVE_CLASSES = Array.from(
  { length: 6 },
  (_, index) => `style-controller-h${index + 1}-space-above-active`
);
const STYLE_HEADING_SPACE_ABOVE_VARIABLES = Array.from(
  { length: 6 },
  (_, index) => `--osc-h${index + 1}-space-above`
);
const STYLE_TITLE_FONT_ACTIVE_CLASS = "style-controller-title-font-active";
const STYLE_TITLE_SIZE_ACTIVE_CLASS = "style-controller-title-size-active";
const STYLE_TITLE_WEIGHT_ACTIVE_CLASS = "style-controller-title-weight-active";
const STYLE_TITLE_ACTIVE_CLASSES = [
  STYLE_TITLE_FONT_ACTIVE_CLASS,
  STYLE_TITLE_SIZE_ACTIVE_CLASS,
  STYLE_TITLE_WEIGHT_ACTIVE_CLASS
];
const STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS = "style-controller-code-block-color-active";
const STYLE_BOLD_FONT_ACTIVE_CLASS = "style-controller-bold-font-active";
const STYLE_BOLD_STYLE_ACTIVE_CLASS = "style-controller-bold-style-active";
const STYLE_BOLD_WEIGHT_ACTIVE_CLASS = "style-controller-bold-weight-active";
const STYLE_BOLD_COLOR_ACTIVE_CLASS = "style-controller-bold-color-active";
const STYLE_ITALIC_FONT_ACTIVE_CLASS = "style-controller-italic-font-active";
const STYLE_ITALIC_STYLE_ACTIVE_CLASS = "style-controller-italic-style-active";
const STYLE_ITALIC_SIZE_ACTIVE_CLASS = "style-controller-italic-size-active";
const STYLE_ITALIC_WEIGHT_ACTIVE_CLASS = "style-controller-italic-weight-active";
const STYLE_ITALIC_COLOR_ACTIVE_CLASS = "style-controller-italic-color-active";
const STYLE_EMPHASIS_ACTIVE_CLASSES = [
  STYLE_BOLD_FONT_ACTIVE_CLASS,
  STYLE_BOLD_STYLE_ACTIVE_CLASS,
  STYLE_BOLD_WEIGHT_ACTIVE_CLASS,
  STYLE_BOLD_COLOR_ACTIVE_CLASS,
  STYLE_ITALIC_FONT_ACTIVE_CLASS,
  STYLE_ITALIC_STYLE_ACTIVE_CLASS,
  STYLE_ITALIC_SIZE_ACTIVE_CLASS,
  STYLE_ITALIC_WEIGHT_ACTIVE_CLASS,
  STYLE_ITALIC_COLOR_ACTIVE_CLASS
];
const STYLE_PROFILE_FIELD_ACTIVE_CLASSES = PROFILE_FIELDS
  .filter(([field]) => STYLE_FIELD_REGISTRY[field]?.selectors?.length)
  .map(([field]) => styleFieldActiveClass(field));
const STYLE_CALLOUT_BORDER_WIDTH_ACTIVE_CLASS = "style-controller-callout-border-width-active";
const STYLE_CALLOUT_RADIUS_ACTIVE_CLASS = "style-controller-callout-radius-active";
const STYLE_CALLOUT_TITLE_SIZE_ACTIVE_CLASS = "style-controller-callout-title-size-active";
const STYLE_CALLOUT_TITLE_FONT_ACTIVE_CLASS = "style-controller-callout-title-font-active";
const STYLE_CALLOUT_MULTI_COLUMN_BORDER_ACTIVE_CLASS = "style-controller-callout-multi-column-border-active";
const STYLE_CALLOUT_ACTIVE_CLASSES = [
  STYLE_CALLOUT_BORDER_WIDTH_ACTIVE_CLASS,
  STYLE_CALLOUT_RADIUS_ACTIVE_CLASS,
  STYLE_CALLOUT_TITLE_SIZE_ACTIVE_CLASS,
  STYLE_CALLOUT_TITLE_FONT_ACTIVE_CLASS,
  STYLE_CALLOUT_MULTI_COLUMN_BORDER_ACTIVE_CLASS
];
const CALLOUT_PRESET_STYLE_ID = "style-controller-callout-presets";
const ADVANCED_LAYOUT_STYLE_ID = "style-controller-advanced-callout-layouts";
const CALLOUT_PREVIEW_HIDE_ICON_CLASS = "style-controller-preview-hide-callout-icon";
const STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS = "style-controller-bottom-left-controls-left";
const STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS = "style-controller-matched-document-layout";
const LEGACY_STYLE_SETTINGS_ICON_THEMEPRO_CLASS = "style-controller-settings-icon-themepro";
const THEMEPRO_ORIGINAL_SELECTOR = ".workspace-drawer-vault-actions";
const THEMEPRO_ORIGINAL_ORDER = -1;
const BOTTOM_LEFT_CONTROLS_LEFT_SELECTOR = THEMEPRO_ORIGINAL_SELECTOR;
const FILE_EXPLORER_TARGET_CLASS = "style-controller-file-explorer-target";
const FILE_EXPLORER_FOLDER_CLASS = "style-controller-file-explorer-folder";
const FILE_EXPLORER_FILE_CLASS = "style-controller-file-explorer-file";
const FILE_EXPLORER_FIELD_VARIABLES = {
  fontFamily: "--style-controller-file-explorer-font-family",
  fontWeight: "--style-controller-file-explorer-font-weight",
  folderColor: "--style-controller-file-explorer-folder-color",
  fileColor: "--style-controller-file-explorer-file-color",
  hoverColor: "--style-controller-file-explorer-hover-color",
  hoverBackground: "--style-controller-file-explorer-hover-background",
  activeBackground: "--style-controller-file-explorer-active-background",
  indentLineColor: "--style-controller-file-explorer-indent-line-color",
  collapseIconColor: "--style-controller-file-explorer-collapse-icon-color",
  focusBorderColor: "--style-controller-file-explorer-focus-border-color"
};
const FILE_EXPLORER_FIELD_ACTIVE_CLASSES = Object.fromEntries(
  Object.keys(FILE_EXPLORER_FIELD_VARIABLES).map((field) => [
    field,
    `style-controller-file-explorer-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-active`
  ])
);
const FILE_EXPLORER_CLASSES = [
  FILE_EXPLORER_TARGET_CLASS,
  FILE_EXPLORER_FOLDER_CLASS,
  FILE_EXPLORER_FILE_CLASS,
  ...Object.values(FILE_EXPLORER_FIELD_ACTIVE_CLASSES)
];
const FILE_EXPLORER_VARIABLES = Object.values(FILE_EXPLORER_FIELD_VARIABLES);
function toggleElementClass(element, className, enabled) {
  if (!element) return;
  if (typeof element.toggleClass === "function") {
    element.toggleClass(className, enabled);
    return;
  }
  element.classList?.toggle(className, enabled);
}

function applyInterfaceStateClasses(element, interfaceSettings) {
  const settings = normalizeInterfaceSettings(interfaceSettings);
  toggleElementClass(
    element,
    STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS,
    settings.bottomLeftControlsPosition === BOTTOM_LEFT_CONTROLS_POSITION_LEFT
  );
  toggleElementClass(element, LEGACY_STYLE_SETTINGS_ICON_THEMEPRO_CLASS, false);
}

function clearInterfaceStateClasses(element) {
  toggleElementClass(element, STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS, false);
  toggleElementClass(element, LEGACY_STYLE_SETTINGS_ICON_THEMEPRO_CLASS, false);
}

function applyDocumentLayoutStateClass(element, interfaceSettings) {
  const settings = normalizeInterfaceSettings(interfaceSettings);
  toggleElementClass(
    element,
    STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS,
    settings.readingEditingLayout === READING_EDITING_LAYOUT_MATCHED
  );
}
const SIZE_FIELDS = new Set([
  ...Object.entries(STYLE_FIELD_REGISTRY)
    .filter(([, meta]) => meta.type === "size")
    .map(([key]) => key),
  "calloutBorderWidth",
  "calloutRadius",
  "calloutTitleSize",
  "calloutMultiColumnBorderWidth"
]);
const COLOR_FIELDS = new Set([
  ...Object.entries(STYLE_FIELD_REGISTRY)
    .filter(([, meta]) => meta.type === "color")
    .map(([key]) => key),
  "calloutColor",
  "calloutTitleColor",
  "calloutBackgroundColor",
  "calloutMultiColumnBorderColor"
]);
const FONT_FIELDS = new Set([
  ...Object.entries(STYLE_FIELD_REGISTRY)
    .filter(([, meta]) => meta.type === "font")
    .map(([key]) => key),
  "calloutTitleFontFamily"
]);
const FONT_VARIABLES = new Set([
  ...Object.values(STYLE_FIELD_REGISTRY)
    .filter((meta) => meta.type === "font" && meta.variable)
    .map((meta) => meta.variable)
]);
const FONT_WEIGHT_FIELDS = new Set([
  ...Object.entries(STYLE_FIELD_REGISTRY)
    .filter(([, meta]) => meta.type === "weight")
    .map(([key]) => key),
  "fontWeight"
]);
const FONT_SUGGESTIONS = [
  "inherit",
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "Avenir Next, Arial, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, Times New Roman, serif",
  "Inter, Arial, sans-serif",
  "JetBrains Mono, Menlo, monospace",
  "Menlo, Monaco, monospace",
  "Roboto, Arial, sans-serif",
  "Times New Roman, Georgia, serif"
];

class ConfirmationModal extends Modal {
  constructor(app, title, message, confirmText) {
    super(app);
    this.titleText = title;
    this.message = message;
    this.confirmText = confirmText;
    this.result = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new Setting(contentEl).setName(this.titleText).setHeading();
    contentEl.createDiv({ text: this.message, cls: "style-controller-confirm-message" });
    new Setting(contentEl)
      .addButton((button) => button
        .setButtonText("Cancel")
        .onClick(() => this.close()))
      .addButton((button) => button
        .setButtonText(this.confirmText)
        .setCta()
        .onClick(() => {
          this.result = true;
          this.close();
        }));
  }
}

function confirmWithModal(app, title, message, confirmText = "Confirm") {
  return new Promise((resolve) => {
    const modal = new ConfirmationModal(app, title, message, confirmText);
    modal.onClose = () => resolve(modal.result);
    modal.open();
  });
}

class LayoutTemplateModal extends Modal {
  constructor(app, onSelect) {
    super(app);
    this.onSelect = onSelect;
  }

  onOpen() {
    this.contentEl.empty();
    new Setting(this.contentEl).setName("Add callout layout").setHeading();
    let template = ADVANCED_LAYOUT_TEMPLATES[0].id;
    new Setting(this.contentEl)
      .setName("Template")
      .addDropdown((dropdown) => {
        ADVANCED_LAYOUT_TEMPLATES.forEach((definition) => dropdown.addOption(definition.id, definition.name));
        dropdown.setValue(template).onChange((value) => { template = value; });
      });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((button) => button.setButtonText("Add layout").setCta().onClick(() => {
        this.onSelect(template);
        this.close();
      }));
  }
}

export default class StyleControllerPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    warnUnsafeStylePatterns(this.settings);
    this.settingTab = new StyleControllerSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.registerEvent(this.app.workspace.on("layout-change", () => this.applyStyles()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.applyStyles()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyStyles()));
    this.registerEvent(this.app.workspace.on("css-change", () => {
      this.applyStyles();
      this.settingTab?.refreshNativeDefaults();
    }));
    this.app.workspace.onLayoutReady(() => this.applyStyles());
  }

  onunload() {
    this.removeStyles();
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = normalizeSettings(loaded);
    if (Number(loaded?.schemaVersion || 0) < SETTINGS_SCHEMA_VERSION) {
      await this.saveData(this.settings);
    }
  }

  async saveSettings() {
    this.settings = normalizeSettings(this.settings);
    await this.saveData(this.settings);
    this.applyStyles();
  }

  installBaseStyles() {
    this.applyStyles();
  }

  removeStyles() {
    nativeSemanticProbeScope = null;
    nativeSemanticProbeUsesReadingView = false;
    const presetTypes = this.calloutPresetIconTypes || new Set();
    this.calloutPresetStyleEls?.forEach((style) => style.remove());
    this.calloutPresetStyleEls?.clear();
    this.advancedLayoutStyleEls?.forEach((style) => style.remove());
    this.advancedLayoutStyleEls?.clear();
    this.calloutPresetIconTypes = new Set();
    refreshCalloutIcons(this.getMarkdownContainers(), presetTypes);
    const interfaceRoot = this.getInterfaceRoot();
    clearInterfaceStateClasses(interfaceRoot);
    this.getMarkdownContainers().forEach((container) => {
      cleanScopeClasses(container);
      container.classList.remove(
        STYLE_SCOPE_CLASS,
        ...STYLE_PROFILE_FIELD_ACTIVE_CLASSES,
        ...STYLE_CALLOUT_ACTIVE_CLASSES,
        ...STYLE_IMAGE_ALIGNMENT_CLASSES,
        STYLE_IMAGE_WIDTH_CLASS,
        STYLE_IMAGE_RESPECT_EXPLICIT_CLASS,
        STYLE_IMAGE_IGNORE_EXPLICIT_CLASS,
        STYLE_HEADING_COLOR_ACTIVE_CLASS,
        ...STYLE_HEADING_COLOR_CLASSES,
        ...STYLE_HEADING_SPACE_ABOVE_CLASSES,
        ...STYLE_TITLE_ACTIVE_CLASSES,
        STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS,
        ...STYLE_EMPHASIS_ACTIVE_CLASSES,
        STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS
      );
      clearProfileCssVariables(container);
      container.removeAttribute("data-osc-profile");
    });
    this.clearFileExplorerStyles();
  }

  getInterfaceRoot() {
    const rootDocument = this.app?.workspace?.containerEl?.ownerDocument
      || (typeof document !== "undefined" ? document : null);
    return rootDocument?.body || rootDocument?.documentElement || null;
  }

  applyStyles() {
    applyInterfaceStateClasses(this.getInterfaceRoot(), this.settings?.interface);
    const markdownViews = this.getMarkdownViews();
    const activeLeaf = this.app.workspace.getMostRecentLeaf?.();
    const nativeProbeView = (
      markdownViews.find((view) => view.leaf === activeLeaf)
      || markdownViews.find((view) => view.containerEl?.isConnected)
    );
    nativeSemanticProbeScope = nativeProbeView?.containerEl || null;
    nativeSemanticProbeUsesReadingView = nativeProbeView?.currentMode?.type === "preview";
    markdownViews.forEach((view, index) => {
      const file = view.file;
      const container = view.containerEl;
      const scopeClass = `osc-scope-${index}`;
      cleanScopeClasses(container);
      container.classList.remove(
        STYLE_SCOPE_CLASS,
        ...STYLE_PROFILE_FIELD_ACTIVE_CLASSES,
        ...STYLE_CALLOUT_ACTIVE_CLASSES,
        ...STYLE_IMAGE_ALIGNMENT_CLASSES,
        STYLE_IMAGE_WIDTH_CLASS,
        STYLE_IMAGE_RESPECT_EXPLICIT_CLASS,
        STYLE_IMAGE_IGNORE_EXPLICIT_CLASS,
        STYLE_HEADING_COLOR_ACTIVE_CLASS,
        ...STYLE_HEADING_COLOR_CLASSES,
        ...STYLE_HEADING_SPACE_ABOVE_CLASSES,
        ...STYLE_TITLE_ACTIVE_CLASSES,
        ...STYLE_EMPHASIS_ACTIVE_CLASSES,
        STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS,
        STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS
      );
      clearProfileCssVariables(container);
      container.removeAttribute("data-osc-profile");
      if (!file) return;

      const match = this.getProfileForPath(file.path);
      container.classList.add(STYLE_SCOPE_CLASS, scopeClass);
      applyDocumentLayoutStateClass(container, this.settings?.interface);
      container.setAttribute("data-osc-profile", match.name);
      applyProfileCssVariables(container, match.profile);
      applyProfileStateClasses(container, match.profile);
      applyCalloutCssVariables(container, this.settings.callouts);
    });
    this.syncCalloutPresetStyles(markdownViews);
    this.syncAdvancedLayoutStyles(markdownViews);
    this.applyFileExplorerStyles();
  }

  isMclSnippetEnabled() {
    return this.app.customCss?.enabledSnippets?.has("MCLMultiColumn") === true;
  }

  syncAdvancedLayoutStyles(markdownViews) {
    const mainDocument = this.app.workspace.containerEl?.ownerDocument
      || (typeof document !== "undefined" ? document : null);
    if (!mainDocument) return;
    const css = buildAdvancedLayoutCss(this.settings.callouts.advancedLayouts, this.isMclSnippetEnabled());
    const documents = new Set([mainDocument, ...markdownViews.map((view) => view.containerEl?.ownerDocument).filter(Boolean)]);
    this.advancedLayoutStyleEls ||= new Map();
    this.advancedLayoutStyleEls.forEach((style, ownerDocument) => {
      if (css && documents.has(ownerDocument)) return;
      style.remove();
      this.advancedLayoutStyleEls.delete(ownerDocument);
    });
    if (!css) return;
    for (const ownerDocument of documents) {
      let style = this.advancedLayoutStyleEls.get(ownerDocument);
      if (!style?.isConnected) {
        style = ownerDocument.createElement("style");
        style.id = ADVANCED_LAYOUT_STYLE_ID;
        ownerDocument.head.appendChild(style);
        this.advancedLayoutStyleEls.set(ownerDocument, style);
      }
      if (style.textContent !== css) style.textContent = css;
    }
  }

  syncCalloutPresetStyles(markdownViews) {
    const mainDocument = this.app.workspace.containerEl?.ownerDocument
      || (typeof document !== "undefined" ? document : null);
    if (!mainDocument) return;
    const presets = this.settings.callouts.presets;
    const globalSelector = ".osc-style-scope:not(.osc-callout-preview) .callout";
    const css = [
      buildCalloutSpacingCss(this.settings.callouts, globalSelector),
      buildCalloutViewSpacingCss(this.settings.callouts),
      buildCalloutPresetCss(presets)
    ].filter(Boolean).join("\n");
    const oldTypes = this.calloutPresetIconTypes || new Set();
    const nextTypes = calloutPresetIconTypes(presets);
    const documents = new Set([mainDocument, ...markdownViews.map((view) => view.containerEl?.ownerDocument).filter(Boolean)]);
    this.calloutPresetStyleEls ||= new Map();
    let changed = false;
    this.calloutPresetStyleEls.forEach((style, ownerDocument) => {
      if (css && documents.has(ownerDocument)) return;
      style.remove();
      this.calloutPresetStyleEls.delete(ownerDocument);
      changed = true;
    });
    if (css) for (const ownerDocument of documents) {
      let style = this.calloutPresetStyleEls.get(ownerDocument);
      if (!style?.isConnected) {
        style = ownerDocument.createElement("style");
        style.id = CALLOUT_PRESET_STYLE_ID;
        ownerDocument.head.appendChild(style);
        this.calloutPresetStyleEls.set(ownerDocument, style);
        changed = true;
      }
      if (style.textContent !== css) {
        style.textContent = css;
        changed = true;
      }
    }
    if (changed) refreshCalloutIcons(markdownViews.map((view) => view.containerEl), new Set([...oldTypes, ...nextTypes]));
    this.calloutPresetIconTypes = nextTypes;
  }

  clearFileExplorerStyles() {
    const root = this.app.workspace.containerEl?.ownerDocument || document;
    root.querySelectorAll(`.${FILE_EXPLORER_TARGET_CLASS}`).forEach((element) => {
      FILE_EXPLORER_CLASSES.forEach((className) => element.removeClass(className));
      FILE_EXPLORER_VARIABLES.forEach((variable) => setCssVariable(element, variable, ""));
      if (element.classList.contains("nav-folder-title")) {
        applyFileExplorerIndentGuide(element, { indentLineColor: "" });
      }
      element.removeAttribute("data-style-controller-prefix");
    });
  }

  applyFileExplorerStyles() {
    this.clearFileExplorerStyles();
    const root = this.app.workspace.containerEl?.ownerDocument || document;
    const titleElements = root.querySelectorAll(".nav-folder-title[data-path], .nav-file-title[data-path]");
    titleElements.forEach((element) => {
      const path = element.getAttribute("data-path") || "";
      const override = this.settings.overrides.find((candidate) => (
        candidate.enabled
        && candidate.modules?.fileExplorer
        && candidate.pattern
        && matchesOverride(path, candidate)
      ));
      if (!override) return;
      const style = normalizeFileExplorerStyle(override.fileExplorer);
      element.addClass(FILE_EXPLORER_TARGET_CLASS);
      element.toggleClass(FILE_EXPLORER_FOLDER_CLASS, element.hasClass("nav-folder-title"));
      element.toggleClass(FILE_EXPLORER_FILE_CLASS, element.hasClass("nav-file-title"));
      applyFileExplorerCssVariables(element, style);
      if (element.hasClass("nav-folder-title")) applyFileExplorerIndentGuide(element, style);
      if (style.prefix) {
        element.setAttribute("data-style-controller-prefix", style.prefix);
      }
    });
  }

  getMarkdownViews() {
    return this.app.workspace
      .getLeavesOfType("markdown")
      .map((leaf) => leaf.view)
      .filter((view) => view && view.containerEl);
  }

  getMarkdownContainers() {
    return this.getMarkdownViews().map((view) => view.containerEl);
  }

  getProfileForPath(path) {
    let profile = { ...DEFAULT_PROFILE, ...this.settings.global };
    let name = "global";

    for (const override of this.settings.overrides) {
      if (!override.enabled || !matchesOverride(path, override)) continue;
      profile = { ...profile, ...compactProfile(override.profile, override.modules) };
      name = override.name || override.pattern || override.type;
    }

    return { profile, name };
  }
};

function normalizeSettings(loaded) {
  const source = loaded && typeof loaded === "object" ? loaded : {};
  const migrateLegacyAutomaticDefaults = Number(source.schemaVersion || 0) < 5;
  const settings = { ...DEFAULT_SETTINGS, ...source };
  settings.enabled = true;
  settings.activeSettingsTab = settings.activeSettingsTab || "global";
  settings.interface = normalizeInterfaceSettings(source.interface || settings.interface);
  settings.global = Object.prototype.hasOwnProperty.call(source, "global")
    ? normalizeProfile(migrateLegacyProfileDefaults(source.global, migrateLegacyAutomaticDefaults))
    : createDefaultProfile();
  if (Number(source.schemaVersion || 0) < 3
    && source.global?.italicFontFamily === "Times New Roman, Times, serif"
    && source.global?.italicWeight === "400"
    && source.global?.italicColor === "#ac38de"
    && !Object.prototype.hasOwnProperty.call(source.global, "italicSize")) {
    settings.global.italicFontFamily = "";
    settings.global.italicWeight = "";
  }
  settings.schemaVersion = SETTINGS_SCHEMA_VERSION;
  settings.callouts = normalizeCallouts(migrateLegacyCalloutDefaults(source.callouts, migrateLegacyAutomaticDefaults));
  settings.overrides = Array.isArray(settings.overrides)
    ? settings.overrides.map(normalizeOverride)
    : [];
  settings.storedConfigurations = normalizeStoredConfigurations(settings.storedConfigurations, migrateLegacyAutomaticDefaults);
  return settings;
}

function clearExactLegacyDefaults(source, defaults) {
  const value = source && typeof source === "object" ? source : {};
  const entries = Object.entries(defaults);
  if (!entries.every(([field, oldDefault]) => value[field] === oldDefault)) {
    return value;
  }
  return {
    ...value,
    ...Object.fromEntries(entries.map(([field]) => [field, ""]))
  };
}

function migrateLegacyProfileDefaults(profile, shouldMigrate) {
  if (!shouldMigrate) return profile;
  return clearExactLegacyDefaults(
    clearExactLegacyDefaults(profile, LEGACY_AUTOMATIC_LINK_DEFAULTS),
    LEGACY_AUTOMATIC_HEADING_DEFAULTS
  );
}

function migrateLegacyCalloutDefaults(callouts, shouldMigrate) {
  return shouldMigrate
    ? clearExactLegacyDefaults(callouts, LEGACY_AUTOMATIC_CALLOUT_DEFAULTS)
    : callouts;
}

function normalizeInterfaceSettings(interfaceSettings) {
  const source = interfaceSettings && typeof interfaceSettings === "object" ? interfaceSettings : {};
  const configuredPosition = source.bottomLeftControlsPosition ?? source.settingsIconPosition;
  return {
    ...DEFAULT_INTERFACE_SETTINGS,
    bottomLeftControlsPosition: configuredPosition === BOTTOM_LEFT_CONTROLS_POSITION_LEFT
      || configuredPosition === LEGACY_SETTINGS_ICON_POSITION_THEMEPRO
      ? BOTTOM_LEFT_CONTROLS_POSITION_LEFT
      : BOTTOM_LEFT_CONTROLS_POSITION_NATIVE,
    readingEditingLayout: source.readingEditingLayout === READING_EDITING_LAYOUT_MATCHED
      ? READING_EDITING_LAYOUT_MATCHED
      : READING_EDITING_LAYOUT_NATIVE
  };
}

function validateInterfaceSection(interfaceSettings) {
  const errors = [];
  if (![BOTTOM_LEFT_CONTROLS_POSITION_NATIVE, BOTTOM_LEFT_CONTROLS_POSITION_LEFT].includes(interfaceSettings?.bottomLeftControlsPosition)) {
    errors.push("bottomLeftControlsPosition must be Native or Left");
  }
  if (![READING_EDITING_LAYOUT_NATIVE, READING_EDITING_LAYOUT_MATCHED].includes(interfaceSettings?.readingEditingLayout)) {
    errors.push("readingEditingLayout must be Native or Matched");
  }
  return errors;
}

function normalizeStoredConfigurations(configurations, migrateLegacyAutomaticDefaults = false) {
  const imported = Array.isArray(configurations)
    ? configurations
      .map((config) => normalizeStoredConfiguration(config, migrateLegacyAutomaticDefaults))
      .filter(Boolean)
    : [];
  const userConfigurations = imported.filter((config) => !isBuiltinConfigurationId(config.id));
  return [
    cloneStoredConfiguration(NATIVE_DEFAULT_CONFIGURATION),
    cloneStoredConfiguration(OBSIDIAN_PRO_CONFIGURATION),
    ...userConfigurations
  ];
}

function normalizeStoredConfiguration(config, migrateLegacyAutomaticDefaults = false) {
  if (!config || typeof config !== "object") return null;
  const data = normalizeConfigurationData(config.data || config, migrateLegacyAutomaticDefaults);
  return {
    id: String(config.id || `config-${Date.now()}`),
    name: String(config.name || "Imported configuration"),
    description: String(config.description || ""),
    data
  };
}

function normalizeConfigurationData(data, migrateLegacyAutomaticDefaults = false) {
  return {
    enabled: true,
    global: data && Object.prototype.hasOwnProperty.call(data, "global")
      ? normalizeProfile(migrateLegacyProfileDefaults(data.global, migrateLegacyAutomaticDefaults))
      : createDefaultProfile(),
    callouts: normalizeCallouts(migrateLegacyCalloutDefaults(data?.callouts, migrateLegacyAutomaticDefaults)),
    overrides: Array.isArray(data?.overrides) ? data.overrides.map(normalizeOverride) : []
  };
}

function isBuiltinConfigurationId(id) {
  return id === NATIVE_DEFAULT_CONFIGURATION.id || id === OBSIDIAN_PRO_CONFIGURATION.id;
}

function normalizeProfile(profile) {
  const source = profile && typeof profile === "object" ? profile : DEFAULT_PROFILE;
  const normalized = normalizeLineHeightState(normalizeCodeBackgroundStates(
    sanitizeProfile({ ...DEFAULT_PROFILE, ...source }, source),
    source,
    false
  ), source, false);
  return normalizeHeadingSpaceAboveStates(normalized, source, false);
}

function normalizeOptionalProfile(profile) {
  const source = profile && typeof profile === "object" ? profile : {};
  const normalized = normalizeHeadingSpaceAboveStates(normalizeLineHeightState(normalizeCodeBackgroundStates(
    sanitizeProfile({ ...blankProfileData(), ...source }, source),
    source,
    true
  ), source, true), source, true);
  delete normalized.settingsIconPosition;
  delete normalized.bottomLeftControlsPosition;
  return normalized;
}

function createDefaultProfile() {
  return normalizeProfile(DEFAULT_PROFILE);
}

function normalizeCodeBackgroundStates(profile, source, optional) {
  Object.entries(CODE_BACKGROUND_CUSTOM_FIELDS).forEach(([field, stateFields]) => {
    const hasEnabledState = Object.prototype.hasOwnProperty.call(source, stateFields.enabled);
    const hasCustomValue = Object.prototype.hasOwnProperty.call(source, stateFields.value);
    const legacyValue = String(source[field] ?? "").trim();

    if (optional && !hasEnabledState && !hasCustomValue && !legacyValue) {
      profile[stateFields.enabled] = "";
      profile[stateFields.value] = "";
      profile[field] = "";
      return;
    }

    if (!hasEnabledState && !hasCustomValue) {
      profile[stateFields.enabled] = !!legacyValue && legacyValue.toLowerCase() !== DEFAULT_CODE_BACKGROUND;
      profile[stateFields.value] = legacyValue || DEFAULT_CODE_BACKGROUND;
    } else {
      const rawEnabled = source[stateFields.enabled];
      if (optional && rawEnabled === "") {
        profile[stateFields.enabled] = "";
        profile[stateFields.value] = String(source[stateFields.value] ?? "").trim() || DEFAULT_CODE_BACKGROUND;
        profile[field] = "";
        return;
      }
      profile[stateFields.enabled] = rawEnabled === true || String(rawEnabled).toLowerCase() === "true";
      profile[stateFields.value] = String(source[stateFields.value] ?? "").trim() || DEFAULT_CODE_BACKGROUND;
    }

    profile[field] = profile[stateFields.enabled] === true
      ? effectiveCodeBackground(profile, field)
      : "";
  });
  return profile;
}

function parseLineHeight(value) {
  const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)(px|rem|em|%|pt)?$/i);
  if (!match) return { value: "", unit: "unitless" };
  return { value: match[1], unit: match[2]?.toLowerCase() || "unitless" };
}

function lineHeightCssValue(profile) {
  const value = String(profile?.lineHeightValue ?? "").trim();
  const unit = String(profile?.lineHeightUnit ?? "").trim();
  if (!isValidLineHeightValue(value) || !LINE_HEIGHT_UNITS.includes(unit)) return "";
  return `${value}${unit === "unitless" ? "" : unit}`;
}

function isValidLineHeightValue(value) {
  const text = String(value ?? "").trim();
  return /^\d+(?:\.\d+)?$/.test(text) && Number.isFinite(Number(text)) && Number(text) > 0;
}

function normalizeLineHeightState(profile, source, optional) {
  const hasStructuredValue = Object.prototype.hasOwnProperty.call(source, "lineHeightValue")
    || Object.prototype.hasOwnProperty.call(source, "lineHeightUnit");
  const parsed = parseLineHeight(hasStructuredValue
    ? `${source.lineHeightValue ?? ""}${source.lineHeightUnit === "unitless" ? "" : source.lineHeightUnit ?? ""}`
    : source.lineHeight);

  if (optional && !hasStructuredValue && !hasActiveValue(source.lineHeight)) {
    profile.lineHeight = "";
    profile.lineHeightValue = "";
    profile.lineHeightUnit = "";
    return profile;
  }

  profile.lineHeightValue = parsed.value;
  profile.lineHeightUnit = parsed.value ? parsed.unit : optional ? "" : "unitless";
  profile.lineHeight = lineHeightCssValue(profile);
  return profile;
}

function normalizeHeadingSpaceAboveStates(profile, source, optional) {
  for (let level = 1; level <= 6; level += 1) {
    const enabledField = `h${level}SpaceAboveEnabled`;
    const valueField = `h${level}SpaceAboveValue`;
    const unitField = `h${level}SpaceAboveUnit`;
    const rawEnabled = source[enabledField];
    const rawValue = String(source[valueField] ?? profile[valueField] ?? "").trim();
    const rawUnit = String(source[unitField] ?? profile[unitField] ?? "").trim();

    if (optional && rawEnabled === undefined && source[valueField] === undefined && source[unitField] === undefined) {
      profile[enabledField] = "";
      profile[valueField] = "";
      profile[unitField] = "";
      continue;
    }

    profile[enabledField] = optional && rawEnabled === ""
      ? ""
      : rawEnabled === true || String(rawEnabled).toLowerCase() === "true";
    profile[valueField] = rawValue || (optional ? "" : "0");
    profile[unitField] = HEADING_SPACE_ABOVE_UNITS.includes(rawUnit)
      ? rawUnit
      : optional && !rawUnit ? "" : "px";
  }
  return profile;
}

function effectiveCodeBackground(profile, field) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (!stateFields) return "";
  const customValue = String(profile?.[stateFields.value] ?? "").trim();
  return profile?.[stateFields.enabled] === true && normalizeHexColor(customValue)
    ? customValue
    : "";
}

function codeBackgroundUiState(profile, field, optional = false) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  const inherited = optional && profile?.[stateFields.enabled] === "";
  const enabled = profile?.[stateFields.enabled] === true;
  const customValue = String(profile?.[stateFields.value] ?? "").trim() || DEFAULT_CODE_BACKGROUND;
  const valid = !!normalizeHexColor(customValue);
  return {
    enabled,
    inherited,
    customValue,
    displayedValue: enabled ? customValue : DEFAULT_CODE_BACKGROUND,
    effectiveValue: inherited ? "" : enabled && valid ? customValue : "",
    status: inherited ? "Inherit" : enabled ? valid ? "On" : "Error" : "Off"
  };
}

function setCodeBackgroundCustomEnabled(profile, field, enabled, optional = false) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (!stateFields) return null;
  if (!hasActiveValue(profile[stateFields.value])) {
    profile[stateFields.value] = DEFAULT_CODE_BACKGROUND;
  }
  profile[stateFields.enabled] = optional && !enabled ? "" : enabled;
  profile[field] = effectiveCodeBackground(profile, field);
  return codeBackgroundUiState(profile, field, optional);
}

function setCodeBackgroundCustomValue(profile, field, value, optional = false) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (!stateFields) return null;
  profile[stateFields.value] = String(value ?? "").trim();
  profile[field] = optional && profile[stateFields.enabled] === ""
    ? ""
    : effectiveCodeBackground(profile, field);
  return codeBackgroundUiState(profile, field, optional);
}

function setCodeBackgroundCustomInput(profile, field, value, optional = false) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (!stateFields) return null;
  const customValue = String(value ?? "").trim();
  if (!customValue) {
    profile[stateFields.enabled] = optional ? "" : false;
    profile[stateFields.value] = optional ? "" : DEFAULT_CODE_BACKGROUND;
    profile[field] = "";
  } else {
    profile[stateFields.enabled] = true;
    profile[stateFields.value] = customValue;
    profile[field] = effectiveCodeBackground(profile, field);
  }
  return codeBackgroundUiState(profile, field, optional);
}

function sanitizeProfile(profile, source = {}) {
  const normalized = { ...profile };
  const oldBaseDefaults =
    normalizeCssSizeText(normalized.textSize) === "16px"
    && String(normalized.textWeight || "").trim() === "400"
    && String(normalized.lineHeight || "").trim() === "1.65"
    && !hasActiveValue(normalized.fontFamily)
    && !hasActiveValue(normalized.textColor)
    && !hasActiveValue(normalized.backgroundColor);
  if (oldBaseDefaults) {
    normalized.textSize = "";
    normalized.textWeight = "";
    normalized.lineHeight = "";
  }

  normalized.imageAlignment = normalizeImageAlignment(normalized.imageAlignment);
  normalized.imageWidth = normalizeCssSizeText(normalized.imageWidth);
  normalized.imageRespectExplicitSize = normalizeImageRespectExplicitSize(normalized.imageRespectExplicitSize);
  return normalized;
}

function normalizeImageAlignment(value) {
  const alignment = String(value || "").trim().toLowerCase();
  return ["left", "center", "right"].includes(alignment) ? alignment : "";
}

function normalizeImageRespectExplicitSize(value) {
  if (value === false || String(value || "").trim().toLowerCase() === "false") return "false";
  return "";
}

function createNativeConfigurationData() {
  return normalizeConfigurationData({
    enabled: true,
    global: {
      ...blankProfileData(),
      codeBackground: DEFAULT_CODE_BACKGROUND,
      codeBackgroundCustomEnabled: false,
      codeBackgroundCustomValue: DEFAULT_CODE_BACKGROUND,
      codeBlockBackground: DEFAULT_CODE_BACKGROUND,
      codeBlockBackgroundCustomEnabled: false,
      codeBlockBackgroundCustomValue: DEFAULT_CODE_BACKGROUND
    },
    callouts: blankObjectLike(DEFAULT_SETTINGS.callouts),
    overrides: []
  });
}

function blankProfileData() {
  return Object.fromEntries([
    ...new Set([
      ...Object.keys(DEFAULT_PROFILE),
      ...Object.keys(STYLE_FIELD_REGISTRY)
    ])
  ].map((key) => [key, ""]));
}

function blankObjectLike(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).map((key) => [key, blankObjectLike(value[key])]));
  }
  if (typeof value === "boolean") return false;
  return "";
}

function normalizeCssSizeText(value) {
  const parsed = parseCssSize(value);
  return parsed.value ? `${parsed.value}${parsed.unit}` : "";
}

function cloneStoredConfiguration(config) {
  return JSON.parse(JSON.stringify(config));
}

function createConfigurationSnapshot(settings) {
  return normalizeConfigurationData({
    enabled: settings.enabled,
    global: settings.global,
    callouts: settings.callouts,
    overrides: settings.overrides
  });
}

function configurationToExport(config) {
  return JSON.stringify({
    kind: "obsidian-style-controller/configuration",
    version: 1,
    name: config.name,
    description: config.description || "",
    data: config.data
  }, null, 2);
}

function parseConfigurationImport(text) {
  const parsed = JSON.parse(text);
  const config = parsed.kind === "obsidian-style-controller/configuration"
    ? parsed
    : { name: parsed.name, description: parsed.description, data: parsed.data || parsed };
  return normalizeStoredConfiguration({
    id: `imported-${Date.now()}`,
    name: config.name || "Imported configuration",
    description: config.description || "",
    data: config.data
  });
}

function datedConfigurationName(base) {
  const date = new Date().toISOString().slice(0, 10);
  return `${base} ${date}`;
}

function normalizeCallouts(callouts) {
  const defaults = DEFAULT_SETTINGS.callouts;
  const normalized = {
    ...defaults,
    ...(callouts || {}),
    spacingByView: normalizeCalloutSpacingByView(callouts?.spacingByView),
    advancedLayouts: normalizeAdvancedLayouts(callouts?.advancedLayouts),
    presets: Array.isArray(callouts?.presets)
      ? callouts.presets.map(normalizeCalloutPreset)
      : defaults.presets.map(normalizeCalloutPreset)
  };
  if (isLegacyCalloutTitleFont(normalized.titleFontFamily)) {
    normalized.titleFontFamily = "";
  }
  return normalized;
}

function isLegacyCalloutTitleFont(value) {
  return String(value || "").trim() === "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif";
}

function cloneCalloutDefaults() {
  return normalizeCallouts(JSON.parse(JSON.stringify(DEFAULT_SETTINGS.callouts)));
}

function normalizeCalloutPreset(preset) {
  return {
    ...Object.fromEntries(CALLOUT_SPACING_FIELDS.map((field) => [field, preset[field] ?? ""])),
    spacingByView: normalizeCalloutSpacingByView(preset.spacingByView),
    type: preset.type || "custom",
    color: preset.color || "#008293",
    titleColor: preset.titleColor || "",
    backgroundColor: preset.backgroundColor || "#ecf6f3",
    icon: preset.icon || "none",
    hideIcon: preset.hideIcon === true,
    previewTitle: preset.previewTitle || "Hello",
    previewBody: preset.previewBody || "ss"
  };
}

function normalizeCalloutSpacingByView(source) {
  const input = source && typeof source === "object" ? source : {};
  const values = (view) => Object.fromEntries(CALLOUT_SPACING_FIELDS
    .filter((field) => Object.prototype.hasOwnProperty.call(input[view] || {}, field))
    .map((field) => [field, String(input[view][field] ?? "")]));
  return { enabled: input.enabled === true, reading: values("reading"), live: values("live") };
}

function normalizeLayoutWidth(width, fallback = DEFAULT_LAYOUT_WIDTH) {
  const source = width && typeof width === "object" ? width : {};
  return {
    mode: String(source.mode ?? fallback.mode),
    value: String(source.value ?? fallback.value)
  };
}

function normalizeLayoutOptions(options, defaults = DEFAULT_LAYOUT_OPTIONS) {
  const source = options && typeof options === "object" ? options : {};
  return {
    columnCount: source.columnCount ?? defaults.columnCount,
    widths: Array.isArray(source.widths) ? source.widths.map((width, index) => normalizeLayoutWidth(width, defaults.widths[index] || DEFAULT_LAYOUT_WIDTH))
      : defaults.widths.map((width) => normalizeLayoutWidth(width)),
    gap: String(source.gap ?? defaults.gap),
    minWidth: String(source.minWidth ?? defaults.minWidth),
    wrap: String(source.wrap ?? defaults.wrap),
    responsive: String(source.responsive ?? defaults.responsive),
    breakpoint: String(source.breakpoint ?? defaults.breakpoint)
  };
}

function normalizeAdvancedLayouts(advanced) {
  const source = advanced && typeof advanced === "object" ? advanced : {};
  const legacyDefaults = Object.prototype.hasOwnProperty.call(source, "defaults")
    ? normalizeLayoutOptions(source.defaults) : null;
  const untouchedLegacyDefaults = !legacyDefaults || draftValuesEqual(legacyDefaults, normalizeLayoutOptions(DEFAULT_LAYOUT_OPTIONS));
  const layouts = Array.isArray(source.layouts) ? source.layouts.filter((layout) => !untouchedLegacyDefaults || !isUntouchedAutoLayout(layout)).map((layout, index) => {
    const template = String(layout?.template || "multi-column");
    const definition = ADVANCED_LAYOUT_TEMPLATES.find((candidate) => candidate.id === template);
    const legacyOptions = normalizeLayoutOptions(layout?.options, {
      columnCount: "", widths: [], gap: "", minWidth: "", wrap: "", responsive: "", breakpoint: ""
    });
    return {
      ...layout,
      id: String(layout?.id || `legacy-layout-${index + 1}`),
      template,
      displayName: String(layout?.displayName ?? definition?.name ?? template),
      markdownId: String(layout?.markdownId ?? ""),
      builtIn: false,
      enabled: layout?.enabled === true,
      options: definition
        ? legacyDefaults && definition.migrateLegacyOptions
          ? definition.migrateLegacyOptions(legacyDefaults, legacyOptions) : definition.normalizeOptions(layout?.options)
        : cloneDraftValue(layout?.options || {})
    };
  }) : [];
  return {
    enabled: source.enabled === true,
    pinToTop: source.pinToTop === true,
    layouts
  };
}

function isUntouchedAutoLayout(layout) {
  if (layout?.id !== "builtin-multi-column" || layout?.builtIn !== true || layout?.enabled !== false
    || layout?.template !== "multi-column" || layout?.displayName !== "Multi-column"
    || calloutTypeKey(layout?.markdownId) !== "multi-column") return false;
  return draftValuesEqual(normalizeLayoutOptions(layout.options), normalizeLayoutOptions(DEFAULT_LAYOUT_OPTIONS));
}

function effectiveLayoutOptions(defaults, options) {
  const requestedCount = Number(options?.columnCount || defaults.columnCount);
  const count = Number.isInteger(requestedCount) && requestedCount >= 2 && requestedCount <= 6 ? requestedCount : 2;
  const widths = Array.from({ length: count }, (_, index) => {
    const own = options?.widths?.[index];
    return normalizeLayoutWidth(own?.mode && own.mode !== "inherit" ? own : defaults.widths[index] || DEFAULT_LAYOUT_WIDTH);
  });
  return {
    columnCount: count,
    widths,
    gap: options?.gap || defaults.gap,
    minWidth: options?.minWidth || defaults.minWidth,
    wrap: options?.wrap || defaults.wrap,
    responsive: options?.responsive || defaults.responsive,
    breakpoint: options?.breakpoint || defaults.breakpoint
  };
}

function materializeLegacyMultiColumnOptions(defaults, options) {
  const effective = effectiveLayoutOptions(defaults, options);
  const extras = options.widths.slice(effective.columnCount).map((width, index) => {
    const fallback = defaults.widths[effective.columnCount + index] || DEFAULT_LAYOUT_WIDTH;
    return normalizeLayoutWidth(width.mode === "inherit" ? fallback : width);
  });
  return { ...effective, widths: [...effective.widths, ...extras] };
}

function validateLayoutOptions(options, label) {
  const errors = [];
  if (!Number.isInteger(Number(options.columnCount)) || Number(options.columnCount) < 2 || Number(options.columnCount) > 6) {
    errors.push(`${label} column count must be 2–6`);
  }
  ["gap", "minWidth", "breakpoint"].forEach((field) => {
    const value = normalizeCssSizeText(options[field]);
    if (!value || value.startsWith("-") || (field !== "gap" && Number(parseCssSize(value).value) <= 0)) {
      errors.push(`${label} ${field} must be a non-negative CSS size${field === "gap" ? "" : " greater than zero"}`);
    } else if (field !== "gap" && value.endsWith("%")) {
      errors.push(`${label} ${field} must use a length unit, not percent`);
    }
  });
  for (const [field, values] of [["wrap", ["wrap", "nowrap"]], ["responsive", ["auto-fit", "stack"]]]) {
    if (!values.includes(options[field])) errors.push(`${label} ${field} is invalid`);
  }
  options.widths.slice(0, Number(options.columnCount) || 0).forEach((width, index) => {
    const number = Number(width.value);
    if (!["ratio", "percent", "fixed"].includes(width.mode) || !Number.isFinite(number) || number <= 0
      || (width.mode === "percent" && number > 100) || (width.mode === "ratio" && number > 100)) {
      errors.push(`${label} column ${index + 1} width is invalid`);
    }
  });
  return errors;
}

function validateAdvancedLayouts(advanced) {
  const settings = normalizeAdvancedLayouts(advanced);
  const errors = [];
  const seen = new Set();
  settings.layouts.forEach((layout, index) => {
    const label = `Layout ${index + 1}`;
    const definition = ADVANCED_LAYOUT_TEMPLATES.find((template) => template.id === layout.template);
    if (!definition) return;
    const type = calloutTypeKey(layout.markdownId);
    if (!definition.isValidMarkdownId(type)) errors.push(`${label} Markdown identifier must be multi-column or begin with multi-column followed by letters/numbers`);
    if (seen.has(type)) errors.push(`${label} Markdown identifier duplicates another layout`);
    seen.add(type);
    errors.push(...definition.validateOptions(layout.options, label));
  });
  return errors;
}

function nextLayoutMarkdownId(layouts, prefix = "multi-column") {
  const used = new Set(layouts.map((layout) => calloutTypeKey(layout.markdownId)));
  if (!used.has(prefix)) return prefix;
  let index = 1;
  while (used.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function createAdvancedLayout(template, layouts) {
  const definition = ADVANCED_LAYOUT_TEMPLATES.find((candidate) => candidate.id === template);
  if (!definition) return null;
  const markdownId = nextLayoutMarkdownId(layouts, definition.markdownPrefix);
  return {
    id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    template: definition.id,
    displayName: `${definition.name}${markdownId === definition.markdownPrefix ? "" : ` ${markdownId.slice(definition.markdownPrefix.length)}`}`,
    markdownId,
    builtIn: false,
    enabled: true,
    options: definition.createOptions()
  };
}

function layoutMarkdownSample(layout) {
  const definition = ADVANCED_LAYOUT_TEMPLATES.find((candidate) => candidate.id === layout.template);
  return definition?.markdownSample(layout) || "";
}

function multiColumnMarkdownSample(layout) {
  const type = calloutTypeKey(layout.markdownId);
  if (!/^multi-column(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(type)) return "";
  const count = normalizeLayoutOptions(layout.options).columnCount;
  const lines = [`> [!${type}]`];
  for (let index = 1; index <= count; index += 1) {
    lines.push(">", `>> [!note] Column ${index}`, ">> Add Markdown content here.");
  }
  return lines.join("\n");
}

function layoutTrack(width, minWidth) {
  const amount = Number(width.value);
  if (!Number.isFinite(amount) || amount <= 0) return `minmax(${minWidth}, 1fr)`;
  if (width.mode === "ratio") return `minmax(${minWidth}, ${amount}fr)`;
  if (width.mode === "percent") return `minmax(${minWidth}, ${amount}%)`;
  if (width.mode === "fixed") return `minmax(${minWidth}, ${amount}px)`;
  return `minmax(${minWidth}, 1fr)`;
}

function buildSingleLayoutCss(layout, scope) {
  if (layout.template !== "multi-column" || validateLayoutOptions(layout.options, "Layout").length) return "";
  const type = calloutTypeKey(layout.markdownId);
  if (!/^multi-column(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(type)) return "";
  const options = effectiveLayoutOptions(DEFAULT_LAYOUT_OPTIONS, layout.options);
  const selector = `${scope} .callout[data-callout="${escapeCssAttributeValue(type)}" i]`;
  const tracks = options.widths.map((width) => layoutTrack(width, options.minWidth)).join(" ");
  const rules = [
    `${selector} { container-type: inline-size; background: transparent; border: 0; padding: 0; overflow: visible; }`,
    `${selector} > .callout-title { display: none; }`,
    `${selector} > .callout-content { display: grid; grid-template-columns: ${tracks}; gap: ${options.gap}; padding: 0; overflow-x: auto; }`,
    `${selector} > .callout-content > * { min-width: 0; margin: 0; }`,
    `${selector} > .callout-content > [data-callout-metadata*="wide-2"] { grid-column: span 2; }`,
    `${selector} > .callout-content > [data-callout-metadata*="wide-3"] { grid-column: span ${Math.min(3, options.columnCount)}; }`
  ];
  if (type === "multi-column") {
    rules.push(`${selector}[data-callout-metadata*="no-wrap"] > .callout-content { grid-template-columns: ${tracks}; overflow-x: auto; }`);
    rules.push(`${selector}[data-callout-metadata*="center-fixed"] > .callout-content { justify-content: center; }`);
  }
  if (options.wrap === "wrap") {
    const narrowTracks = options.responsive === "stack" ? "minmax(0, 1fr)"
      : `repeat(auto-fit, minmax(min(100%, ${options.minWidth}), 1fr))`;
    rules.push(`@container (max-width: ${options.breakpoint}) { ${selector} > .callout-content { grid-template-columns: ${narrowTracks}; overflow-x: visible; } ${selector} > .callout-content > [data-callout-metadata*="wide-"] { grid-column: auto; } }`);
  }
  return rules.join("\n");
}

function buildAdvancedLayoutCss(advanced, mclEnabled = false, scope = ".osc-style-scope:where(:not(.osc-layout-preview))") {
  const settings = normalizeAdvancedLayouts(advanced);
  if (!settings.enabled) return "";
  const used = new Set();
  return settings.layouts.filter((layout) => layout.enabled && (calloutTypeKey(layout.markdownId) !== "multi-column" || !mclEnabled))
    .map((layout) => {
      const type = calloutTypeKey(layout.markdownId);
      if (used.has(type)) return "";
      used.add(type);
      const definition = ADVANCED_LAYOUT_TEMPLATES.find((candidate) => candidate.id === layout.template);
      return definition?.buildCss(layout, scope) || "";
    }).filter(Boolean).join("\n");
}

function normalizeOverride(override) {
  const sourceModules = override.modules || {};
  const modules = { ...DEFAULT_OVERRIDE_MODULES, ...sourceModules };
  if (!Object.prototype.hasOwnProperty.call(sourceModules, "boldItalic")) {
    modules.boldItalic = sourceModules.baseText === true;
  }
  return {
    id: override.id || String(Date.now()),
    name: override.name || "",
    type: override.type || "folder",
    pattern: override.pattern || "",
    enabled: override.enabled !== false,
    modules,
    profile: normalizeOptionalProfile(override.profile),
    fileExplorer: normalizeFileExplorerStyle(override.fileExplorer)
  };
}

function normalizeFileExplorerStyle(style) {
  const normalized = { ...DEFAULT_FILE_EXPLORER_STYLE, ...(style || {}) };
  Object.keys(LEGACY_FILE_EXPLORER_PRESET_STYLE).forEach((key) => {
    if (key === "prefix") return;
    if (normalized[key] === LEGACY_FILE_EXPLORER_PRESET_STYLE[key]) {
      normalized[key] = "";
    }
  });
  return normalized;
}

function compactProfile(profile, modules) {
  const result = {};
  const enabledFields = modules
    ? Object.entries(PROFILE_GROUP_FIELDS)
      .filter(([group]) => modules[group])
      .flatMap(([, fields]) => fields)
    : Object.keys(DEFAULT_PROFILE);
  enabledFields.forEach((key) => {
    if (profile[key] !== undefined && profile[key] !== null && String(profile[key]).trim() !== "") {
      result[key] = profile[key];
    }
  });
  return result;
}

function setCssVariable(element, variable, value) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  element.setCssProps({ [variable]: text });
}

function normalizedCssVariableValue(field, variable, rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return "";
  if (field === "lineHeight") return lineHeightCssValue({
    lineHeightValue: parseLineHeight(rawValue).value,
    lineHeightUnit: parseLineHeight(rawValue).unit
  });
  if (FONT_VARIABLES.has(variable)) {
    if (String(rawValue).trim().toLowerCase() === "inherit") return "";
    const meta = STYLE_FIELD_REGISTRY[field];
    return validateFont(rawValue, meta).valid ? cssFontValue(rawValue, meta) : "";
  }
  if (STYLE_FIELD_REGISTRY[field]?.type === "style") return normalizeFontStyle(rawValue);
  if (variable.includes("weight")) return validateFontWeight(rawValue).valid ? cssValue(rawValue) : "";
  if (COLOR_FIELDS.has(field)) return cssColorValue(rawValue);
  return cssValue(rawValue);
}

function styleFieldActiveClass(field) {
  const name = String(field).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `${STYLE_FIELD_ACTIVE_CLASS_PREFIX}${name}${STYLE_FIELD_ACTIVE_CLASS_SUFFIX}`;
}

function profileFieldCssValue(profile, field, variable) {
  const codeState = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  const legacyExplicitCodeValue = codeState
    && profile[codeState.enabled] === undefined
    && normalizeHexColor(profile[field])
    && normalizeHexColor(profile[field]) !== DEFAULT_CODE_BACKGROUND;
  const value = codeState
    ? profile[codeState.enabled] === true
      ? profile[codeState.value]
      : legacyExplicitCodeValue ? profile[field] : ""
    : profile[field];
  return normalizedCssVariableValue(field, variable, value);
}

function clearProfileCssVariables(element) {
  const props = Object.fromEntries([
    ...PROFILE_FIELDS.map(([, variable]) => [variable, ""]),
    ...STYLE_HEADING_SPACE_ABOVE_VARIABLES.map((variable) => [variable, ""]),
    ["--osc-title-line-height", ""],
    ["--osc-native-inline-code-line-height", ""],
    ["--osc-native-block-code-line-height", ""],
    ["--osc-image-width", ""],
    ["--style-controller-callout-border-width", ""],
    ["--style-controller-callout-radius", ""],
    ["--style-controller-callout-title-size", ""],
    ["--style-controller-callout-title-font-family", ""],
    ["--style-controller-callout-multi-column-border", ""]
  ]);
  element.setCssProps(props);
}

function applyProfileCssVariables(element, profile) {
  const props = {};
  PROFILE_FIELDS.forEach(([field, variable]) => {
    props[variable] = profileFieldCssValue(profile, field, variable);
  });
  props["--osc-image-width"] = normalizeCssSizeText(profile.imageWidth);
  props["--osc-title-line-height"] = "";
  props["--osc-native-inline-code-line-height"] = "";
  props["--osc-native-block-code-line-height"] = "";
  STYLE_HEADING_SPACE_ABOVE_VARIABLES.forEach((variable, index) => {
    props[variable] = headingSpaceAboveCssValue(profile, index + 1);
  });
  element.setCssProps(props);
}

function applyProfileToPreview(element, profile) {
  element.addClass(STYLE_SCOPE_CLASS);
  applyProfileCssVariables(element, profile);
  applyProfileStateClasses(element, profile);
  const nativeProps = {};
  PROFILE_FIELDS.forEach(([field, variable]) => {
    if (!element.style.getPropertyValue(variable)) {
      nativeProps[variable] = resolvedNativePreviewValueForField(field, profile);
    }
  });
  nativeProps["--osc-title-line-height"] = resolvedNativeTitleLineHeight(profile);
  nativeProps["--osc-native-inline-code-line-height"] = resolvedNativeLineHeightForField("codeFontFamily", profile);
  nativeProps["--osc-native-block-code-line-height"] = resolvedNativeLineHeightForField("codeBlockFontFamily", profile);
  element.setCssProps(nativeProps);
}

function applyProfileStateClasses(element, profile) {
  PROFILE_FIELDS.forEach(([field, variable]) => {
    const hasRuntimeSelector = STYLE_FIELD_REGISTRY[field]?.selectors?.length > 0;
    element.toggleClass(
      styleFieldActiveClass(field),
      hasRuntimeSelector && hasActiveValue(profileFieldCssValue(profile, field, variable))
    );
  });
  applyEmphasisStateClasses(element, profile);
  applyTitleStateClasses(element, profile);
  STYLE_IMAGE_ALIGNMENT_CLASSES.forEach((className) => element.removeClass(className));
  const alignment = normalizeImageAlignment(profile.imageAlignment);
  if (alignment) element.addClass(`style-controller-image-align-${alignment}`);

  const hasWidth = hasActiveValue(normalizeCssSizeText(profile.imageWidth));
  element.toggleClass(STYLE_IMAGE_WIDTH_CLASS, hasWidth);
  const respectExplicitSize = normalizeImageRespectExplicitSize(profile.imageRespectExplicitSize) !== "false";
  element.toggleClass(STYLE_IMAGE_RESPECT_EXPLICIT_CLASS, hasWidth && respectExplicitSize);
  element.toggleClass(STYLE_IMAGE_IGNORE_EXPLICIT_CLASS, hasWidth && !respectExplicitSize);
  STYLE_HEADING_COLOR_CLASSES.forEach((className, index) => {
    element.toggleClass(className, !!cssColorValue(profile[`h${index + 1}Color`]));
  });
  STYLE_HEADING_SPACE_ABOVE_CLASSES.forEach((className, index) => {
    element.toggleClass(className, !!headingSpaceAboveCssValue(profile, index + 1));
  });
  element.toggleClass(STYLE_HEADING_COLOR_ACTIVE_CLASS, hasActiveHeadingColor(profile));
  element.toggleClass(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS, !!cssColorValue(profile.codeBlockColor));
}

function applyTitleStateClasses(element, profile) {
  const titleFont = String(profile.titleFontFamily || "").trim();
  const hasTitleFont = titleFont !== ""
    && titleFont.toLowerCase() !== "inherit"
    && !!cssFontValue(titleFont, STYLE_FIELD_REGISTRY.titleFontFamily);
  element.toggleClass(STYLE_TITLE_FONT_ACTIVE_CLASS, hasTitleFont);
  element.toggleClass(STYLE_TITLE_SIZE_ACTIVE_CLASS, !!normalizeCssSizeText(profile.titleSize));
  element.toggleClass(STYLE_TITLE_WEIGHT_ACTIVE_CLASS, String(profile.titleWeight || "").trim() !== ""
    && validateFontWeight(profile.titleWeight).valid);
}

function applyEmphasisStateClasses(element, profile) {
  const explicitFont = (value) => {
    const text = String(value || "").trim();
    return text !== "" && text.toLowerCase() !== "inherit" && !!cssFontValue(text);
  };
  const explicitWeight = (value) => String(value || "").trim() !== "" && validateFontWeight(value).valid;
  const explicitSize = (value) => !!normalizeCssSizeText(value);
  const explicitStyle = (value) => !!normalizeFontStyle(value);
  const states = {
    [STYLE_BOLD_FONT_ACTIVE_CLASS]: explicitFont(profile.boldFontFamily),
    [STYLE_BOLD_STYLE_ACTIVE_CLASS]: explicitStyle(profile.boldFontStyle),
    [STYLE_BOLD_WEIGHT_ACTIVE_CLASS]: explicitWeight(profile.boldWeight),
    [STYLE_BOLD_COLOR_ACTIVE_CLASS]: !!cssColorValue(profile.boldColor),
    [STYLE_ITALIC_FONT_ACTIVE_CLASS]: explicitFont(profile.italicFontFamily),
    [STYLE_ITALIC_STYLE_ACTIVE_CLASS]: explicitStyle(profile.italicFontStyle),
    [STYLE_ITALIC_SIZE_ACTIVE_CLASS]: explicitSize(profile.italicSize),
    [STYLE_ITALIC_WEIGHT_ACTIVE_CLASS]: explicitWeight(profile.italicWeight),
    [STYLE_ITALIC_COLOR_ACTIVE_CLASS]: !!cssColorValue(profile.italicColor)
  };
  Object.entries(states).forEach(([className, enabled]) => element.toggleClass(className, enabled));
}

function hasActiveHeadingColor(profile) {
  return Array.from({ length: 6 }, (_, index) => `h${index + 1}Color`)
    .some((field) => cssColorValue(profile[field]));
}

function applyCalloutCssVariables(element, callouts) {
  const settings = normalizeCallouts(callouts);
  const titleFontFamily = String(settings.titleFontFamily || "").trim().toLowerCase() === "inherit"
    ? ""
    : cssFontValue(settings.titleFontFamily);
  const multiColumnBorderStyle = String(settings.multiColumnBorderStyle || "").trim().toLowerCase();
  const multiColumnBorder = normalizeCssSizeText(settings.multiColumnBorderWidth)
    && VALID_BORDER_STYLES.includes(multiColumnBorderStyle)
    && cssColorValue(settings.multiColumnBorderColor)
    ? `${normalizeCssSizeText(settings.multiColumnBorderWidth)} ${multiColumnBorderStyle} ${cssColorValue(settings.multiColumnBorderColor)}`
    : "";
  element.setCssProps({
    "--style-controller-callout-border-width": cssValue(settings.borderWidth),
    "--style-controller-callout-radius": cssValue(settings.radius),
    "--style-controller-callout-title-size": cssValue(settings.titleSize),
    "--style-controller-callout-title-font-family": titleFontFamily,
    "--style-controller-callout-multi-column-border": multiColumnBorder
  });
  element.toggleClass(STYLE_CALLOUT_BORDER_WIDTH_ACTIVE_CLASS, !!normalizeCssSizeText(settings.borderWidth));
  element.toggleClass(STYLE_CALLOUT_RADIUS_ACTIVE_CLASS, !!normalizeCssSizeText(settings.radius));
  element.toggleClass(STYLE_CALLOUT_TITLE_SIZE_ACTIVE_CLASS, !!normalizeCssSizeText(settings.titleSize));
  element.toggleClass(STYLE_CALLOUT_TITLE_FONT_ACTIVE_CLASS, !!titleFontFamily);
  element.toggleClass(STYLE_CALLOUT_MULTI_COLUMN_BORDER_ACTIVE_CLASS, !!multiColumnBorder);
}

function calloutTypeKey(type) {
  return String(type || "").trim().toLowerCase();
}

function effectiveCalloutPresets(presets) {
  const byType = new Map();
  (presets || []).forEach((preset) => {
    const type = calloutTypeKey(preset?.type);
    if (type) byType.set(type, preset);
  });
  return byType;
}

function escapeCssAttributeValue(value) {
  return Array.from(String(value), (character) => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127 || character === '"' || character === "\\"
      ? `\\${code.toString(16)} ` : character;
  }).join("");
}

function calloutPresetIcon(preset) {
  const icon = String(preset?.icon || "").trim();
  return /^[a-z0-9-]+$/i.test(icon) && icon.toLowerCase() !== "none" ? icon : "";
}

function calloutPresetIconTypes(presets) {
  return new Set([...effectiveCalloutPresets(presets)]
    .filter(([, preset]) => preset.hideIcon !== true && calloutPresetIcon(preset))
    .map(([type]) => type));
}

function calloutSpacingEntries(settings) {
  const entries = CALLOUT_SPACING_GROUPS.flatMap(({ prefix, selector }) =>
    CALLOUT_SPACING_DIRECTIONS.map((direction) => ({
      field: `${prefix}${direction}`,
      selector,
      property: `${prefix === "margin" ? "margin" : "padding"}-${direction.toLowerCase()}`,
      value: validCalloutSpacingValue(`${prefix}${direction}`, settings?.[`${prefix}${direction}`])
    }))
  ).filter(({ value }) => value);
  const first = validCalloutSpacingValue("bodyFirstMarginTop", settings?.bodyFirstMarginTop);
  if (first) {
    if (first.startsWith("-")) entries.push(
      { field: "bodyFirstMarginTop", selector: " > .callout-content", property: "padding-top", value: "0px", reset: true },
      { field: "bodyFirstMarginTop", selector: " > .callout-content > :first-child", property: "margin-top", value: first }
    );
    else entries.push(
      { field: "bodyFirstMarginTop", selector: " > .callout-content", property: "padding-top", value: first },
      { field: "bodyFirstMarginTop", selector: " > .callout-content > :first-child", property: "margin-top", value: "0px", reset: true }
    );
  }
  const last = validCalloutSpacingValue("bodyLastMarginBottom", settings?.bodyLastMarginBottom);
  if (last) {
    if (last.startsWith("-")) entries.push(
      { field: "bodyLastMarginBottom", selector: " > .callout-content", property: "padding-bottom", value: "0px", reset: true },
      { field: "bodyLastMarginBottom", selector: " > .callout-content > :last-child", property: "margin-bottom", value: last }
    );
    else entries.push(
      { field: "bodyLastMarginBottom", selector: " > .callout-content", property: "padding-bottom", value: last },
      { field: "bodyLastMarginBottom", selector: " > .callout-content > :last-child", property: "margin-bottom", value: "0px", reset: true }
    );
  }
  const gap = validCalloutSpacingValue("bodyBlockGap", settings?.bodyBlockGap);
  if (gap) entries.push(
    { field: "bodyBlockGap", selector: " > .callout-content > :not(:last-child)", property: "margin-bottom", value: "0px", reset: true },
    { field: "bodyBlockGap", selector: " > .callout-content > * + *", property: "margin-top", value: "0px", reset: true },
    { field: "bodyBlockGap", selector: " > .callout-content > * + *", property: "padding-top", value: gap }
  );
  return entries;
}

function validCalloutSpacingValue(field, value) {
  const normalized = normalizeCssSizeText(value);
  return (field.toLowerCase().includes("padding") || field === "bodyBlockGap") && normalized.startsWith("-") ? "" : normalized;
}

function buildCalloutSpacingCss(settings, selector) {
  const bySelector = new Map();
  calloutSpacingEntries(settings).forEach(({ selector: suffix, property, value }) => {
    const declarations = bySelector.get(suffix) || [];
    declarations.push(`${property}: ${value};`);
    bySelector.set(suffix, declarations);
  });
  return [...bySelector].map(([suffix, declarations]) =>
    `${selector}${suffix} { ${declarations.join(" ")} }`
  ).join("\n");
}

function calloutViewSelector(view, type = "") {
  const scope = ".osc-style-scope:not(.osc-callout-preview)";
  const viewClass = view === "live" ? ".markdown-source-view.mod-cm6" : ".markdown-preview-view";
  const typeSelector = type ? `[data-callout="${escapeCssAttributeValue(type)}" i]` : "";
  return `:is(${scope}:where(${viewClass}), ${scope} :where(${viewClass})) .callout${typeSelector}`;
}

function buildCalloutViewSpacingCss(settings, type = "") {
  if (settings?.spacingByView?.enabled !== true) return "";
  return CALLOUT_SPACING_VIEWS.map((view) =>
    buildCalloutSpacingCss(settings.spacingByView[view], calloutViewSelector(view, type))
  ).filter(Boolean).join("\n");
}

function calloutSpacingLayers(globalSettings, preset = null, view = null) {
  return [
    globalSettings,
    view && globalSettings?.spacingByView?.enabled ? globalSettings.spacingByView[view] : null,
    preset,
    view && preset?.spacingByView?.enabled ? preset.spacingByView[view] : null
  ].filter(Boolean);
}

function applyCalloutSpacingToPreview(preview, globalSettings, preset, view = null) {
  const callout = preview.querySelector(".callout[data-callout]");
  if (!callout) return;
  calloutSpacingLayers(globalSettings, preset, view).forEach((settings) => {
    calloutSpacingEntries(settings).forEach(({ selector, property, value }) => {
      const targets = selector ? callout.querySelectorAll(`:scope${selector}`) : [callout];
      targets.forEach((target) => target.style.setProperty(property, value));
    });
  });
}

function measureCalloutSpacingMode(ownerDocument, mode, inheritedSettings = null, type = "std") {
  const view = ownerDocument?.defaultView;
  if (!view?.getComputedStyle || !ownerDocument.body) return {};
  const host = ownerDocument.createElement("div");
  host.className = `osc-callout-spacing-measure ${mode === "reading" ? "markdown-preview-view markdown-rendered" : "markdown-source-view mod-cm6"}`;
  const contentRoot = ownerDocument.createElement("div");
  contentRoot.className = mode === "reading" ? "markdown-preview-sizer" : "cm-content";
  host.appendChild(contentRoot);
  const wrapper = mode === "reading" ? contentRoot : ownerDocument.createElement("div");
  if (mode !== "reading") {
    wrapper.className = "cm-embed-block";
    contentRoot.appendChild(wrapper);
  }
  const callout = ownerDocument.createElement("div");
  callout.className = "callout";
  callout.setAttribute("data-callout", calloutTypeKey(type) || "std");
  wrapper.appendChild(callout);
  const title = ownerDocument.createElement("div");
  title.className = "callout-title";
  const titleText = ownerDocument.createElement("div");
  titleText.className = "callout-title-inner";
  titleText.textContent = "Spacing preview";
  title.appendChild(titleText);
  callout.appendChild(title);
  const body = ownerDocument.createElement("div");
  body.className = "callout-content";
  const first = ownerDocument.createElement("p");
  first.textContent = "First paragraph";
  const second = ownerDocument.createElement("p");
  second.textContent = "Second paragraph";
  body.append(first, second);
  callout.appendChild(body);
  ownerDocument.body.appendChild(host);
  try {
    if (inheritedSettings) (Array.isArray(inheritedSettings) ? inheritedSettings : [inheritedSettings]).forEach((settings) => {
      applyCalloutSpacingToPreview({ querySelector: () => callout }, settings);
    });
    const values = {};
    CALLOUT_SPACING_GROUPS.forEach(({ prefix }) => {
      const target = prefix === "margin" || prefix === "padding" ? callout
        : prefix === "titlePadding" ? title : body;
      const property = prefix === "margin" ? "margin" : "padding";
      CALLOUT_SPACING_DIRECTIONS.forEach((direction) => {
        values[`${prefix}${direction}`] = view.getComputedStyle(target).getPropertyValue(`${property}-${direction.toLowerCase()}`).trim();
      });
    });
    values.bodyFirstMarginTop = `${Number((first.getBoundingClientRect().top - title.getBoundingClientRect().bottom).toFixed(2))}px`;
    values.bodyLastMarginBottom = view.getComputedStyle(second).marginBottom;
    const secondPaddingTop = Number.parseFloat(view.getComputedStyle(second).paddingTop) || 0;
    values.bodyBlockGap = `${Number((second.getBoundingClientRect().top + secondPaddingTop - first.getBoundingClientRect().bottom).toFixed(2))}px`;
    return values;
  } finally {
    host.remove();
  }
}

function measureCalloutSpacingModes(ownerDocument, inheritedSettings = null, type = "std") {
  return {
    reading: measureCalloutSpacingMode(ownerDocument, "reading", inheritedSettings, type),
    live: measureCalloutSpacingMode(ownerDocument, "live", inheritedSettings, type)
  };
}

function calloutSpacingPlaceholder(measurements, field, view) {
  return parseCssSize(measurements?.[view]?.[field]).value;
}

function calloutSpacingPlaceholderUnit(measurements, field, view) {
  return parseCssSize(measurements?.[view]?.[field]).unit;
}

function calloutSpacingInheritedLayers(callouts, preset, view, separate) {
  if (!preset) return separate ? [callouts] : [];
  return [
    callouts,
    callouts?.spacingByView?.enabled ? callouts.spacingByView[view] : null,
    separate ? preset : null
  ].filter(Boolean);
}

function calloutPreviewBodyMarkdown(body) {
  const lines = String(body).split(/\r?\n/).map((line) => `> ${line}`).join("\n");
  return /\n\s*\n/.test(String(body)) ? lines : `${lines}\n>\n> Second paragraph for spacing.`;
}

function buildCalloutPresetCss(presets) {
  // Saved type names cannot be enumerated in the packaged stylesheet.
  const rules = [];
  effectiveCalloutPresets(presets).forEach((preset, type) => {
    const selector = `.osc-style-scope:not(.osc-callout-preview) .callout[data-callout="${escapeCssAttributeValue(type)}" i]`;
    const declarations = [
      ["--callout-color", cssColorValue(preset.color)],
      ["--callout-title-color", cssColorValue(preset.titleColor)],
      ["background-color", cssColorValue(preset.backgroundColor)]
    ].filter(([, value]) => value).map(([property, value]) => `${property}: ${value};`);
    if (declarations.length) rules.push(`${selector} { ${declarations.join(" ")} }`);
    const spacing = buildCalloutSpacingCss(preset, selector);
    if (spacing) rules.push(spacing);
    const viewSpacing = buildCalloutViewSpacingCss(preset, type);
    if (viewSpacing) rules.push(viewSpacing);
    if (preset.hideIcon === true || String(preset.icon || "").trim().toLowerCase() === "none") {
      rules.push(`${selector}:not([data-callout-icon]) > .callout-title > .callout-icon { display: none; }`);
    } else {
      const icon = calloutPresetIcon(preset);
      if (icon) rules.push(`${selector}:not([data-callout-icon]) { --callout-icon: ${icon}; }`);
    }
  });
  return rules.join("\n");
}

function refreshCalloutIcons(scopes, types, renderIcon = setIcon) {
  // Obsidian reads --callout-icon when it renders; existing SVGs need a refresh after rules change.
  if (!types?.size) return;
  scopes.forEach((scope) => scope?.querySelectorAll?.(".callout[data-callout]").forEach((callout) => {
    if (!types.has(calloutTypeKey(callout.getAttribute("data-callout"))) || callout.hasAttribute("data-callout-icon")) return;
    const iconEl = callout.querySelector(".callout-title > .callout-icon");
    if (!iconEl) return;
    const value = callout.getCssPropertyValue?.("--callout-icon")
      || callout.ownerDocument?.defaultView?.getComputedStyle(callout).getPropertyValue("--callout-icon");
    const icon = calloutPresetIcon({ icon: value });
    if (icon) renderIcon(iconEl, icon);
  }));
}

function applyCalloutPresetToPreview(preview, preset, renderIcon = setIcon) {
  const callout = preview.querySelector(".callout[data-callout]");
  if (!callout || !preset || calloutTypeKey(callout.getAttribute("data-callout")) !== calloutTypeKey(preset.type)) return;
  const color = cssColorValue(preset.color);
  const titleColor = cssColorValue(preset.titleColor);
  const background = cssColorValue(preset.backgroundColor);
  if (color) callout.style.setProperty("--callout-color", color);
  if (titleColor) callout.style.setProperty("--callout-title-color", titleColor);
  if (background) callout.style.setProperty("background-color", background);
  if (callout.hasAttribute("data-callout-icon")) return;
  const iconEl = callout.querySelector(".callout-title > .callout-icon");
  if (!iconEl) return;
  const hidden = preset.hideIcon === true || String(preset.icon || "").trim().toLowerCase() === "none";
  callout.toggleClass(CALLOUT_PREVIEW_HIDE_ICON_CLASS, hidden);
  const icon = calloutPresetIcon(preset);
  if (!hidden && icon) renderIcon(iconEl, icon);
}

function applyFileExplorerCssVariables(element, style) {
  const values = {
    fontFamily: String(style.fontFamily || "").trim().toLowerCase() === "inherit" ? "" : cssFontValue(style.fontFamily),
    fontWeight: hasActiveValue(style.fontWeight) && validateFontWeight(style.fontWeight).valid ? style.fontWeight : "",
    folderColor: cssColorValue(style.folderColor),
    fileColor: cssColorValue(style.fileColor),
    hoverColor: cssColorValue(style.hoverColor),
    hoverBackground: cssColorValue(style.hoverBackground),
    activeBackground: cssColorValue(style.activeBackground),
    indentLineColor: cssColorValue(style.indentLineColor),
    collapseIconColor: cssColorValue(style.collapseIconColor),
    focusBorderColor: cssColorValue(style.focusBorderColor)
  };
  element.setCssProps(Object.fromEntries(
    Object.entries(FILE_EXPLORER_FIELD_VARIABLES).map(([field, variable]) => [variable, values[field]])
  ));
  Object.entries(FILE_EXPLORER_FIELD_ACTIVE_CLASSES).forEach(([field, className]) => {
    element.toggleClass(className, hasActiveValue(values[field]));
  });
}

function applyFileExplorerIndentGuide(folderTitle, style) {
  const folder = folderTitle?.parentElement;
  if (!folder?.classList.contains("nav-folder")) return;
  const color = cssColorValue(style.indentLineColor);
  setCssVariable(folder, FILE_EXPLORER_FIELD_VARIABLES.indentLineColor, color);
  folder.toggleClass(FILE_EXPLORER_FIELD_ACTIVE_CLASSES.indentLineColor, !!color);
}

function cleanScopeClasses(element) {
  Array.from(element.classList)
    .filter((className) => className.startsWith("osc-scope-"))
    .forEach((className) => element.classList.remove(className));
}

function matchesOverride(path, override) {
  const pattern = normalizePathText(override.pattern);
  const normalizedPath = normalizePathText(path);
  if (!pattern) return false;

  if (override.type === "file") {
    return normalizedPath === pattern;
  }

  if (override.type === "path-contains") {
    return normalizedPath.includes(pattern);
  }

  return normalizedPath === pattern || normalizedPath.startsWith(`${pattern}/`);
}

function normalizePathText(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function parseCssSize(value) {
  const match = String(value || "").trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|pt)?$/i);
  if (!match) return { value: "", unit: "px" };
  return { value: match[1], unit: match[2] || "px" };
}

function isValidHeadingSpaceAboveValue(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return false;
  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric >= 0;
}

function headingSpaceAboveCssValue(profile, level) {
  if (profile?.[`h${level}SpaceAboveEnabled`] !== true) return "";
  const value = String(profile[`h${level}SpaceAboveValue`] ?? "").trim();
  const unit = String(profile[`h${level}SpaceAboveUnit`] ?? "").trim();
  if (!isValidHeadingSpaceAboveValue(value) || !HEADING_SPACE_ABOVE_UNITS.includes(unit)) return "";
  return `${value}${unit}`;
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return "";
}

function warnUnsafeStylePatterns(settings) {
  const warnings = [];
  collectProfilesForSafetyCheck(settings).forEach(({ name, profile }) => {
    const oldBaseDefaults =
      normalizeCssSizeText(profile.textSize) === "16px"
      && String(profile.textWeight || "").trim() === "400"
      && String(profile.lineHeight || "").trim() === "1.65";
    if (oldBaseDefaults) warnings.push(`${name} contains old accidental base text defaults`);
  });
  warnings.push(...validateStyleFieldRegistry());
  if (warnings.length) {
    console.warn("[Style Controller] Passive safety warnings:\n- " + warnings.join("\n- "));
  }
}

function collectProfilesForSafetyCheck(settings) {
  const profiles = [{ name: "global profile", profile: settings.global || {} }];
  (settings.overrides || []).forEach((override, index) => {
    profiles.push({ name: `override ${override.name || override.pattern || index}`, profile: override.profile || {} });
  });
  (settings.storedConfigurations || []).forEach((config) => {
    if (config?.data?.global) profiles.push({ name: `stored configuration ${config.name || config.id}`, profile: config.data.global });
    (config?.data?.overrides || []).forEach((override, index) => {
      profiles.push({ name: `stored configuration ${config.name || config.id} override ${index}`, profile: override.profile || {} });
    });
  });
  return profiles;
}

function validateStyleFieldRegistry() {
  const warnings = [];
  ["codeFontFamily", "codeBackground", "codeColor"].forEach((key) => {
    const selectors = STYLE_FIELD_REGISTRY[key]?.selectors || [];
    if (selectors.some((selector) => selector.includes("pre") || selector.includes("HyperMD-codeblock") || selector.includes(".cm-code"))) {
      warnings.push(`${key} has a block-code selector in the registry`);
    }
  });
  ["codeBlockFontFamily", "codeBlockBackground", "codeBlockColor"].forEach((key) => {
    const selectors = STYLE_FIELD_REGISTRY[key]?.selectors || [];
    if (selectors.some((selector) => selector.includes(":not(pre)") || selector.includes("cm-inline-code"))) {
      warnings.push(`${key} has an inline-code selector in the registry`);
    }
  });
  ["fontFamily", "textSize", "textWeight", "lineHeight", "textColor", "backgroundColor"].forEach((key) => {
    const meta = STYLE_FIELD_REGISTRY[key];
    if (!meta?.blankAllowed || !meta?.emitsCss) warnings.push(`${key} does not follow blank/default CSS emission rules`);
  });
  return warnings;
}

function cssStringEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function cssValue(value) {
  return String(value || "").trim();
}

function cssColorValue(value) {
  return normalizeHexColor(value) || "";
}

function cssFontValue(value, options = {}) {
  return validateFont(value, options).valid ? cssValue(value) : "";
}

let nativeSemanticProbeScope = null;
let nativeSemanticProbeUsesReadingView = false;

function withPreviewProbe(callback, profile = null) {
  if (typeof document === "undefined") return "";
  const scope = nativeSemanticProbeScope?.isConnected ? nativeSemanticProbeScope : null;
  const ownerDocument = scope?.ownerDocument || document;
  const host = scope?.querySelector(".view-content") || scope || ownerDocument.body;
  const probe = ownerDocument.createElement("div");
  probe.className = "markdown-preview-view markdown-rendered";
  probe.setCssStyles({ position: "absolute", left: "-99999px", top: "-99999px", visibility: "hidden", pointerEvents: "none" });
  const originalClass = scope?.getAttribute("class");
  const originalStyle = scope?.getAttribute("style");
  if (scope && profile) {
    applyProfileCssVariables(scope, profile);
    applyProfileStateClasses(scope, profile);
  }
  host.appendChild(probe);
  try {
    return callback(probe) || "";
  } finally {
    probe.remove();
    if (scope) {
      if (originalClass === null) scope.removeAttribute("class");
      else scope.setAttribute("class", originalClass);
      if (originalStyle === null) scope.removeAttribute("style");
      else scope.setAttribute("style", originalStyle);
    }
  }
}

function nativeActiveElementForField(field) {
  const scope = nativeSemanticProbeScope?.isConnected ? nativeSemanticProbeScope : null;
  const selectors = STYLE_FIELD_REGISTRY[field]?.selectors || [];
  if (!scope || selectors.length === 0) return null;
  const semanticSelector = nativeSemanticProbeUsesReadingView
    ? {
      codeFontFamily: ".markdown-preview-view :not(pre) > code",
      codeBackground: ".markdown-preview-view :not(pre) > code",
      codeColor: ".markdown-preview-view :not(pre) > code",
      codeBlockFontFamily: ".markdown-rendered pre code",
      codeBlockBackground: ".markdown-rendered pre",
      codeBlockColor: ".markdown-rendered pre code"
    }[field]
    : {
      codeFontFamily: ".markdown-source-view.mod-cm6 .cm-inline-code",
      codeBackground: ".markdown-source-view.mod-cm6 .cm-inline-code",
      codeColor: ".markdown-source-view.mod-cm6 .cm-inline-code",
      codeBlockFontFamily: ".markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock",
      codeBlockBackground: ".markdown-source-view.mod-cm6 .HyperMD-codeblock-bg",
      codeBlockColor: ".markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock"
    }[field];
  if (semanticSelector) {
    const semanticElement = scope.querySelector(semanticSelector);
    if (semanticElement) return semanticElement;
  }
  const viewToken = nativeSemanticProbeUsesReadingView
    ? ".markdown-preview-view"
    : ".markdown-source-view";
  for (const selector of selectors) {
    if (!selector.includes(viewToken)) continue;
    try {
      const element = scope.matches?.(selector) ? scope : scope.querySelector(selector);
      if (element) return element;
    } catch {
      // Ignore selectors that the host browser cannot evaluate and use the semantic fallback.
    }
  }
  return null;
}

function cssDefaultColorForField(field, profile = null) {
  const fallbackVariableByField = {
    textColor: "--text-normal",
    backgroundColor: "--background-primary",
    accentColor: "--interactive-accent",
    linkColor: "--link-color",
    linkHoverColor: "--link-color-hover",
    internalLinkColor: "--link-color",
    externalLinkColor: "--link-external-color",
    boldColor: "--bold-color",
    italicColor: "--italic-color",
    h1Color: "--h1-color",
    h2Color: "--h2-color",
    h3Color: "--h3-color",
    h4Color: "--h4-color",
    h5Color: "--h5-color",
    h6Color: "--h6-color",
    tableHeaderBackground: "--background-secondary",
    tableHeaderColor: "--text-normal",
    tableBorderColor: "--table-border-color",
    tableRowAltBackground: "--background-secondary",
    codeBackground: "--code-background",
    codeColor: "--code-normal",
    codeBlockBackground: "--code-background",
    codeBlockColor: "--code-normal",
    blockquoteBorderColor: "--blockquote-border-color",
    blockquoteBackground: "--background-secondary",
    folderColor: "--nav-item-color",
    fileColor: "--nav-item-color",
    hoverColor: "--nav-item-color-hover",
    hoverBackground: "--nav-item-background-hover",
    activeBackground: "--nav-item-background-active",
    indentLineColor: "--nav-indentation-guide-color",
    collapseIconColor: "--nav-collapse-icon-color",
    focusBorderColor: "--background-modifier-border-focus"
  };
  return withPreviewProbe((probe) => {
    const activeElement = !isFileExplorerColorField(field) && field !== "accentColor"
      ? nativeActiveElementForField(field)
      : null;
    if (activeElement) {
      const style = (activeElement.ownerDocument.defaultView || window).getComputedStyle(activeElement);
      const property = field === "tableBorderColor" ? "borderTopColor"
        : field === "blockquoteBorderColor" ? "borderLeftColor"
          : STYLE_FIELD_REGISTRY[field]?.property === "background" ? "backgroundColor"
            : STYLE_FIELD_REGISTRY[field]?.property;
      const value = property ? normalizeCssColor(style[property]) : "";
      if (value) return value;
    }
    let el = probe;
    let property = "color";
    if (field === "backgroundColor") property = "backgroundColor";
    if (field === "boldColor") el = probe.createEl("strong", { text: "Bold" });
    if (field === "italicColor") el = probe.createEl("em", { text: "Italic" });
    if (field === "linkColor" || field === "linkHoverColor") el = probe.createEl("a", { text: "Link", attr: { href: "#" } });
    if (field === "internalLinkColor") el = probe.createEl("a", { text: "Internal", cls: "internal-link", attr: { href: "Welcome", "data-href": "Welcome" } });
    if (field === "externalLinkColor") el = probe.createEl("a", { text: "External", cls: "external-link", attr: { href: "#external-link-preview" } });
    if (/^h[1-6]Color$/.test(field)) el = probe.createEl(field.slice(0, 2), { text: "Heading" });
    if (field === "tableHeaderBackground" || field === "tableHeaderColor" || field === "tableBorderColor") {
      const table = probe.createEl("table");
      const th = table.createEl("thead").createEl("tr").createEl("th", { text: "Header" });
      el = th;
      property = field === "tableHeaderBackground" ? "backgroundColor" : field === "tableBorderColor" ? "borderColor" : "color";
    }
    if (field === "tableRowAltBackground") {
      const table = probe.createEl("table");
      const tr = table.createEl("tbody").createEl("tr");
      tr.createEl("td", { text: "Cell" });
      el = tr;
      property = "backgroundColor";
    }
    if (field === "codeBackground" || field === "codeColor") {
      el = probe.createEl("code", { text: "code" });
      property = field === "codeBackground" ? "backgroundColor" : "color";
    }
    if (field === "codeBlockBackground" || field === "codeBlockColor") {
      const pre = probe.createEl("pre");
      const code = pre.createEl("code", { text: "const value = true;" });
      el = field === "codeBlockBackground" ? pre : code;
      property = field === "codeBlockBackground" ? "backgroundColor" : "color";
    }
    if (field === "blockquoteBorderColor" || field === "blockquoteBackground") {
      el = probe.createEl("blockquote", { text: "Quote" });
      property = field === "blockquoteBackground" ? "backgroundColor" : "borderColor";
    }
    if (isFileExplorerColorField(field)) {
      probe.className = "nav-files-container";
      const folder = probe.createDiv({ cls: "nav-folder" });
      const folderTitle = folder.createDiv({ cls: "nav-folder-title is-clickable" });
      folderTitle.createDiv({ cls: "nav-folder-collapse-indicator collapse-icon" });
      folderTitle.createDiv({ cls: "nav-folder-title-content", text: "Folder" });
      const fileTitle = folder.createDiv({ cls: "nav-file-title is-clickable" });
      fileTitle.createDiv({ cls: "nav-file-title-content", text: "File.md" });
      const activeFile = folder.createDiv({ cls: "nav-file-title is-clickable is-active" });
      activeFile.createDiv({ cls: "nav-file-title-content", text: "Active.md" });
      el = field === "folderColor" || field === "collapseIconColor" ? folderTitle : fileTitle;
      if (field === "activeBackground") el = activeFile;
      if (field === "collapseIconColor") el = folderTitle.querySelector(".collapse-icon") || folderTitle;
      if (field === "indentLineColor" || field === "focusBorderColor") el = activeFile;
      property = field === "hoverBackground" || field === "activeBackground" ? "backgroundColor"
        : field === "indentLineColor" || field === "focusBorderColor" ? "borderColor"
          : "color";
      if (field === "hoverColor") el.setCssStyles({ color: "var(--nav-item-color-hover)" });
      if (field === "hoverBackground") el.setCssStyles({ backgroundColor: "var(--nav-item-background-hover)" });
      if (field === "activeBackground") el.setCssStyles({ backgroundColor: "var(--nav-item-background-active)" });
      if (field === "indentLineColor") el.setCssStyles({ borderColor: "var(--nav-indentation-guide-color)" });
      if (field === "focusBorderColor") el.setCssStyles({ borderColor: "var(--background-modifier-border-focus)" });
    }
    if (field === "accentColor") {
      const view = probe.ownerDocument.defaultView || window;
      const raw = view.getComputedStyle(probe.ownerDocument.body).getPropertyValue("--interactive-accent").trim();
      el = probe.createSpan();
      el.setCssStyles({ color: raw || "var(--interactive-accent)" });
    }
    const view = probe.ownerDocument.defaultView || window;
    return normalizeCssColor(view.getComputedStyle(el)[property])
      || cssVariableColor(fallbackVariableByField[field])
      || "";
  }, profile);
}

function nativeSemanticElementForField(probe, field) {
  probe.className = "markdown-preview-view markdown-rendered";
  if (field.startsWith("title")) {
    probe.className = nativeSemanticProbeUsesReadingView
      ? "markdown-preview-view markdown-rendered"
      : "markdown-source-view mod-cm6";
    return probe.createDiv({ cls: "inline-title", text: "Untitled" });
  }
  if (/^h[1-6]/.test(field)) {
    return probe.createEl(field.slice(0, 2), { text: "Heading" });
  }
  if (field.startsWith("bold")) return probe.createEl("strong", { text: "Bold" });
  if (field.startsWith("italic")) return probe.createEl("em", { text: "Italic" });
  if (field === "linkColor" || field === "linkHoverColor") {
    return probe.createEl("a", { text: "Link", attr: { href: "#" } });
  }
  if (field === "internalLinkColor") {
    return probe.createEl("a", { text: "Internal", cls: "internal-link", attr: { href: "Welcome", "data-href": "Welcome" } });
  }
  if (field === "externalLinkColor") {
    return probe.createEl("a", { text: "External", cls: "external-link", attr: { href: "#external-link-preview" } });
  }
  if (field.startsWith("table")) {
    const table = probe.createEl("table");
    if (field === "tableRowAltBackground") {
      const tbody = table.createEl("tbody");
      tbody.createEl("tr").createEl("td", { text: "First" });
      return tbody.createEl("tr").createEl("td", { text: "Second" });
    }
    return table.createEl("thead").createEl("tr").createEl("th", { text: "Header" });
  }
  if (field.startsWith("codeBlock")) {
    const pre = probe.createEl("pre");
    const code = pre.createEl("code", { text: "const value = true;" });
    return field === "codeBlockBackground" ? pre : code;
  }
  if (field.startsWith("code")) return probe.createEl("code", { text: "code" });
  if (field.startsWith("blockquote")) return probe.createEl("blockquote", { text: "Quote" });
  if (field === "accentColor") return probe.createEl("button", { text: "Accent", cls: "mod-cta" });
  if (field === "backgroundColor") return probe;
  return probe.createEl("p", { text: "Body text" });
}

function nativeInlineTitleElement() {
  const selector = nativeSemanticProbeUsesReadingView
    ? ".markdown-preview-view .inline-title"
    : ".markdown-source-view.mod-cm6 .inline-title";
  return nativeSemanticProbeScope?.querySelector(selector) || null;
}

function profileWithNativeField(profile, field) {
  if (!profile) return null;
  const nativeProfile = { ...profile, [field]: "" };
  const codeState = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (codeState) nativeProfile[codeState.enabled] = false;
  return nativeProfile;
}

function resolvedNativeValueForField(field, profile = null) {
  const meta = STYLE_FIELD_REGISTRY[field];
  if (isFileExplorerColorField(field)) return cssDefaultColorForField(field);
  if (!meta || typeof document === "undefined") return "";
  const nativeProfile = profileWithNativeField(profile, field);
  if (meta.type === "color") return cssDefaultColorForField(field, nativeProfile);
  return withPreviewProbe((probe) => {
    const element = nativeActiveElementForField(field)
      || (field.startsWith("title") ? nativeInlineTitleElement() : null)
      || nativeSemanticElementForField(probe, field);
    const view = probe.ownerDocument.defaultView || window;
    const style = view.getComputedStyle(element);
    if (field === "accentColor") return normalizeCssColor(style.backgroundColor);
    if (field === "tableBorderColor") return normalizeCssColor(style.borderTopColor);
    if (field === "blockquoteBorderColor") return normalizeCssColor(style.borderLeftColor);
    const property = meta.property === "background" ? "backgroundColor" : meta.property;
    return property ? style.getPropertyValue(property).trim() : "";
  }, nativeProfile);
}

function resolvedNativeDisplayValueForField(field, profile = null) {
  const value = resolvedNativeValueForField(field, profile);
  return STYLE_FIELD_REGISTRY[field]?.type === "font"
    ? normalizeNativeFontFamilyStack(value)
    : value;
}

function resolvedNativePreviewValueForField(field, profile = null) {
  if (STYLE_FIELD_REGISTRY[field]?.type !== "color") return resolvedNativeValueForField(field, profile);
  const nativeProfile = profileWithNativeField(profile, field);
  const activeValue = withPreviewProbe(() => {
    const element = nativeActiveElementForField(field);
    if (!element) return "";
    const style = (element.ownerDocument.defaultView || window).getComputedStyle(element);
    const property = field === "tableBorderColor" ? "borderTopColor"
      : field === "blockquoteBorderColor" ? "borderLeftColor"
        : STYLE_FIELD_REGISTRY[field]?.property === "background" ? "backgroundColor"
          : STYLE_FIELD_REGISTRY[field]?.property;
    const raw = property ? String(style[property] || "").trim() : "";
    if (raw === "transparent" || /^rgba\([^)]*,\s*0\s*\)$/i.test(raw)) return "transparent";
    return normalizeCssColor(raw);
  }, nativeProfile);
  return activeValue || resolvedNativeValueForField(field, profile);
}

function resolvedNativeTitleLineHeight(profile) {
  return withPreviewProbe((probe) => {
    const title = nativeActiveElementForField("titleSize")
      || nativeInlineTitleElement()
      || nativeSemanticElementForField(probe, "titleSize");
    const view = probe.ownerDocument.defaultView || window;
    return view.getComputedStyle(title).lineHeight;
  }, profile);
}

function resolvedNativeLineHeightForField(field, profile) {
  return withPreviewProbe((probe) => {
    const element = nativeActiveElementForField(field) || nativeSemanticElementForField(probe, field);
    return (element.ownerDocument.defaultView || window).getComputedStyle(element).lineHeight;
  }, profileWithNativeField(profile, field));
}

function resolvedColorDefaultForField(field, fallback = "") {
  return resolvedNativeValueForField(field) || (!STYLE_FIELD_REGISTRY[field] ? normalizeHexColor(fallback) : "");
}

function inheritedPlaceholderForField(profile, key, placeholder) {
  if (key === "codeBlockFontFamily") return profile.codeFontFamily || placeholder;
  return placeholder;
}

function isFileExplorerColorField(field) {
  return [
    "folderColor",
    "fileColor",
    "hoverColor",
    "hoverBackground",
    "activeBackground",
    "indentLineColor",
    "collapseIconColor",
    "focusBorderColor"
  ].includes(field);
}

function normalizeCssColor(value) {
  const text = String(value || "").trim();
  if (!text || text === "transparent") return "";
  if (normalizeHexColor(text)) return normalizeHexColor(text);
  const rgb = text.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([^)]+))?\)/i);
  if (!rgb) return "";
  if (rgb[4] !== undefined && Number.parseFloat(rgb[4]) === 0) return "";
  return `#${[rgb[1], rgb[2], rgb[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function cssVariableColor(variable) {
  if (!variable || typeof document === "undefined") return "";
  const probe = document.createElement("span");
  probe.setCssStyles({ color: `var(${variable})` });
  document.body.appendChild(probe);
  const color = normalizeCssColor(window.getComputedStyle(probe).color);
  probe.remove();
  return color;
}

function cssDefaultFontForField(field) {
  return resolvedNativeDisplayValueForField(field);
}

function cssDefaultWeightForField(field) {
  return resolvedNativeValueForField(field);
}

function findScrollParent(element) {
  let current = element;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY}${style.overflow}`);
    if (canScroll && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function hasActiveValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeFontStyle(value) {
  const style = String(value || "").trim().toLowerCase();
  return FONT_STYLE_VALUES.includes(style) ? style : "";
}

function updateControlInactiveState(settingEl, active) {
  settingEl.toggleClass("osc-control-off", !active);
}

function bindControlInactiveState(setting, isActive) {
  const update = () => updateControlInactiveState(setting.settingEl, isActive());
  setting.controlEl.addEventListener("input", update);
  setting.controlEl.addEventListener("change", update);
  update();
}

function createValueStatus(parent, active, inactiveLabel = "Off") {
  const status = parent.createSpan({ cls: "osc-value-status" });
  updateValueStatus(status, active, inactiveLabel);
  return status;
}

function updateValueStatus(status, active, inactiveLabel = "Off") {
  status.setText(active ? "On" : inactiveLabel);
  status.toggleClass("is-active", active);
  status.toggleClass("is-placeholder", !active);
  status.toggleClass("is-error", false);
  status.setAttribute("title", active ? "Saved and applied." : "Using Obsidian's resolved default value.");
}

function updateColorStatus(status, value) {
  const active = hasActiveValue(value);
  const valid = !active || !!normalizeHexColor(value);
  status.setText(!active ? "Off" : valid ? "On" : "Error");
  status.toggleClass("is-active", active && valid);
  status.toggleClass("is-placeholder", !active);
  status.toggleClass("is-error", active && !valid);
  status.setAttribute("title", !active
    ? "Using Obsidian's resolved default value."
    : valid
      ? "Saved and applied."
      : "Use a valid hex color such as #222222.");
}

function updateCodeBackgroundStatus(status, state) {
  status.setText(state.status);
  status.toggleClass("is-active", state.status === "On");
  status.toggleClass("is-placeholder", state.status === "Off" || state.status === "Inherit");
  status.toggleClass("is-error", state.status === "Error");
  status.setAttribute("title", state.status === "Off"
    ? "Using Obsidian's resolved native code background."
    : state.status === "Inherit"
      ? "Inherits the resolved full profile background."
      : state.status === "Error"
        ? `Use a valid hex color; ${DEFAULT_CODE_BACKGROUND} remains effective until corrected.`
        : "Custom override saved and applied.");
}

function updateFontStatus(status, result) {
  const active = result.valid && result.label === "On";
  const placeholder = result.valid && result.label === "Off";
  const error = !result.valid;
  status.setText(result.label);
  status.toggleClass("is-valid", result.valid);
  status.toggleClass("is-invalid", error);
  status.toggleClass("is-active", active);
  status.toggleClass("is-placeholder", placeholder);
  status.toggleClass("is-error", error);
  status.toggleClass("is-hidden", false);
  status.setAttribute("title", result.title);
}

function setDisplayedColorValue(input, value, fallback) {
  input.value = value || fallback || "";
  input.toggleClass("osc-default-color-value", !value && !!fallback);
}

function setDisplayedColorSwatch(swatch, value, fallback) {
  swatch.value = normalizeHexColor(value) || fallback || "#000000";
}

function clearDisplayedDefaultOnFocus(input) {
  input.addEventListener("focus", () => {
    if (input.hasClass("osc-default-color-value")) {
      input.value = "";
      input.toggleClass("osc-default-color-value", false);
    }
  });
}

let scrollTextFieldId = 0;

function singleLineScrollState(inputValue, displayValue, editingBlank = false) {
  const native = !hasActiveValue(inputValue) && !!String(displayValue || "");
  const nativeVisible = native && !editingBlank;
  return {
    native,
    nativeVisible,
    target: nativeVisible ? "native" : "input"
  };
}

class ScrollableSingleLineTextField {
  constructor(input, displayValue = "") {
    this.input = input;
    this.displayValue = String(displayValue || "");
    this.editingBlank = false;
    this.shell = input.ownerDocument.createElement("div");
    this.shell.className = "osc-scroll-text-field";
    input.parentElement?.insertBefore(this.shell, input);
    this.viewport = input.ownerDocument.createElement("div");
    this.viewport.className = "osc-scroll-text-viewport";
    this.shell.appendChild(this.viewport);
    this.viewport.appendChild(input);
    input.addClass("osc-scroll-text-input");

    this.nativeDisplay = input.ownerDocument.createElement("div");
    this.nativeDisplay.className = "osc-scroll-text-native";
    this.nativeDisplay.textContent = this.displayValue;
    this.nativeDisplay.id = `osc-scroll-text-native-${scrollTextFieldId += 1}`;
    this.viewport.appendChild(this.nativeDisplay);

    const describedBy = input.getAttribute("aria-describedby");
    input.setAttribute("aria-describedby", [describedBy, this.nativeDisplay.id].filter(Boolean).join(" "));
    this.nativeDisplay.addEventListener("click", () => {
      if (!this.isNativeValue()) return;
      this.editingBlank = true;
      this.update();
      input.focus({ preventScroll: true });
    });
    input.addEventListener("focus", () => {
      this.editingBlank = this.isNativeValue();
      this.update();
    });
    input.addEventListener("blur", () => {
      this.editingBlank = false;
      this.update();
    });
    input.addEventListener("input", () => {
      this.editingBlank = false;
      this.update();
    });
    this.update();
  }

  state() {
    return singleLineScrollState(this.input.value, this.displayValue, this.editingBlank);
  }

  isNativeValue() {
    return this.state().native;
  }

  update() {
    const state = this.state();
    this.shell.toggleClass("is-native", state.native);
    this.shell.toggleClass("is-editing-native", state.native && !state.nativeVisible);
    this.nativeDisplay.toggleAttribute("aria-hidden", !state.nativeVisible);
  }

  destroy() {
    // All listeners are owned by elements removed with the settings view.
  }
}

function normalizeUserPathPattern(path) {
  return normalizePath(String(path || "")).replace(/^\/+|\/+$/g, "");
}

function ensureFontDatalist() {
  if (document.getElementById("osc-font-suggestions")) return;
  const datalist = document.body.createEl("datalist", { attr: { id: "osc-font-suggestions" } });
  FONT_SUGGESTIONS.forEach((font) => datalist.createEl("option", { value: font }));
}

function validateFont(value, options = {}) {
  const font = String(value || "").trim();
  if (!font || font === "inherit") {
    return { valid: true, label: "Off", title: "Uses the default inherited font." };
  }

  const families = splitFontStack(font);
  const minimumFamilies = options.allowShortStack ? 2 : 3;
  if (families.length < minimumFamilies) {
    return { valid: false, label: "Error", title: "Use at least three font entries, for example: SF Pro Display, Arial, sans-serif. Default font will be used until then." };
  }

  if (!isValidFontFamilyValue(font)) {
    return { valid: false, label: "Error", title: "Use a valid CSS font-family stack, for example: SF Pro Display, Arial, sans-serif." };
  }

  const primaryFont = stripFontQuotes(families[0]);
  if (isGenericFontFamily(primaryFont) || isFontAvailable(primaryFont)) {
    return { valid: true, label: "On", title: "Font stack is valid and will be applied." };
  }

  return {
    valid: true,
    label: "On",
    title: `${primaryFont} was not confirmed by the detector, but the font stack is valid and will be applied with CSS fallback.`
  };
}

function isValidFontFamilyValue(value) {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  return CSS.supports("font-family", value);
}

function isGenericFontFamily(fontName) {
  return new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "emoji",
    "math",
    "fangsong"
  ]).has(String(fontName || "").toLowerCase());
}

function validateFontWeight(value) {
  const weight = String(value || "").trim();
  if (!weight) return { valid: true, label: "Off", title: "Uses inherited/default font weight." };
  if (["normal", "bold", "lighter", "bolder"].includes(weight.toLowerCase())) {
    return { valid: true, label: "On", title: "Valid CSS font weight." };
  }
  const number = Number(weight);
  if (Number.isInteger(number) && number >= 1 && number <= 1000) {
    return { valid: true, label: "On", title: number <= 300 ? "Valid light font weight. Readability depends on the font face." : "Valid CSS font weight." };
  }
  return { valid: false, label: "Error", title: "Use a number from 1-1000, or normal, bold, lighter, bolder." };
}

function splitFontStack(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripFontQuotes(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "").trim();
}

function normalizeNativeFontFamilyStack(value) {
  const seen = new Set();
  return splitFontStack(value)
    .map((family) => stripFontQuotes(family).replace(/\s+/g, " ").trim())
    .filter((family) => family && !/^[?\uFFFD]+$/u.test(family))
    .filter((family) => {
      const key = family.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((family) => /\s/u.test(family)
      ? `"${family.replace(/"/g, "\\\"")}"`
      : family)
    .join(", ");
}

function isFontAvailable(fontName) {
  if (!fontName) return false;
  if (!isFontAvailable.cache) isFontAvailable.cache = new Map();
  if (isFontAvailable.cache.has(fontName)) return isFontAvailable.cache.get(fontName);

  if (document.fonts && typeof document.fonts.check === "function") {
    try {
      if (document.fonts.check(`12px "${cssStringEscape(fontName)}"`)) {
        isFontAvailable.cache.set(fontName, true);
        return true;
      }
    } catch (error) {
      // Fall through to canvas detection for unusual font names.
    }
  }

  const canvas = isFontAvailable.canvas || (isFontAvailable.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  if (!context) return true;

  const sample = "mmmmmmmmmmlli";
  const size = "72px";
  const baselines = ["monospace", "serif", "sans-serif"];
  const baselineWidths = baselines.map((family) => {
    context.font = `${size} ${family}`;
    return context.measureText(sample).width;
  });

  const available = baselines.some((family, index) => {
    context.font = `${size} "${fontName}", ${family}`;
    return context.measureText(sample).width !== baselineWidths[index];
  });
  isFontAvailable.cache.set(fontName, available);
  return available;
}

class OverridePathSuggest {
  constructor(app, inputEl, onChoosePath) {
    this.app = app;
    this.inputEl = inputEl;
    this.onChoosePath = onChoosePath;
    this.suggestions = [];
    this.selectedIndex = 0;
    this.limit = 12;
    this.containerEl = inputEl.parentElement;
    this.containerEl?.addClass("osc-path-suggest");
    this.dropdownEl = this.containerEl.createDiv({ cls: "osc-path-dropdown" });

    this.inputEl.addEventListener("input", () => this.render());
    this.inputEl.addEventListener("focus", () => this.render());
    this.inputEl.addEventListener("keydown", (event) => this.handleKeydown(event));
    this.inputEl.addEventListener("blur", () => {
      window.setTimeout(() => this.close(), 150);
    });
  }

  getSuggestions(query) {
    const normalizedQuery = normalizeUserPathPattern(query);
    if (!normalizedQuery) return [];
    const fuzzySearch = prepareFuzzySearch(normalizedQuery);
    return this.getVaultPaths()
      .filter((path) => fuzzySearch(path))
      .slice(0, this.limit);
  }

  render() {
    this.suggestions = this.getSuggestions(this.inputEl.value);
    this.selectedIndex = 0;
    this.dropdownEl.empty();

    if (this.suggestions.length === 0) {
      this.close();
      return;
    }

    this.fitDropdownToInput();
    this.dropdownEl.addClass("is-visible");
    this.suggestions.forEach((path, index) => {
      const itemEl = this.dropdownEl.createDiv({ cls: "osc-path-option" });
      itemEl.toggleClass("is-selected", index === this.selectedIndex);
      itemEl.createDiv({ cls: "osc-path-option-title", text: path });
      itemEl.createDiv({
        cls: "osc-path-option-note",
        text: this.isFolderPath(path) ? "Folder" : "File"
      });
      itemEl.addEventListener("mousedown", (event) => {
        event.preventDefault();
        void this.choose(path);
      });
    });
  }

  handleKeydown(event) {
    if (event.key === "Enter" && this.suggestions.length > 0) {
      event.preventDefault();
      void this.choose(this.suggestions[this.selectedIndex]);
      return;
    }

    if (event.key === "Escape") {
      this.close();
      return;
    }

    if (this.suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
      this.renderSelection();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderSelection();
    }
  }

  renderSelection() {
    const items = this.dropdownEl.querySelectorAll(".osc-path-option");
    items.forEach((item, index) => item.toggleClass("is-selected", index === this.selectedIndex));
  }

  async choose(path) {
    this.inputEl.value = path;
    await this.onChoosePath(path);
    this.close();
  }

  close() {
    this.dropdownEl.removeClass("is-visible");
    this.dropdownEl.empty();
    this.dropdownEl.removeAttribute("style");
    this.suggestions = [];
    this.selectedIndex = 0;
  }

  fitDropdownToInput() {
    const inputRect = this.inputEl.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const rightPadding = 16;
    const availableWidth = Math.max(180, viewportWidth - inputRect.left - rightPadding);
    this.dropdownEl.setCssStyles({
      left: "0",
      width: `${Math.min(Math.max(inputRect.width, 260), availableWidth)}px`,
      maxWidth: `${availableWidth}px`,
      maxHeight: "260px"
    });
  }

  getVaultPaths() {
    const paths = new Set();
    for (const file of this.app.vault.getAllLoadedFiles()) {
      if (file instanceof TFolder && file.path !== "/") {
        const path = normalizeUserPathPattern(file.path);
        if (path) paths.add(path);
      }
    }
    for (const file of this.app.vault.getFiles()) {
      const path = normalizeUserPathPattern(file.path);
      if (path) paths.add(path);
    }
    return [...paths].sort((a, b) => a.localeCompare(b));
  }

  isFolderPath(path) {
    return this.app.vault.getAbstractFileByPath(path) instanceof TFolder;
  }
}

class StyleControllerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.drafts = new SectionDraftManager();
    this.scrollTextFields = [];
  }

  addScrollableTextField(input, displayValue = input.placeholder) {
    const field = new ScrollableSingleLineTextField(input, displayValue);
    this.scrollTextFields.push(field);
    return field;
  }

  clearScrollableTextFields() {
    this.scrollTextFields.forEach((field) => field.destroy());
    this.scrollTextFields = [];
  }

  getSectionContext(key, targetGetter, label, options = {}) {
    const target = targetGetter();
    if (!target) return null;
    const context = this.drafts.get(key, target);
    context.target = targetGetter;
    context.label = label;
    context.normalize = options.normalize || ((value) => value);
    context.validate = options.validate || (() => []);
    context.commit = options.commit;
    return context;
  }

  getProfileSectionContext(key, label, targetGetter, fields, optional = false) {
    return this.getSectionContext(key, targetGetter, label, {
      normalize: (value) => optional ? normalizeOptionalProfile(value) : normalizeProfile(value),
      validate: (value) => validateProfileSection(value, fields),
      commit: (candidate) => {
        const target = targetGetter();
        if (!target) throw new Error(`${label} target is no longer available`);
        fields.forEach((field) => {
          target[field] = candidate[field];
        });
      }
    });
  }

  getOverrideContext(override) {
    return this.getSectionContext(`override:${override.id}`, () => this.plugin.settings.overrides.find((candidate) => candidate.id === override.id), `${override.name || "Override"} settings`, {
      normalize: normalizeOverride,
      validate: validateOverrideSection,
      commit: (candidate) => {
        const index = this.plugin.settings.overrides.findIndex((current) => current.id === override.id);
        if (index < 0) throw new Error("Override no longer exists");
        this.plugin.settings.overrides[index] = candidate;
      }
    });
  }

  noteDraftMutation(value) {
    return this.drafts.mark(value);
  }

  updateDraftPreview(profile) {
    const context = this.drafts.objectEntries.get(profile);
    this.updatePreview(profile, context?.previewRoot || this.containerEl);
  }

  renderSectionActions(parent, context) {
    if (!context) return;
    const actions = parent.createDiv({ cls: "osc-section-actions" });
    const status = actions.createSpan({ cls: "osc-section-status", text: "Applied" });
    const applyButton = actions.createEl("button", { text: "Apply", cls: "mod-cta" });
    const revertButton = actions.createEl("button", { text: "Revert" });
    context.previewRoot = parent;
    context.updateUi = () => {
      const dirty = context.dirty;
      status.setText(dirty ? "Unsaved changes" : "Applied");
      status.toggleClass("is-dirty", dirty);
      parent.toggleClass("is-dirty", dirty);
      applyButton.disabled = !dirty;
      revertButton.disabled = !dirty;
    };
    applyButton.addEventListener("click", () => void this.applyDraftContext(context));
    revertButton.addEventListener("click", () => this.revertDraftContext(context));
    context.updateUi();
  }

  async applyDraftContext(context) {
    if (!context?.dirty) return;
    const settingsBefore = cloneDraftValue(this.plugin.settings);
    let result;
    try {
      result = await applyDraftAtomically({
        draft: context.value,
        normalize: context.normalize,
        validate: context.validate,
        commit: context.commit,
        persist: () => this.plugin.saveSettings(),
        rollback: () => {
          this.plugin.settings = normalizeSettings(settingsBefore);
          this.plugin.applyStyles();
        }
      });
    } catch (error) {
      new Notice(`Could not apply ${context.label}: ${error.message}`);
      return;
    }
    if (!result.applied) {
      new Notice(`Could not apply ${context.label}: ${result.errors[0]}`);
      return;
    }
    const current = context.target();
    context.value = cloneDraftValue(current);
    context.baseline = cloneDraftValue(current);
    context.dirty = false;
    this.drafts.bind(context);
    context.updateUi?.();
    this.refreshPreservingScroll();
    new Notice(`${context.label} applied.`);
  }

  revertDraftContext(context) {
    if (!context?.dirty) return;
    const current = context.target();
    if (!current) return;
    this.drafts.revert(context.key, current);
    this.refreshPreservingScroll();
    new Notice(`${context.label} reverted.`);
  }

  hasDirtyDrafts() {
    return this.drafts.hasDirty();
  }

  blockIfDirty(action = "leave this section") {
    if (!this.hasDirtyDrafts()) return false;
    new Notice(`Apply or Revert unsaved changes before you ${action}.`);
    return true;
  }

  display() {
    const { containerEl } = this;
    this.clearScrollableTextFields();
    containerEl.empty();
    containerEl.addClass("osc-settings");
    this.renderTopNav(containerEl);

    const activeTab = this.plugin.settings.activeSettingsTab || "global";
    if (activeTab === "global") {
      this.renderProfileSection(containerEl, "Global defaults", this.plugin.settings.global);
    }

    if (activeTab === "interface") {
      this.renderInterfaceSection(containerEl);
    }

    if (activeTab === "callouts") {
      this.renderCalloutSection(containerEl, this.plugin.settings.callouts);
    }

    if (activeTab === "overrides") {
      this.renderOverridesSection(containerEl, false);
    }

    if (activeTab === "fileExplorer") {
      this.renderOverridesSection(containerEl, true);
    }

    if (activeTab === "configurations") {
      this.renderConfigurationsSection(containerEl);
    }
  }

  hide() {
    if (this.hasDirtyDrafts()) {
      new Notice("Unsaved Style Controller changes were not applied.");
    }
    this.drafts = new SectionDraftManager();
    this.clearScrollableTextFields();
    this.containerEl.empty();
  }

  refreshPreservingScroll() {
    const scrollParent = findScrollParent(this.containerEl);
    const scrollTop = scrollParent ? scrollParent.scrollTop : 0;
    this.display();
    window.requestAnimationFrame(() => {
      if (scrollParent) scrollParent.scrollTop = scrollTop;
    });
  }

  refreshNativeDefaults() {
    if (!this.containerEl?.isConnected) return;
    this.refreshPreservingScroll();
  }

  renderTopNav(parent) {
    const nav = parent.createDiv({ cls: "osc-top-nav" });
    [
      ["global", "Style Controller"],
      ["interface", "Interface"],
      ["callouts", "Callouts"],
      ["overrides", "Overrides"],
      ["fileExplorer", "File Explorer"],
      ["configurations", "Configurations"]
    ].forEach(([id, label]) => {
      const button = nav.createEl("button", { text: label });
      button.toggleClass("is-active", (this.plugin.settings.activeSettingsTab || "global") === id);
      button.addEventListener("click", async () => {
        if (this.blockIfDirty("navigate away")) return;
        this.plugin.settings.activeSettingsTab = id;
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }

  renderInterfaceSection(parent) {
    const context = this.getSectionContext("interface:root", () => this.plugin.settings.interface, "Interface settings", {
      normalize: normalizeInterfaceSettings,
      validate: validateInterfaceSection,
      commit: (candidate) => {
        this.plugin.settings.interface = candidate;
      }
    });
    const root = parent.createDiv({ cls: "osc-profile" });
    root.createEl("div", { text: "Interface", cls: "osc-section-heading" });
    this.renderSectionActions(root, context);
    new Setting(root)
      .setName("Bottom-left controls position")
      .setDesc("Choose whether the Help and Settings controls stay in native Obsidian order or move together to the left of the vault footer.")
      .addDropdown((dropdown) => dropdown
        .addOption(BOTTOM_LEFT_CONTROLS_POSITION_NATIVE, "Native")
        .addOption(BOTTOM_LEFT_CONTROLS_POSITION_LEFT, "Left")
        .setValue(context.value.bottomLeftControlsPosition)
        .onChange((value) => {
          context.value.bottomLeftControlsPosition = value;
          this.noteDraftMutation(context.value);
        }));
    new Setting(root)
      .setName("Reading/editing layout")
      .setDesc("Choose whether Reading view and Live Preview use their native layouts or share safe text metrics and horizontal document geometry.")
      .addDropdown((dropdown) => dropdown
        .addOption(READING_EDITING_LAYOUT_NATIVE, "Native")
        .addOption(READING_EDITING_LAYOUT_MATCHED, "Matched")
        .setValue(context.value.readingEditingLayout)
        .onChange((value) => {
          context.value.readingEditingLayout = value;
          this.noteDraftMutation(context.value);
        }));
  }

  renderConfigurationsSection(containerEl) {
    containerEl.createEl("div", { text: "Stored Configurations", cls: "osc-section-heading" });
    new Setting(containerEl)
      .setName("Save current configuration")
      .setDesc("Store the current global styles, callouts, and overrides as a reusable configuration.")
      .addButton((button) => button
        .setButtonText("Save snapshot")
        .setCta()
        .onClick(async () => {
          const name = datedConfigurationName(`Configuration ${this.plugin.settings.storedConfigurations.length + 1}`);
          this.plugin.settings.storedConfigurations.push({
            id: `saved-${Date.now()}`,
            name,
            description: "Saved from current Style Controller settings.",
            data: createConfigurationSnapshot(this.plugin.settings)
          });
          await this.plugin.saveSettings();
          this.refreshPreservingScroll();
          new Notice(`Saved ${name}.`);
        }));

    const importGroup = this.renderCollapsibleGroup(containerEl, "Import configuration");
    let importTextArea;
    new Setting(importGroup)
      .setName("Configuration JSON")
      .setDesc("Paste an exported Style Controller configuration JSON here.")
      .addTextArea((text) => {
        importTextArea = text.inputEl;
        text.inputEl.rows = 8;
        text.setPlaceholder('{"kind":"obsidian-style-controller/configuration","version":1,...}');
      });
    new Setting(importGroup)
      .addButton((button) => button
        .setButtonText("Import")
        .setCta()
        .onClick(async () => {
          try {
            const config = parseConfigurationImport(importTextArea?.value || "");
            this.plugin.settings.storedConfigurations.push(config);
            await this.plugin.saveSettings();
            this.refreshPreservingScroll();
            new Notice(`Imported ${config.name}.`);
          } catch (error) {
            new Notice(`Import failed: ${error.message}`);
          }
        }));

    const list = containerEl.createDiv({ cls: "osc-config-list" });
    this.plugin.settings.storedConfigurations.forEach((config, index) => {
      this.renderStoredConfiguration(list, config, index);
    });
  }

  renderStoredConfiguration(parent, config, index) {
    const card = parent.createDiv({ cls: "osc-config-card" });
    const header = card.createDiv({ cls: "osc-config-card-header" });
    const title = header.createDiv({ cls: "osc-config-title" });
    new Setting(title).setName(config.name).setHeading();
    title.createDiv({
      text: config.description || "No description.",
      cls: `setting-item-description osc-config-description${config.description ? "" : " is-empty"}`
    });
    const actions = header.createDiv({ cls: "osc-config-actions" });
    if (!isBuiltinConfigurationId(config.id)) {
      actions.createEl("button", { text: "Edit", attr: { title: "Rename configuration" } }).addEventListener("click", () => {
        this.showConfigurationEditor(card, config);
      });
    }
    actions.createEl("button", { text: "Apply" }).addEventListener("click", async () => {
      if (this.blockIfDirty("apply a stored configuration")) return;
      await this.applyStoredConfiguration(config);
    });
    actions.createEl("button", { text: "Export" }).addEventListener("click", () => {
      this.showConfigurationExport(card, config);
    });
    if (!isBuiltinConfigurationId(config.id)) {
      const deleteButton = actions.createEl("button", { text: "Delete", cls: "mod-warning" });
      deleteButton.addEventListener("click", async () => {
        this.plugin.settings.storedConfigurations.splice(index, 1);
        await this.plugin.saveSettings();
        this.refreshPreservingScroll();
      });
    }
  }

  showConfigurationEditor(card, config) {
    let editor = card.querySelector(".osc-config-editor");
    if (editor) {
      editor.remove();
      return;
    }
    editor = card.createDiv({ cls: "osc-config-editor" });
    const nameInput = editor.createEl("input", {
      attr: { type: "text", "aria-label": "Configuration name", placeholder: "Configuration name" }
    });
    nameInput.value = config.name || "";
    this.addScrollableTextField(nameInput, "Configuration name");
    const descriptionInput = editor.createEl("textarea", {
      attr: { "aria-label": "Configuration description", placeholder: "Description" }
    });
    descriptionInput.value = config.description || "";
    descriptionInput.rows = 4;
    const controls = editor.createDiv({ cls: "osc-config-editor-actions" });
    controls.createEl("button", { text: "Save" }).addEventListener("click", async () => {
      config.name = nameInput.value.trim() || "Untitled configuration";
      config.description = descriptionInput.value.trim();
      await this.plugin.saveSettings();
      this.refreshPreservingScroll();
    });
    controls.createEl("button", { text: "Cancel" }).addEventListener("click", () => {
      editor.remove();
    });
    nameInput.focus();
    nameInput.select();
  }

  showConfigurationExport(card, config) {
    let exportEl = card.querySelector(".osc-config-export");
    if (!exportEl) {
      exportEl = card.createEl("textarea", { cls: "osc-config-export" });
      exportEl.rows = 10;
      exportEl.readOnly = true;
    }
    exportEl.value = configurationToExport(config);
    exportEl.select();
  }

  async applyStoredConfiguration(config) {
    if (this.blockIfDirty("apply a stored configuration")) return;
    if (config.id === NATIVE_DEFAULT_CONFIGURATION.id) {
      const confirmed = await confirmWithModal(
        this.app,
        "Apply Default configuration?",
        "This restores native Obsidian styling. Saved configurations will remain.",
        "Apply Default"
      );
      if (!confirmed) return;
    }
    const snapshot = normalizeConfigurationData(config.data);
    this.plugin.settings.enabled = true;
    this.plugin.settings.global = snapshot.global;
    this.plugin.settings.callouts = snapshot.callouts;
    this.plugin.settings.overrides = snapshot.overrides;
    await this.plugin.saveSettings();
    this.display();
    new Notice(`Applied ${config.name}.`);
  }

  renderOverridesSection(containerEl, fileExplorerOnly) {
    containerEl.createEl("div", { text: fileExplorerOnly ? "File Explorer Overrides" : "Overrides", cls: "osc-section-heading" });
    new Setting(containerEl)
      .setName("Add override")
      .setDesc(fileExplorerOnly ? "Create a folder/file sidebar style override." : "Create a folder, file, or path-contains note style override.")
      .addButton((button) => button
        .setButtonText("Add")
        .setCta()
        .onClick(async () => {
          if (this.blockIfDirty("add an override")) return;
          this.plugin.settings.overrides.push(normalizeOverride({
            id: String(Date.now()),
            name: "New override",
            type: "folder",
            pattern: "",
            enabled: true,
            modules: fileExplorerOnly ? { fileExplorer: true } : {},
            profile: {}
          }));
          await this.plugin.saveSettings();
          this.refreshPreservingScroll();
        }));

    this.plugin.settings.overrides.forEach((override, index) => {
      this.renderOverride(containerEl, override, index, fileExplorerOnly);
    });
  }

  renderOverride(parent, override, index, fileExplorerOnly = false) {
    const context = this.getOverrideContext(override);
    const draft = context.value;
    const card = parent.createDiv({ cls: `osc-override-card${draft.enabled ? "" : " is-disabled"}` });
    const header = card.createDiv({ cls: "osc-override-card-header" });
    new Setting(header).setName(draft.name || `Override ${index + 1}`).setHeading();
    this.renderSectionActions(header, context);
    this.renderOverrideActions(header, index);

    new Setting(card)
      .setName("Enabled")
      .addToggle((toggle) => toggle
        .setValue(draft.enabled)
        .onChange((value) => {
          draft.enabled = value;
          this.noteDraftMutation(draft);
          this.refreshPreservingScroll();
        }));

    new Setting(card)
      .setName("Name")
      .addText((text) => {
        text.setPlaceholder("Projects style")
          .setValue(draft.name)
          .onChange((value) => {
          draft.name = value;
          this.noteDraftMutation(draft);
          });
        this.addScrollableTextField(text.inputEl, "Projects style");
      });

    new Setting(card)
      .setName("Match type")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("folder", "Folder")
          .addOption("file", "File")
          .addOption("path-contains", "Path contains")
          .setValue(draft.type)
          .onChange((value) => {
            draft.type = value;
            this.noteDraftMutation(draft);
          });
      });

    new Setting(card)
      .setClass("osc-path-pattern-setting")
      .setName("Path pattern")
      .setDesc("Folder prefix, exact file path, or text contained in the note path.")
      .addText((text) => {
        text
          .setPlaceholder("Projects/Client A")
          .setValue(draft.pattern)
          .onChange((value) => {
            draft.pattern = normalizeUserPathPattern(value);
            this.noteDraftMutation(draft);
          });
        let status;
        new OverridePathSuggest(this.app, text.inputEl, async (path) => {
          draft.pattern = path;
          text.setValue(path);
          if (status) updateValueStatus(status, hasActiveValue(path));
          this.noteDraftMutation(draft);
        });
        status = createValueStatus(text.inputEl.parentElement, hasActiveValue(draft.pattern));
        text.inputEl.addEventListener("input", () => updateValueStatus(status, hasActiveValue(text.inputEl.value)));
      });

    if (fileExplorerOnly) {
      this.renderOverrideModuleToggle(card, draft, "fileExplorer", "Enable file explorer styling");
      if (draft.modules.fileExplorer) this.renderFileExplorerOverride(card, draft.fileExplorer, draft);
    } else {
      this.renderOverrideModuleToggle(card, draft, "baseText", "Base text");
      if (draft.modules.baseText) this.renderSettingGroup(card, "Base text", draft.profile, [
        ["fontFamily", "Font family", "Inter, Arial, sans-serif"],
        ["textSize", "Text size", "16"],
        ["textWeight", "Text weight", "400"],
        ["lineHeight", "Line height", "1.65"],
        ["textColor", "Text color", "Default"],
        ["backgroundColor", "Note background", "Default"],
        ["accentColor", "Accent color", "#4f8cff"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "boldItalic", "Bold and italic");
      if (draft.modules.boldItalic) this.renderSettingGroup(card, "Bold and italic", draft.profile, [
        ["boldFontFamily", "Bold font", "Inter, Arial, sans-serif"],
        ["boldFontStyle", "Bold style", "Native/default"],
        ["boldWeight", "Bold weight", "700"],
        ["boldColor", "Bold color", "Default"],
        ["italicFontFamily", "Italic font", "Inter, Arial, sans-serif"],
        ["italicFontStyle", "Italic style", "Native/default"],
        ["italicSize", "Italic size", "16"],
        ["italicWeight", "Italic weight", "inherit"],
        ["italicColor", "Italic color", "Default"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "links", "Links");
      if (draft.modules.links) this.renderSettingGroup(card, "Links", draft.profile, [
        ["linkColor", "Link", "#00ff33"],
        ["linkHoverColor", "Hover", "#ff6b9f"],
        ["internalLinkColor", "Internal", "#6eb47c"],
        ["externalLinkColor", "External", "#66d9ef"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "headings", "Headings and title");
      if (draft.modules.headings) this.renderHeadingGroup(card, draft.profile);

      this.renderOverrideModuleToggle(card, draft, "tablesCodeQuotes", "Tables, code, quotes");
      if (draft.modules.tablesCodeQuotes) this.renderSettingGroup(card, "Tables, code, quotes", draft.profile, [
        ["tableHeaderBackground", "Table header bg", "#1f2937"],
        ["tableHeaderColor", "Table header text", "#ffffff"],
        ["tableBorderColor", "Table border", "#3b4252"],
        ["tableRowAltBackground", "Alt row bg", "#151b22"],
        ["codeFontFamily", "Inline code font", "JetBrains Mono, Menlo, monospace"],
        ["codeBackground", "Inline code bg", DEFAULT_CODE_BACKGROUND],
        ["codeColor", "Inline code text", "#f8f8f2"],
        ["codeBlockFontFamily", "Code block font", "JetBrains Mono, Menlo, monospace"],
        ["codeBlockBackground", "Code block bg", DEFAULT_CODE_BACKGROUND],
        ["codeBlockColor", "Code block base text", "#f8f8f2"],
        ["blockquoteBorderColor", "Quote border", "#4f8cff"],
        ["blockquoteBackground", "Quote bg", "#111827"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "images", "Images");
      if (draft.modules.images) this.renderImageGroup(card, draft.profile);

      this.renderOverrideModuleToggle(card, draft, "advancedCss", "Advanced CSS");
      if (draft.modules.advancedCss) {
        const advanced = this.renderCollapsibleGroup(card, "Advanced CSS");
        new Setting(advanced)
          .setName("Advanced custom CSS")
          .setDesc("Arbitrary CSS injection is unavailable in the Community version. Existing stored custom CSS is preserved but not applied.");
      }
    }

  }

  renderOverrideActions(parent, index) {
    new Setting(parent)
      .setClass("osc-override-actions")
      .addButton((button) => button
        .setButtonText("Move up")
        .setDisabled(index === 0)
        .onClick(async () => {
          if (this.blockIfDirty("reorder or delete an override")) return;
          const overrides = this.plugin.settings.overrides;
          [overrides[index - 1], overrides[index]] = [overrides[index], overrides[index - 1]];
          await this.plugin.saveSettings();
          this.refreshPreservingScroll();
        }))
      .addButton((button) => button
        .setButtonText("Move down")
        .setDisabled(index === this.plugin.settings.overrides.length - 1)
        .onClick(async () => {
          if (this.blockIfDirty("reorder or delete an override")) return;
          const overrides = this.plugin.settings.overrides;
          [overrides[index + 1], overrides[index]] = [overrides[index], overrides[index + 1]];
          await this.plugin.saveSettings();
          this.refreshPreservingScroll();
        }))
      .addButton((button) => button
        .setButtonText("Delete")
        .setDestructive()
        .onClick(async () => {
          if (this.blockIfDirty("reorder or delete an override")) return;
          const override = this.plugin.settings.overrides[index];
          this.plugin.settings.overrides.splice(index, 1);
          if (override) this.drafts.remove(`override:${override.id}`);
          await this.plugin.saveSettings();
          this.refreshPreservingScroll();
        }));
  }

  renderOverrideModuleToggle(parent, override, key, label) {
    new Setting(parent)
      .setName(label)
      .setDesc("Enable this module for the override.")
      .addToggle((toggle) => toggle
        .setValue(override.modules[key] === true)
        .onChange((value) => {
          override.modules[key] = value;
          this.noteDraftMutation(override);
          this.refreshPreservingScroll();
        }));
  }

  renderFileExplorerOverride(parent, style, override = null) {
    const content = this.renderCollapsibleGroup(parent, "File explorer appearance");
    const preview = this.renderFileExplorerPreview(content, style, override);
    const updatePreview = () => this.updateFileExplorerPreview(preview, style, override);
    const grid = content.createDiv({ cls: "osc-setting-grid osc-file-explorer-grid" });
    this.addDirectSetting(grid, style, "folderColor", "Folder text color", "#222222", "color", "Color of matching folder names.", updatePreview);
    this.addDirectSetting(grid, style, "fileColor", "File text color", "#222222", "color", "Color of files inside the matching folder or matching file paths.", updatePreview);
    this.addDirectSetting(grid, style, "hoverColor", "Hover text color", "#222222", "color", "Text color when a matching sidebar item is hovered.", updatePreview);
    this.addDirectSetting(grid, style, "hoverBackground", "Hover background", "#f2f2f2", "color", "Background color when a matching sidebar item is hovered.", updatePreview);
    this.addDirectSetting(grid, style, "activeBackground", "Selected background", "#e8e8e8", "color", "Background color for the active selected file.", updatePreview);
    this.addDirectSetting(grid, style, "indentLineColor", "Vertical line color", "#dddddd", "color", "Color of the nested folder indentation guide line.", updatePreview);
    this.addDirectSetting(grid, style, "collapseIconColor", "Folder arrow color", "#222222", "color", "Color of the expanded/collapsed folder arrow.", updatePreview);
    this.addDirectSetting(grid, style, "focusBorderColor", "Click border color", "#bdbdbd", "color", "Border color shown by Obsidian when the item receives focus.", updatePreview);
    this.addDirectSetting(grid, style, "fontFamily", "Font family", "SF Pro Display, Arial, sans-serif", "font", "", updatePreview)
      .settingEl.classList.add("osc-file-explorer-font-setting");
    this.addDirectSetting(grid, style, "fontWeight", "Font weight", "700", "text", "", updatePreview);
    this.addDirectSetting(grid, style, "prefix", "File prefix", "📓", "text", "", updatePreview);
  }

  renderFileExplorerPreview(parent, style, override) {
    const preview = parent.createDiv({ cls: "osc-mini-preview osc-file-explorer-preview nav-files-container" });
    const root = preview.createDiv({ cls: "nav-folder mod-root" });
    const children = root.createDiv({ cls: "nav-folder-children" });
    const folder = children.createDiv({ cls: "nav-folder" });
    const folderTitle = folder.createDiv({
      cls: "nav-folder-title is-clickable",
      attr: { "data-path": override?.pattern || "Projects/Client A" }
    });
    folderTitle.createDiv({ cls: "nav-folder-collapse-indicator collapse-icon" }).createSpan({ text: "▾" });
    folderTitle.createDiv({ cls: "nav-folder-title-content", text: "Projects" });
    const folderChildren = folder.createDiv({ cls: "nav-folder-children" });
    const fileOne = folderChildren.createDiv({ cls: "nav-file" });
    const fileOneTitle = fileOne.createDiv({
      cls: "nav-file-title is-clickable",
      attr: { "data-path": `${override?.pattern || "Projects/Client A"}/Brief.md` }
    });
    fileOneTitle.createDiv({ cls: "nav-file-title-content", text: "Brief.md" });
    const fileTwo = folderChildren.createDiv({ cls: "nav-file" });
    const fileTwoTitle = fileTwo.createDiv({
      cls: "nav-file-title is-clickable is-active",
      attr: { "data-path": `${override?.pattern || "Projects/Client A"}/Current note.md` }
    });
    fileTwoTitle.createDiv({ cls: "nav-file-title-content", text: "Current note.md" });
    this.updateFileExplorerPreview(preview, style, override);
    return preview;
  }

  updateFileExplorerPreview(preview, style, override) {
    if (!preview) return;
    const folderTitle = preview.querySelector(".nav-folder-title");
    const fileTitles = preview.querySelectorAll(".nav-file-title");
    const activeFile = preview.querySelector(".nav-file-title.is-active");
    const matchPath = override?.pattern || "Projects/Client A";
    const normalized = normalizeUserPathPattern(matchPath) || "Projects/Client A";
    const hoverColor = cssColorValue(style.hoverColor) || resolvedColorDefaultForField("hoverColor");
    const hoverBackground = cssColorValue(style.hoverBackground) || resolvedColorDefaultForField("hoverBackground");
    const activeBackground = cssColorValue(style.activeBackground) || resolvedColorDefaultForField("activeBackground");
    const focusBorderColor = cssColorValue(style.focusBorderColor) || resolvedColorDefaultForField("focusBorderColor");
    if (folderTitle) {
      folderTitle.setAttribute("data-path", normalized);
      folderTitle.setCssStyles({
        fontFamily: cssFontValue(style.fontFamily),
        fontWeight: validateFontWeight(style.fontWeight).valid ? style.fontWeight : "",
        color: cssColorValue(style.folderColor)
      });
      folderTitle.setCssProps({ "--nav-collapse-icon-color": cssColorValue(style.collapseIconColor) || "var(--nav-collapse-icon-color)" });
    }
    preview.querySelector(".nav-folder-title-content")?.setText(normalized.split("/").filter(Boolean).pop() || "Projects");
    preview.setCssProps({
      "--nav-indentation-guide-color": cssColorValue(style.indentLineColor) || "var(--nav-indentation-guide-color)",
      "--osc-file-preview-prefix": JSON.stringify(style.prefix || "")
    });
    fileTitles.forEach((el, index) => {
      el.setAttribute("data-path", index === 0 ? `${normalized}/Brief.md` : `${normalized}/Current note.md`);
      if (style.prefix) {
        el.setAttribute("data-osc-file-preview-prefix", "");
      } else {
        el.removeAttribute("data-osc-file-preview-prefix");
      }
      el.setCssStyles({
        fontFamily: cssFontValue(style.fontFamily),
        fontWeight: validateFontWeight(style.fontWeight).valid ? style.fontWeight : "",
        color: cssColorValue(style.fileColor)
      });
      el.setCssProps({
        "--nav-item-color-hover": hoverColor,
        "--nav-item-background-hover": hoverBackground,
        "--nav-item-background-active": activeBackground,
        "--background-modifier-border-focus": focusBorderColor
      });
    });
    if (activeFile) activeFile.setCssStyles({ backgroundColor: activeBackground });
  }

  renderProfileSection(parent, title, profile) {
    const profileRoot = parent.createDiv({ cls: "osc-profile" });
    profileRoot.createEl("div", { text: title, cls: "osc-section-heading" });

    const target = () => this.plugin.settings.global;
    const baseTextContext = this.getProfileSectionContext("global:baseText", "Base text settings", target, PROFILE_SECTION_FIELDS.baseText);
    this.renderSettingGroup(profileRoot, "Base text", baseTextContext.value, [
      ["fontFamily", "Font family", "Inter, Arial, sans-serif"],
      ["textSize", "Text size", "16"],
      ["textWeight", "Text weight", "400"],
      ["lineHeight", "Line height", "1.65"],
      ["textColor", "Text color", "Default"],
      ["backgroundColor", "Note background", "Default"],
      ["accentColor", "Accent color", "#4f8cff"]
    ], baseTextContext);

    const boldItalicContext = this.getProfileSectionContext("global:boldItalic", "Bold and italic settings", target, PROFILE_SECTION_FIELDS.boldItalic);
    this.renderSettingGroup(profileRoot, "Bold and italic", boldItalicContext.value, [
      ["boldFontFamily", "Bold font", "Inter, Arial, sans-serif"],
      ["boldFontStyle", "Bold style", "Native/default"],
      ["boldWeight", "Bold weight", "700"],
      ["boldColor", "Bold color", "Default"],
      ["italicFontFamily", "Italic font", "Inter, Arial, sans-serif"],
      ["italicFontStyle", "Italic style", "Native/default"],
      ["italicSize", "Italic size", "16"],
      ["italicWeight", "Italic weight", "inherit"],
      ["italicColor", "Italic color", "Default"]
    ], boldItalicContext);

    const linksContext = this.getProfileSectionContext("global:links", "Links settings", target, PROFILE_SECTION_FIELDS.links);
    this.renderSettingGroup(profileRoot, "Links", linksContext.value, [
      ["linkColor", "Link", "#00ff33"],
      ["linkHoverColor", "Hover", "#ff6b9f"],
      ["internalLinkColor", "Internal", "#6eb47c"],
      ["externalLinkColor", "External", "#66d9ef"]
    ], linksContext);

    const headingsContext = this.getProfileSectionContext("global:headings", "Headings and title settings", target, PROFILE_SECTION_FIELDS.headings);
    this.renderHeadingGroup(profileRoot, headingsContext.value, headingsContext);

    const tablesContext = this.getProfileSectionContext("global:tables", "Tables settings", target, PROFILE_SECTION_FIELDS.tables);
    this.renderSettingGroup(profileRoot, "Tables", tablesContext.value, [
      ["tableHeaderBackground", "Table header bg", "#1f2937"],
      ["tableHeaderColor", "Table header text", "#ffffff"],
      ["tableBorderColor", "Table border", "#3b4252"],
      ["tableRowAltBackground", "Alt row bg", "#151b22"]
    ], tablesContext, (content) => this.renderTablePreview(content, tablesContext.value));

    const codeContext = this.getProfileSectionContext("global:code", "Code settings", target, PROFILE_SECTION_FIELDS.code);
    this.renderSettingGroup(profileRoot, "Code", codeContext.value, [
      ["codeFontFamily", "Inline code font", "JetBrains Mono, Menlo, monospace"],
      ["codeBackground", "Inline code bg", DEFAULT_CODE_BACKGROUND],
      ["codeColor", "Inline code text", "#f8f8f2"],
      ["codeBlockFontFamily", "Code block font", "JetBrains Mono, Menlo, monospace"],
      ["codeBlockBackground", "Code block bg", DEFAULT_CODE_BACKGROUND],
      ["codeBlockColor", "Code block base text", "#f8f8f2"]
    ], codeContext, (content) => this.renderCodePreview(content, codeContext.value));

    const quotesContext = this.getProfileSectionContext("global:quotes", "Quotes settings", target, PROFILE_SECTION_FIELDS.quotes);
    this.renderSettingGroup(profileRoot, "Quotes", quotesContext.value, [
      ["blockquoteBorderColor", "Quote border", "#4f8cff"],
      ["blockquoteBackground", "Quote bg", "#111827"]
    ], quotesContext, (content) => this.renderQuotePreview(content, quotesContext.value));

    const imagesContext = this.getProfileSectionContext("global:images", "Images settings", target, PROFILE_SECTION_FIELDS.images);
    this.renderImageGroup(profileRoot, imagesContext.value, imagesContext);

    const advanced = this.renderCollapsibleGroup(profileRoot, "Advanced CSS");
    new Setting(advanced)
      .setName("Advanced custom CSS")
      .setDesc("Arbitrary CSS injection is unavailable in the Community version. Existing stored custom CSS is preserved but not applied.");
  }

  renderSettingGroup(parent, title, profile, fields, context = null, renderPreview = null) {
    const content = this.renderCollapsibleGroup(parent, title);
    this.renderSectionActions(content, context);
    context && (context.previewRoot = content);
    renderPreview?.(content);
    this.renderSectionPreview(content, title, profile);
    if (title === "Base text") {
      this.renderBaseTextControls(content, profile);
      return;
    }
    const grid = content.createDiv({ cls: "osc-setting-grid" });
    fields.forEach(([key, name, placeholder]) => {
      this.addTextSetting(grid, profile, key, name, placeholder);
    });
  }

  renderRichControls(parent, profile) {
    this.renderControlSubsection(parent, "Table", profile, [
      ["tableHeaderBackground", "Header bg", "#1f2937"],
      ["tableHeaderColor", "Header text", "#ffffff"],
      ["tableBorderColor", "Border", "#3b4252"],
      ["tableRowAltBackground", "Alt row bg", "#151b22"]
    ], () => this.renderTablePreview(parent, profile));

    this.renderControlSubsection(parent, "Code", profile, [
      ["codeFontFamily", "Inline font", "JetBrains Mono, Menlo, monospace"],
      ["codeBackground", "Inline bg", DEFAULT_CODE_BACKGROUND],
      ["codeColor", "Inline text", "#f8f8f2"],
      ["codeBlockFontFamily", "Block font", "JetBrains Mono, Menlo, monospace"],
      ["codeBlockBackground", "Block bg", DEFAULT_CODE_BACKGROUND],
      ["codeBlockColor", "Block base text", "#f8f8f2"]
    ], () => this.renderCodePreview(parent, profile));

    this.renderControlSubsection(parent, "Quotes", profile, [
      ["blockquoteBorderColor", "Border", "#4f8cff"],
      ["blockquoteBackground", "Background", "#111827"]
    ], () => this.renderQuotePreview(parent, profile));
  }

  renderControlSubsection(parent, title, profile, fields, renderPreview = null) {
    parent.createEl("div", { text: title, cls: "osc-control-subheading" });
    renderPreview?.();
    const grid = parent.createDiv({ cls: "osc-setting-grid" });
    fields.forEach(([key, name, placeholder]) => {
      this.addTextSetting(grid, profile, key, name, placeholder);
    });
  }

  createCompactPreview(parent, className) {
    const preview = parent.createDiv({
      cls: `osc-mini-preview osc-compact-preview osc-style-scope ${className}`
    });
    const content = preview.createDiv({
      cls: "osc-compact-preview-content markdown-preview-view markdown-rendered"
    });
    return { preview, content };
  }

  renderTablePreview(parent, profile) {
    const { content } = this.createCompactPreview(parent, "osc-rich-preview osc-table-preview");
    const table = content.createEl("table", { cls: "osc-preview-table" });
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    headerRow.createEl("th", { text: "Table header" });
    headerRow.createEl("th", { text: "State" });
    const tbody = table.createEl("tbody");
    const rowOne = tbody.createEl("tr");
    rowOne.createEl("td", { text: "Normal row" });
    rowOne.createEl("td", { text: "Stable" });
    const rowTwo = tbody.createEl("tr", { cls: "osc-preview-table-row" });
    rowTwo.createEl("td", { text: "Alternating row" });
    rowTwo.createEl("td", { text: "Stable" });
    this.updateRichPreview(profile, parent);
  }

  renderCodePreview(parent, profile) {
    const { content } = this.createCompactPreview(parent, "osc-rich-preview osc-code-preview");
    const inlineSample = content.createEl("p", { cls: "osc-inline-code-row" });
    inlineSample.createEl("code", { text: "inline code sample", cls: "osc-inline-code-preview" });
    const codeBlock = content.createDiv({ cls: "osc-code-block-rendered-preview markdown-rendered" });
    void MarkdownRenderer.renderMarkdown(
      "```js\nconst status = \"ready\";\nreturn status;\n```",
      codeBlock,
      "Style Controller Preview.md",
      this.plugin
    ).then(() => this.updateRichPreview(profile, parent));
    this.updateRichPreview(profile, parent);
  }

  renderQuotePreview(parent, profile) {
    const { content } = this.createCompactPreview(parent, "osc-rich-preview osc-quote-preview");
    content.createEl("blockquote", { text: "Blockquote preview text" });
    this.updateRichPreview(profile, parent);
  }

  renderBaseTextControls(parent, profile) {
    const rows = [
      [
        ["textWeight", "Text weight", "400"],
        ["lineHeight", "Line height", "1.65"]
      ],
      [
        ["textColor", "Text color", "Default"],
        ["backgroundColor", "Note background", "Default"],
        ["accentColor", "Accent color", "#4f8cff"]
      ]
    ];

    const root = parent.createDiv({ cls: "osc-base-text-controls" });
    const rowClasses = ["is-metrics-row", "is-color-row"];
    rows.forEach((row, index) => {
      const rowEl = root.createDiv({
        cls: `osc-base-text-row ${rowClasses[index]}`
      });
      row.forEach(([key, name, placeholder]) => {
        this.addTextSetting(rowEl, profile, key, name, placeholder);
      });
    });
  }

  renderHeadingGroup(parent, profile, context = null) {
    const content = this.renderCollapsibleGroup(parent, "Headings and title");
    this.renderSectionActions(content, context);
    context && (context.previewRoot = content);
    this.renderHeadingPreview(content, profile);
    const titleCard = content.createDiv({ cls: "osc-heading-card osc-title-card" });
    titleCard.createEl("div", { text: "Title", cls: "osc-heading-card-title" });
    const titleFontRow = titleCard.createDiv({ cls: "osc-heading-font-row" });
    this.addTextSetting(titleFontRow, profile, "titleFontFamily", "Title font", "");
    const titleMetrics = titleCard.createDiv({ cls: "osc-heading-controls-row osc-title-controls-row" });
    this.addTextSetting(titleMetrics, profile, "titleSize", "Title size", "");
    this.addTextSetting(titleMetrics, profile, "titleWeight", "Title weight", "");
    const grid = content.createDiv({ cls: "osc-heading-grid" });
    for (let level = 1; level <= 6; level += 1) {
      const card = grid.createDiv({ cls: "osc-heading-card" });
      card.createEl("div", { text: `H${level}`, cls: "osc-heading-card-title" });
      const fontRow = card.createDiv({ cls: "osc-heading-font-row" });
      this.addTextSetting(fontRow, profile, `h${level}FontFamily`, "Font", "Inter, Arial, sans-serif");
      const controlsRow = card.createDiv({ cls: "osc-heading-controls-row" });
      this.addTextSetting(controlsRow, profile, `h${level}Size`, "Size", String(parseCssSize(DEFAULT_PROFILE[`h${level}Size`]).value));
      this.addTextSetting(controlsRow, profile, `h${level}Weight`, "Weight", level <= 2 ? "700" : "650");
      this.addTextSetting(controlsRow, profile, `h${level}Color`, "Color", "#ffffff");
      this.addHeadingSpaceAboveControl(controlsRow, profile, level);
    }
  }

  renderImageGroup(parent, profile, context = null) {
    const content = this.renderCollapsibleGroup(parent, "Images");
    this.renderSectionActions(content, context);
    context && (context.previewRoot = content);
    const { content: previewContent } = this.createCompactPreview(content, "osc-rich-preview osc-image-preview");
    const embed = previewContent.createSpan({ cls: "image-embed" });
    embed.createSpan({ cls: "image-wrapper" }).createEl("img", {
      attr: {
        alt: "Image preview",
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' rx='8' fill='%23808080'/%3E%3C/svg%3E"
      }
    });
    this.updateRichPreview(profile, content);
    const grid = content.createDiv({ cls: "osc-images-grid" });
    this.addImageAlignmentControl(grid, profile);
    this.addImageRespectExplicitSizeControl(grid, profile);
    const widthRow = grid.createDiv({ cls: "osc-image-width-row" });
    this.addTextSetting(widthRow, profile, "imageWidth", "Default width", "300");
  }

  addImageAlignmentControl(parent, profile) {
    const setting = new Setting(parent).setName("Alignment");
    setting.settingEl.addClass("osc-image-card", "osc-image-alignment-card");
    setting.addDropdown((dropdown) => {
      dropdown
        .addOption("", "Native/default")
        .addOption("left", "Left")
        .addOption("center", "Center")
        .addOption("right", "Right")
        .setValue(normalizeImageAlignment(profile.imageAlignment))
        .onChange((value) => {
          profile.imageAlignment = normalizeImageAlignment(value);
          this.noteDraftMutation(profile);
          this.updateDraftPreview(profile);
        });
    });
    const status = createValueStatus(setting.controlEl, hasActiveValue(normalizeImageAlignment(profile.imageAlignment)));
    const select = setting.controlEl.querySelector("select");
    select?.addClass("osc-select-wide", "osc-image-alignment-select");
    select?.addEventListener("change", () => updateValueStatus(status, hasActiveValue(select.value)));
    bindControlInactiveState(setting, () => hasActiveValue(normalizeImageAlignment(profile.imageAlignment)));
  }

  addImageRespectExplicitSizeControl(parent, profile) {
    const setting = new Setting(parent)
      .setName("Respect explicit image size")
      .setDesc("When on, default width only targets rendered note images without explicit width, height, or inline sizing.");
    setting.settingEl.addClass("osc-image-card", "osc-image-respect-card");
    let status;
    setting.addToggle((toggle) => toggle
      .setValue(normalizeImageRespectExplicitSize(profile.imageRespectExplicitSize) !== "false")
      .onChange((value) => {
        profile.imageRespectExplicitSize = value ? "" : "false";
        if (status) updateValueStatus(status, !value, "On");
        this.noteDraftMutation(profile);
        this.updateDraftPreview(profile);
      }));
    status = createValueStatus(setting.controlEl, normalizeImageRespectExplicitSize(profile.imageRespectExplicitSize) === "false", "On");
    const input = setting.controlEl.querySelector("input");
    input?.addEventListener("change", () => {
      updateValueStatus(status, !input.checked, "On");
    });
  }

  renderCalloutSection(parent) {
    const context = this.getSectionContext("callouts:root", () => this.plugin.settings.callouts, "Callouts settings", {
      normalize: normalizeCallouts,
      validate: validateCalloutSection,
      commit: (candidate) => {
        this.plugin.settings.callouts = candidate;
      }
    });
    const callouts = context.value;
    const root = parent.createDiv({ cls: "osc-profile" });
    this.calloutSpacingGroups = [];
    this.calloutSpacingPreviews = [];
    this.calloutSpacingViewSelection ||= new Map();
    this.calloutSpacingOpen ||= new Map();
    root.createEl("div", { text: "Callouts", cls: "osc-section-heading" });
    this.renderSectionActions(root, context);
    context.previewRoot = root;

    const global = this.renderCollapsibleGroup(root, "Global callout style");
    new Setting(global)
      .setName("Reset imported callouts")
      .setDesc("Restore the bundled imported callout values.")
      .addButton((button) => button
        .setButtonText("Reset")
        .onClick(() => {
          Object.assign(callouts, cloneCalloutDefaults());
          this.noteDraftMutation(callouts);
          this.refreshPreservingScroll();
        }));
    const globalPreview = this.renderGlobalCalloutPreview(global, callouts);
    const presetPreviews = [];
    const updateGlobalPreview = () => {
      this.updateGlobalCalloutPreview(globalPreview, callouts);
      presetPreviews.forEach(({ preview, preset }) => this.updateCalloutPreview(preview, preset, callouts));
      this.refreshCalloutSpacingPreviews(callouts);
      this.refreshCalloutSpacingPlaceholders(callouts);
    };
    const globalGrid = global.createDiv({ cls: "osc-setting-grid" });
    this.addDirectSetting(globalGrid, callouts, "borderWidth", "Border width", "2", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "radius", "Radius", "8", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "titleSize", "Title size", "18", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "titleFontFamily", "Title font", "Inter, Arial, sans-serif", "font", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-title-font-setting");
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderWidth", "Multi-column border width", "1", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderStyle", "Multi-column border style", "groove", "border-style", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderColor", "Multi-column border color", "#000000", "color", "", updateGlobalPreview);
    this.renderCalloutSpacingControls(global, callouts, updateGlobalPreview);
    const previewGrid = global.createDiv({ cls: "osc-setting-grid osc-callout-global-preview-controls" });
    this.addDirectSetting(previewGrid, callouts, "previewTitle", "Preview title", "Global callout preview", "text", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-preview-text-setting");
    this.addDirectSetting(previewGrid, callouts, "previewBody", "Preview body", "ss", "text", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-preview-text-setting");

    const advanced = callouts.advancedLayouts;
    if (advanced.enabled && advanced.pinToTop) this.renderAdvancedLayoutsSection(root, callouts);
    const presets = this.renderCollapsibleGroup(root, "Named callout types");
    const grid = presets.createDiv({ cls: "osc-callout-grid" });
    callouts.presets.forEach((preset, index) => {
      const card = grid.createDiv({ cls: "osc-callout-card" });
      const title = card.createEl("div", { text: preset.type || `Callout ${index + 1}`, cls: "osc-callout-card-title" });
      const preview = this.renderCalloutPreview(card, preset, callouts);
      presetPreviews.push({ preview, preset });
      const updateCallout = () => {
        title.setText(preset.type || `Callout ${index + 1}`);
        presetPreviews.forEach(({ preview, preset }) => this.updateCalloutPreview(preview, preset, callouts));
        this.updateGlobalCalloutPreview(globalPreview, callouts);
        this.refreshCalloutSpacingPreviews(callouts, preset);
        this.refreshCalloutSpacingPlaceholders(callouts);
      };
      this.addDirectSetting(card, preset, "type", "Type", "email", "text", "", updateCallout);
      this.addDirectSetting(card, preset, "color", "Callout color", "#008293", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "titleColor", "Title color", "#008293", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "backgroundColor", "Background", "#ecf6f3", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "icon", "Icon", "lucide-mail", "text", "", updateCallout);
      this.renderCalloutSpacingControls(card, preset, updateCallout, true, callouts, `preset-${index}`);
      this.addDirectSetting(card, preset, "previewTitle", "Preview title", "Hello", "text", "", updateCallout)
        .settingEl.classList.add("osc-callout-preview-text-setting");
      this.addDirectSetting(card, preset, "previewBody", "Preview body", "ss", "text", "", updateCallout)
        .settingEl.classList.add("osc-callout-preview-text-setting");
      new Setting(card)
        .setName("Hide icon")
        .addToggle((toggle) => toggle
          .setValue(preset.hideIcon)
          .onChange((value) => {
            preset.hideIcon = value;
            this.noteDraftMutation(callouts);
            updateCallout();
          }));
      new Setting(card)
        .addButton((button) => button
          .setButtonText("Delete")
          .setWarning()
          .onClick(() => {
            callouts.presets.splice(index, 1);
            this.noteDraftMutation(callouts);
            this.refreshPreservingScroll();
          }));
    });

    new Setting(presets)
      .setName("Add callout type")
      .addButton((button) => button
        .setButtonText("Add")
        .setCta()
        .onClick(() => {
          callouts.presets.push(normalizeCalloutPreset({
            type: "custom",
            color: "#008293",
            backgroundColor: "#ecf6f3",
            icon: "none",
            previewTitle: "Hello",
            previewBody: "ss"
          }));
          this.noteDraftMutation(callouts);
          this.refreshPreservingScroll();
        }));
    if (!advanced.enabled || !advanced.pinToTop) this.renderAdvancedLayoutsSection(root, callouts);
  }

  renderAdvancedLayoutsSection(parent, callouts) {
    const advanced = callouts.advancedLayouts;
    const root = parent.createDiv({ cls: "osc-advanced-layouts" });
    new Setting(root)
      .setName("Advanced Callout Layouts")
      .setDesc("Opt-in structural layouts for dedicated callout Markdown identifiers.")
      .addToggle((toggle) => toggle.setValue(advanced.enabled).onChange((enabled) => {
        advanced.enabled = enabled;
        this.advancedLayoutsOpen = enabled;
        this.noteDraftMutation(callouts);
        this.refreshPreservingScroll();
      }));
    if (!advanced.enabled) return;
    const details = root.createEl("details", { cls: "osc-setting-group" });
    details.open = this.advancedLayoutsOpen === true;
    details.addEventListener("toggle", () => { this.advancedLayoutsOpen = details.open; });
    details.createEl("summary", { text: "Layouts" });
    const content = details.createDiv({ cls: "osc-setting-group-content" });
    new Setting(content)
      .setName("Pin to top")
      .setDesc("Show this section above Named callout types.")
      .addToggle((toggle) => toggle.setValue(advanced.pinToTop).onChange((pinned) => {
        advanced.pinToTop = pinned;
        this.advancedLayoutsOpen = true;
        this.noteDraftMutation(callouts);
        this.refreshPreservingScroll();
      }));
    if (this.plugin.isMclSnippetEnabled()) {
      content.createDiv({ cls: "osc-layout-warning", text: "MCLMultiColumn is enabled. Style Controller leaves [!multi-column] to MCL; custom identifiers remain available." });
    }
    advanced.layouts.forEach((layout, index) => this.renderAdvancedLayoutCard(content, callouts, layout, index));
    new Setting(content)
      .setName("Add layout")
      .setDesc("Choose a template and create an independent Markdown identifier.")
      .addButton((button) => button.setButtonText("Add layout").setCta().onClick(() => {
        new LayoutTemplateModal(this.app, (template) => {
          const layout = createAdvancedLayout(template, advanced.layouts);
          if (!layout) return;
          advanced.layouts.push(layout);
          this.advancedLayoutsOpen = true;
          this.noteDraftMutation(callouts);
          this.refreshPreservingScroll();
        }).open();
      }));
  }

  renderAdvancedLayoutCard(parent, callouts, layout, index) {
    const advanced = callouts.advancedLayouts;
    const card = parent.createDiv({ cls: "osc-layout-card" });
    const header = new Setting(card)
      .setName(layout.displayName || `Layout ${index + 1}`)
      .setDesc(`[!${layout.markdownId || "?"}] · ${layout.template}`);
    const editor = card.createEl("details", { cls: "osc-setting-group" });
    editor.open = this.openLayoutEditors?.has(layout.id) === true;
    editor.addEventListener("toggle", () => {
      this.openLayoutEditors ||= new Set();
      if (editor.open) this.openLayoutEditors.add(layout.id);
      else this.openLayoutEditors.delete(layout.id);
    });
    editor.createEl("summary", { text: "Edit layout" });
    const editContent = editor.createDiv({ cls: "osc-setting-group-content" });
    const preview = card.createDiv({ cls: "osc-layout-preview osc-style-scope markdown-rendered" });
    preview.setAttribute("data-osc-layout-id", layout.id);
    const update = () => {
      header.setName(layout.displayName || `Layout ${index + 1}`);
      header.setDesc(`[!${layout.markdownId || "?"}] · ${layout.template}`);
      this.updateLayoutPreview(preview, layout);
    };
    header.addToggle((toggle) => toggle.setValue(layout.enabled).onChange((enabled) => {
      layout.enabled = enabled;
      this.noteDraftMutation(callouts);
      card.toggleClass("is-disabled", !enabled);
    }));
    header.addButton((button) => button.setButtonText("Edit").onClick(() => { editor.open = !editor.open; }));
    header.addButton((button) => button.setButtonText("Duplicate").onClick(() => {
      const created = createAdvancedLayout(layout.template, advanced.layouts);
      if (!created) return;
      const duplicate = { ...cloneDraftValue(layout), id: created.id, markdownId: created.markdownId,
        displayName: `${layout.displayName} copy`, builtIn: false, enabled: false };
      advanced.layouts.splice(index + 1, 0, duplicate);
      this.advancedLayoutsOpen = true;
      this.noteDraftMutation(callouts);
      this.refreshPreservingScroll();
    }));
    header.addButton((button) => button.setButtonText("Copy Markdown").onClick(async () => {
      const markdown = layoutMarkdownSample(layout);
      if (!markdown) return new Notice("Use a valid Markdown identifier before copying.");
      try {
        await navigator.clipboard.writeText(markdown);
        new Notice(`Copied Markdown for [!${layout.markdownId}].`);
      } catch {
        new Notice("Clipboard access failed; try again from the desktop app.");
      }
    }));
    header.addButton((button) => button.setButtonText("Delete").setWarning().onClick(() => {
      this.openLayoutEditors?.delete(layout.id);
      advanced.layouts.splice(index, 1);
      this.noteDraftMutation(callouts);
      this.refreshPreservingScroll();
    }));
    card.toggleClass("is-disabled", !layout.enabled);

    this.addDirectSetting(editContent, layout, "displayName", "Display name", "Multi-column", "text", "Does not change Markdown in notes.", update);
    this.addDirectSetting(editContent, layout, "markdownId", "Markdown identifier", "multi-column", "text", "Changing this identifier does not rewrite Markdown notes.", update);
    const definition = ADVANCED_LAYOUT_TEMPLATES.find((template) => template.id === layout.template);
    definition?.renderOptions(this, editContent, layout, callouts, update);
    this.updateLayoutPreview(preview, layout);
  }

  renderMultiColumnOptions(parent, options, callouts, onChange) {
    const grid = parent.createDiv({ cls: "osc-setting-grid" });
    const countSetting = new Setting(grid).setName("Columns");
    countSetting.addText((text) => {
      text.inputEl.type = "number";
      text.inputEl.min = "2";
      text.inputEl.max = "6";
      text.inputEl.step = "1";
      text.setPlaceholder("2")
        .setValue(String(options.columnCount ?? ""))
        .onChange((value) => {
          options.columnCount = Number(value);
          this.noteDraftMutation(callouts);
          this.advancedLayoutsOpen = true;
          this.refreshPreservingScroll();
        });
    });
    this.addDirectSetting(grid, options, "gap", "Column gap", "1em", "size", "", onChange);
    this.addDirectSetting(grid, options, "minWidth", "Minimum width", "200px", "size", "", onChange);
    this.addDirectSetting(grid, options, "breakpoint", "Responsive breakpoint", "600px", "size", "", onChange);
    for (const [field, label, values] of [
      ["wrap", "Wrapping", [["wrap", "Wrap on narrow widths"], ["nowrap", "Keep columns; scroll"]]],
      ["responsive", "Narrow layout", [["auto-fit", "Auto-fit columns"], ["stack", "Stack to one column"]]]
    ]) {
      new Setting(grid).setName(label).addDropdown((dropdown) => {
        values.forEach(([value, text]) => dropdown.addOption(value, text));
        dropdown.setValue(options[field]).onChange((value) => {
          options[field] = value;
          this.noteDraftMutation(callouts);
          onChange?.();
        });
      });
    }
    const count = normalizeLayoutOptions(options).columnCount;
    parent.createEl("div", { text: "Individual column widths", cls: "osc-control-subheading" });
    const widthGrid = parent.createDiv({ cls: "osc-setting-grid" });
    for (let index = 0; index < count; index += 1) {
      const width = options.widths[index] || { ...DEFAULT_LAYOUT_WIDTH };
      const setting = new Setting(widthGrid).setName(`Column ${index + 1}`);
      setting.addDropdown((dropdown) => {
        dropdown.addOption("ratio", "Ratio (fr)").addOption("percent", "Percent (%)").addOption("fixed", "Fixed (px)")
          .setValue(width.mode)
          .onChange((value) => {
            const current = options.widths[index] || width;
            options.widths[index] = { mode: value, value: current.value || "1" };
            this.noteDraftMutation(callouts);
            onChange?.();
          });
      });
      setting.addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0.1";
        text.inputEl.step = "0.1";
        text.setPlaceholder("1")
          .setValue(width.value)
          .onChange((value) => {
            const current = options.widths[index] || width;
            options.widths[index] = { mode: current.mode, value };
            this.noteDraftMutation(callouts);
            onChange?.();
          });
      });
    }
  }

  async updateLayoutPreview(preview, layout) {
    preview.empty();
    const markdown = layoutMarkdownSample(layout);
    if (!markdown) {
      preview.createDiv({ text: "Enter a valid Markdown identifier to preview this layout." });
      return;
    }
    const scope = `.osc-layout-preview:where([data-osc-layout-id="${escapeCssAttributeValue(layout.id)}"])`;
    const css = this.plugin.isMclSnippetEnabled() && calloutTypeKey(layout.markdownId) === "multi-column"
      ? "" : ADVANCED_LAYOUT_TEMPLATES.find((template) => template.id === layout.template)?.buildCss(layout, scope) || "";
    if (css) {
      const style = preview.ownerDocument.createElement("style");
      style.textContent = css;
      preview.appendChild(style);
    }
    const target = preview.createDiv();
    await MarkdownRenderer.renderMarkdown(markdown, target, "Style Controller Layout Preview.md", this.plugin);
  }

  renderCalloutSpacingControls(parent, settings, onChange, inherited = false, callouts = settings, key = "global") {
    const view = this.calloutSpacingViewSelection.get(key) || "reading";
    const separate = settings.spacingByView?.enabled === true;
    const values = separate ? settings.spacingByView[view] : settings;
    const group = { view, separate, inherited, settings, callouts, controls: [] };
    group.measurements = { [view]: measureCalloutSpacingMode(parent.ownerDocument, view,
      calloutSpacingInheritedLayers(callouts, inherited ? settings : null, view, separate), inherited ? settings.type : "note") };
    this.calloutSpacingGroups.push(group);
    const details = parent.createEl("details", { cls: "osc-setting-group osc-callout-spacing-group" });
    details.open = this.calloutSpacingOpen.has(key) ? this.calloutSpacingOpen.get(key) : !parent.classList.contains("osc-callout-card");
    details.addEventListener("toggle", () => this.calloutSpacingOpen.set(key, details.open));
    details.createEl("summary", { text: "Spacing" });
    const content = details.createDiv({ cls: "osc-setting-group-content" });
    const toolbar = content.createDiv({ cls: "osc-callout-spacing-toolbar" });
    new Setting(toolbar).setName("Preview view").addDropdown((dropdown) => dropdown
      .addOption("reading", "Reading View")
      .addOption("live", "Live Preview")
      .setValue(view)
      .onChange((selected) => {
        this.calloutSpacingViewSelection.set(key, selected);
        this.refreshPreservingScroll();
      }));
    new Setting(toolbar).setName("Separate settings by view").addToggle((toggle) => toggle
      .setValue(separate)
      .onChange((enabled) => {
        settings.spacingByView.enabled = enabled;
        this.noteDraftMutation(settings);
        this.refreshPreservingScroll();
      }));
    const preview = inherited
      ? this.renderCalloutPreview(content, settings, callouts, true, view)
      : this.renderGlobalCalloutPreview(content, callouts, true, view);
    this.calloutSpacingPreviews.push({ preview, preset: inherited ? settings : null });
    content.createEl("div", { text: separate
      ? "Empty inherits shared, global, or native spacing."
      : "Empty inherits global or native spacing; shared values apply to both views.", cls: "osc-callout-spacing-help" });
    const commonGrid = content.createDiv({ cls: "osc-setting-grid" });
    CALLOUT_SPACING_COMMON.forEach(([field, label]) => this.addCalloutSpacingSetting(commonGrid, values, field, label, group, onChange));
    const advanced = content.createEl("details", { cls: "osc-setting-group osc-callout-spacing-advanced" });
    advanced.createEl("summary", { text: "Advanced spacing" });
    const advancedGrid = advanced.createDiv({ cls: "osc-setting-group-content osc-setting-grid" });
    CALLOUT_SPACING_ADVANCED.forEach(([field, label]) => this.addCalloutSpacingSetting(advancedGrid, values, field, label, group, onChange));
    const activeLegacy = CALLOUT_SPACING_LEGACY.filter(([field]) => hasActiveValue(values[field]));
    if (activeLegacy.length) {
      const legacy = content.createEl("details", { cls: "osc-setting-group osc-callout-spacing-legacy" });
      legacy.createEl("summary", { text: "Existing detailed overrides" });
      const legacyGrid = legacy.createDiv({ cls: "osc-setting-group-content osc-setting-grid" });
      activeLegacy.forEach(([field, label]) => this.addCalloutSpacingSetting(legacyGrid, values, field, label, group, onChange));
    }
  }

  addCalloutSpacingSetting(parent, values, field, label, group, onChange) {
    const placeholder = calloutSpacingPlaceholder(group.measurements, field, group.view);
    const defaultUnit = calloutSpacingPlaceholderUnit(group.measurements, field, group.view);
    const active = hasActiveValue(values[field]);
    const parsed = parseCssSize(active ? values[field] : "");
    const setting = new Setting(parent).setName(label);
    const wrapper = setting.controlEl.createDiv({ cls: "osc-size-control osc-callout-spacing-size-control" });
    wrapper.toggleClass("is-native", !active);
    const nonNegative = field.toLowerCase().includes("padding") || field === "bodyBlockGap";
    const input = wrapper.createEl("input", { attr: { type: "number", step: "0.1", ...(nonNegative ? { min: "0" } : {}), placeholder, "aria-label": `${label} value` } });
    input.value = active ? parsed.value : "";
    const select = wrapper.createEl("select", { attr: { "aria-label": `${label} unit` } });
    SIZE_UNITS.forEach((unit) => select.createEl("option", { text: unit, value: unit }));
    select.value = active ? parsed.unit : defaultUnit;
    const status = createValueStatus(wrapper, active);
    const save = () => {
      values[field] = input.value ? `${input.value}${select.value}` : "";
      wrapper.toggleClass("is-native", !hasActiveValue(values[field]));
      updateValueStatus(status, hasActiveValue(values[field]));
      this.noteDraftMutation(values);
      onChange?.();
    };
    input.addEventListener("input", save);
    select.addEventListener("change", () => {
      if (input.value) save();
      else select.value = calloutSpacingPlaceholderUnit(group.measurements, field, group.view);
    });
    group.controls.push({ field, input, select, wrapper, values });
    bindControlInactiveState(setting, () => hasActiveValue(values[field]));
  }

  refreshCalloutSpacingPlaceholders(callouts) {
    this.calloutSpacingGroups?.forEach((group) => {
      group.measurements = { [group.view]: measureCalloutSpacingMode(this.containerEl.ownerDocument, group.view,
        calloutSpacingInheritedLayers(callouts, group.inherited ? group.settings : null, group.view, group.separate),
        group.inherited ? group.settings.type : "note") };
      group.controls.forEach(({ field, input, select, wrapper, values }) => {
        input.placeholder = calloutSpacingPlaceholder(group.measurements, field, group.view);
        if (!hasActiveValue(values[field])) {
          select.value = calloutSpacingPlaceholderUnit(group.measurements, field, group.view);
          wrapper.toggleClass("is-native", true);
        }
      });
    });
  }

  refreshCalloutSpacingPreviews(callouts, changedPreset = null) {
    this.calloutSpacingPreviews?.forEach(({ preview, preset }) => {
      if (changedPreset && preset !== changedPreset) return;
      if (preset) this.updateCalloutPreview(preview, preset, callouts);
      else this.updateGlobalCalloutPreview(preview, callouts);
    });
  }

  renderCalloutPreview(parent, preset, callouts = this.plugin.settings.callouts, spacing = false, view = "reading") {
    const preview = parent.createDiv({ cls: `osc-callout-preview osc-style-scope markdown-rendered${spacing ? " osc-callout-spacing-preview" : ""}` });
    if (spacing) preview.setAttribute("data-osc-spacing-view", view);
    this.updateCalloutPreview(preview, preset, callouts);
    return preview;
  }

  renderGlobalCalloutPreview(parent, callouts = this.plugin.settings.callouts, spacing = false, view = "reading") {
    const preview = parent.createDiv({ cls: `osc-callout-preview osc-global-callout-preview osc-style-scope markdown-rendered${spacing ? " osc-callout-spacing-preview" : ""}` });
    if (spacing) preview.setAttribute("data-osc-spacing-view", view);
    this.updateGlobalCalloutPreview(preview, callouts);
    return preview;
  }

  createCalloutPreviewRenderTarget(preview) {
    if (!preview.classList.contains("osc-callout-spacing-preview")) return preview.createDiv();
    const view = preview.getAttribute("data-osc-spacing-view") === "live" ? "live" : "reading";
    const modeRoot = preview.createDiv({ cls: view === "reading"
      ? "markdown-preview-view markdown-rendered" : "markdown-source-view mod-cm6" });
    const content = modeRoot.createDiv({ cls: view === "reading" ? "markdown-preview-sizer" : "cm-content" });
    return view === "reading" ? content : content.createDiv({ cls: "cm-embed-block" });
  }

  async updateGlobalCalloutPreview(preview, callouts = this.plugin.settings.callouts) {
    preview.empty();
    const renderTarget = this.createCalloutPreviewRenderTarget(preview);
    const spacing = preview.classList.contains("osc-callout-spacing-preview");
    const title = spacing ? CALLOUT_SPACING_PREVIEW_TITLE : String(callouts.previewTitle || "").trim() || "Global callout preview";
    const body = spacing ? CALLOUT_SPACING_PREVIEW_BODY : String(callouts.previewBody || "").trim() || "ss";
    const bodyLines = calloutPreviewBodyMarkdown(body);
    await MarkdownRenderer.renderMarkdown(`> [!note] ${title}\n${bodyLines}`, renderTarget, "", this.plugin);
    if (!preview.contains(renderTarget)) return;
    applyCalloutCssVariables(preview, callouts);
    const preset = spacing ? null : effectiveCalloutPresets(callouts.presets).get("note");
    applyCalloutPresetToPreview(preview, preset);
    applyCalloutSpacingToPreview(preview, callouts, preset, spacing ? preview.getAttribute("data-osc-spacing-view") : null);
  }

  async updateCalloutPreview(preview, preset, callouts = this.plugin.settings.callouts) {
    preview.empty();
    const renderTarget = this.createCalloutPreviewRenderTarget(preview);
    const type = String(preset.type || "note").trim() || "note";
    const spacing = preview.classList.contains("osc-callout-spacing-preview");
    const title = spacing ? CALLOUT_SPACING_PREVIEW_TITLE : String(preset.previewTitle || "").trim() || "Hello";
    const body = spacing ? CALLOUT_SPACING_PREVIEW_BODY : String(preset.previewBody || "").trim() || "ss";
    const bodyLines = calloutPreviewBodyMarkdown(body);
    await MarkdownRenderer.renderMarkdown(`> [!${type}] ${title}\n${bodyLines}`, renderTarget, "", this.plugin);
    if (!preview.contains(renderTarget)) return;
    applyCalloutCssVariables(preview, callouts);
    const effectivePreset = effectiveCalloutPresets(callouts.presets).get(calloutTypeKey(type)) || preset;
    applyCalloutPresetToPreview(preview, effectivePreset);
    applyCalloutSpacingToPreview(preview, callouts, effectivePreset, spacing ? preview.getAttribute("data-osc-spacing-view") : null);
  }

  renderSectionPreview(parent, title, profile) {
    if (title === "Base text") {
      const { content } = this.createCompactPreview(parent, "osc-base-preview");
      content.createEl("p", { text: "Regular body text preview with enough words to judge spacing and readability." });
      this.updateBasePreview(profile, parent);
      return;
    }

    if (title === "Bold and italic") {
      const { content } = this.createCompactPreview(parent, "osc-emphasis-preview");
      void MarkdownRenderer.renderMarkdown(
        "Normal surrounding text with **bold text** and *italic text* samples.",
        content,
        "Style Controller Preview.md",
        this.plugin
      ).then(() => this.updateBasePreview(profile, parent));
      this.updateBasePreview(profile, parent);
      return;
    }

    if (title === "Links") {
      const { content } = this.createCompactPreview(parent, "osc-links-preview");
      void MarkdownRenderer.render(
        this.app,
        "[[Welcome|Internal link]] [External link](#external-link-preview) [Normal link](#normal-link-preview)",
        content,
        "Style Controller Preview.md",
        this.plugin
      );
      this.updateLinksPreview(profile, parent);
      return;
    }

  }

  renderHeadingPreview(parent, profile) {
    const { content } = this.createCompactPreview(parent, "osc-heading-preview");
    const grid = content.createDiv({ cls: "osc-heading-preview-grid" });
    grid.createDiv({ text: "Note title", cls: "inline-title osc-heading-preview-title" });
    for (let level = 1; level <= 6; level += 1) {
      grid.createEl(`h${level}`, { text: `Heading ${level}`, cls: `osc-heading-preview-h${level}` });
    }
    this.updateHeadingPreview(profile, parent);
  }

  updatePreview(profile = this.plugin.settings.global, root = this.containerEl) {
    this.updateBasePreview(profile, root);
    this.updateLinksPreview(profile, root);
    this.updateHeadingPreview(profile, root);
    this.updateRichPreview(profile, root);
  }

  updateBasePreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-base-preview, .osc-emphasis-preview")
      .forEach((preview) => applyProfileToPreview(preview, profile));
  }

  updateLinksPreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-links-preview")
      .forEach((preview) => applyProfileToPreview(preview, profile));
  }

  updateHeadingPreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-heading-preview").forEach((preview) => {
      applyProfileToPreview(preview, profile);
    });
  }

  updateRichPreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-rich-preview")
      .forEach((preview) => applyProfileToPreview(preview, profile));
  }

  renderCollapsibleGroup(parent, title) {
    const details = parent.createEl("details", { cls: "osc-setting-group" });
    details.open = true;
    details.createEl("summary", { text: title });
    return details.createDiv({ cls: "osc-setting-group-content" });
  }

  addTextSetting(parent, profile, key, name, placeholder) {
    const setting = new Setting(parent).setName(name);
    const nativeValue = resolvedNativeDisplayValueForField(key, profile);
    const resolvedPlaceholder = STYLE_FIELD_REGISTRY[key]
      ? nativeValue
      : inheritedPlaceholderForField(profile, key, placeholder);
    setting.settingEl.setAttribute("data-osc-field", key);
    setting.settingEl.setAttribute("data-osc-native-value", nativeValue);
    setting.settingEl.toggleClass("osc-font-setting", FONT_FIELDS.has(key));
    if (key === "lineHeight") {
      this.addLineHeightControl(setting, profile, resolvedPlaceholder);
    } else if (SIZE_FIELDS.has(key)) {
      this.addSizeControl(setting, profile, key, resolvedPlaceholder);
    } else if (COLOR_FIELDS.has(key)) {
      this.addColorControl(setting, profile, key, resolvedPlaceholder);
    } else if (FONT_FIELDS.has(key)) {
      this.addFontControl(setting, profile, key, resolvedPlaceholder);
    } else if (FONT_WEIGHT_FIELDS.has(key)) {
      this.addWeightControl(setting, profile, key, resolvedPlaceholder);
    } else if (STYLE_FIELD_REGISTRY[key]?.type === "style") {
      this.addFontStyleControl(setting, profile, key);
    } else {
      setting.addText((text) => {
        text.setPlaceholder(resolvedPlaceholder)
          .setValue(profile[key] || "")
          .onChange((value) => {
          profile[key] = value;
          this.noteDraftMutation(profile);
          this.updateDraftPreview(profile);
          });
        this.addScrollableTextField(text.inputEl, resolvedPlaceholder);
      });
      const status = createValueStatus(setting.controlEl, hasActiveValue(profile[key]));
      const input = setting.controlEl.querySelector("input");
      input?.addEventListener("input", () => updateValueStatus(status, hasActiveValue(input.value)));
    }
    const codeStateFields = CODE_BACKGROUND_CUSTOM_FIELDS[key];
    bindControlInactiveState(setting, () => codeStateFields
      ? profile[codeStateFields.enabled] === true && hasActiveValue(profile[key])
      : hasActiveValue(profile[key]));
  }

  addSizeControl(setting, profile, key, placeholder) {
    const hasValue = hasActiveValue(profile[key]);
    const parsed = parseCssSize(hasValue ? profile[key] : "");
    const wrapper = setting.controlEl.createDiv({ cls: "osc-size-control" });
    const input = wrapper.createEl("input", {
      attr: { type: "number", step: "0.1", placeholder: String(parseCssSize(placeholder).value || "") }
    });
    input.value = hasValue ? parsed.value : "";
    const select = wrapper.createEl("select");
    SIZE_UNITS.forEach((unit) => select.createEl("option", { text: unit, value: unit }));
    select.value = hasValue ? parsed.unit : parseCssSize(placeholder).unit;
    const status = createValueStatus(wrapper, hasValue);

    const save = () => {
      profile[key] = input.value ? `${input.value}${select.value}` : "";
      updateValueStatus(status, hasActiveValue(profile[key]));
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    };
    input.addEventListener("input", save);
    select.addEventListener("change", save);
  }

  addLineHeightControl(setting, profile, placeholder) {
    const hasValue = hasActiveValue(profile.lineHeightValue);
    const native = parseLineHeight(placeholder);
    const wrapper = setting.controlEl.createDiv({ cls: "osc-size-control osc-line-height-control" });
    const input = wrapper.createEl("input", {
      attr: { type: "number", min: "0.1", step: "0.1", inputmode: "decimal", placeholder: native.value }
    });
    input.value = hasValue ? profile.lineHeightValue : "";
    const select = wrapper.createEl("select", { attr: { "aria-label": "Line height unit" } });
    LINE_HEIGHT_UNITS.forEach((unit) => select.createEl("option", { text: unit, value: unit }));
    select.value = hasValue && LINE_HEIGHT_UNITS.includes(profile.lineHeightUnit)
      ? profile.lineHeightUnit
      : native.unit;
    const status = createValueStatus(wrapper, hasValue);

    const save = () => {
      profile.lineHeightValue = input.value;
      profile.lineHeightUnit = select.value;
      profile.lineHeight = lineHeightCssValue(profile);
      const valid = !input.value || isValidLineHeightValue(input.value);
      input.setCustomValidity(valid ? "" : "Enter a finite value greater than zero.");
      updateValueStatus(status, hasActiveValue(profile.lineHeight));
      updateControlInactiveState(setting.settingEl, hasActiveValue(profile.lineHeight));
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    };
    input.addEventListener("input", save);
    select.addEventListener("change", save);
  }

  addHeadingSpaceAboveControl(parent, profile, level) {
    const enabledField = `h${level}SpaceAboveEnabled`;
    const valueField = `h${level}SpaceAboveValue`;
    const unitField = `h${level}SpaceAboveUnit`;
    const setting = new Setting(parent).setName("Space above");
    setting.settingEl.addClass("osc-heading-space-above-setting");
    const labelId = `osc-h${level}-space-above-label`;
    setting.nameEl?.setAttribute("id", labelId);

    const wrapper = setting.controlEl.createDiv({ cls: "osc-size-control osc-heading-space-above-control" });
    const input = wrapper.createEl("input", {
      attr: {
        type: "number",
        min: "0",
        step: "0.1",
        inputmode: "decimal",
        "aria-labelledby": labelId
      }
    });
    input.value = String(profile[valueField] ?? "").trim() || "0";
    const select = wrapper.createEl("select", {
      attr: { "aria-label": `H${level} Space above unit` }
    });
    HEADING_SPACE_ABOVE_UNITS.forEach((unit) => select.createEl("option", { text: unit, value: unit }));
    select.value = HEADING_SPACE_ABOVE_UNITS.includes(profile[unitField]) ? profile[unitField] : "px";
    const status = wrapper.createSpan({ cls: "osc-value-status" });

    const updateStatus = () => {
      const enabled = profile[enabledField] === true;
      const valid = isValidHeadingSpaceAboveValue(profile[valueField])
        && HEADING_SPACE_ABOVE_UNITS.includes(profile[unitField]);
      status.setText(!enabled ? "Off" : valid ? "On" : "Error");
      status.toggleClass("is-active", enabled && valid);
      status.toggleClass("is-placeholder", !enabled);
      status.toggleClass("is-error", enabled && !valid);
      status.setAttribute("title", !enabled
        ? "Using Obsidian's resolved default spacing."
        : valid ? "Saved and applied." : "Enter a finite non-negative value.");
      input.setCustomValidity(enabled && !isValidHeadingSpaceAboveValue(input.value)
        ? "Enter a finite non-negative value."
        : "");
      updateControlInactiveState(setting.settingEl, enabled);
    };
    const saveValue = () => {
      profile[valueField] = input.value;
      profile[unitField] = select.value;
      updateStatus();
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    };
    input.addEventListener("input", saveValue);
    select.addEventListener("change", saveValue);
    setting.addToggle((toggle) => {
      toggle
        .setValue(profile[enabledField] === true)
        .onChange((enabled) => {
          profile[enabledField] = enabled;
          if (!hasActiveValue(profile[valueField])) profile[valueField] = input.value || "0";
          if (!HEADING_SPACE_ABOVE_UNITS.includes(profile[unitField])) profile[unitField] = select.value;
          updateStatus();
          this.noteDraftMutation(profile);
          this.updateDraftPreview(profile);
        });
      toggle.toggleEl.setAttribute("aria-label", `H${level} Space above On or Off`);
    });
    updateStatus();
  }

  addColorControl(setting, profile, key, placeholder) {
    const wrapper = setting.controlEl.createDiv({ cls: "osc-color-control" });
    const swatch = wrapper.createEl("input", { attr: { type: "color", "aria-label": `${key} color picker` } });
    const resolvedDefault = resolvedColorDefaultForField(key);
    const input = wrapper.createEl("input", {
      attr: { type: "text", placeholder: resolvedDefault || placeholder, "aria-label": `${key} color value` }
    });
    const codeStateFields = CODE_BACKGROUND_CUSTOM_FIELDS[key];
    if (codeStateFields) {
      const optional = profile[codeStateFields.enabled] === "";
      const status = wrapper.createSpan({ cls: "osc-value-status" });

      const updateControl = () => {
        const state = codeBackgroundUiState(profile, key, optional);
        input.value = state.displayedValue;
        input.toggleClass("osc-default-color-value", false);
        swatch.value = normalizeHexColor(state.displayedValue) || DEFAULT_CODE_BACKGROUND;
        updateCodeBackgroundStatus(status, state);
      };
      const updateValue = (value) => {
        setCodeBackgroundCustomInput(profile, key, value, optional);
        this.noteDraftMutation(profile);
        updateControl();
        this.updateDraftPreview(profile);
      };

      input.addEventListener("focus", () => {
        if (!codeBackgroundUiState(profile, key, optional).enabled) input.value = "";
      });
      input.addEventListener("input", () => updateValue(input.value));
      input.addEventListener("blur", () => {
        if (!input.value.trim()) updateControl();
      });
      swatch.addEventListener("input", () => updateValue(swatch.value));
      updateControl();
      return;
    }

    setDisplayedColorValue(input, profile[key] || "", resolvedDefault);
    clearDisplayedDefaultOnFocus(input);
    setDisplayedColorSwatch(swatch, profile[key] || "", resolvedDefault);
    const status = wrapper.createSpan({ cls: "osc-value-status" });
    updateColorStatus(status, profile[key]);

    const save = (value) => {
      setDisplayedColorValue(input, value, resolvedDefault);
      setDisplayedColorSwatch(swatch, value, resolvedDefault);
      profile[key] = value;
      updateColorStatus(status, profile[key]);
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    };
    swatch.addEventListener("input", () => save(swatch.value));
    input.addEventListener("input", () => {
      const value = input.value.trim();
      input.toggleClass("osc-default-color-value", false);
      setDisplayedColorSwatch(swatch, value, resolvedDefault);
      profile[key] = value;
      updateColorStatus(status, profile[key]);
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    });
  }

  addFontControl(setting, profile, key, placeholder) {
    const wrapper = setting.controlEl.createDiv({ cls: "osc-font-control" });
    const resolvedDefault = placeholder || cssDefaultFontForField(key);
    const input = wrapper.createEl("input", {
      attr: { type: "text", placeholder: resolvedDefault || placeholder, list: "osc-font-suggestions" }
    });
    input.value = profile[key] || "";
    const status = wrapper.createEl("span", { cls: "osc-font-status", text: "?" });
    ensureFontDatalist();
    this.addScrollableTextField(input, resolvedDefault || placeholder);

    const updateStatus = () => {
      updateFontStatus(status, validateFont(input.value, STYLE_FIELD_REGISTRY[key]));
    };

    input.addEventListener("input", () => {
      profile[key] = input.value;
      updateStatus();
      this.noteDraftMutation(profile);
      this.updateDraftPreview(profile);
    });
    updateStatus();
  }

  addWeightControl(setting, profile, key, placeholder) {
    const resolvedDefault = cssDefaultWeightForField(key);
    setting.addText((text) => text
      .setPlaceholder(resolvedDefault || placeholder)
      .setValue(profile[key] || "")
      .onChange((value) => {
        profile[key] = value;
        this.noteDraftMutation(profile);
        this.updateDraftPreview(profile);
      }));
    const input = setting.controlEl.querySelector("input");
    const status = setting.controlEl.createSpan({ cls: "osc-font-status" });
    const updateStatus = () => {
      updateFontStatus(status, validateFontWeight(input?.value || ""));
    };
    input?.addEventListener("input", updateStatus);
    updateStatus();
  }

  addFontStyleControl(setting, profile, key) {
    let status;
    setting.addDropdown((dropdown) => dropdown
      .addOption("", "Native/default")
      .addOption("normal", "Upright")
      .addOption("italic", "Italic")
      .setValue(normalizeFontStyle(profile[key]))
      .onChange((value) => {
        profile[key] = normalizeFontStyle(value);
        updateValueStatus(status, hasActiveValue(profile[key]));
        this.noteDraftMutation(profile);
        this.updateDraftPreview(profile);
      }));
    status = createValueStatus(setting.controlEl, hasActiveValue(normalizeFontStyle(profile[key])));
  }

  addDirectSetting(parent, object, key, name, placeholder, type, description = "", onChange = null) {
    const setting = new Setting(parent).setName(name);
    if (description) setting.setDesc(description);
    if (type === "size") {
      this.addDirectSizeControl(setting, object, key, placeholder, onChange);
    } else if (type === "color") {
      this.addDirectColorControl(setting, object, key, placeholder, onChange);
    } else if (type === "font") {
      this.addDirectFontControl(setting, object, key, placeholder, onChange);
    } else if (type === "border-style") {
      this.addDirectBorderStyleControl(setting, object, key, onChange);
    } else if (FONT_WEIGHT_FIELDS.has(key)) {
      this.addDirectWeightControl(setting, object, key, placeholder, onChange);
    } else {
      setting.addText((text) => {
        text.setPlaceholder(placeholder)
          .setValue(object[key] || "")
          .onChange((value) => {
          object[key] = value;
          this.noteDraftMutation(object);
          onChange?.();
          });
        this.addScrollableTextField(text.inputEl, placeholder);
      });
      const status = createValueStatus(setting.controlEl, hasActiveValue(object[key]));
      const input = setting.controlEl.querySelector("input");
      input?.addEventListener("input", () => updateValueStatus(status, hasActiveValue(input.value)));
    }
    bindControlInactiveState(setting, () => hasActiveValue(object[key]));
    return setting;
  }

  addDirectBorderStyleControl(setting, object, key, onChange = null) {
    let status;
    setting.addDropdown((dropdown) => {
      dropdown.addOption("", "Native/default");
      BORDER_STYLES.forEach((style) => dropdown.addOption(style, style));
      const saved = String(object[key] || "").trim();
      if (saved && !BORDER_STYLES.includes(saved)) dropdown.addOption(saved, `${saved} (saved value)`);
      dropdown.setValue(saved).onChange((value) => {
        object[key] = value;
        updateValueStatus(status, hasActiveValue(value));
        this.noteDraftMutation(object);
        onChange?.();
      });
    });
    status = createValueStatus(setting.controlEl, hasActiveValue(object[key]));
  }

  addDirectSizeControl(setting, object, key, placeholder, onChange = null) {
    const hasValue = hasActiveValue(object[key]);
    const parsed = parseCssSize(hasValue ? object[key] : "");
    const wrapper = setting.controlEl.createDiv({ cls: "osc-size-control" });
    const input = wrapper.createEl("input", {
      attr: { type: "number", step: "0.1", placeholder: String(parseCssSize(placeholder).value || "") }
    });
    input.value = hasValue ? parsed.value : "";
    const select = wrapper.createEl("select");
    SIZE_UNITS.forEach((unit) => select.createEl("option", { text: unit, value: unit }));
    select.value = hasValue ? parsed.unit : parseCssSize(placeholder).unit;
    const status = createValueStatus(wrapper, hasValue);

    const save = () => {
      object[key] = input.value ? `${input.value}${select.value}` : "";
      updateValueStatus(status, hasActiveValue(object[key]));
      this.noteDraftMutation(object);
      onChange?.();
    };
    input.addEventListener("input", save);
    select.addEventListener("change", save);
  }

  addDirectColorControl(setting, object, key, placeholder, onChange = null) {
    const wrapper = setting.controlEl.createDiv({ cls: "osc-color-control" });
    const swatch = wrapper.createEl("input", { attr: { type: "color" } });
    const resolvedDefault = resolvedColorDefaultForField(key, placeholder);
    const input = wrapper.createEl("input", { attr: { type: "text", placeholder: resolvedDefault || placeholder } });
    setDisplayedColorValue(input, object[key] || "", resolvedDefault);
    clearDisplayedDefaultOnFocus(input);
    setDisplayedColorSwatch(swatch, object[key] || "", resolvedDefault);
    const status = wrapper.createSpan({ cls: "osc-value-status" });
    updateColorStatus(status, object[key]);

    const save = (value) => {
      setDisplayedColorValue(input, value, resolvedDefault);
      setDisplayedColorSwatch(swatch, value, resolvedDefault);
      object[key] = value;
      updateColorStatus(status, object[key]);
      this.noteDraftMutation(object);
      onChange?.();
    };
    swatch.addEventListener("input", () => save(swatch.value));
    input.addEventListener("input", () => {
      const value = input.value.trim();
      input.toggleClass("osc-default-color-value", false);
      setDisplayedColorSwatch(swatch, value, resolvedDefault);
      object[key] = value;
      updateColorStatus(status, object[key]);
      this.noteDraftMutation(object);
      onChange?.();
    });
  }

  addDirectFontControl(setting, object, key, placeholder, onChange = null) {
    const wrapper = setting.controlEl.createDiv({ cls: "osc-font-control" });
    const resolvedDefault = cssDefaultFontForField(key);
    const input = wrapper.createEl("input", {
      attr: { type: "text", placeholder: resolvedDefault || placeholder, list: "osc-font-suggestions" }
    });
    input.value = object[key] || "";
    const status = wrapper.createEl("span", { cls: "osc-font-status", text: "?" });
    ensureFontDatalist();
    this.addScrollableTextField(input, resolvedDefault || placeholder);

    const updateStatus = () => {
      updateFontStatus(status, validateFont(input.value, STYLE_FIELD_REGISTRY[key]));
    };

    input.addEventListener("input", () => {
      object[key] = input.value;
      updateStatus();
      this.noteDraftMutation(object);
      onChange?.();
    });
    updateStatus();
  }

  addDirectWeightControl(setting, object, key, placeholder, onChange = null) {
    const resolvedDefault = cssDefaultWeightForField(key);
    setting.addText((text) => text
      .setPlaceholder(resolvedDefault || placeholder)
      .setValue(object[key] || "")
      .onChange((value) => {
        object[key] = value;
        this.noteDraftMutation(object);
        onChange?.();
      }));
    const input = setting.controlEl.querySelector("input");
    const status = setting.controlEl.createSpan({ cls: "osc-font-status" });
    const updateStatus = () => {
      updateFontStatus(status, validateFontWeight(input?.value || ""));
    };
    input?.addEventListener("input", updateStatus);
    updateStatus();
  }
}

export {
  StyleControllerSettingTab,
  ADVANCED_LAYOUT_TEMPLATES,
  BORDER_STYLES,
  CALLOUT_SPACING_FIELDS,
  CALLOUT_SPACING_COMMON,
  CALLOUT_SPACING_ADVANCED,
  CALLOUT_SPACING_LEGACY,
  BLOCK_CODE_BACKGROUND_SELECTORS,
  BLOCK_CODE_TEXT_SELECTORS,
  CODE_BACKGROUND_CUSTOM_FIELDS,
  DEFAULT_CODE_BACKGROUND,
  DEFAULT_ADVANCED_LAYOUTS,
  DEFAULT_INTERFACE_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  HEADING_SPACE_ABOVE_FIELDS,
  HEADING_SPACE_ABOVE_UNITS,
  LINE_HEIGHT_UNITS,
  INLINE_CODE_SELECTORS,
  NATIVE_DEFAULT_CONFIGURATION,
  PROFILE_SECTION_FIELDS,
  PROFILE_FIELDS,
  SectionDraftManager,
  THEMEPRO_ORIGINAL_ORDER,
  THEMEPRO_ORIGINAL_SELECTOR,
  BOTTOM_LEFT_CONTROLS_POSITION_NATIVE,
  BOTTOM_LEFT_CONTROLS_POSITION_LEFT,
  BOTTOM_LEFT_CONTROLS_LEFT_SELECTOR,
  READING_EDITING_LAYOUT_NATIVE,
  READING_EDITING_LAYOUT_MATCHED,
  SETTINGS_SCHEMA_VERSION,
  STYLE_FIELD_REGISTRY,
  STYLE_SCOPE_CLASS,
  STYLE_HEADING_COLOR_ACTIVE_CLASS,
  STYLE_HEADING_COLOR_CLASSES,
  STYLE_HEADING_SPACE_ABOVE_CLASSES,
  STYLE_HEADING_SPACE_ABOVE_VARIABLES,
  STYLE_TITLE_FONT_ACTIVE_CLASS,
  STYLE_TITLE_SIZE_ACTIVE_CLASS,
  STYLE_TITLE_WEIGHT_ACTIVE_CLASS,
  STYLE_TITLE_ACTIVE_CLASSES,
  STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS,
  STYLE_EMPHASIS_ACTIVE_CLASSES,
  STYLE_BOLD_FONT_ACTIVE_CLASS,
  STYLE_BOLD_STYLE_ACTIVE_CLASS,
  STYLE_BOLD_WEIGHT_ACTIVE_CLASS,
  STYLE_BOLD_COLOR_ACTIVE_CLASS,
  STYLE_ITALIC_FONT_ACTIVE_CLASS,
  STYLE_ITALIC_STYLE_ACTIVE_CLASS,
  STYLE_ITALIC_SIZE_ACTIVE_CLASS,
  STYLE_ITALIC_WEIGHT_ACTIVE_CLASS,
  STYLE_ITALIC_COLOR_ACTIVE_CLASS,
  STYLE_BOTTOM_LEFT_CONTROLS_LEFT_CLASS,
  STYLE_MATCHED_DOCUMENT_LAYOUT_CLASS,
  STYLE_PROFILE_FIELD_ACTIVE_CLASSES,
  STYLE_CALLOUT_ACTIVE_CLASSES,
  FILE_EXPLORER_FIELD_ACTIVE_CLASSES,
  FILE_EXPLORER_FIELD_VARIABLES,
  applyDocumentLayoutStateClass,
  applyCalloutCssVariables,
  applyCalloutPresetToPreview,
  applyCalloutSpacingToPreview,
  applyDraftAtomically,
  applyFileExplorerCssVariables,
  applyFileExplorerIndentGuide,
  applyInterfaceStateClasses,
  applyProfileCssVariables,
  applyProfileStateClasses,
  clearInterfaceStateClasses,
  clearProfileCssVariables,
  buildCalloutPresetCss,
  buildCalloutSpacingCss,
  buildCalloutViewSpacingCss,
  calloutViewSelector,
  calloutSpacingLayers,
  calloutSpacingInheritedLayers,
  buildAdvancedLayoutCss,
  buildSingleLayoutCss,
  calloutSpacingEntries,
  calloutSpacingPlaceholder,
  calloutSpacingPlaceholderUnit,
  calloutPreviewBodyMarkdown,
  codeBackgroundUiState,
  configurationToExport,
  createConfigurationSnapshot,
  createDefaultProfile,
  createAdvancedLayout,
  createNativeConfigurationData,
  effectiveCodeBackground,
  effectiveLayoutOptions,
  hasActiveValue,
  headingSpaceAboveCssValue,
  isValidHeadingSpaceAboveValue,
  lineHeightCssValue,
  normalizeHexColor,
  normalizeFontStyle,
  normalizeInterfaceSettings,
  normalizeNativeFontFamilyStack,
  normalizeOptionalProfile,
  normalizeProfile,
  normalizeSettings,
  normalizeAdvancedLayouts,
  normalizeCalloutSpacingByView,
  isUntouchedAutoLayout,
  parseConfigurationImport,
  layoutMarkdownSample,
  nextLayoutMarkdownId,
  refreshCalloutIcons,
  measureCalloutSpacingModes,
  setCodeBackgroundCustomEnabled,
  setCodeBackgroundCustomInput,
  setCodeBackgroundCustomValue,
  singleLineScrollState,
  styleFieldActiveClass,
  validCalloutSpacingValue,
  validateCalloutSection,
  validateAdvancedLayouts
};
