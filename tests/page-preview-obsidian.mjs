// Opt-in integration test: runs native Page Preview in the open Obsidian Pro vault.
// Temporary notes and in-memory settings are restored in finally; data.json is never saved.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const code = String.raw`(async () => {
  if (app.vault.getName() !== "Obsidian Pro") throw new Error("Pro only");
  const plugin = app.plugins.plugins["style-controller"];
  const originalSettings = plugin.settings;
  const originalLeaf = app.workspace.activeLeaf || app.workspace.getMostRecentLeaf();
  const originalPath = app.workspace.getActiveFile()?.path;
  const folder = "SC Page Preview Test " + Date.now();
  const leaves = [], popovers = [], results = {};
  const pause = () => new Promise(resolve => setTimeout(resolve, 350));
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const styles = (element) => {
    const s = getComputedStyle(element);
    return { color: s.color, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, style: s.fontStyle, lineHeight: s.lineHeight };
  };
  const show = async (parent, target, linktext, sourcePath, source) => {
    app.workspace.trigger("hover-link", { event: new MouseEvent("mouseover", { bubbles: true, ctrlKey: true, metaKey: true, view: window }), source, hoverParent: parent, targetEl: target, linktext, sourcePath });
    for (let i = 0; i < 40; i++) {
      if (parent.hoverPopover?.hoverEl.querySelector(".osc-style-scope")) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const popover = parent.hoverPopover;
    check(popover?.embed && popover.hoverEl.isConnected, "Native Page Preview did not open");
    popovers.push(popover);
    // Keep native interaction focus while scripted scrolling runs away from the physical pointer.
    popover.setIsFocused(true);
    check(popover.hoverEl.querySelector(".osc-style-scope"), "Preview scope missing for " + linktext);
    return popover;
  };
  const open = async (file, mode = "preview") => {
    const leaf = app.workspace.getLeaf("tab"); leaves.push(leaf);
    await leaf.openFile(file);
    await leaf.view.setState({ ...leaf.view.getState(), mode, source: false }, { history: false });
    await pause();
    return leaf.view;
  };
  try {
    // Match the user's actual note, before introducing test overrides.
    if (originalPath) {
      const view = await open(app.vault.getAbstractFileByPath(originalPath));
      const heading = view.containerEl.querySelector("h2");
      if (heading) {
        const h = await show({}, view.containerEl.querySelector(".view-header"), originalPath, originalPath, "preview");
        const previewHeading = h.hoverEl.querySelector("h2");
        check(previewHeading, "Original preview H2 missing");
        results.originalHeading = { note: styles(heading), preview: styles(previewHeading) };
        check(JSON.stringify(results.originalHeading.note) === JSON.stringify(results.originalHeading.preview), "Original heading differs");
        h.hide(); await pause();
      }
    }
    await app.vault.createFolder(folder);
    const source = await app.vault.create(folder + "/Source.md", "# Source\n\n[[Target]]\n");
    const target = await app.vault.create(folder + "/Target.md", "## Target heading\n\nBody **bold** and *italic*, [external](https://example.com).\n\n[[Nested#Nested heading]]\n\n> [!note]+ Callout\n> Body\n\n" + "Paragraph for native scrolling.\n\n".repeat(60));
    await app.vault.create(folder + "/Nested.md", "## Nested heading\n\nNested body\n");
    await new Promise(resolve => setTimeout(resolve, 1800));
    plugin.settings = JSON.parse(JSON.stringify(originalSettings));
    const override = (name, color, font, size) => ({ id: name, name, enabled: true, type: "file", pattern: folder + "/" + name + ".md", modules: { headings: true, boldItalic: true, baseText: true }, profile: { paragraphSpacing: __READING_MODE__, preserveExtraBlankLines: "on", h2Color: color, h2FontFamily: font, h2Size: size, textColor: color, lineHeight: "1.8", boldColor: color, italicColor: color } });
    plugin.settings.overrides.push(override("Source", "#ff0000", "Arial", "19px"), override("Target", "#123456", "Georgia, serif", "33px"), override("Nested", "#654321", "Verdana", "29px"));
    plugin.applyStyles();
    const note = await open(target);
    const expectedHeading = styles(note.containerEl.querySelector("h2"));
    const expectedBody = styles(note.containerEl.querySelector(".markdown-preview-view p"));
    const expectedBold = styles(note.containerEl.querySelector("strong"));
    const expectedItalic = styles(note.containerEl.querySelector("em"));
    const calloutStyles = (root) => {
      const e = root.querySelector(".callout"); const s = getComputedStyle(e);
      return { ...styles(e), padding: s.padding, marginTop: s.marginTop, borderRadius: s.borderRadius };
    };
    const expectedCallout = calloutStyles(note.containerEl);
    const sourceView = await open(source);
    for (const mode of ["preview", "source"]) {
      await sourceView.setState({ ...sourceView.getState(), mode, source: false }, { history: false }); await pause();
      // In Live Preview, move the cursor away from the link to render its widget.
      if (mode === "source") { sourceView.editor.setCursor({ line: 0, ch: 0 }); await pause(); }
      const targetEl = sourceView.containerEl.querySelector(mode === "preview" ? "a.internal-link" : ".cm-hmd-internal-link");
      check(targetEl, mode + " internal link missing");
      const parent = {};
      const h = await show(parent, targetEl, "Target", source.path, mode === "preview" ? "preview" : "editor");
      const el = h.hoverEl;
      check(JSON.stringify(styles(el.querySelector("h2"))) === JSON.stringify(expectedHeading), mode + " linked heading mismatch");
      check(JSON.stringify(styles(el.querySelector(".markdown-preview-view p"))) === JSON.stringify(expectedBody), mode + " body mismatch");
      check(JSON.stringify(styles(el.querySelector("strong"))) === JSON.stringify(expectedBold), mode + " bold mismatch");
      check(JSON.stringify(styles(el.querySelector("em"))) === JSON.stringify(expectedItalic), mode + " italic mismatch");
      check(JSON.stringify(calloutStyles(el)) === JSON.stringify(expectedCallout), mode + " callout mismatch");
      const callout = el.querySelector(".callout");
      const collapsed = callout.classList.contains("is-collapsed");
      callout.querySelector(".callout-fold").click();
      check(callout.classList.contains("is-collapsed") !== collapsed, "Native callout interaction failed");
      callout.querySelector(".callout-fold").click();
      const scope = el.querySelector(".osc-style-scope");
      check(scope.getAttribute("data-osc-profile") === "Target", "Source profile leaked");
      if (scope.classList.contains("style-controller-match-reading-view")) {
        check(scope.style.getPropertyValue("--osc-reading-h2-color") === "rgb(18, 52, 86)", "Preview reference uses another note's profile");
        check(el.querySelector(".osc-reading-block"), "Preview source boundaries missing");
      }
      check(!scope.classList.contains("style-controller-matched-document-layout"), "Preview geometry changed");
      const scroller = el.querySelector(".markdown-preview-view");
      const before = { width: el.offsetWidth, height: el.offsetHeight, overflow: getComputedStyle(scroller).overflowY };
      scroller.scrollTop = 180; await pause();
      check(scroller.scrollTop > 0, "Native scrolling failed");
      check(scope.classList.contains("osc-style-scope"), "Virtualization removed scope " + JSON.stringify({connected: el.isConnected,state:h.state, scopes:plugin.hoverPreviewScopes.size}));
      scroller.scrollTop = 100; await pause();
      for (let i = 0; i < 30 && !el.querySelector("a.internal-link"); i++) await new Promise(resolve => setTimeout(resolve, 100));
      const nestedLink = el.querySelector("a.internal-link");
      check(nestedLink, "Nested internal link missing " + JSON.stringify({connected:el.isConnected,state:h.state, html:el.innerHTML.slice(0,300), top:scroller.scrollTop}));
      const nested = await show(h.embed.previewMode, nestedLink, "Nested#Nested heading", target.path, "preview");
      check(nested.hoverEl.querySelector(".osc-style-scope").getAttribute("data-osc-profile") === "Nested", "Nested path resolution failed");
      check(styles(nested.hoverEl.querySelector("h2")).color === "rgb(101, 67, 33)", "Nested heading color mismatch");
      nested.hide(); await pause();
      scroller.scrollTop = 0; await pause();
      const targetOverride = plugin.settings.overrides.find(o => o.name === "Target");
      targetOverride.profile.h2Color = "#246810";
      plugin.applyStyles();
      check(styles(el.querySelector("h2")).color === "rgb(36, 104, 16)", "Open preview did not update");
      check(el.offsetWidth === before.width && el.offsetHeight === before.height, "Settings refresh changed popover size");
      targetOverride.profile.h2Color = "#123456";
      plugin.applyStyles();
      results[mode === "preview" ? "reading" : "livePreview"] = { heading: expectedHeading, body: true, bold: true, italic: true, callouts: true, interaction: true, nested: true, updates: true, scrolling: true, nativeGeometry: before };
      h.hide(); await pause();
      check(!plugin.hoverPreviewScopes.has(scope), "Closed preview retained");
    }
    // A non-Page-Preview popover remains outside the plugin's scope.
    const unrelated = document.createElement("div"); unrelated.className = "popover";
    unrelated.innerHTML = '<div class="markdown-rendered"><h2>Unrelated</h2></div>';
    document.body.append(unrelated);
    try { plugin.applyStyles(); check(!unrelated.querySelector(".osc-style-scope"), "Unrelated popover styled"); } finally { unrelated.remove(); }
    const h = await show({}, sourceView.containerEl.querySelector(".view-header"), target.path, source.path, "editor");
    const scope = h.hoverEl.querySelector(".osc-style-scope");
    plugin.removeStyles();
    check(!scope.classList.contains("osc-style-scope") && plugin.hoverPreviewScopes.size === 0, "Unload cleanup failed");
    results.cleanup = true;
    return JSON.stringify(results);
  } finally {
    popovers.forEach(h => h.hide());
    leaves.reverse().forEach(leaf => leaf.detach());
    plugin.settings = originalSettings;
    plugin.applyStyles();
    plugin.getMarkdownViews().forEach(view => view.previewMode?.rerender(true));
    if (originalLeaf.parent) app.workspace.setActiveLeaf(originalLeaf, { focus: true });
    const temporary = app.vault.getAbstractFileByPath(folder);
    if (temporary) await app.vault.delete(temporary, true);
  }
})()`;
const output = execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code.replace("__READING_MODE__", JSON.stringify(process.env.SC_DOCUMENT_MATCH ? "document" : ""))}`], { encoding: "utf8", timeout: 60000 });
process.stdout.write(output);
assert.ok(output.includes('"cleanup":true'), "Native Page Preview integration failed");
