import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asarPath = process.env.OBSIDIAN_ASAR_PATH;
assert.ok(asarPath, "Set OBSIDIAN_ASAR_PATH to the active Obsidian runtime .asar, not the bundled fallback");
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const asar = readFileSync(asarPath);
const headerLength = asar.readUInt32LE(12);
const header = JSON.parse(asar.subarray(16, 16 + headerLength).toString());
const appCss = asar.subarray(16 + headerLength, 16 + headerLength + header.files["app.css"].size).toString();
const pluginCss = readFileSync(path.join(root, "styles.css"), "utf8");
const bundle = await build({
  entryPoints: [path.join(root, "src/main.ts")], bundle: true, format: "cjs", platform: "node", write: false,
  plugins: [{
    name: "obsidian-stub",
    setup(api) {
      api.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
      api.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
        contents: "export class Plugin {} export class PluginSettingTab {} export class Modal {} export class Notice {} export class Setting {} export class TFolder {} export const MarkdownRenderer = {}; export const prepareFuzzySearch = () => () => null; export const normalizePath = (value) => value; export const setIcon = () => {};",
        loader: "js"
      }));
    }
  }]
});
const moduleRecord = { exports: {} };
new vm.Script(bundle.outputFiles[0].text).runInNewContext({ module: moduleRecord, exports: moduleRecord.exports });
const { buildCalloutSpacingCss, buildCalloutPresetCss, buildAdvancedLayoutCss, buildSingleLayoutCss, applyCalloutSpacingToPreview } = moduleRecord.exports;

const global = { marginTop: "7px", marginRight: "5px", marginBottom: "9px", marginLeft: "3px", paddingTop: "13px", paddingRight: "14px", paddingBottom: "15px", paddingLeft: "16px", titlePaddingBottom: "4px", bodyPaddingLeft: "6px", bodyFirstMarginTop: "0px", bodyLastMarginBottom: "0px", bodyBlockGap: "3px" };
const preset = { type: "std", marginTop: "21px", paddingLeft: "22px", titlePaddingBottom: "8px", bodyFirstMarginTop: "2px", bodyBlockGap: "5px" };
const generatedCss = [
  buildCalloutSpacingCss(global, ".osc-style-scope:not(.osc-callout-preview) .callout"),
  buildCalloutPresetCss([preset, { type: "multi-column1", color: "#123456", backgroundColor: "#aabbcc" }])
].join("\n");
const layout = { id: "fixture", template: "multi-column", displayName: "Fixture", markdownId: "multi-column1", enabled: true,
  options: { columnCount: 3, widths: [{ mode: "ratio", value: "1" }, { mode: "ratio", value: "2" }, { mode: "ratio", value: "1" }], gap: "10px", minWidth: "180px", wrap: "wrap", responsive: "auto-fit", breakpoint: "600px" } };
const exactLayout = { ...layout, id: "fixture-exact", markdownId: "multi-column", enabled: true,
  options: { ...layout.options, gap: "14px" } };
const layoutCss = buildAdvancedLayoutCss({ enabled: true, layouts: [exactLayout, layout] });
const layoutPreviewCss = buildSingleLayoutCss(layout, '.osc-layout-preview:where([data-osc-layout-id="fixture"])');

