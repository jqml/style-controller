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
  Modal
} from "obsidian";

const SETTINGS_SCHEMA_VERSION = 2;
const DEFAULT_CODE_BACKGROUND = "#fafafa";
const SETTINGS_ICON_POSITION_NATIVE = "native";
const SETTINGS_ICON_POSITION_THEMEPRO = "themepro";
const DEFAULT_INTERFACE_SETTINGS = {
  settingsIconPosition: SETTINGS_ICON_POSITION_NATIVE
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
  boldWeight: "",
  boldColor: "",
  italicFontFamily: "",
  italicWeight: "",
  italicColor: "",
  lineHeight: "",
  textColor: "",
  backgroundColor: "",
  accentColor: "",
  linkColor: "#00ff33",
  linkHoverColor: "#ff6b9f",
  internalLinkColor: "#6eb47c",
  externalLinkColor: "#66d9ef",
  h1FontFamily: "",
  h1Size: "32px",
  h1Weight: "700",
  h1Color: "",
  h2FontFamily: "",
  h2Size: "24px",
  h2Weight: "700",
  h2Color: "",
  h3FontFamily: "",
  h3Size: "20px",
  h3Weight: "650",
  h3Color: "",
  h4FontFamily: "",
  h4Size: "18px",
  h4Weight: "650",
  h4Color: "",
  h5FontFamily: "",
  h5Size: "16px",
  h5Weight: "600",
  h5Color: "",
  h6FontFamily: "",
  h6Size: "14px",
  h6Weight: "600",
  h6Color: "",
  tableHeaderBackground: "",
  tableHeaderColor: "",
  tableBorderColor: "",
  tableRowAltBackground: "",
  codeFontFamily: "",
  codeBackground: DEFAULT_CODE_BACKGROUND,
  codeBackgroundCustomEnabled: false,
  codeBackgroundCustomValue: DEFAULT_CODE_BACKGROUND,
  codeColor: "",
  codeBlockFontFamily: "",
  codeBlockBackground: DEFAULT_CODE_BACKGROUND,
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

const DEFAULT_OVERRIDE_MODULES = {
  baseText: false,
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
  fontFamily: fieldDefinition("font", "baseText", "--osc-font-family", BASE_TEXT_SELECTORS, "font-family"),
  textSize: fieldDefinition("size", "baseText", "--osc-text-size", BASE_TEXT_SELECTORS, "font-size"),
  textWeight: fieldDefinition("weight", "baseText", "--osc-text-weight", BASE_TEXT_SELECTORS, "font-weight"),
  boldFontFamily: fieldDefinition("font", "baseText", "--osc-bold-font-family", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "font-family"),
  boldWeight: fieldDefinition("weight", "baseText", "--osc-bold-weight", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "font-weight"),
  boldColor: fieldDefinition("color", "baseText", "--osc-bold-color", [".markdown-preview-view strong", ".markdown-preview-view b", EMPHASIS_SOURCE_SELECTORS.bold], "color"),
  italicFontFamily: fieldDefinition("font", "baseText", "--osc-italic-font-family", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-family"),
  italicWeight: fieldDefinition("weight", "baseText", "--osc-italic-weight", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "font-weight"),
  italicColor: fieldDefinition("color", "baseText", "--osc-italic-color", [".markdown-preview-view em", ".markdown-preview-view i", EMPHASIS_SOURCE_SELECTORS.italic], "color"),
  lineHeight: fieldDefinition("text", "baseText", "--osc-line-height", BASE_TEXT_SELECTORS, "line-height"),
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

const PROFILE_SECTION_FIELDS = {
  baseText: [
    "fontFamily", "textSize", "textWeight", "lineHeight", "textColor", "backgroundColor", "accentColor"
  ],
  boldItalic: [
    "boldFontFamily", "boldWeight", "boldColor", "italicFontFamily", "italicWeight", "italicColor"
  ],
  headings: Array.from({ length: 6 }, (_, index) => [
    `h${index + 1}FontFamily`, `h${index + 1}Size`, `h${index + 1}Weight`, `h${index + 1}Color`
  ]).flat(),
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
  fields.forEach((field) => {
    const value = profile[field];
    const meta = STYLE_FIELD_REGISTRY[field];
    if (!meta || value === undefined || value === null || String(value).trim() === "") return;
    if (meta.type === "color" && !normalizeHexColor(value)) errors.push(`${field} must be a valid hex color`);
    if (meta.type === "font" && !validateFont(value).valid) errors.push(`${field} must be a valid font family`);
    if (meta.type === "weight" && !validateFontWeight(value).valid) errors.push(`${field} must be a valid font weight`);
    if (meta.type === "size" && !normalizeCssSizeText(value)) errors.push(`${field} must be a valid CSS size`);
  });
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
  ["multiColumnBorderColor"].forEach((field) => {
    if (hasActiveValue(callouts[field]) && !normalizeHexColor(callouts[field])) errors.push(`${field} must be a valid hex color`);
  });
  (callouts.presets || []).forEach((preset, index) => {
    ["color", "titleColor", "backgroundColor"].forEach((field) => {
      if (hasActiveValue(preset[field]) && !normalizeHexColor(preset[field])) errors.push(`preset ${index + 1} ${field} must be a valid hex color`);
    });
  });
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
      italicWeight: "400",
      italicColor: "#ac38de",
      lineHeight: "",
      linkColor: "#1804f3",
      linkHoverColor: "#0aa1ff",
      internalLinkColor: "#1804f3",
      externalLinkColor: "#1804f3",
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
  description: "Native Obsidian styling with built-in #fafafa inline-code and block-code backgrounds.",
  data: createNativeConfigurationData()
};

const PROFILE_FIELDS = Object.entries(STYLE_FIELD_REGISTRY)
  .filter(([, meta]) => meta.variable)
  .map(([key, meta]) => [key, meta.variable]);

const STYLE_SCOPE_CLASS = "osc-style-scope";
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
const STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS = "style-controller-code-block-color-active";
const STYLE_SETTINGS_ICON_THEMEPRO_CLASS = "style-controller-settings-icon-themepro";
const SETTINGS_ICON_THEMEPRO_SELECTOR = ".workspace-drawer-vault-actions > span.clickable-icon:nth-of-type(2)";
const FILE_EXPLORER_TARGET_CLASS = "style-controller-file-explorer-target";
const FILE_EXPLORER_FOLDER_CLASS = "style-controller-file-explorer-folder";
const FILE_EXPLORER_FILE_CLASS = "style-controller-file-explorer-file";
const FILE_EXPLORER_CLASSES = [FILE_EXPLORER_TARGET_CLASS, FILE_EXPLORER_FOLDER_CLASS, FILE_EXPLORER_FILE_CLASS];
const FILE_EXPLORER_VARIABLES = [
  "--style-controller-file-explorer-font-family",
  "--style-controller-file-explorer-font-weight",
  "--style-controller-file-explorer-folder-color",
  "--style-controller-file-explorer-file-color",
  "--style-controller-file-explorer-hover-color",
  "--style-controller-file-explorer-hover-background",
  "--style-controller-file-explorer-active-background",
  "--style-controller-file-explorer-indent-line-color",
  "--style-controller-file-explorer-collapse-icon-color",
  "--style-controller-file-explorer-focus-border-color"
];
const PREVIEW_STYLE_VARIABLES = [
  "--osc-preview-font-family",
  "--osc-preview-font-size",
  "--osc-preview-font-weight",
  "--osc-preview-line-height",
  "--osc-preview-color",
  "--osc-preview-background",
  "--osc-preview-bold-font-family",
  "--osc-preview-bold-font-weight",
  "--osc-preview-bold-color",
  "--osc-preview-italic-font-family",
  "--osc-preview-italic-font-weight",
  "--osc-preview-italic-color",
  "--osc-preview-heading-font-family",
  "--osc-preview-heading-font-size",
  "--osc-preview-heading-font-weight",
  "--osc-preview-heading-color",
  "--osc-preview-table-header-background",
  "--osc-preview-table-header-color",
  "--osc-preview-table-border-color",
  "--osc-preview-table-row-alt-background",
  "--osc-preview-blockquote-background",
  "--osc-preview-blockquote-border-color"
];

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
    STYLE_SETTINGS_ICON_THEMEPRO_CLASS,
    settings.settingsIconPosition === SETTINGS_ICON_POSITION_THEMEPRO
  );
}

function clearInterfaceStateClasses(element) {
  toggleElementClass(element, STYLE_SETTINGS_ICON_THEMEPRO_CLASS, false);
}
const SIZE_UNITS = ["px", "rem", "em", "%", "pt"];
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

export default class StyleControllerPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    warnUnsafeStylePatterns(this.settings);
    this.addSettingTab(new StyleControllerSettingTab(this.app, this));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.applyStyles()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.applyStyles()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyStyles()));
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
    const interfaceRoot = this.getInterfaceRoot();
    clearInterfaceStateClasses(interfaceRoot);
    this.getMarkdownContainers().forEach((container) => {
      cleanScopeClasses(container);
      container.classList.remove(
        STYLE_SCOPE_CLASS,
        ...STYLE_IMAGE_ALIGNMENT_CLASSES,
        STYLE_IMAGE_WIDTH_CLASS,
        STYLE_IMAGE_RESPECT_EXPLICIT_CLASS,
        STYLE_IMAGE_IGNORE_EXPLICIT_CLASS,
        STYLE_HEADING_COLOR_ACTIVE_CLASS,
        ...STYLE_HEADING_COLOR_CLASSES,
        STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS
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
    this.getMarkdownViews().forEach((view, index) => {
      const file = view.file;
      const container = view.containerEl;
      const scopeClass = `osc-scope-${index}`;
      cleanScopeClasses(container);
      container.classList.remove(
        STYLE_SCOPE_CLASS,
        ...STYLE_IMAGE_ALIGNMENT_CLASSES,
        STYLE_IMAGE_WIDTH_CLASS,
        STYLE_IMAGE_RESPECT_EXPLICIT_CLASS,
        STYLE_IMAGE_IGNORE_EXPLICIT_CLASS,
        STYLE_HEADING_COLOR_ACTIVE_CLASS,
        ...STYLE_HEADING_COLOR_CLASSES,
        STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS
      );
      clearProfileCssVariables(container);
      container.removeAttribute("data-osc-profile");
      if (!file) return;

      const match = this.getProfileForPath(file.path);
      container.classList.add(STYLE_SCOPE_CLASS, scopeClass);
      container.setAttribute("data-osc-profile", match.name);
      applyProfileCssVariables(container, match.profile);
      applyProfileStateClasses(container, match.profile);
      applyCalloutCssVariables(container, this.settings.callouts);
    });
    this.applyFileExplorerStyles();
  }

  clearFileExplorerStyles() {
    const root = this.app.workspace.containerEl?.ownerDocument || document;
    root.querySelectorAll(`.${FILE_EXPLORER_TARGET_CLASS}`).forEach((element) => {
      FILE_EXPLORER_CLASSES.forEach((className) => element.removeClass(className));
      FILE_EXPLORER_VARIABLES.forEach((variable) => setCssVariable(element, variable, ""));
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
  const settings = { ...DEFAULT_SETTINGS, ...source };
  settings.enabled = true;
  settings.activeSettingsTab = settings.activeSettingsTab || "global";
  settings.interface = normalizeInterfaceSettings(source.interface || settings.interface);
  settings.global = Object.prototype.hasOwnProperty.call(source, "global")
    ? normalizeProfile(source.global)
    : createDefaultProfile();
  settings.schemaVersion = SETTINGS_SCHEMA_VERSION;
  settings.callouts = normalizeCallouts(settings.callouts);
  settings.overrides = Array.isArray(settings.overrides)
    ? settings.overrides.map(normalizeOverride)
    : [];
  settings.storedConfigurations = normalizeStoredConfigurations(settings.storedConfigurations);
  return settings;
}

function normalizeInterfaceSettings(interfaceSettings) {
  const source = interfaceSettings && typeof interfaceSettings === "object" ? interfaceSettings : {};
  return {
    ...DEFAULT_INTERFACE_SETTINGS,
    settingsIconPosition: source.settingsIconPosition === SETTINGS_ICON_POSITION_THEMEPRO
      ? SETTINGS_ICON_POSITION_THEMEPRO
      : SETTINGS_ICON_POSITION_NATIVE
  };
}

function validateInterfaceSection(interfaceSettings) {
  return [SETTINGS_ICON_POSITION_NATIVE, SETTINGS_ICON_POSITION_THEMEPRO].includes(interfaceSettings?.settingsIconPosition)
    ? []
    : ["settingsIconPosition must be Native or ThemePro position"];
}

function normalizeStoredConfigurations(configurations) {
  const imported = Array.isArray(configurations)
    ? configurations.map(normalizeStoredConfiguration).filter(Boolean)
    : [];
  const userConfigurations = imported.filter((config) => !isBuiltinConfigurationId(config.id));
  return [
    cloneStoredConfiguration(NATIVE_DEFAULT_CONFIGURATION),
    cloneStoredConfiguration(OBSIDIAN_PRO_CONFIGURATION),
    ...userConfigurations
  ];
}

function normalizeStoredConfiguration(config) {
  if (!config || typeof config !== "object") return null;
  const data = normalizeConfigurationData(config.data || config);
  return {
    id: String(config.id || `config-${Date.now()}`),
    name: String(config.name || "Imported configuration"),
    description: String(config.description || ""),
    data
  };
}

function normalizeConfigurationData(data) {
  return {
    enabled: true,
    global: data && Object.prototype.hasOwnProperty.call(data, "global")
      ? normalizeProfile(data.global)
      : createDefaultProfile(),
    callouts: normalizeCallouts(data?.callouts),
    overrides: Array.isArray(data?.overrides) ? data.overrides.map(normalizeOverride) : []
  };
}

function isBuiltinConfigurationId(id) {
  return id === NATIVE_DEFAULT_CONFIGURATION.id || id === OBSIDIAN_PRO_CONFIGURATION.id;
}

function normalizeProfile(profile) {
  const source = profile && typeof profile === "object" ? profile : DEFAULT_PROFILE;
  return normalizeCodeBackgroundStates(
    sanitizeProfile({ ...DEFAULT_PROFILE, ...source }, source),
    source,
    false
  );
}

function normalizeOptionalProfile(profile) {
  const source = profile && typeof profile === "object" ? profile : {};
  const normalized = normalizeCodeBackgroundStates(
    sanitizeProfile({ ...blankProfileData(), ...source }, source),
    source,
    true
  );
  delete normalized.settingsIconPosition;
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

    profile[field] = effectiveCodeBackground(profile, field);
  });
  return profile;
}

function effectiveCodeBackground(profile, field) {
  const stateFields = CODE_BACKGROUND_CUSTOM_FIELDS[field];
  if (!stateFields) return "";
  const customValue = String(profile?.[stateFields.value] ?? "").trim();
  return profile?.[stateFields.enabled] === true && normalizeHexColor(customValue)
    ? customValue
    : DEFAULT_CODE_BACKGROUND;
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
    effectiveValue: inherited ? "" : enabled && valid ? customValue : DEFAULT_CODE_BACKGROUND,
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
  profile[field] = optional && !enabled ? "" : effectiveCodeBackground(profile, field);
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
    profile[field] = optional ? "" : DEFAULT_CODE_BACKGROUND;
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

function normalizeOverride(override) {
  const modules = { ...DEFAULT_OVERRIDE_MODULES, ...(override.modules || {}) };
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
  if (FONT_VARIABLES.has(variable)) return validateFont(rawValue).valid ? cssFontValue(rawValue) : "";
  if (variable.includes("weight")) return validateFontWeight(rawValue).valid ? cssValue(rawValue) : "";
  if (COLOR_FIELDS.has(field)) return cssColorValue(rawValue);
  return cssValue(rawValue);
}

function clearProfileCssVariables(element) {
  const props = Object.fromEntries([
    ...PROFILE_FIELDS.map(([, variable]) => [variable, ""]),
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
    props[variable] = normalizedCssVariableValue(field, variable, profile[field]);
  });
  props["--osc-image-width"] = normalizeCssSizeText(profile.imageWidth);
  element.setCssProps(props);
}

function applyProfileStateClasses(element, profile) {
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
  element.toggleClass(STYLE_HEADING_COLOR_ACTIVE_CLASS, hasActiveHeadingColor(profile));
  element.toggleClass(STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS, !!cssColorValue(profile.codeBlockColor));
}

function hasActiveHeadingColor(profile) {
  return Array.from({ length: 6 }, (_, index) => `h${index + 1}Color`)
    .some((field) => cssColorValue(profile[field]));
}

function applyCalloutCssVariables(element, callouts) {
  const settings = normalizeCallouts(callouts);
  const multiColumnBorder = settings.multiColumnBorderWidth && settings.multiColumnBorderStyle && settings.multiColumnBorderColor
    ? `${settings.multiColumnBorderWidth} ${settings.multiColumnBorderStyle} ${settings.multiColumnBorderColor}`
    : "";
  element.setCssProps({
    "--style-controller-callout-border-width": cssValue(settings.borderWidth),
    "--style-controller-callout-radius": cssValue(settings.radius),
    "--style-controller-callout-title-size": cssValue(settings.titleSize),
    "--style-controller-callout-title-font-family": cssFontValue(settings.titleFontFamily),
    "--style-controller-callout-multi-column-border": multiColumnBorder
  });
}

function applyFileExplorerCssVariables(element, style) {
  element.setCssProps({
    "--style-controller-file-explorer-font-family": cssFontValue(style.fontFamily),
    "--style-controller-file-explorer-font-weight": validateFontWeight(style.fontWeight).valid ? style.fontWeight : "",
    "--style-controller-file-explorer-folder-color": cssColorValue(style.folderColor),
    "--style-controller-file-explorer-file-color": cssColorValue(style.fileColor),
    "--style-controller-file-explorer-hover-color": cssColorValue(style.hoverColor),
    "--style-controller-file-explorer-hover-background": cssColorValue(style.hoverBackground),
    "--style-controller-file-explorer-active-background": cssColorValue(style.activeBackground),
    "--style-controller-file-explorer-indent-line-color": cssColorValue(style.indentLineColor),
    "--style-controller-file-explorer-collapse-icon-color": cssColorValue(style.collapseIconColor),
    "--style-controller-file-explorer-focus-border-color": cssColorValue(style.focusBorderColor)
  });
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

function setOptionalCssVariable(element, variable, value) {
  const text = cssValue(value);
  element.setCssProps({ [variable]: text });
}

function cssColorValue(value) {
  return normalizeHexColor(value) || "";
}

function cssFontValue(value) {
  return validateFont(value).valid ? cssValue(value) : "";
}

function withPreviewProbe(callback) {
  if (typeof document === "undefined") return "";
  const probe = document.createElement("div");
  probe.className = "markdown-preview-view markdown-rendered";
  probe.setCssStyles({ position: "absolute", left: "-99999px", top: "-99999px", visibility: "hidden", pointerEvents: "none" });
  document.body.appendChild(probe);
  try {
    return callback(probe) || "";
  } finally {
    probe.remove();
  }
}

function cssDefaultColorForField(field) {
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
  const fallbackColorByField = {
    folderColor: "#222222",
    fileColor: "#222222",
    hoverColor: "#222222",
    hoverBackground: "#f2f2f2",
    activeBackground: "#e8e8e8",
    indentLineColor: "#dddddd",
    collapseIconColor: "#222222",
    focusBorderColor: "#bdbdbd"
  };
  return withPreviewProbe((probe) => {
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
      const raw = window.getComputedStyle(document.body).getPropertyValue("--interactive-accent").trim();
      el = probe.createSpan();
      el.setCssStyles({ color: raw || "var(--interactive-accent)" });
    }
    return normalizeCssColor(window.getComputedStyle(el)[property])
      || cssVariableColor(fallbackVariableByField[field])
      || fallbackColorByField[field]
      || "";
  });
}

function resolvedColorDefaultForField(field, placeholder) {
  if (isFileExplorerColorField(field)) {
    return cssDefaultColorForField(field) || normalizeHexColor(placeholder) || "#000000";
  }
  return cssDefaultColorForField(field) || normalizeHexColor(placeholder);
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
  return defaultFontStackForField(field);
}

function defaultFontStackForField(field) {
  if (field === "codeFontFamily" || field === "codeBlockFontFamily") return "Menlo, Monaco, monospace";
  return "Inter, Arial, sans-serif";
}

function cssDefaultWeightForField(field) {
  return withPreviewProbe((probe) => {
    let el = probe;
    if (field === "boldWeight") el = probe.createEl("strong", { text: "Bold" });
    if (field === "italicWeight") el = probe.createEl("em", { text: "Italic" });
    if (/^h[1-6]Weight$/.test(field)) el = probe.createEl(field.slice(0, 2), { text: "Heading" });
    return window.getComputedStyle(el).fontWeight;
  });
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
    ? `Using the built-in ${DEFAULT_CODE_BACKGROUND} code background.`
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

function normalizeUserPathPattern(path) {
  return normalizePath(String(path || "")).replace(/^\/+|\/+$/g, "");
}

function ensureFontDatalist() {
  if (document.getElementById("osc-font-suggestions")) return;
  const datalist = document.body.createEl("datalist", { attr: { id: "osc-font-suggestions" } });
  FONT_SUGGESTIONS.forEach((font) => datalist.createEl("option", { value: font }));
}

function validateFont(value) {
  const font = String(value || "").trim();
  if (!font || font === "inherit") {
    return { valid: true, label: "Off", title: "Uses the default inherited font." };
  }

  const families = splitFontStack(font);
  if (families.length < 3) {
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
    this.plugin.applyStyles();
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
      .setName("Settings icon position")
      .setDesc("Choose whether the bottom-left Settings gear stays in native Obsidian order or uses the isolated ThemePro position.")
      .addDropdown((dropdown) => dropdown
        .addOption(SETTINGS_ICON_POSITION_NATIVE, "Native")
        .addOption(SETTINGS_ICON_POSITION_THEMEPRO, "ThemePro position")
        .setValue(context.value.settingsIconPosition)
        .onChange((value) => {
          context.value.settingsIconPosition = value;
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
        "This restores native styling except for the active #fafafa inline-code and block-code backgrounds. Saved configurations will remain.",
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
      .addText((text) => text
        .setPlaceholder("Projects style")
        .setValue(draft.name)
        .onChange((value) => {
          draft.name = value;
          this.noteDraftMutation(draft);
        }));

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
        ["boldFontFamily", "Bold font", "Inter, Arial, sans-serif"],
        ["boldWeight", "Bold weight", "700"],
        ["boldColor", "Bold color", "Default"],
        ["italicFontFamily", "Italic font", "Inter, Arial, sans-serif"],
        ["italicWeight", "Italic weight", "inherit"],
        ["italicColor", "Italic color", "Default"],
        ["lineHeight", "Line height", "1.65"],
        ["textColor", "Text color", "Default"],
        ["backgroundColor", "Note background", "Default"],
        ["accentColor", "Accent color", "#4f8cff"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "links", "Links");
      if (draft.modules.links) this.renderSettingGroup(card, "Links", draft.profile, [
        ["linkColor", "Link", "#00ff33"],
        ["linkHoverColor", "Hover", "#ff6b9f"],
        ["internalLinkColor", "Internal", "#6eb47c"],
        ["externalLinkColor", "External", "#66d9ef"]
      ]);

      this.renderOverrideModuleToggle(card, draft, "headings", "Headings");
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
    const hoverColor = cssColorValue(style.hoverColor) || resolvedColorDefaultForField("hoverColor", "#222222");
    const hoverBackground = cssColorValue(style.hoverBackground) || resolvedColorDefaultForField("hoverBackground", "#f2f2f2");
    const activeBackground = cssColorValue(style.activeBackground) || resolvedColorDefaultForField("activeBackground", "#e8e8e8");
    const focusBorderColor = cssColorValue(style.focusBorderColor) || resolvedColorDefaultForField("focusBorderColor", "#bdbdbd");
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
      ["boldWeight", "Bold weight", "700"],
      ["boldColor", "Bold color", "Default"],
      ["italicFontFamily", "Italic font", "Inter, Arial, sans-serif"],
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

    const headingsContext = this.getProfileSectionContext("global:headings", "Headings settings", target, PROFILE_SECTION_FIELDS.headings);
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

  renderTablePreview(parent, profile) {
    const preview = parent.createDiv({ cls: "osc-mini-preview osc-rich-preview osc-table-preview osc-style-scope markdown-rendered" });
    const table = preview.createEl("table", { cls: "osc-preview-table" });
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
    const preview = parent.createDiv({ cls: "osc-mini-preview osc-rich-preview osc-code-preview osc-style-scope markdown-rendered" });
    preview.createEl("code", { text: "inline code sample", cls: "osc-inline-code-preview" });
    const codeBlock = preview.createDiv({ cls: "osc-code-block-rendered-preview markdown-rendered" });
    void MarkdownRenderer.renderMarkdown(
      "```js\nconst status = \"ready\";\nreturn status;\n```",
      codeBlock,
      "Style Controller Preview.md",
      this.plugin
    ).then(() => this.updateRichPreview(profile, parent));
    this.updateRichPreview(profile, parent);
  }

  renderQuotePreview(parent, profile) {
    const preview = parent.createDiv({ cls: "osc-mini-preview osc-rich-preview osc-quote-preview osc-style-scope markdown-rendered" });
    preview.createEl("blockquote", { text: "Blockquote preview text" });
    this.updateRichPreview(profile, parent);
  }

  renderBaseTextControls(parent, profile) {
    const rows = [
      [["fontFamily", "Font family", "Inter, Arial, sans-serif"]],
      [
        ["textSize", "Text size", "16"],
        ["textWeight", "Text weight", "400"],
        ["lineHeight", "Line height", "1.65"]
      ],
      [
        ["boldFontFamily", "Bold font", "Inter, Arial, sans-serif"],
        ["boldWeight", "Bold weight", "700"],
        ["boldColor", "Bold color", "Default"]
      ],
      [
        ["italicFontFamily", "Italic font", "Inter, Arial, sans-serif"],
        ["italicWeight", "Italic weight", "inherit"],
        ["italicColor", "Italic color", "Default"]
      ],
      [
        ["textColor", "Text color", "Default"],
        ["backgroundColor", "Note background", "Default"],
        ["accentColor", "Accent color", "#4f8cff"]
      ]
    ];

    const root = parent.createDiv({ cls: "osc-base-text-controls" });
    const rowClasses = ["is-font-row", "is-metrics-row", "is-emphasis-row", "is-emphasis-row", "is-color-row"];
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
    const content = this.renderCollapsibleGroup(parent, "Headings");
    this.renderSectionActions(content, context);
    context && (context.previewRoot = content);
    this.renderHeadingPreview(content, profile);
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
    }
  }

  renderImageGroup(parent, profile, context = null) {
    const content = this.renderCollapsibleGroup(parent, "Images");
    this.renderSectionActions(content, context);
    context && (context.previewRoot = content);
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
    const updateGlobalPreview = () => this.updateGlobalCalloutPreview(globalPreview, callouts);
    const globalGrid = global.createDiv({ cls: "osc-setting-grid" });
    this.addDirectSetting(globalGrid, callouts, "borderWidth", "Border width", "2", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "radius", "Radius", "8", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "titleSize", "Title size", "18", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "titleFontFamily", "Title font", "Inter, Arial, sans-serif", "font", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-title-font-setting");
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderWidth", "Multi-column border width", "1", "size", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderStyle", "Multi-column border style", "groove", "text", "", updateGlobalPreview);
    this.addDirectSetting(globalGrid, callouts, "multiColumnBorderColor", "Multi-column border color", "#000000", "color", "", updateGlobalPreview);
    const previewGrid = global.createDiv({ cls: "osc-setting-grid osc-callout-global-preview-controls" });
    this.addDirectSetting(previewGrid, callouts, "previewTitle", "Preview title", "Global callout preview", "text", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-preview-text-setting");
    this.addDirectSetting(previewGrid, callouts, "previewBody", "Preview body", "ss", "text", "", updateGlobalPreview)
      .settingEl.classList.add("osc-callout-preview-text-setting");

    const presets = this.renderCollapsibleGroup(root, "Named callout types");
    const grid = presets.createDiv({ cls: "osc-callout-grid" });
    callouts.presets.forEach((preset, index) => {
      const card = grid.createDiv({ cls: "osc-callout-card" });
      const title = card.createEl("div", { text: preset.type || `Callout ${index + 1}`, cls: "osc-callout-card-title" });
      const preview = this.renderCalloutPreview(card, preset);
      const updateCallout = () => {
        title.setText(preset.type || `Callout ${index + 1}`);
        this.updateCalloutPreview(preview, preset);
      };
      this.addDirectSetting(card, preset, "type", "Type", "email", "text", "", updateCallout);
      this.addDirectSetting(card, preset, "color", "Callout color", "#008293", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "titleColor", "Title color", "#008293", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "backgroundColor", "Background", "#ecf6f3", "color", "", updateCallout);
      this.addDirectSetting(card, preset, "icon", "Icon", "lucide-mail", "text", "", updateCallout);
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
  }

  renderCalloutPreview(parent, preset) {
    const preview = parent.createDiv({ cls: "osc-callout-preview osc-style-scope markdown-rendered" });
    this.updateCalloutPreview(preview, preset);
    return preview;
  }

  renderGlobalCalloutPreview(parent, callouts = this.plugin.settings.callouts) {
    const preview = parent.createDiv({ cls: "osc-callout-preview osc-global-callout-preview osc-style-scope markdown-rendered" });
    this.updateGlobalCalloutPreview(preview, callouts);
    return preview;
  }

  async updateGlobalCalloutPreview(preview, callouts = this.plugin.settings.callouts) {
    preview.empty();
    const title = String(callouts.previewTitle || "").trim() || "Global callout preview";
    const body = String(callouts.previewBody || "").trim() || "ss";
    const bodyLines = body.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
    await MarkdownRenderer.renderMarkdown(`> [!note] ${title}\n${bodyLines}`, preview, "", this.plugin);
  }

  async updateCalloutPreview(preview, preset) {
    preview.empty();
    const type = String(preset.type || "note").trim() || "note";
    const title = String(preset.previewTitle || "").trim() || "Hello";
    const body = String(preset.previewBody || "").trim() || "ss";
    const bodyLines = body.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
    await MarkdownRenderer.renderMarkdown(`> [!${type}] ${title}\n${bodyLines}`, preview, "", this.plugin);
  }

  renderSectionPreview(parent, title, profile) {
    if (title === "Base text") {
      const preview = parent.createDiv({ cls: "osc-mini-preview osc-base-preview" });
      preview.createDiv({ text: "Regular body text preview with enough words to judge spacing and readability." });
      const emphasis = preview.createDiv();
      emphasis.createEl("strong", { text: "Bold text" });
      emphasis.appendText(" and ");
      emphasis.createEl("em", { text: "italic text" });
      emphasis.appendText(" use the current base font and size.");
      this.updateBasePreview(profile, parent);
      return;
    }

    if (title === "Links") {
      const preview = parent.createDiv({ cls: "osc-mini-preview osc-links-preview" });
      void MarkdownRenderer.render(
        this.app,
        "[[Welcome|Internal link]] [External link](#external-link-preview) [Normal link](#normal-link-preview)",
        preview,
        "Style Controller Preview.md",
        this.plugin
      );
      this.updateLinksPreview(profile, parent);
      return;
    }

  }

  renderHeadingPreview(parent, profile) {
    const preview = parent.createDiv({ cls: "osc-mini-preview osc-heading-preview" });
    for (let level = 1; level <= 6; level += 1) {
      preview.createDiv({ text: `Heading ${level}`, cls: `osc-heading-preview-h${level}` });
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
    root.querySelectorAll(".osc-base-preview").forEach((preview) => {
      preview.setCssProps({
        "--osc-preview-font-family": cssFontValue(profile.fontFamily),
        "--osc-preview-font-size": cssValue(profile.textSize),
        "--osc-preview-font-weight": cssValue(profile.textWeight),
        "--osc-preview-line-height": cssValue(profile.lineHeight),
        "--osc-preview-color": cssValue(profile.textColor),
        "--osc-preview-background": cssValue(profile.backgroundColor),
        "--osc-preview-bold-font-family": cssFontValue(profile.boldFontFamily || profile.fontFamily),
        "--osc-preview-bold-font-weight": cssValue(profile.boldWeight),
        "--osc-preview-bold-color": cssValue(profile.boldColor),
        "--osc-preview-italic-font-family": cssFontValue(profile.italicFontFamily || profile.fontFamily),
        "--osc-preview-italic-font-weight": cssValue(profile.italicWeight),
        "--osc-preview-italic-color": cssValue(profile.italicColor)
      });
    });
  }

  updateLinksPreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-links-preview").forEach((preview) => {
      setOptionalCssVariable(preview, "--osc-preview-link-color", profile.linkColor);
      setOptionalCssVariable(preview, "--osc-preview-link-hover-color", profile.linkHoverColor);
      setOptionalCssVariable(preview, "--osc-preview-internal-link-color", profile.internalLinkColor);
      setOptionalCssVariable(preview, "--osc-preview-external-link-color", profile.externalLinkColor);
    });
  }

  updateHeadingPreview(profile, root = this.containerEl) {
    for (let level = 1; level <= 6; level += 1) {
      root.querySelectorAll(`.osc-heading-preview-h${level}`).forEach((el) => {
        el.setCssProps({
          "--osc-preview-heading-font-family": cssFontValue(profile[`h${level}FontFamily`] || profile.fontFamily),
          "--osc-preview-heading-font-size": cssValue(profile[`h${level}Size`]),
          "--osc-preview-heading-font-weight": cssValue(profile[`h${level}Weight`]),
          "--osc-preview-heading-color": cssValue(profile[`h${level}Color`])
        });
      });
    }
  }

  updateRichPreview(profile, root = this.containerEl) {
    root.querySelectorAll(".osc-rich-preview").forEach((preview) => {
      applyProfileCssVariables(preview, profile);
      preview.setCssProps({
        "--osc-preview-table-header-background": cssValue(profile.tableHeaderBackground),
        "--osc-preview-table-header-color": cssValue(profile.tableHeaderColor),
        "--osc-preview-table-border-color": cssValue(profile.tableBorderColor),
        "--osc-preview-table-row-alt-background": cssValue(profile.tableRowAltBackground),
        "--osc-preview-blockquote-background": cssValue(profile.blockquoteBackground),
        "--osc-preview-blockquote-border-color": cssValue(profile.blockquoteBorderColor)
      });
    });
  }

  renderCollapsibleGroup(parent, title) {
    const details = parent.createEl("details", { cls: "osc-setting-group" });
    details.open = true;
    details.createEl("summary", { text: title });
    return details.createDiv({ cls: "osc-setting-group-content" });
  }

  addTextSetting(parent, profile, key, name, placeholder) {
    const setting = new Setting(parent).setName(name);
    const resolvedPlaceholder = inheritedPlaceholderForField(profile, key, placeholder);
    setting.settingEl.toggleClass("osc-font-setting", FONT_FIELDS.has(key));
    if (SIZE_FIELDS.has(key)) {
      this.addSizeControl(setting, profile, key, resolvedPlaceholder);
    } else if (COLOR_FIELDS.has(key)) {
      this.addColorControl(setting, profile, key, resolvedPlaceholder);
    } else if (FONT_FIELDS.has(key)) {
      this.addFontControl(setting, profile, key, resolvedPlaceholder);
    } else if (FONT_WEIGHT_FIELDS.has(key)) {
      this.addWeightControl(setting, profile, key, resolvedPlaceholder);
    } else {
      setting.addText((text) => text
        .setPlaceholder(resolvedPlaceholder)
        .setValue(profile[key] || "")
        .onChange((value) => {
          profile[key] = value;
          this.noteDraftMutation(profile);
          this.updateDraftPreview(profile);
        }));
      const status = createValueStatus(setting.controlEl, hasActiveValue(profile[key]));
      const input = setting.controlEl.querySelector("input");
      input?.addEventListener("input", () => updateValueStatus(status, hasActiveValue(input.value)));
    }
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

  addColorControl(setting, profile, key, placeholder) {
    const wrapper = setting.controlEl.createDiv({ cls: "osc-color-control" });
    const swatch = wrapper.createEl("input", { attr: { type: "color", "aria-label": `${key} color picker` } });
    const resolvedDefault = resolvedColorDefaultForField(key, placeholder);
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
    const resolvedDefault = key === "codeBlockFontFamily" && placeholder
      ? placeholder
      : cssDefaultFontForField(key);
    const input = wrapper.createEl("input", {
      attr: { type: "text", placeholder: resolvedDefault || placeholder, list: "osc-font-suggestions" }
    });
    input.value = profile[key] || "";
    const status = wrapper.createEl("span", { cls: "osc-font-status", text: "?" });
    ensureFontDatalist();

    const updateStatus = () => {
      updateFontStatus(status, validateFont(input.value));
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

  addDirectSetting(parent, object, key, name, placeholder, type, description = "", onChange = null) {
    const setting = new Setting(parent).setName(name);
    if (description) setting.setDesc(description);
    if (type === "size") {
      this.addDirectSizeControl(setting, object, key, placeholder, onChange);
    } else if (type === "color") {
      this.addDirectColorControl(setting, object, key, placeholder, onChange);
    } else if (type === "font") {
      this.addDirectFontControl(setting, object, key, placeholder, onChange);
    } else if (FONT_WEIGHT_FIELDS.has(key)) {
      this.addDirectWeightControl(setting, object, key, placeholder, onChange);
    } else {
      setting.addText((text) => text
        .setPlaceholder(placeholder)
        .setValue(object[key] || "")
        .onChange((value) => {
          object[key] = value;
          this.noteDraftMutation(object);
          onChange?.();
        }));
      const status = createValueStatus(setting.controlEl, hasActiveValue(object[key]));
      const input = setting.controlEl.querySelector("input");
      input?.addEventListener("input", () => updateValueStatus(status, hasActiveValue(input.value)));
    }
    return setting;
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

    const updateStatus = () => {
      updateFontStatus(status, validateFont(input.value));
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
  BLOCK_CODE_BACKGROUND_SELECTORS,
  BLOCK_CODE_TEXT_SELECTORS,
  CODE_BACKGROUND_CUSTOM_FIELDS,
  DEFAULT_CODE_BACKGROUND,
  DEFAULT_INTERFACE_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  INLINE_CODE_SELECTORS,
  NATIVE_DEFAULT_CONFIGURATION,
  PROFILE_SECTION_FIELDS,
  PROFILE_FIELDS,
  SectionDraftManager,
  SETTINGS_ICON_POSITION_NATIVE,
  SETTINGS_ICON_POSITION_THEMEPRO,
  SETTINGS_ICON_THEMEPRO_SELECTOR,
  SETTINGS_SCHEMA_VERSION,
  STYLE_FIELD_REGISTRY,
  STYLE_SCOPE_CLASS,
  STYLE_HEADING_COLOR_ACTIVE_CLASS,
  STYLE_HEADING_COLOR_CLASSES,
  STYLE_CODE_BLOCK_COLOR_ACTIVE_CLASS,
  STYLE_SETTINGS_ICON_THEMEPRO_CLASS,
  applyDraftAtomically,
  applyInterfaceStateClasses,
  applyProfileCssVariables,
  applyProfileStateClasses,
  clearInterfaceStateClasses,
  clearProfileCssVariables,
  codeBackgroundUiState,
  configurationToExport,
  createConfigurationSnapshot,
  createDefaultProfile,
  createNativeConfigurationData,
  effectiveCodeBackground,
  hasActiveValue,
  normalizeHexColor,
  normalizeInterfaceSettings,
  normalizeOptionalProfile,
  normalizeProfile,
  normalizeSettings,
  parseConfigurationImport,
  setCodeBackgroundCustomEnabled,
  setCodeBackgroundCustomInput,
  setCodeBackgroundCustomValue
};
