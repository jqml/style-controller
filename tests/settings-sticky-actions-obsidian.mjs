// Native Pro-only sticky regression. Temporary fixtures and all saved bytes are restored.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, "Set SC_EVIDENCE_DIR");
mkdirSync(directory, { recursive: true });
const dataPath = "/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro/.obsidian/plugins/style-controller/data.json";
const originalData = readFileSync(dataPath);
function evaluate(body) {
  const code = `(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const p=app.plugins.plugins['style-controller'],tab=p.settingTab,t=window.__scStickyRegression,d=tab.containerEl.ownerDocument,w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));${body}})()`;
  let output;
  try { output = execFileSync("obsidian", ["vault=Obsidian Pro", "eval", "code=" + code], { encoding: "utf8", timeout: 20000, killSignal: "SIGKILL", maxBuffer: 4000000 }); }
  catch (error) { if (!error.stdout?.includes("=> ")) throw error; output = error.stdout; }
  const marker = output.lastIndexOf("=> ");
  assert.ok(marker >= 0, output);
  return JSON.parse(output.slice(marker + 3));
}
const nav = `[...tab.sectionMenuEl.children].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})`;
const rows = [];
const baseline = process.env.SC_NAV_BASELINE ? JSON.parse(readFileSync(process.env.SC_NAV_BASELINE, "utf8")) : [];
function capture(name) {
  evaluate(`require('fs').writeFileSync(${JSON.stringify(path.join(directory, name + ".png"))},(await w.webContents.capturePage()).toPNG());return JSON.stringify(true);`);
}
function click(expression, keyboard = false) {
  return evaluate(`const e=${expression},r=e.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);if(!e.contains(d.elementFromPoint(x,y)))throw Error('Covered action');window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();${keyboard ? "e.focus();for(const type of ['keyDown','char','keyUp'])w.webContents.sendInputEvent({type,keyCode:type==='char'?String.fromCharCode(13):'Enter'});" : "for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});"}await new Promise(r=>setTimeout(r,180));await tab.applyQueue;await p.settingsWrite;return JSON.stringify(true);`);
}
function select(id, sub) {
  evaluate(`p.settings.activeSettingsTab=${JSON.stringify(id)};${sub ? `tab.subsections.set(${JSON.stringify(id)},${JSON.stringify(sub)});` : ""}tab.display();tab.pageEl.scrollTop=0;await new Promise(r=>setTimeout(r,100));return JSON.stringify(true);`);
}
function geometry() {
  return evaluate(`const page=tab.pageEl.getBoundingClientRect(),rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right}};return JSON.stringify({page:rect(tab.pageEl),scroll:tab.pageEl.scrollTop,nav:${nav},usableRight:page.left+tab.pageEl.clientWidth,overflow:tab.pageEl.scrollWidth>tab.pageEl.clientWidth,groups:[...tab.pageEl.querySelectorAll('.osc-action-group')].map(g=>{const b=g.querySelector(':scope > .osc-section-actions'),s=d.defaultView.getComputedStyle(b);return {key:g.dataset.oscActionGroup,owner:rect(g),bar:rect(b),sticky:s.position,top:s.top,nested:g.querySelectorAll('.osc-action-group').length,count:g.querySelectorAll(':scope > .osc-section-actions').length,buttons:[...b.querySelectorAll('button')].map(e=>e.textContent),name:b.querySelector('.osc-section-name').textContent,visible:b.getBoundingClientRect().bottom>page.top&&b.getBoundingClientRect().top<page.bottom}})});`);
}
try {
  evaluate(`if(tab.hasDirtyDrafts())throw Error('Existing user drafts');window.__scStickyRegression={settings:JSON.parse(JSON.stringify(p.settings)),sections:new Map(tab.subsections||[]),sectionOpen:tab.sectionOpen,spacingOpen:tab.calloutSpacingOpen,layoutOpen:tab.openLayoutEditors,advancedOpen:tab.advancedLayoutsOpen,wasOpen:app.setting.opened};app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('style-controller');const win=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));window.__scStickyRegression.bounds=win.getBounds();tab.hide();p.settings=JSON.parse(JSON.stringify(p.settings));p.settings.callouts.presets=[0,1].map(i=>({...p.settings.callouts.presets[0],type:'sticky-type-'+i}));p.settings.callouts.advancedLayouts={...p.settings.callouts.advancedLayouts,enabled:true,pinToTop:false,layouts:[0,1].map(i=>({id:'sc-sticky-'+i,template:'multi-column',markdownId:'multi-columnsticky'+i,displayName:'Sticky layout '+i,enabled:true,options:{columnCount:2,gap:'1em',widths:[]}}))};p.settings.overrides=[0,1].map(i=>({id:'sc-sticky-override-'+i,name:'Sticky override '+i,enabled:true,type:'file',pattern:'SC sticky fixture '+i+'.md',modules:{baseText:true,boldItalic:true,headings:true,links:true,images:true,tables:true,advanced:true},profile:JSON.parse(JSON.stringify(p.settings.global)),fileExplorer:{}}));tab.sectionOpen=new Map();tab.calloutSpacingOpen=new Map([['preset-0',true],['preset-1',true]]);tab.openLayoutEditors=new Set(['sc-sticky-0','sc-sticky-1']);tab.advancedLayoutsOpen=true;tab.subsections ||= new Map();p.applyStyles();return JSON.stringify(true);`);
  for (const width of (process.env.SC_STICKY_ACTIONS_ONLY ? [] : [620, 720, 1000])) {
    evaluate(`w.setBounds({width:${width},height:800});await new Promise(r=>setTimeout(r,150));return JSON.stringify(true);`);
    let expected;
    for (const [id, sub, count] of [['global','headings',1],['callouts','style',1],['callouts','spacing',1],['callouts','presets',2],['callouts','layouts',3],['overrides',null,2],['viewsExport',null,1],['interface',null,1]]) {
      select(id, sub);
      const start = geometry();
      assert.equal(start.groups.length,count, `${id}/${sub} save boundaries`);
      if (expected) assert.deepEqual(start.nav,expected,'main navigation stays stationary');
      expected=start.nav;
      const old=baseline.find(r=>r.width===width&&r.id===id&&r.sub===sub);
      if(old)assert.deepEqual(start.nav,old.main,'navigation unchanged from pre-task build');
      for(const g of start.groups){
        assert.ok(g.bar.right<=start.usableRight+1,'action bar fits available width');assert.equal(g.nested,0,'independent groups must never nest');assert.equal(g.count,1);if(sub==='presets'){assert.equal(g.sticky,'static');assert.equal(g.top,'auto');}else{assert.equal(g.bar.height,34);assert.equal(g.sticky,'sticky');assert.equal(g.top,'0px');}assert.ok(g.name);assert.deepEqual(g.buttons,['Revert','Apply']);
      }
      for(let i=0;i<count;i++){
        evaluate(`const g=tab.pageEl.querySelectorAll('.osc-action-group')[${i}],r=g.getBoundingClientRect(),pr=tab.pageEl.getBoundingClientRect();tab.pageEl.scrollTop+=r.top-pr.top+70;await new Promise(r=>setTimeout(r,70));return JSON.stringify(true);`);
        const pinned=geometry(),g=pinned.groups[i];
        assert.deepEqual(pinned.nav,start.nav);
        assert.ok(g.bar.bottom<=g.owner.bottom+1,'bar never outlives owner');
        assert.ok(g.bar.top>=g.owner.top-1,'bar stays inside owner');
        if(sub!=='presets'&&g.owner.top<pinned.page.top&&g.owner.bottom>pinned.page.top+34)assert.ok(Math.abs(g.bar.top-pinned.page.top)<=1,'eligible bar pins beneath navigation');
        if(['presets','layouts','headings'].includes(sub)&&i===count-1)capture(`${width}-${id}-${sub}-pinned`);
        rows.push({width,id,sub,index:i,...pinned});
        if(i<count-1&&sub!=='presets'){
          evaluate(`const g=tab.pageEl.querySelectorAll('.osc-action-group')[${i}];tab.pageEl.scrollTop+=g.getBoundingClientRect().bottom-tab.pageEl.getBoundingClientRect().top-15;await new Promise(r=>setTimeout(r,70));return JSON.stringify(true);`);
          const edge=geometry(),previous=edge.groups[i],next=edge.groups[i+1];
          assert.ok(previous.bar.bottom<=previous.owner.bottom+1);
          assert.ok(next.bar.top>=previous.bar.bottom-1,'adjacent action bars do not overlap');
          if(i===0&&sub==='presets')capture(`${width}-group-transition`);
          rows.push({width,id,sub,transition:i,...edge});
        }
      }
      evaluate(`tab.pageEl.scrollTop=tab.pageEl.scrollHeight;return JSON.stringify(true);`);
      assert.deepEqual(geometry().nav,start.nav);
    }
  }
  // Named cards retain ordinary non-sticky actions and their independent drafts.
  for (const width of [620,720,1000]) {
    evaluate(`w.setBounds({width:${width},height:800});await new Promise(r=>setTimeout(r,100));return JSON.stringify(true);`);
    select('callouts','presets');
    evaluate(`t.a=tab.calloutPresetContexts[0];t.b=tab.calloutPresetContexts[1];t.savedB=p.settings.callouts.presets[1].previewTitle;t.a.value.item.previewTitle='Sticky saved A ${width}';t.b.value.item.previewTitle='Sticky unsaved B';tab.noteDraftMutation(t.a.value);tab.noteDraftMutation(t.b.value);t.calls=0;t.commit=tab.commitDraftContext;tab.commitDraftContext=function(...args){t.calls++;return t.commit.apply(this,args)};const g=tab.pageEl.querySelector('.osc-action-group');g.scrollIntoView({block:'start',behavior:'instant'});t.scroll=tab.pageEl.scrollTop;return JSON.stringify(true);`);
    click(`tab.pageEl.querySelector('.osc-section-actions .mod-cta')`);
    const scroll=evaluate(`return JSON.stringify({before:t.scroll,after:tab.pageEl.scrollTop});`);
    assert.ok(Math.abs(scroll.before-scroll.after)<=1,JSON.stringify({width,...scroll}));
    assert.deepEqual(evaluate(`return JSON.stringify({calls:t.calls,a:p.settings.callouts.presets[0].previewTitle,b:p.settings.callouts.presets[1].previewTitle===t.savedB,dirtyA:t.a.dirty,dirtyB:t.b.dirty});`),{calls:1,a:`Sticky saved A ${width}`,b:true,dirtyA:false,dirtyB:true});
    evaluate(`const g=tab.pageEl.querySelectorAll('.osc-action-group')[1];g.scrollIntoView({block:'start',behavior:'instant'});return JSON.stringify(true);`);
    click(`tab.pageEl.querySelectorAll('.osc-section-actions')[1].querySelector('button')`);
    assert.ok(evaluate(`return JSON.stringify(!t.b.dirty&&p.settings.callouts.presets[0].previewTitle==='Sticky saved A ${width}');`));
    evaluate(`t.b.value.item.previewTitle='Keyboard revert';tab.noteDraftMutation(t.b.value);return JSON.stringify(true);`);
    click(`tab.pageEl.querySelectorAll('.osc-section-actions')[1].querySelector('button')`,true);
    assert.ok(evaluate(`return JSON.stringify(!t.b.dirty&&t.calls===1);`));
    evaluate(`tab.commitDraftContext=t.commit;delete t.commit;return JSON.stringify(true);`);
  }
  writeFileSync(path.join(directory,'sticky-geometry.json'),JSON.stringify(rows,null,2));
  process.stdout.write((process.env.SC_STICKY_ACTIONS_ONLY ? 'PASS: ordinary named-card mouse/Enter actions and independent saves at 620/720/1000\n' : 'PASS: 620/720/1000; exact pre-task main navigation coordinates; 34px sticky bars outside Named Types; independent non-nested owners and transitions; action rows fit available width; ordinary named-card first-click Apply/Revert; Enter; independent saves\n'));
} finally {
  try { evaluate(`if(t){await tab.applyQueue;await p.settingsWrite;if(t.commit)tab.commitDraftContext=t.commit;tab.hide();p.settings=JSON.parse(JSON.stringify(t.settings));tab.subsections=t.sections;tab.sectionOpen=t.sectionOpen;tab.calloutSpacingOpen=t.spacingOpen;tab.openLayoutEditors=t.layoutOpen;tab.advancedLayoutsOpen=t.advancedOpen;p.applyStyles();tab.display();w?.setBounds(t.bounds);if(!t.wasOpen)app.setting.close();delete window.__scStickyRegression;}return JSON.stringify(true);`); }
  finally { writeFileSync(dataPath,originalData);assert.deepEqual(readFileSync(dataPath),originalData); }
}
