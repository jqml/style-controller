import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proSnippets = process.env.OBSIDIAN_PRO_SNIPPETS;
assert.ok(process.env.OBSIDIAN_ASAR_PATH, "Set OBSIDIAN_ASAR_PATH to the active Obsidian runtime .asar, not the bundled fallback");
assert.ok(proSnippets, "Set OBSIDIAN_PRO_SNIPPETS to Pro's active snippet directory");
const asar = readFileSync(process.env.OBSIDIAN_ASAR_PATH);
const headerLength = asar.readUInt32LE(12);
const header = JSON.parse(asar.subarray(16, 16 + headerLength).toString());
const appCss = asar.subarray(16 + headerLength, 16 + headerLength + header.files["app.css"].size).toString();
const pluginCss = readFileSync(path.join(root, "styles.css"), "utf8");
const appearance = JSON.parse(readFileSync(path.join(proSnippets, "..", "appearance.json"), "utf8"));
const activeSnippets = (appearance.enabledCssSnippets || [])
  .map((name) => path.join(proSnippets, `${name}.css`)).filter(existsSync).map((file) => readFileSync(file, "utf8")).join("\n");
const bundle = await build({
  entryPoints: [path.join(root, "src/main.ts")], bundle: true, format: "iife", platform: "browser", globalName: "StyleControllerFixture", write: false,
  plugins: [{ name: "obsidian-stub", setup(api) {
    api.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
    api.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export class Plugin {} export class PluginSettingTab {} export class Modal {} export class Notice {} export class Setting {} export class TFolder {} export const MarkdownRenderer = {}; export const prepareFuzzySearch = () => () => null; export const normalizePath = (value) => value; export const setIcon = () => {};",
      loader: "js"
    }));
  } }]
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${appCss}</style><style>${activeSnippets}</style><style>${pluginCss}</style></head><body class="theme-light"><script>${bundle.outputFiles[0].text}</script><script>
const api = StyleControllerFixture;
const native = api.measureCalloutSpacingModes(document);
const typeRule = document.createElement('style'); typeRule.textContent = ':is(.markdown-preview-view, .markdown-source-view.mod-cm6) .callout[data-callout="special"] { margin-top: 27px; }';
document.head.appendChild(typeRule);
const namedNative = api.measureCalloutSpacingModes(document, null, 'special');
const inherited = api.measureCalloutSpacingModes(document, { marginTop: "13px", bodyFirstMarginTop: "11px", bodyBlockGap: "9px" });
const roots = {};
for (const mode of ["reading", "live"]) {
  const scope = document.createElement("div"); scope.className = "osc-style-scope";
  const view = document.createElement("div");
  view.className = mode === "reading" ? "markdown-preview-view markdown-rendered" : "markdown-source-view mod-cm6";
  const holder = document.createElement("div"); holder.className = mode === "reading" ? "markdown-preview-sizer" : "cm-content";
  const embed = mode === "reading" ? holder : document.createElement("div");
  if (mode === "live") { embed.className = "cm-embed-block"; holder.appendChild(embed); }
  const callout = document.createElement("div"); callout.className = "callout"; callout.dataset.callout = "std";
  callout.innerHTML = '<div class="callout-title"><div class="callout-title-inner">Hückel’s Rule</div></div><div class="callout-content"><p>Planar, fully conjugated rings.</p><p>Analogous systems are anti-aromatic.</p></div>';
  embed.appendChild(callout); view.appendChild(holder); scope.appendChild(view); document.body.appendChild(scope);
  roots[mode] = callout;
}
const style = document.createElement("style"); document.head.appendChild(style);
const effects = {};
for (const field of api.CALLOUT_SPACING_FIELDS) {
  const entries = api.calloutSpacingEntries({ [field]: "37px" }).filter((entry) => entry.field === field && !entry.reset);
  effects[field] = {};
  for (const mode of ["reading", "live"]) {
    const callout = roots[mode];
    const entry = entries[0];
    const target = entry.selector ? callout.querySelector(':scope' + entry.selector) : callout;
    const before = getComputedStyle(target).getPropertyValue(entry.property).trim();
    style.textContent = api.buildCalloutSpacingCss({ [field]: "37px" }, ".osc-style-scope:not(.osc-callout-preview) .callout");
    const after = getComputedStyle(target).getPropertyValue(entry.property).trim();
    effects[field][mode] = { target: !!target, before, after };
    style.textContent = "";
  }
}
const settings = document.createElement("div"); settings.className = "osc-settings"; document.body.appendChild(settings);
const sizeControl = document.createElement("div"); sizeControl.className = "osc-size-control osc-callout-spacing-size-control is-native";
const input = document.createElement("input"); input.type = "number"; input.placeholder = api.calloutSpacingPlaceholder(native, "marginTop", "reading");
const unit = document.createElement("select"); unit.innerHTML = '<option value="px">px</option><option value="em">em</option>';
unit.value = api.calloutSpacingPlaceholderUnit(native, "marginTop", "reading");
sizeControl.append(input, unit); settings.appendChild(sizeControl);
const frame = document.createElement("div"); frame.className = "osc-callout-preview osc-callout-spacing-preview osc-style-scope markdown-rendered";
const previewMarkup = '<div class="callout" data-callout="std"><div class="callout-title">Spacing preview</div><div class="callout-content"><p>First paragraph.</p><p>Second paragraph.</p></div></div>';
frame.innerHTML = previewMarkup; settings.appendChild(frame);
const previewCallout = () => frame.querySelector('.callout');
const previewMetrics = () => {
  const callout = previewCallout(), paragraphs = callout.querySelectorAll('p');
  const frameRect = frame.getBoundingClientRect(), calloutRect = callout.getBoundingClientRect();
  const modeRoot = frame.querySelector('.markdown-preview-view, .markdown-source-view.mod-cm6');
  const contentRoot = frame.querySelector('.markdown-preview-sizer, .cm-content');
  const embedRoot = frame.querySelector('.cm-embed-block');
  return { type: callout.dataset.callout, paragraphs: paragraphs.length, marginTop: getComputedStyle(callout).marginTop,
    paddingTop: getComputedStyle(callout).paddingTop, bodyPaddingTop: getComputedStyle(callout.querySelector('.callout-content')).paddingTop,
    secondPaddingTop: getComputedStyle(paragraphs[1]).paddingTop,
    frameTop: frameRect.top, calloutTop: calloutRect.top, frameBottom: frameRect.bottom, calloutBottom: calloutRect.bottom,
    frameHeight: frameRect.height, frameWidth: frameRect.width, calloutHeight: calloutRect.height, calloutWidth: calloutRect.width,
    modeRootHeight: modeRoot?.getBoundingClientRect().height || 0, modeRootWidth: modeRoot?.getBoundingClientRect().width || 0,
    modeRootCssHeight: modeRoot ? getComputedStyle(modeRoot).height : '',
    modeRootDisplay: modeRoot ? getComputedStyle(modeRoot).display : '',
    contentRootHeight: contentRoot?.getBoundingClientRect().height || 0, contentRootWidth: contentRoot?.getBoundingClientRect().width || 0,
    contentRootCssHeight: contentRoot ? getComputedStyle(contentRoot).height : '',
    contentRootMinHeight: contentRoot ? getComputedStyle(contentRoot).minHeight : '',
    contentRootFlex: contentRoot ? getComputedStyle(contentRoot).flex : '',
    embedRootHeight: embedRoot?.getBoundingClientRect().height || 0, embedRootWidth: embedRoot?.getBoundingClientRect().width || 0,
    calloutDisplay: getComputedStyle(callout).display, calloutFlex: getComputedStyle(callout).flex };
};
api.applyCalloutSpacingToPreview(frame, { marginTop: '12px', paddingTop: '18px', bodyFirstMarginTop: '11px', bodyBlockGap: '9px' }, { type: 'std', marginTop: '21px' });
const previewDraft = previewMetrics();
frame.innerHTML = previewMarkup;
api.applyCalloutSpacingToPreview(frame, { marginTop: '12px', paddingTop: '18px' });
const previewReverted = previewMetrics();
const readingDefault = { value: input.placeholder, unit: unit.value };
input.placeholder = api.calloutSpacingPlaceholder(native, "marginTop", "live");
unit.value = api.calloutSpacingPlaceholderUnit(native, "marginTop", "live");
const liveDefault = { value: input.placeholder, unit: unit.value };
const global = { marginTop: '6px', spacingByView: { enabled: true, reading: { marginTop: '12px' }, live: { marginTop: '18px' } } };
const named = { type: 'std', marginTop: '22px', spacingByView: { enabled: true, reading: { marginTop: '30px' }, live: { marginTop: '34px' } } };
style.textContent = [api.buildCalloutSpacingCss(global, '.osc-style-scope:not(.osc-callout-preview) .callout'),
  api.buildCalloutViewSpacingCss(global), api.buildCalloutPresetCss([named])].join('\\n');
