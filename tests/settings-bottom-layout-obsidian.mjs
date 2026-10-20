// Pro-only layout regression. Uses real wheel input; never saves plugin settings.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, "Set SC_EVIDENCE_DIR");
const before = process.env.SC_BOTTOM_STAGE === "before";
mkdirSync(directory, { recursive: true });
const dataPath = "/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro/.obsidian/plugins/style-controller/data.json";
const originalData = readFileSync(dataPath);
function evaluate(body) {
  const code = `(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const p=app.plugins.plugins['style-controller'],tab=p.settingTab;${body}})()`;
  let output;
  try { output = execFileSync("obsidian", ["vault=Obsidian Pro", "eval", "code=" + code], { encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", maxBuffer: 4000000 }); }
  catch (error) { if (!error.stdout?.includes("=> ")) throw error; output = error.stdout; }
  const marker = output.lastIndexOf("=> ");
  assert.ok(marker >= 0, output);
  return JSON.parse(output.slice(marker + 3));
}
const rows = [];
try {
  evaluate(`if(tab.hasDirtyDrafts())throw Error('Existing drafts');window.__scBottomLayout={active:p.settings.activeSettingsTab,sections:tab.subsections?new Map(tab.subsections):undefined,wasOpen:app.setting.opened};tab.subsections ||= new Map();app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('style-controller');const w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));window.__scBottomLayout.bounds=w.getBounds();return JSON.stringify(true);`);
  for (const width of [620, 720, 1000]) {
    let expectedNav;
    for (const [id, subsection, long] of [["global", "headings", true], ["global", "advanced", false], ["viewsExport", null, false]]) {
      const row = evaluate(`const w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));w.setBounds({width:${width},height:800});await new Promise(r=>setTimeout(r,150));p.settings.activeSettingsTab=${JSON.stringify(id)};${subsection ? `tab.subsections.set('global',${JSON.stringify(subsection)});` : ""}tab.display();tab.pageEl.scrollTop=0;await new Promise(r=>setTimeout(r,150));const d=tab.containerEl.ownerDocument,nav=()=>[...tab.sectionMenuEl.children].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}),info=e=>{const r=e.getBoundingClientRect(),s=d.defaultView.getComputedStyle(e);return {top:r.top,bottom:r.bottom,height:r.height,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,paddingBottom:s.paddingBottom,overflowY:s.overflowY}};const initialNav=nav(),initial=info(tab.pageEl),pr=tab.pageEl.getBoundingClientRect();w.focus();w.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(pr.x+pr.width/2),y:Math.round(pr.y+pr.height/2),deltaY:-6000,deltaX:0,canScroll:true});await new Promise(r=>setTimeout(r,300));const wheel=info(tab.pageEl);tab.pageEl.scrollTop=tab.pageEl.scrollHeight;await new Promise(r=>setTimeout(r,100));const end=info(tab.pageEl),root=info(tab.containerEl),controls=[...tab.pageEl.querySelectorAll('button,input,select,textarea')].filter(e=>e.getClientRects().length),last=controls.at(-1),lastRect=last?.getBoundingClientRect();require('fs').writeFileSync(${JSON.stringify(path.join(directory, `${width}-${id}-${subsection || "page"}.png`))},(await w.webContents.capturePage()).toPNG());return JSON.stringify({width:${width},id:${JSON.stringify(id)},subsection:${JSON.stringify(subsection)},initial,wheel,end,root,initialNav,finalNav:nav(),lastControl:lastRect?{top:lastRect.top,bottom:lastRect.bottom}:null,outerScrollTop:tab.containerEl.scrollTop,scrollableAncestors:(()=>{const a=[];for(let e=tab.pageEl.parentElement;e;e=e.parentElement){const s=d.defaultView.getComputedStyle(e);if(['auto','scroll'].includes(s.overflowY)&&e.scrollHeight>e.clientHeight)a.push(e.className)}return a})()});`);
      assert.deepEqual(row.initialNav, row.finalNav, "scrolling must not move navigation");
      if (expectedNav) assert.deepEqual(row.initialNav, expectedNav, "short/long pages must not move navigation");
      expectedNav = row.initialNav;
      assert.equal(row.outerScrollTop, 0);
      assert.deepEqual(row.scrollableAncestors, [], "only content should scroll");
      if (long) {
        assert.ok(row.initial.scrollHeight > row.initial.clientHeight);
        assert.ok(row.wheel.scrollTop > 0, "real wheel scrolls long content");
        assert.ok(Math.abs(row.end.scrollHeight - row.end.clientHeight - row.end.scrollTop) <= 1);
        assert.ok(row.lastControl && row.lastControl.bottom <= row.end.bottom + 1, "last control is not clipped at scroll end");
        if (!before) assert.ok(Math.abs(row.end.bottom - row.root.bottom) <= 1, "content reaches the bottom without a reserved footer");
      } else {
        assert.ok(row.initial.height < row.root.bottom - row.initial.top - 10, "short page retains natural height");
        assert.equal(row.initial.scrollHeight, row.initial.clientHeight, "short content needs no artificial scrollbar");
      }
      assert.equal(parseFloat(row.root.paddingBottom), before ? 64 : 0);
      rows.push(row);
      writeFileSync(path.join(directory, "layout.json"), JSON.stringify(rows, null, 2));
    }
  }
  process.stdout.write(`PASS: ${before ? "baseline recorded" : "no reserved bottom bar"}; natural short pages, wheel scrolling, unclipped last controls, stable navigation at 620/720/1000\n`);
} finally {
  evaluate(`const s=window.__scBottomLayout;if(s){p.settings.activeSettingsTab=s.active;tab.subsections=s.sections;tab.display();const w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));w?.setBounds(s.bounds);if(!s.wasOpen)app.setting.close();delete window.__scBottomLayout;}return JSON.stringify(true);`);
  assert.deepEqual(readFileSync(dataPath), originalData, "data.json must remain byte-for-byte unchanged");
}
