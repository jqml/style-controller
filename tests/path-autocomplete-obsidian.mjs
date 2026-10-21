// Pro-only UI regression. Test changes are restored byte-for-byte in finally.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, 'Set SC_EVIDENCE_DIR'); mkdirSync(directory, { recursive: true });
const vault = '/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro';
const dataPath = path.join(vault,'.obsidian/plugins/style-controller/data.json');
const original = readFileSync(dataPath), notePath = path.join(vault,'Cambridge/Appendix/pKa.md');
const hash = value => createHash('sha256').update(value).digest('hex');
const noteHash = hash(readFileSync(notePath));
function evaluate(body) {
  const code = `(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const p=app.plugins.plugins['style-controller'],tab=p?.settingTab,t=window.__scPathTest,d=tab?.containerEl.ownerDocument||document,w=window.electron.remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('Settings - Obsidian Pro'));${body}})()`;
  let out;
  try { out=execFileSync('obsidian',['vault=Obsidian Pro','eval','code='+code],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:5000000}); }
  catch(error) { if(!error.stdout?.includes('=> '))throw error;out=error.stdout; }
  const marker=out.lastIndexOf('=> ');assert.ok(marker>=0,out);return JSON.parse(out.slice(marker+3));
}
const results=[];
try {
  evaluate(`app.setting.open();await new Promise(r=>setTimeout(r,100));app.setting.openTabById('style-controller');return JSON.stringify(true);`);
  evaluate(`if(tab.hasDirtyDrafts())throw Error('Existing user drafts');window.__scPathTest={bounds:w.getBounds(),sections:new Map(tab.subsections||[]),ids:[],currentNote:app.workspace.getActiveFile()?.path};const state=window.__scPathTest;state.click=async e=>{e.scrollIntoView({block:'center',behavior:'instant'});await new Promise(r=>d.defaultView.setTimeout(r,60));const b=e.getBoundingClientRect(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);if(!e.contains(d.elementFromPoint(x,y)))throw Error('Covered click: '+e.textContent);window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await new Promise(r=>d.defaultView.setTimeout(r,130));await tab.applyQueue;await p.settingsWrite;};p.settings.activeSettingsTab='global';tab.subsections ||= new Map();tab.subsections.set('global','images');tab.display();for(let i=0;i<2;i++){const before=p.settings.overrides.length;await state.click([...tab.pageEl.querySelectorAll('button')].find(e=>e.textContent==='Add rule'));if(p.settings.overrides.length!==before+1)throw Error('Add rule did not fire exactly once');state.ids.push(p.settings.overrides.at(-1).id);}state.cards=()=>[...tab.pageEl.querySelectorAll('.osc-image-rule')].filter(e=>state.ids.some(id=>e.dataset.oscDraft==='override:'+id));state.context=id=>tab.drafts.entries.get('override:'+id);return JSON.stringify(true);`);
  for(const width of [620,720,1000]) {
    const result=evaluate(`w.setBounds({width:${width},height:800});await new Promise(r=>d.defaultView.setTimeout(r,200));const nav=()=>[...tab.sectionMenuEl.children,...tab.subsectionNavEl.children].map(e=>{const b=e.getBoundingClientRect();return [b.x,b.y,b.width,b.height];}),beforeNav=nav();const card=t.cards()[0],input=card.querySelector('.osc-path-pattern-setting input'),suggest=tab.pathSuggests.find(s=>s.inputEl===input);input.scrollIntoView({block:'end',behavior:'instant'});await new Promise(r=>d.defaultView.setTimeout(r,70));input.focus({preventScroll:true});input.value='Cambridge';const start=performance.now();input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));const searchMs=performance.now()-start;await new Promise(r=>d.defaultView.setTimeout(r,120));const popup=suggest.dropdownEl,b=popup.getBoundingClientRect(),getBounds=()=>({left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height});if(!popup.isConnected)throw Error('Popup was clipped '+JSON.stringify({width:${width},rect:input.getBoundingClientRect().toJSON(),connected:input.isConnected,scroll:tab.pageEl.scrollTop,clip:tab.pageEl.getBoundingClientRect().toJSON(),active:d.activeElement.className}));const first=suggest.suggestions[0].path;let calls=0;const choose=suggest.onChoosePath;suggest.onChoosePath=path=>{calls++;choose(path);};const rows=[...popup.children].map(e=>({path:e.title,text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}));const highlight=!!popup.querySelector('.suggestion-highlight');const upward=popup.classList.contains('opens-up');t.stage='capture';require('fs').writeFileSync(${JSON.stringify(directory)}+'/'+${width}+'-paths.png',(await w.webContents.capturePage()).toPNG());t.stage='select';await t.click(popup.children[0]);if(calls!==1||input.value!==first||popup.isConnected)throw Error('First-click selection failed');suggest.onChoosePath=choose;
      // Keyboard selection scrolls just the popup, then closes before a repeat Enter.
      input.focus({preventScroll:true});input.value='Cambridge';input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));const scroll=tab.pageEl.scrollTop;for(const key of ['ArrowDown','PageDown','End']){w.webContents.sendInputEvent({type:'keyDown',keyCode:key});w.webContents.sendInputEvent({type:'keyUp',keyCode:key});}await new Promise(r=>d.defaultView.setTimeout(r,80));const index=suggest.selectedIndex,option=popup.children[index],visible=option.offsetTop>=popup.scrollTop&&option.offsetTop+option.offsetHeight<=popup.scrollTop+popup.clientHeight+1;const expected=suggest.suggestions[index].path;w.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});await new Promise(r=>d.defaultView.setTimeout(r,80));if(input.value!==expected||popup.isConnected)throw Error('Keyboard selection failed');const keyboardScrollStable=Math.abs(scroll-tab.pageEl.scrollTop)<1;const navAfter=nav();
      t.stage='refocus';await t.click(input);t.stage='escape';input.value='Cambridge';input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));w.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await new Promise(r=>d.defaultView.setTimeout(r,70));const escape=!popup.isConnected;t.stage='blur';await t.click(input);input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));await t.click([...tab.sectionMenuEl.children].find(e=>e.classList.contains('is-active'))||tab.sectionMenuEl.children[0]);const blurred=!popup.isConnected;t.stage='scope';

      // Image scope limits results without changing ordinary override matching.
      const scope=card.querySelector('select');scope.value='folder';scope.dispatchEvent(new d.defaultView.Event('change',{bubbles:true}));const folders=suggest.getSuggestions('Cambridge').every(s=>s.folder);scope.value='file';scope.dispatchEvent(new d.defaultView.Event('change',{bubbles:true}));const notes=suggest.getSuggestions('Cambridge').every(s=>!s.folder&&s.path.endsWith('.md'));const fuzzy=suggest.getSuggestions('CmbAp').length;
      t.stage='current';await t.click(card.querySelector('.osc-current-note'));const current=t.context(t.ids[0]).value;const shortcut=current.type==='file'&&current.pattern===t.currentNote;
      // Navigate subsections with a draft: popup disappears, draft stays owned by rule.
      const draft=current.pattern;tab.selectSubsection('headings');const cleaned=d.querySelectorAll('.osc-path-dropdown').length===0;tab.selectSubsection('images');const preserved=t.context(t.ids[0]).value.pattern===draft;
      return JSON.stringify({width:${width},searchMs,bounds:getBounds(),viewport:[d.documentElement.clientWidth,d.documentElement.clientHeight],rows,highlight,upward,firstClick:true,index,visible,escape,blurred,pageScrollStable:keyboardScrollStable,nav:beforeNav,navAfter,folders,notes,fuzzy,shortcut,cleaned,preserved});`);
    results.push(result);writeFileSync(path.join(directory,'paths.json'),JSON.stringify(results,null,2));
    assert.deepEqual(result.navAfter,result.nav,'navigation remains stationary');
    assert.ok(result.bounds.left>=0&&result.bounds.right<=result.viewport[0]);
    assert.ok(result.bounds.top>=0&&result.bounds.bottom<=result.viewport[1]);
    assert.ok(result.bounds.height<=260&&result.rows.length<=12);
    assert.ok(result.rows.every(row=>row.width===row.scroll&&row.text===row.path),'single path per row, ellipsis without horizontal scroll');
    for(const key of ['highlight','upward','visible','escape','blurred','pageScrollStable','folders','notes','shortcut','cleaned','preserved'])assert.ok(result[key],key);
    assert.ok(result.fuzzy>0,'non-contiguous fuzzy query');
  }
  const independent=evaluate(`const [a,b]=t.ids.map(id=>t.context(id));a.value.name='Autocomplete saved note';a.value.type='file';a.value.pattern=t.currentNote;a.value.profile.imageWidth='222px';a.value.profile.imageAlignment='native';a.value.profile.imageRespectExplicitSize='true';b.value.name='Autocomplete folder draft';b.value.type='folder';b.value.pattern='Cambridge';b.value.profile.imageWidth='333px';const savedB=p.settings.overrides.find(o=>o.id===t.ids[1]).profile.imageWidth;tab.noteDraftMutation(a.value);tab.noteDraftMutation(b.value);tab.display();await t.click([...t.cards()[0].querySelector('.osc-section-actions').querySelectorAll('button')].find(e=>e.textContent==='Apply'));const independent=!a.dirty&&b.dirty&&p.settings.overrides.find(o=>o.id===t.ids[1]).profile.imageWidth===savedB&&p.settings.overrides.find(o=>o.id===t.ids[0]).profile.imageWidth==='222px';await t.click([...t.cards()[1].querySelector('.osc-section-actions').querySelectorAll('button')].find(e=>e.textContent==='Revert'));const reverted=!b.dirty&&p.settings.overrides.find(o=>o.id===t.ids[0]).profile.imageWidth==='222px';const resolved=p.getProfileForPath(t.currentNote).profile;return JSON.stringify({independent,reverted,resolved:{width:resolved.imageWidth,alignment:resolved.imageAlignment,respect:resolved.imageRespectExplicitSize}});`);
  assert.ok(independent.independent&&independent.reverted);
  assert.deepEqual(independent.resolved,{width:'222px',alignment:'native',respect:'true'});
  evaluate(`await tab.applyQueue;await p.settingsWrite;tab.hide();await app.plugins.disablePlugin('style-controller');await app.plugins.enablePlugin('style-controller');return JSON.stringify(true);`);
  const persisted=evaluate(`return JSON.stringify(p.settings.overrides.find(o=>o.id===t.ids[0])?.profile.imageWidth);`);assert.equal(persisted,'222px');
  // Both legacy editors instantiate the same component and retain the same picker semantics.
  evaluate(`app.setting.openTabById('style-controller');return JSON.stringify(true);`);
  const consumers=evaluate(`const result=[];let constructor;for(const section of ['overrides','fileExplorer']){p.settings.activeSettingsTab=section;tab.display();const input=tab.pageEl.querySelector('.osc-path-pattern-setting input'),s=tab.pathSuggests.find(s=>s.inputEl===input);constructor ||= s?.constructor;const count=s?.getSuggestions('CmbAp').length;input.scrollIntoView({block:'center',behavior:'instant'});await new Promise(r=>d.defaultView.setTimeout(r,100));input.focus({preventScroll:true});input.value='Cambridge';input.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));const expected=s.suggestions[0]?.path;await t.click(s.dropdownEl.children[0]);result.push({section,shared:s?.constructor===constructor,count,firstClick:input.value===expected&&!s.dropdownEl.isConnected});}return JSON.stringify(result);`);
  assert.ok(consumers.every(c=>c.shared&&c.count>0&&c.firstClick));
  writeFileSync(path.join(directory,'independent.json'),JSON.stringify({independent,persisted,consumers},null,2));
  process.stdout.write('PASS: shared path autocomplete at 620/720/1000; bounds, upward opening, fuzzy matching, scope filters, mouse/keyboard, highlighting/tooltips, no horizontal scroll, cleanup, current-note shortcut, independent Apply/Revert and reload persistence.\n');
} finally {
  try { evaluate(`await tab.applyQueue;await p.settingsWrite;tab.hide();if(t&&w)w.setBounds(t.bounds);await app.plugins.disablePlugin('style-controller');return JSON.stringify(true);`); }
  finally {
    writeFileSync(dataPath,original);
    evaluate(`await app.plugins.enablePlugin('style-controller');if(t){app.plugins.plugins['style-controller'].settingTab.subsections=t.sections;}delete window.__scPathTest;return JSON.stringify(true);`);
    assert.deepEqual(readFileSync(dataPath),original,'data.json preserved byte-for-byte');
    assert.equal(hash(readFileSync(notePath)),noteHash,'pKa unchanged');
  }
}