const viewCss = { reading: getComputedStyle(roots.reading).marginTop, live: getComputedStyle(roots.live).marginTop };
named.spacingByView.enabled = false;
style.textContent = [api.buildCalloutSpacingCss(global, '.osc-style-scope:not(.osc-callout-preview) .callout'),
  api.buildCalloutViewSpacingCss(global), api.buildCalloutPresetCss([named])].join('\\n');
const namedShared = { reading: getComputedStyle(roots.reading).marginTop, live: getComputedStyle(roots.live).marginTop };
named.marginTop = '';
style.textContent = [api.buildCalloutSpacingCss(global, '.osc-style-scope:not(.osc-callout-preview) .callout'),
  api.buildCalloutViewSpacingCss(global), api.buildCalloutPresetCss([named])].join('\\n');
const globalInherited = { reading: getComputedStyle(roots.reading).marginTop, live: getComputedStyle(roots.live).marginTop };
const rootIsView = document.createElement('div');
rootIsView.className = 'osc-style-scope markdown-preview-view markdown-rendered';
rootIsView.innerHTML = '<div class="callout" data-callout="note"><div class="callout-title">Title</div><div class="callout-content"><p>Body</p></div></div>';
document.body.appendChild(rootIsView);
const globalAtViewRoot = getComputedStyle(rootIsView.querySelector('.callout')).marginTop;
const positiveGap = { bodyFirstMarginTop: '12px', bodyLastMarginBottom: '9px' };
const negativeGap = { type: 'std', bodyFirstMarginTop: '-3px', bodyLastMarginBottom: '-2px' };
style.textContent = [api.buildCalloutSpacingCss(positiveGap, '.osc-style-scope:not(.osc-callout-preview) .callout'),
  api.buildCalloutPresetCss([negativeGap])].join('\\n');
