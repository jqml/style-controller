// Pro-only published-layout comparison and independent named-card actions.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, "Set SC_EVIDENCE_DIR");
mkdirSync(directory, { recursive: true });
const dataPath = "/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro/.obsidian/plugins/style-controller/data.json";
const originalData = readFileSync(dataPath);
const publishedCss = execFileSync("git", ["show", "0.1.39:styles.css"], { encoding: "utf8" });
function evaluate(body) {
  const code = `(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const p=app.plugins.plugins['style-controller'],tab=p.settingTab,t=window.__scNamedGrid,d=tab.containerEl.ownerDocument,w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));${body}})()`;
  let output;
  try { output=execFileSync("obsidian", ["vault=Obsidian Pro","eval","code="+code], { encoding:"utf8",timeout:10000,killSignal:"SIGKILL",maxBuffer:4000000 }); }
  catch(error){if(!error.stdout?.includes("=> "))throw error;output=error.stdout;}
  const marker=output.lastIndexOf("=> ");assert.ok(marker>=0,output);return JSON.parse(output.slice(marker+3));
}
const measurements=[];
function geometry(){return evaluate(`const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},grid=tab.pageEl.querySelector('.osc-callout-grid'),s=d.defaultView.getComputedStyle(grid);return JSON.stringify({columns:s.gridTemplateColumns,gap:s.gap,nav:[...tab.sectionMenuEl.children,...tab.subsectionNavEl.children].map(rect),cards:[...grid.children].map(c=>({rect:rect(c),padding:d.defaultView.getComputedStyle(c).padding,title:c.querySelector('.osc-callout-card-title').textContent,titleRect:rect(c.querySelector('.osc-callout-card-title')),actionRect:rect(c.querySelector('.osc-section-actions')),fields:[...c.querySelectorAll('input,select,textarea')].filter(e=>e.getClientRects().length&&!e.classList.contains('is-measuring')).map(rect)}))});`);}
function screenshot(name){evaluate(`require('fs').writeFileSync(${JSON.stringify(path.join(directory,name+'.png'))},(await w.webContents.capturePage()).toPNG());return JSON.stringify(true);`);}
function click(index,text){evaluate(`const g=tab.pageEl.querySelectorAll('.osc-callout-card')[${index}];g.scrollIntoView({block:'start',behavior:'instant'});const e=[...g.querySelector('.osc-section-actions').querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)}),r=e.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!e.contains(d.elementFromPoint(x,y)))throw Error('Covered named-card action');window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,180));await tab.applyQueue;await p.settingsWrite;return JSON.stringify(true);`);}
try{
  evaluate(`if(tab.hasDirtyDrafts())throw Error('Existing user drafts');window.__scNamedGrid={settings:JSON.parse(JSON.stringify(p.settings)),sections:new Map(tab.subsections||[]),spacing:tab.calloutSpacingOpen,wasOpen:window.electron.remote.BrowserWindow.getAllWindows().some(w=>w.getTitle().startsWith('Settings - Obsidian Pro'))};app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('style-controller');const win=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));window.__scNamedGrid.bounds=win.getBounds();tab.hide();p.settings=JSON.parse(JSON.stringify(p.settings));if(p.settings.callouts.presets.length<2)throw Error('Need two saved named types');p.settings.activeSettingsTab='callouts';tab.subsections ||= new Map();tab.subsections.set('callouts','presets');tab.calloutSpacingOpen=new Map();tab.display();return JSON.stringify(true);`);
  for(const width of [620,720,1000]){
    evaluate(`w.setBounds({width:${width},height:800});tab.display();tab.pageEl.scrollTop=0;await d.fonts.ready;await new Promise(r=>setTimeout(r,250));t.sheet=[...d.styleSheets].find(s=>s.ownerNode?.textContent.includes('.osc-section-actions {'));if(!t.sheet)throw Error('Missing plugin stylesheet');t.sheet.disabled=true;t.baseline=d.createElement('style');t.baseline.textContent=Buffer.from(${JSON.stringify(Buffer.from(publishedCss).toString('base64'))},'base64').toString();d.head.append(t.baseline);tab.pageEl.querySelectorAll('.osc-section-name').forEach(e=>e.remove());await new Promise(r=>setTimeout(r,100));return JSON.stringify(true);`);
    const published=geometry();screenshot(`${width}-published`);
    evaluate(`t.baseline.remove();t.baseline=null;t.sheet.disabled=false;t.sheet=null;tab.display();tab.pageEl.scrollTop=0;await new Promise(r=>setTimeout(r,250));return JSON.stringify(true);`);
    const current=geometry();screenshot(`${width}-restored`);
    assert.deepEqual(current,published,`${width}px card geometry, field geometry, spacing, order and navigation match published CSS`);
    const columns=current.columns.split(' ').length;
    assert.equal(columns,width===1000?2:1,'published responsive column count');
    assert.equal(current.gap,'10px');
    assert.ok(evaluate(`return JSON.stringify([...tab.pageEl.querySelectorAll('.osc-callout-card')].every(g=>g.querySelectorAll(':scope > .osc-section-actions').length===1&&d.defaultView.getComputedStyle(g.querySelector('.osc-section-actions')).position==='static'));`));
    const scroll=evaluate(`const page=tab.pageEl,g=page.querySelector('.osc-callout-card'),b=g.querySelector('.osc-section-actions'),before={scroll:page.scrollTop,bar:b.getBoundingClientRect().top,owner:g.getBoundingClientRect().top};page.scrollTop=300;await new Promise(r=>setTimeout(r,80));const after={scroll:page.scrollTop,bar:b.getBoundingClientRect().top,owner:g.getBoundingClientRect().top};return JSON.stringify({before,after,nav:[...tab.sectionMenuEl.children,...tab.subsectionNavEl.children].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})});`);
    assert.ok(Math.abs((scroll.after.bar-scroll.before.bar)+(scroll.after.scroll-scroll.before.scroll))<1,'ordinary actions scroll with their card');
    assert.deepEqual(scroll.nav,current.nav,'scrolling does not move navigation');screenshot(`${width}-scrolled`);
    measurements.push({width,columns,published,current,scroll});
    // Two simultaneous drafts, one deliberate native click per action.
    evaluate(`t.a=tab.calloutPresetContexts[0];t.b=tab.calloutPresetContexts[1];t.savedB=p.settings.callouts.presets[1].previewTitle;t.a.value.item.previewTitle='Grid saved A ${width}';t.b.value.item.previewTitle='Grid unsaved B';tab.noteDraftMutation(t.a.value);tab.noteDraftMutation(t.b.value);return JSON.stringify(true);`);
    click(0,'Apply');
    assert.ok(evaluate(`return JSON.stringify(p.settings.callouts.presets[0].previewTitle==='Grid saved A ${width}'&&!t.a.dirty&&t.b.dirty&&p.settings.callouts.presets[1].previewTitle===t.savedB);`),'Apply affects only the first card');
    click(1,'Revert');
    assert.ok(evaluate(`return JSON.stringify(!t.b.dirty&&p.settings.callouts.presets[0].previewTitle==='Grid saved A ${width}'&&p.settings.callouts.presets[1].previewTitle===t.savedB);`),'Revert affects only the second card');
  }
  evaluate(`app.setting.close();await new Promise(r=>setTimeout(r,100));await app.plugins.disablePlugin('style-controller');await app.plugins.enablePlugin('style-controller');app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('style-controller');return JSON.stringify(true);`);
  assert.equal(evaluate(`return JSON.stringify(p.settings.callouts.presets[0].previewTitle);`),'Grid saved A 1000','independent save persists across plugin reload');
  writeFileSync(path.join(directory,'comparison.json'),JSON.stringify(measurements,null,2));
  process.stdout.write('PASS: published 0.1.39 geometry matches at 620/720/1000; responsive 1/1/2 columns, 10px gap; ordinary per-card actions; stationary navigation; first-click independent Apply/Revert; persistence after reload\n');
}finally{
  try{evaluate(`if(t){t.baseline?.remove();if(t.sheet)t.sheet.disabled=false;await tab.applyQueue;await p.settingsWrite;tab.hide();p.settings=JSON.parse(JSON.stringify(t.settings));tab.subsections=t.sections;tab.calloutSpacingOpen=t.spacing;p.applyStyles();tab.display();w?.setBounds(t.bounds);if(!t.wasOpen)app.setting.close();delete window.__scNamedGrid;}return JSON.stringify(true);`);}
  finally{writeFileSync(dataPath,originalData);assert.deepEqual(readFileSync(dataPath),originalData);}
}
