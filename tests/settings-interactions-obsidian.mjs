// Native Pro-only regression: one mouse event pair per click; original data restored byte for byte.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, "Set SC_EVIDENCE_DIR");
mkdirSync(directory, { recursive: true });
const pluginId = process.env.SC_PLUGIN_ID || "style-controller";
const pluginDirectory = "/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro/.obsidian/plugins/style-controller";
const dataPath = path.join(pluginDirectory, "data.json");
const originalData = readFileSync(dataPath);
writeFileSync(path.join(directory, "data-before.json"), originalData);
function rawEvaluate(code) {
  let output;
  try { output = execFileSync("obsidian", ["vault=Obsidian Pro", "eval", "code=" + code], { encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", maxBuffer: 4000000 }); }
  catch (error) { if (error.signal !== "SIGKILL" || !error.stdout?.includes("=> ")) throw error; output = error.stdout; }
  const marker = output.lastIndexOf("=> ");
  assert.ok(marker >= 0, output);
  return JSON.parse(output.slice(marker + 3));
}
const evaluate = body => rawEvaluate(`(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const t=window.__scSettingsRegression,p=app.plugins.plugins['${pluginId}'],tab=p.settingTab,d=tab.containerEl.ownerDocument,w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));${body}})()`);
const navigation = `[...tab.sectionMenuEl.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return {id:e.dataset.oscTab,x:r.x,y:r.y,width:r.width,height:r.height}})`;
const nativeClick = expression => evaluate(`const e=${expression};if(!e)throw Error('Missing target');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=d.elementFromPoint(x,y);if(hit!==e&&!e.contains(hit))throw Error('Covered target '+e.outerHTML.slice(0,120));w.focus();for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,150));await p.settingsWrite;await tab.applyQueue;return JSON.stringify(true);`);
const button = (root, text) => `[...(${root}).querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)})`;
const group = name => `[...tab.pageEl.querySelectorAll('details')].find(e=>e.querySelector(':scope > summary')?.textContent===${JSON.stringify(name)}).querySelector(':scope > .osc-setting-group-content')`;
const field = (root, name) => `[...(${root}).querySelectorAll('.setting-item')].find(e=>e.querySelector('.setting-item-name')?.textContent===${JSON.stringify(name)})`;
const layout = i => `tab.pageEl.querySelectorAll('.osc-layout-card')[${i}]`;
const named = `tab.pageEl.querySelector('.osc-callout-card')`;
function type(expression, value) {
  nativeClick(expression);
  evaluate(`const e=${expression};w.webContents.selectAll();await new Promise(r=>setTimeout(r,50));w.webContents.insertText(${JSON.stringify(value)});await new Promise(r=>setTimeout(r,130));if(e.value!==${JSON.stringify(value)})throw Error('Native text entry failed');return JSON.stringify(true);`);
}
function chooseTopLevel(id) {
  assert.equal(evaluate(`return JSON.stringify(tab.sectionMenuEl.querySelectorAll('[data-osc-tab]').length);`), 7);
  nativeClick(`tab.sectionMenuEl.querySelector('[data-osc-tab="${id}"]')`);
}
function chooseSubsection(key) {
  nativeClick(`tab.subsectionNavEl.querySelector('[data-osc-subsection="${key}"]')`);
  assert.equal(evaluate(`return JSON.stringify(tab.selectedSubsection());`), key);
}
const results = [];
function snapshot(name) {
  const value = evaluate(`return JSON.stringify({name:${JSON.stringify(name)},saved:p.settings.callouts,dirty:[...tab.drafts.entries.values()].filter(c=>c.dirty).map(c=>c.key)});`);
  results.push(value); writeFileSync(path.join(directory, "interactions.json"), JSON.stringify(results, null, 2)); return value;
}
try {
  rawEvaluate(`(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const p=app.plugins.plugins['${pluginId}'];if(p.settingTab.hasDirtyDrafts())throw Error('Apply or Revert existing user drafts before running regression');window.__scSettingsRegression={settings:JSON.parse(JSON.stringify(p.settings))};app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('${pluginId}');const w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));window.__scSettingsRegression.bounds=w.getBounds();return JSON.stringify(true)})()`);
  // Real sidebar selection: only Obsidian's active plugin may stay highlighted.
  for (const width of [620, 720, 1000]) {
    evaluate(`w.setBounds({width:${width},height:800});await new Promise(r=>setTimeout(r,150));return JSON.stringify(true);`);
    const shortId = evaluate(`return JSON.stringify(app.setting.pluginTabs.find(t=>/short links/i.test(t.name))?.id);`);
    assert.ok(shortId, 'Short links is available for the real sidebar test');
    for (const id of [shortId, 'style-controller', 'appearance', 'style-controller']) {
      nativeClick(`d.querySelector('.vertical-tab-nav-item[data-setting-id="${id}"]')`);
      const selected = evaluate(`return JSON.stringify([...d.querySelectorAll('.vertical-tab-nav-item.is-active')].map(e=>e.dataset.settingId));`);
      assert.deepEqual(selected, [id], 'exactly one active sidebar item');
      if (id!=='style-controller') {
        assert.ok(evaluate(`const content=app.setting.activeTab.containerEl,html=content.innerHTML;tab.refreshNativeDefaults();return JSON.stringify(content.innerHTML===html&&!tab.containerEl.classList.contains('osc-settings'));`));
      } else assert.ok(evaluate(`return JSON.stringify(tab.navEl.matches('.vertical-tab-nav-item')&&tab.navEl!==tab.sectionMenuEl);`));
    }
    let mainPositions;
    evaluate(`t.mainNodes=[...tab.sectionMenuEl.children];return JSON.stringify(true);`);
    for (const id of ["global", "interface", "callouts", "overrides", "fileExplorer", "configurations", "viewsExport"]) {
      chooseTopLevel(id);
      const main=evaluate(`return JSON.stringify({nav:${navigation},selected:tab.sectionMenuEl.querySelector('.is-active')?.dataset.oscTab,sameNodes:t.mainNodes.every((e,i)=>e===tab.sectionMenuEl.children[i]),crumbs:tab.containerEl.querySelectorAll('[data-osc-crumb]').length});`);
      assert.equal(main.selected,id);assert.ok(main.sameNodes);assert.equal(main.crumbs,0);
      if(mainPositions)assert.deepEqual(main.nav,mainPositions);mainPositions=main.nav;
      if (id === 'global' || id === 'callouts') {
        let expected;
        evaluate(`t.subNodes=[...tab.subsectionNavEl.children];return JSON.stringify(true);`);
        for (const key of evaluate(`return JSON.stringify(tab.contextualSections().map(([key])=>key));`)) {
          chooseSubsection(key);
          const detail = evaluate(`const primary=tab.sectionMenuEl.querySelector('.is-active'),secondary=tab.subsectionNavEl.querySelector('.is-active'),a=d.defaultView.getComputedStyle(primary),b=d.defaultView.getComputedStyle(secondary);return JSON.stringify({width:${width},tab:${JSON.stringify(id)},subsection:tab.selectedSubsection(),nav:${navigation},secondary:[...tab.subsectionNavEl.children].map(e=>{const r=e.getBoundingClientRect();return {key:e.dataset.oscSubsection,x:r.x,y:r.y,width:r.width,height:r.height}}),mainSelected:primary.dataset.oscTab,secondarySelected:secondary.dataset.oscSubsection,mainBackground:a.backgroundColor,secondaryBackground:b.backgroundColor,underline:b.borderBottomColor,underlineWidth:b.borderBottomWidth,rowGap:tab.subsectionNavEl.getBoundingClientRect().top-tab.sectionMenuEl.getBoundingClientRect().bottom,sameSubNodes:t.subNodes.every((e,i)=>e===tab.subsectionNavEl.children[i]),previews:tab.pageEl.querySelectorAll('.osc-mini-preview').length,calloutPreviews:tab.pageEl.querySelectorAll('.osc-callout-preview').length});`);
          assert.equal(detail.mainSelected,id);assert.equal(detail.secondarySelected,key);assert.ok(detail.sameSubNodes);
          assert.equal(detail.rowGap,5);assert.equal(detail.underlineWidth,'2px');assert.equal(detail.underline,detail.mainBackground);assert.equal(detail.secondaryBackground,'rgba(0, 0, 0, 0)');
          assert.deepEqual(detail.nav,mainPositions);
          if(expected)assert.deepEqual(detail.secondary,expected);expected=detail.secondary;
          if(id==='global')assert.equal(detail.previews,key==='advanced'?0:1);
          if(id==='callouts'&&['style','spacing'].includes(key))assert.equal(detail.calloutPreviews,1);
          evaluate(`tab.pageEl.scrollTop=tab.pageEl.scrollHeight;return JSON.stringify(true);`);
          assert.deepEqual(evaluate(`return JSON.stringify(${navigation});`),mainPositions);
          results.push(detail);
        }
        evaluate(`const image=await w.webContents.capturePage();require('fs').writeFileSync(${JSON.stringify(path.join(directory, `context-${width}-`))}+${JSON.stringify(id)}+'.png',image.toPNG());return JSON.stringify(true);`);
      } else {
        assert.ok(evaluate(`return JSON.stringify(tab.subsectionNavEl.hidden&&tab.subsectionNavEl.children.length===0);`));
      }
      writeFileSync(path.join(directory,'interactions.json'),JSON.stringify(results,null,2));
    }
    chooseTopLevel('callouts');
    const rapid=evaluate(`const menu=tab.subsectionNavEl,nav=${navigation},clicks=[];const handler=e=>clicks.push(e.target.closest('button')?.dataset.oscSubsection);menu.addEventListener('click',handler);for(const key of ['spacing','layouts','presets','style','spacing']){const r=menu.querySelector('[data-osc-subsection="'+key+'"]').getBoundingClientRect();for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),button:'left',clickCount:1});}await new Promise(r=>setTimeout(r,250));menu.removeEventListener('click',handler);return JSON.stringify({clicks,selected:tab.selectedSubsection(),before:nav,after:${navigation}});`);
    assert.deepEqual(rapid.clicks,['spacing','layouts','presets','style','spacing']);assert.equal(rapid.selected,'spacing');assert.deepEqual(rapid.before,rapid.after);
    chooseTopLevel('global');chooseSubsection('headings');
    evaluate(`t.panel=tab.pageEl.firstElementChild;return JSON.stringify(true);`);
    chooseTopLevel('global');chooseSubsection('headings');
    assert.ok(evaluate(`return JSON.stringify(t.panel===tab.pageEl.firstElementChild);`));
    // One real Enter activates a main tab, directly opening its selected panel.
    evaluate(`window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();tab.sectionMenuEl.querySelector('[data-osc-tab="callouts"]').focus();for(const type of ['keyDown','char','keyUp'])w.webContents.sendInputEvent({type,keyCode:type==='char'?String.fromCharCode(13):'Enter'});await new Promise(r=>setTimeout(r,150));return JSON.stringify(true);`);
    assert.equal(evaluate(`return JSON.stringify(p.settings.activeSettingsTab);`),'callouts');
    evaluate(`const image=await w.webContents.capturePage();require('fs').writeFileSync(${JSON.stringify(path.join(directory, `navigation-${width}.png`))},image.toPNG());return JSON.stringify(true);`);
  }
  // Two rapid clicks on one Delete must never delete the following configuration.
  chooseTopLevel("configurations");
  evaluate(`const base=p.settings.storedConfigurations[0];for(const id of ['sc-regression-delete-one','sc-regression-delete-two'])p.settings.storedConfigurations.push({...JSON.parse(JSON.stringify(base)),id,name:id});tab.display();return JSON.stringify(true);`);
  evaluate(`const card=[...tab.pageEl.querySelectorAll('.osc-config-card')].find(e=>e.querySelector('.setting-item-name')?.textContent==='sc-regression-delete-one'),button=[...card.querySelectorAll('button')].find(e=>e.textContent==='Delete');button.scrollIntoView({block:'center',behavior:'instant'});const r=button.getBoundingClientRect();for(let i=0;i<2;i++)for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),button:'left',clickCount:1});await new Promise(r=>setTimeout(r,200));return JSON.stringify(true);`);
  assert.deepEqual(evaluate(`return JSON.stringify(p.settings.storedConfigurations.filter(c=>c.id.startsWith('sc-regression-delete')).map(c=>c.id));`), ["sc-regression-delete-two"]);
  nativeClick(`[...[...tab.pageEl.querySelectorAll('.osc-config-card')].find(e=>e.querySelector('.setting-item-name')?.textContent==='sc-regression-delete-two').querySelectorAll('button')].find(e=>e.textContent==='Delete')`);
  // Temporary in-memory fixtures; the finally block restores original settings and raw data.
  evaluate(`tab.hide();p.settings.callouts.advancedLayouts.enabled=true;p.settings.callouts.advancedLayouts.layouts=[0,1].map(i=>({id:'sc-ui-test-'+i,template:'multi-column',markdownId:'multi-columnuitest'+i,displayName:'UI test '+i,enabled:true,options:{columnCount:2,gap:'1em',widths:[]}}));p.settings.activeSettingsTab='callouts';await p.saveSettings();tab.advancedLayoutsOpen=true;tab.openLayoutEditors=new Set(['sc-ui-test-0','sc-ui-test-1']);tab.display();t.oldSpacing=p.settings.callouts.marginTop;t.oldType=p.settings.callouts.presets[0].type;return JSON.stringify(true);`);
  chooseSubsection("style");
  type(`(${field(group("Global callout style"), "Border width")}).querySelector('input')`, "17");
  chooseSubsection("spacing");
  type(`(${group("Global callout spacing")}).querySelector('input[aria-label="Outer space above value"]')`, "23");
  chooseSubsection("presets");
  type(`(${field(named, "Type")}).querySelector('input')`, "sc-ui-regression-renamed");
  chooseSubsection("layouts");
  type(`(${field(layout(0), "Display name")}).querySelector('input')`, "First independent layout");
  type(`(${field(layout(1), "Display name")}).querySelector('input')`, "Other unsaved layout");
  evaluate(`t.columns=(${field(layout(0), "Columns")}).querySelector('input');return JSON.stringify(true);`);
  type(`t.columns`, "3");
  assert.ok(evaluate(`return JSON.stringify(t.columns.isConnected&&d.activeElement===t.columns);`));
  assert.equal(snapshot("five simultaneous drafts").dirty.length, 5);
  chooseSubsection("style");
  nativeClick(button(group("Global callout style"), "Apply"));
  let row = snapshot("global style only"); assert.equal(row.saved.borderWidth, "17px"); assert.equal(row.dirty.length, 4);
  assert.ok(evaluate(`return JSON.stringify(p.settings.callouts.marginTop===t.oldSpacing&&p.settings.callouts.presets[0].type===t.oldType);`));
  chooseSubsection("layouts");
  nativeClick(`(${field("tab.pageEl.querySelector('.osc-advanced-layouts')", "Advanced Callout Layouts")}).querySelector('.checkbox-container')`);
  nativeClick(button("tab.pageEl.querySelector('.osc-advanced-layouts')", "Apply"));
  assert.equal(evaluate(`return JSON.stringify(tab.pageEl.querySelectorAll('.osc-layout-card').length);`), 2, "disabled layouts must retain reachable dirty item actions");
  nativeClick(button(layout(0), "Apply")); row = snapshot("first layout only"); assert.equal(row.dirty.length, 3); assert.equal(row.saved.advancedLayouts.layouts[0].options.columnCount, 3); assert.equal(row.saved.advancedLayouts.layouts[1].displayName, "UI test 1");
  chooseTopLevel("interface"); assert.equal(evaluate(`return JSON.stringify(p.settings.activeSettingsTab);`), "callouts");
  chooseSubsection("spacing");
  nativeClick(button(group("Global callout spacing"), "Revert"));
  chooseSubsection("layouts");
  nativeClick(button(layout(1), "Revert"));
  chooseSubsection("presets");
  nativeClick(button(named, "Apply")); assert.equal(snapshot("remaining section actions").dirty.length, 0);
  chooseSubsection("spacing");
  // A dropdown opens on its first click; closed-select keyboard selection keeps its DOM node.
  evaluate(`t.select=(${group("Global callout spacing")}).querySelector('select.dropdown:not(.is-measuring)');t.changes=0;t.select.addEventListener('change',()=>t.changes++);return JSON.stringify(true);`);
  // macOS owns the option popup outside WebContents. Verify one-click opening,
  // then blur only for test cleanup; option selection/dismissal is not claimed here.
  nativeClick(`t.select`);
  assert.ok(evaluate(`return JSON.stringify(t.select.matches(':open'));`));
  evaluate(`t.select.blur();return JSON.stringify(true);`);
  // Verify the selection change
  // contract separately, while testing first-click opening and real Tab focus above/below.
  evaluate(`t.select.value='live';t.select.dispatchEvent(new d.defaultView.Event('change',{bubbles:true}));return JSON.stringify(true);`);
  const selection = evaluate(`return JSON.stringify({connected:t.select.isConnected,value:t.select.value,changes:t.changes});`);
  assert.deepEqual(selection, { connected: true, value: "live", changes: 1 });
  evaluate(`window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();t.select.focus();w.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});await new Promise(r=>setTimeout(r,80));return JSON.stringify(true);`);
  assert.ok(evaluate(`return JSON.stringify(d.activeElement!==t.select&&tab.pageEl.contains(d.activeElement));`));
  evaluate(`app.setting.close();await new Promise(r=>setTimeout(r,100));app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('${pluginId}');return JSON.stringify(true);`);
  assert.equal(snapshot("settings reopened").saved.advancedLayouts.layouts[0].displayName, "First independent layout");
  evaluate(`app.setting.close();await new Promise(r=>setTimeout(r,100));await app.plugins.disablePlugin('${pluginId}');await app.plugins.enablePlugin('${pluginId}');app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('${pluginId}');return JSON.stringify(true);`);
  row = snapshot("plugin reloaded"); assert.equal(row.saved.borderWidth, "17px"); assert.equal(row.saved.presets[0].type, "sc-ui-regression-renamed"); assert.equal(row.saved.advancedLayouts.layouts[0].id, "sc-ui-test-0"); assert.equal(row.saved.advancedLayouts.layouts[0].displayName, "First independent layout"); assert.equal(row.dirty.length, 0);
  chooseTopLevel("configurations");
  evaluate(`const data={global:JSON.parse(JSON.stringify(p.settings.global)),callouts:JSON.parse(JSON.stringify(p.settings.callouts)),overrides:JSON.parse(JSON.stringify(p.settings.overrides))};data.callouts.presets=[{...data.callouts.presets[0],type:'sc-configuration-type'}];data.callouts.advancedLayouts.layouts=[];p.settings.storedConfigurations.push({id:'sc-ui-configuration',name:'SC UI configuration',description:'Temporary regression fixture',data});tab.display();return JSON.stringify(true);`);
  nativeClick(`[...[...tab.pageEl.querySelectorAll('.osc-config-card')].find(e=>e.querySelector('.setting-item-name')?.textContent==='SC UI configuration').querySelectorAll('button')].find(e=>e.textContent==='Apply')`);
  chooseTopLevel("callouts");
  chooseSubsection("presets");
  assert.deepEqual(evaluate(`return JSON.stringify({types:[...tab.pageEl.querySelectorAll('.osc-callout-card-title')].map(e=>e.textContent),layouts:tab.getCalloutRecords('layouts').length,dirty:tab.hasDirtyDrafts()});`), { types: ["sc-configuration-type"], layouts: 0, dirty: false });
  snapshot("stored configuration replaces item lists");
  process.stdout.write("PASS: sidebar selection, two-level tabs at 620/720/1000, simultaneous active states, 5px row gap, selected-only rendering, rapid clicks, independent drafts across subsections, keyboard, dropdown opening/change contract, reopen and plugin reload\n");
} finally {
  try { evaluate(`if(w&&t.bounds)w.setBounds(t.bounds);app.setting.close();p.settingTab.hide();p.settings=JSON.parse(JSON.stringify(t.settings));p.applyStyles();delete window.__scSettingsRegression;return JSON.stringify(true);`); }
  finally { writeFileSync(dataPath, originalData); assert.deepEqual(readFileSync(dataPath), originalData); }
}