const negativeCascade = Object.fromEntries(['reading', 'live'].map((mode) => {
  const content = roots[mode].querySelector('.callout-content');
  return [mode, { paddingTop: getComputedStyle(content).paddingTop, paddingBottom: getComputedStyle(content).paddingBottom,
    firstMarginTop: getComputedStyle(content.firstElementChild).marginTop,
    lastMarginBottom: getComputedStyle(content.lastElementChild).marginBottom }];
}));
style.textContent = '';
const previewForView = (mode) => {
  const rootClass = mode === 'reading' ? 'markdown-preview-view markdown-rendered' : 'markdown-source-view mod-cm6';
  const contentClass = mode === 'reading' ? 'markdown-preview-sizer' : 'cm-content';
  frame.innerHTML = '<div class="' + rootClass + '"><div class="' + contentClass + '">' +
    (mode === 'live' ? '<div class="cm-embed-block">' : '') + previewMarkup +
    (mode === 'live' ? '</div>' : '') + '</div></div>';
};
const previewPreset = { type: 'std', marginTop: '', spacingByView: { enabled: true,
  reading: { marginTop: '30px' }, live: { marginTop: '34px' } } };
previewForView('reading');
const readingPreviewNative = previewMetrics();
api.applyCalloutSpacingToPreview(frame, global, previewPreset, 'reading');
const readingPreviewOverride = previewMetrics();
previewForView('live');
const livePreviewNative = previewMetrics();
api.applyCalloutSpacingToPreview(frame, global, previewPreset, 'live');
const livePreviewOverride = previewMetrics();
api.applyCalloutSpacingToPreview(frame, positiveGap, negativeGap, 'live');
const negativePreview = { paddingTop: getComputedStyle(previewCallout().querySelector('.callout-content')).paddingTop,
  paddingBottom: getComputedStyle(previewCallout().querySelector('.callout-content')).paddingBottom };