const previewStyles = new Map();
const target = (name) => ({ style: { setProperty(property, value) {
  const props = previewStyles.get(name) || new Map();
  props.set(property, value);
  previewStyles.set(name, props);
} } });
const previewCallout = {
  ...target("callout"),
  querySelectorAll(selector) {
    const name = ({
      ":scope > .callout-title": "title",
      ":scope > .callout-content": "content",
      ":scope > .callout-content > :first-child": "first",
      ":scope > .callout-content > :last-child": "last",
      ":scope > .callout-content > :not(:last-child)": "first",
      ":scope > .callout-content > * + *": "last"
    })[selector];
    return name ? [target(name)] : [];
  }
};
applyCalloutSpacingToPreview({ querySelector: () => previewCallout }, global, preset);
const styleAttr = (name) => [...(previewStyles.get(name) || [])].map(([property, value]) => `${property}: ${value}`).join("; ");
const markup = (kind, type, preview = false) => `<div class="${preview ? "osc-callout-preview osc-style-scope markdown-rendered" : "osc-style-scope"}"><div class="${kind === "live" ? "markdown-source-view mod-cm6" : "markdown-preview-view markdown-rendered"}"><div class="${kind === "live" ? "cm-callout" : ""}"><div id="${kind}-${type}${preview ? "-preview" : ""}" class="callout" data-callout="${type}" style="${preview ? styleAttr("callout") : ""}"><div class="callout-title" style="${preview ? styleAttr("title") : ""}">Title</div><div class="callout-content" style="${preview ? styleAttr("content") : ""}"><p style="${preview ? styleAttr("first") : ""}">First paragraph</p><p style="${preview ? styleAttr("last") : ""}">Last paragraph</p></div></div></div></div></div>`;
const nativeMarkup = `<div class="markdown-preview-view markdown-rendered"><div id="native" class="callout" data-callout="std"><div class="callout-title">Title</div><div class="callout-content"><p>First paragraph</p><p>Last paragraph</p></div></div></div>`;
const layoutMarkup = (id, kind, width, preview = false) => `<div class="osc-style-scope${preview ? " osc-layout-preview" : ""}"${preview ? ' data-osc-layout-id="fixture"' : ""} style="width:${width}px"><div class="${kind === "live" ? "markdown-source-view mod-cm6" : "markdown-preview-view markdown-rendered"}"><div class="${kind === "live" ? "cm-embed-block" : ""}"><div id="${id}" class="callout" data-callout="multi-column1"><div class="callout-title">Layout</div><div class="callout-content"><div class="callout" data-callout="note"><div class="callout-title">One</div><div class="callout-content"><p>Nested Markdown</p></div></div><div class="callout" data-callout="note"><div class="callout-title">Two</div><div class="callout-content"><p>Markdown</p></div></div><div class="callout" data-callout="note"><div class="callout-title">Three</div><div class="callout-content"><p>Markdown</p></div></div></div></div></div></div></div>`;
const builtInMarkup = (id, kind) => layoutMarkup(id, kind, 800).replace('data-callout="multi-column1"', 'data-callout="multi-column"');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${appCss}</style><style>${pluginCss}</style><style>${generatedCss}</style><style>${layoutCss}</style><style>${layoutPreviewCss}</style></head><body class="theme-light">${nativeMarkup}${markup("reading", "std")}${markup("reading", "note")}${markup("live", "std")}${markup("reading", "std", true)}${layoutMarkup("layout-reading-wide", "reading", 800)}${layoutMarkup("layout-live-wide", "live", 800)}${layoutMarkup("layout-reading-narrow", "reading", 500)}${layoutMarkup("layout-preview", "reading", 800, true)}${builtInMarkup("layout-builtin-reading", "reading")}${builtInMarkup("layout-builtin-live", "live")}<div class="osc-settings"><div class="setting-item"><div class="setting-item-control"><input id="input" type="text" placeholder="Native"><input id="number" type="number" placeholder="12"><select id="select"><option>Native/default</option></select><span id="native-display" class="osc-scroll-text-native">Native value</span></div></div><input id="outside" type="text" placeholder="Default"></div><script>
const names = ["native", "reading-std", "reading-note", "live-std", "reading-std-preview"];
const result = Object.fromEntries(names.map((name) => {
  const callout = document.getElementById(name);
  const title = callout.querySelector(".callout-title");
  const content = callout.querySelector(".callout-content");
  const first = content.firstElementChild;
  const last = content.lastElementChild;
  const calloutStyle = getComputedStyle(callout);
  const titleStyle = getComputedStyle(title);
  const contentStyle = getComputedStyle(content);
  return [name, { marginTop: calloutStyle.marginTop, marginRight: calloutStyle.marginRight, marginBottom: calloutStyle.marginBottom, marginLeft: calloutStyle.marginLeft, paddingTop: calloutStyle.paddingTop, paddingRight: calloutStyle.paddingRight, paddingBottom: calloutStyle.paddingBottom, paddingLeft: calloutStyle.paddingLeft, titlePaddingBottom: titleStyle.paddingBottom, bodyPaddingLeft: contentStyle.paddingLeft, bodyPaddingTop: contentStyle.paddingTop, firstMarginTop: getComputedStyle(first).marginTop, firstMarginBottom: getComputedStyle(first).marginBottom, lastMarginTop: getComputedStyle(last).marginTop, lastPaddingTop: getComputedStyle(last).paddingTop, lastMarginBottom: getComputedStyle(last).marginBottom, renderedTitleBodyGap: first.getBoundingClientRect().top - title.getBoundingClientRect().bottom, renderedBodyBlockGap: last.getBoundingClientRect().top - first.getBoundingClientRect().bottom }];
}));
result.alignment = Object.fromEntries(["input", "number", "select", "native-display", "outside"].map((id) => [id, getComputedStyle(document.getElementById(id)).textAlign]));
result.layouts = Object.fromEntries(["layout-reading-wide", "layout-live-wide", "layout-reading-narrow", "layout-preview", "layout-builtin-reading", "layout-builtin-live"].map((id) => {
  const outer = document.getElementById(id);
  const content = outer.querySelector(":scope > .callout-content");
  const children = [...content.children];
  return [id, { display: getComputedStyle(content).display, tracks: getComputedStyle(content).gridTemplateColumns,
    background: getComputedStyle(outer).backgroundColor,
    gap: getComputedStyle(content).columnGap, title: getComputedStyle(outer.querySelector(":scope > .callout-title")).display,
    rows: children.map((child) => Math.round(child.getBoundingClientRect().top)),
    nestedVisible: !!children[0].querySelector("p") }];
}));
document.documentElement.setAttribute("data-result", encodeURIComponent(JSON.stringify(result)));
</script></body></html>`;

const directory = mkdtempSync(path.join(tmpdir(), "style-controller-callout-"));
try {
  const fixturePath = path.join(directory, "fixture.html");
  writeFileSync(fixturePath, html);
  const output = execFileSync(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", "--dump-dom", `file://${fixturePath}`], { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });
  const encoded = output.match(/data-result="([^"]+)"/)?.[1];
  assert.ok(encoded, "Chrome did not return computed layout data");
  const result = JSON.parse(decodeURIComponent(encoded));
  assert.equal(result.native.paddingTop, "12px");
  assert.equal(result.native.paddingLeft, "24px");
  assert.equal(result.native.firstMarginTop, "16px");
  assert.equal(result["reading-note"].marginTop, "7px");
  assert.equal(result["reading-std"].marginTop, "21px");
  assert.equal(result["live-std"].marginTop, "21px");
  assert.equal(result["reading-std-preview"].marginTop, "21px");
  for (const name of ["reading-std", "live-std", "reading-std-preview"]) {
    assert.equal(result[name].paddingLeft, "22px");
    assert.equal(result[name].paddingTop, "13px");
    assert.equal(result[name].titlePaddingBottom, "8px");
    assert.equal(result[name].bodyPaddingTop, "2px");
    assert.equal(result[name].firstMarginTop, "0px");
    assert.equal(result[name].firstMarginBottom, "0px");
    assert.equal(result[name].lastMarginTop, "0px");
    assert.equal(result[name].lastPaddingTop, "5px");
    assert.equal(result[name].lastMarginBottom, "0px");
  }
  assert.equal(result["reading-note"].paddingLeft, "16px");
  assert.equal(result["reading-note"].bodyPaddingTop, "0px");
  assert.equal(result["reading-note"].firstMarginTop, "0px");
  assert.equal(result["reading-note"].lastMarginTop, "0px");
  assert.equal(result["reading-note"].lastPaddingTop, "3px");
  assert.notEqual(result.native.firstMarginTop, "0px");
  for (const property of ["renderedTitleBodyGap", "renderedBodyBlockGap"]) {
    assert.equal(result["reading-std"][property], result["live-std"][property]);
    assert.equal(result["reading-std"][property], result["reading-std-preview"][property]);
  }
  Object.values(result.alignment).forEach((value) => assert.equal(value, "left"));
  for (const name of ["layout-reading-wide", "layout-live-wide", "layout-reading-narrow", "layout-preview"]) {
    assert.equal(result.layouts[name].display, "grid");
    assert.equal(result.layouts[name].title, "none");
    assert.equal(result.layouts[name].gap, "10px");
    assert.equal(result.layouts[name].nestedVisible, true);
    assert.equal(result.layouts[name].background, "rgb(170, 187, 204)", "named appearance background wins over layout shell");
  }
  assert.equal(new Set(result.layouts["layout-reading-wide"].rows).size, 1, "wide layout has three columns");
  assert.equal(new Set(result.layouts["layout-live-wide"].rows).size, 1, "Live Preview has three columns");
  assert.equal(new Set(result.layouts["layout-preview"].rows).size, 1, "settings preview has three columns");
  assert.ok(new Set(result.layouts["layout-reading-narrow"].rows).size > 1, "narrow layout wraps columns");
  for (const name of ["layout-builtin-reading", "layout-builtin-live"]) {
    assert.equal(result.layouts[name].display, "grid");
    assert.equal(result.layouts[name].gap, "14px");
    assert.equal(new Set(result.layouts[name].rows).size, 1, "existing [!multi-column] markup keeps three columns");
  }
  process.stdout.write(`${JSON.stringify({ checked: "Obsidian app.css + plugin CSS in Chrome", result }, null, 2)}\n`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