const result = { native, namedNative, inherited, effects, placeholder: input.placeholder, value: input.value, readingDefault, liveDefault,
  viewCss, namedShared, globalInherited, globalAtViewRoot, negativeCascade, negativePreview,
  readingPreviewNative, readingPreviewOverride, livePreviewNative, livePreviewOverride,
  alignment: getComputedStyle(input).textAlign, inputColor: getComputedStyle(input).color,
  placeholderColor: getComputedStyle(input, "::placeholder").color,
  unitColor: getComputedStyle(unit).color,
  inheritedDefault: api.calloutSpacingPlaceholder(inherited, "marginTop", "reading"), previewDraft, previewReverted };
document.documentElement.setAttribute("data-result", encodeURIComponent(JSON.stringify(result)));
</script></body></html>`;

const directory = mkdtempSync(path.join(tmpdir(), "style-controller-spacing-"));
try {
  const fixturePath = path.join(directory, "fixture.html");
  writeFileSync(fixturePath, html);
  const output = execFileSync(process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--dump-dom", `file://${fixturePath}`],
    { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });
  const encoded = output.match(/data-result="([^"]+)"/)?.[1];
  assert.ok(encoded, `Chrome did not return computed spacing data: ${output.slice(-2000)}`);
  const result = JSON.parse(decodeURIComponent(encoded));
  assert.equal(result.value, "", "placeholder must not activate a value");
  assert.equal(result.alignment, "left");
  assert.deepEqual(result.readingDefault, { value: "16", unit: "px" });
  assert.deepEqual(result.liveDefault, { value: "0", unit: "px" });
  assert.notEqual(result.placeholderColor, result.inputColor, "placeholder is visually muted");
  assert.notEqual(result.unitColor, result.inputColor, "Off unit is visually muted");
  assert.equal(result.inheritedDefault, "13");
  assert.equal(result.namedNative.reading.marginTop, "27px", "named Reading defaults use their own callout type");
  assert.equal(result.namedNative.live.marginTop, "27px", "named Live defaults use their own callout type");
  assert.deepEqual(result.viewCss, { reading: "30px", live: "34px" });
  assert.deepEqual(result.namedShared, { reading: "22px", live: "22px" }, "named shared overrides global view in both modes");
  assert.deepEqual(result.globalInherited, { reading: "12px", live: "18px" }, "empty named values inherit global view overrides");
  assert.equal(result.globalAtViewRoot, "12px", "view-scoped CSS also matches when the scope itself is the view root");
  for (const mode of ["reading", "live"]) {
    assert.equal(result.negativeCascade[mode].paddingTop, "0px", `${mode} clears inherited top gap padding`);
    assert.equal(result.negativeCascade[mode].paddingBottom, "0px", `${mode} clears inherited bottom gap padding`);
  }
  assert.deepEqual({ firstMarginTop: result.negativeCascade.live.firstMarginTop,
    lastMarginBottom: result.negativeCascade.live.lastMarginBottom },
  { firstMarginTop: "-3px", lastMarginBottom: "-2px" }, "Live Preview applies the negative margins");
  assert.equal(result.negativeCascade.reading.firstMarginTop, "0px", "active Pro snippet forces Reading paragraph margin with !important");
  assert.deepEqual(result.negativePreview, { paddingTop: "0px", paddingBottom: "0px" }, "preview has the same negative-gap reset");
  assert.equal(result.inherited.reading.bodyFirstMarginTop, "11px");
  assert.equal(result.inherited.live.bodyFirstMarginTop, "11px");
  assert.notEqual(result.inherited.reading.bodyBlockGap, result.native.reading.bodyBlockGap);
  assert.notEqual(result.inherited.live.bodyBlockGap, result.native.live.bodyBlockGap);
  assert.equal(result.previewDraft.type, "std");
  assert.equal(result.previewDraft.paragraphs, 2);
  assert.equal(result.previewDraft.marginTop, "21px", "named draft wins over global outer margin");
  assert.equal(result.previewDraft.paddingTop, "18px", "global inner padding is inherited");
  assert.equal(result.previewDraft.bodyPaddingTop, "11px", "draft title/body gap is visible");
  assert.equal(result.previewDraft.secondPaddingTop, "9px", "draft paragraph spacing is visible");
  assert.ok(result.previewDraft.calloutTop - result.previewDraft.frameTop >= 40, "framed preview exposes the outer top margin");
  assert.ok(result.previewDraft.frameBottom - result.previewDraft.calloutBottom >= 24, "framed preview exposes the outer bottom edge");
  assert.equal(result.previewReverted.marginTop, "12px", "rerender restores inherited spacing after Revert");
  assert.equal(result.previewReverted.bodyPaddingTop, "0px", "cleared draft returns to native title/body gap");
  assert.equal(result.readingPreviewNative.marginTop, "16px", "Reading preview uses Reading DOM/CSS");
  assert.equal(result.livePreviewNative.marginTop, "0px", "Live Preview uses editor DOM/CSS");
  assert.equal(result.readingPreviewOverride.marginTop, "30px", "selected Reading preview uses named Reading override");
  assert.equal(result.livePreviewOverride.marginTop, "34px", "selected Live Preview uses named Live override");
  for (const [mode, preview] of [["Reading", result.readingPreviewNative], ["Live Preview", result.livePreviewNative]]) {
    const above = preview.calloutTop - preview.frameTop;
    const below = preview.frameBottom - preview.calloutBottom;
    assert.ok(above >= 24 && above <= 60, `${mode} keeps visible but compact space above the callout: ${above}px`);
    assert.ok(below >= 24 && below <= 60, `${mode} keeps visible but compact space below the callout: ${below}px`);
    assert.ok(preview.frameHeight - preview.calloutHeight <= 110,
      `${mode} preview frame hugs the rendered callout instead of stretching: ${preview.frameHeight}px frame, ${preview.calloutHeight}px callout`);
    assert.ok(preview.modeRootHeight <= preview.calloutHeight + 32, `${mode} embedded view does not fill the settings pane`);
    assert.ok(preview.contentRootWidth >= preview.frameWidth - 60, `${mode} content keeps the preview width instead of wrapping into a tall column`);
  }
  for (const [field, modes] of Object.entries(result.effects)) for (const [mode, effect] of Object.entries(modes)) {
    assert.equal(effect.target, true, `${field} has a ${mode} DOM target`);
    assert.equal(effect.after, "37px", `${field} changes computed ${mode} spacing`);
    assert.notEqual(effect.before, effect.after, `${field} changes ${mode} styling`);
  }
  process.stdout.write(`${JSON.stringify({ checked: "Obsidian Pro CSS, 19 spacing fields and per-view cascade in Reading and Live Preview", native: result.native, readingDefault: result.readingDefault, liveDefault: result.liveDefault, viewCss: result.viewCss, previewHeights: {
    reading: result.readingPreviewNative, live: result.livePreviewNative
  } }, null, 2)}\n`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
