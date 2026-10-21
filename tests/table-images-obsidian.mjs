// Pro-only, read-only reproduction: native table cell editing must not enlarge images.
// SC_BASELINE_CSS optionally records the pre-fix CSS before verifying the candidate.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, 'Set SC_EVIDENCE_DIR');
mkdirSync(directory, { recursive: true });
const vault = '/Users/pat/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Pro';
const note = 'Cambridge/Appendix/pKa.md';
const dataPath = path.join(vault, '.obsidian/plugins/style-controller/data.json');
const data = readFileSync(dataPath), original = readFileSync(path.join(vault, note));
const hash = b => createHash('sha256').update(b).digest('hex');
const evaluate = body => {
  const code = `(async()=>{if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');const t=window.__scImageRegression;${body}})()`;
  let output;
  try { output = execFileSync('obsidian', ['vault=Obsidian Pro','eval','code='+code], { encoding:'utf8', timeout:12000, killSignal:'SIGKILL', maxBuffer:5000000 }); }
  catch (error) { if (!error.stdout?.includes('=> ')) throw error; output = error.stdout; }
  const marker = output.lastIndexOf('=> '); assert.ok(marker >= 0, output); return JSON.parse(output.slice(marker+3));
};
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const baseline = process.env.SC_BASELINE_CSS && readFileSync(process.env.SC_BASELINE_CSS, 'utf8');
const measurements = [];
let attachments;
try {
  const links = [...original.toString().matchAll(/!\[\[([^\]|\\]+)[^\]]*\]\]/g)].map(m => m[1]);
  attachments = evaluate(`const file=app.vault.getAbstractFileByPath(${JSON.stringify(note)});if(!file)throw Error('Missing reproduction note');return JSON.stringify([...new Set(${JSON.stringify(links)}.map(link=>app.metadataCache.getFirstLinkpathDest(link,file.path)?.path).filter(Boolean))]);`);
  attachments = attachments.map(relative => ({ path:relative, sha256:hash(readFileSync(path.join(vault,relative))) }));
  evaluate(`const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path===${JSON.stringify(note)});if(!leaf)throw Error('Open the reproduction note first');const w=window.electron.remote.getCurrentWindow();window.__scImageRegression={leaf,active:app.workspace.activeLeaf,state:leaf.getViewState(),ephemeral:leaf.view.getEphemeralState(),bounds:w.getBounds(),w};const r=window.__scImageRegression;r.root=leaf.view.containerEl;r.guard=e=>{if(e.type==='beforeinput'||e.key!=='Escape'){e.preventDefault();e.stopImmediatePropagation();}};r.root.addEventListener('keydown',r.guard,true);r.root.addEventListener('beforeinput',r.guard,true);r.classes=[...r.root.classList].filter(c=>c.startsWith('style-controller-image-')||c==='style-controller-respect-explicit-image-size');r.sheet=[...document.styleSheets].find(s=>s.ownerNode?.textContent.includes('.osc-section-actions {'));if(!r.sheet)throw Error('Missing plugin CSS');r.style=document.createElement('style');document.head.append(r.style);r.sheet.disabled=true;app.workspace.setActiveLeaf(leaf,{focus:true});await leaf.setViewState({...r.state,state:{...r.state.state,mode:'source',source:false}});r.click=async(e,padding=false)=>{e.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,100));const b=e.getBoundingClientRect(),x=Math.round(padding?b.x+4:b.x+b.width/2),y=Math.round(b.y+b.height/2);if(!e.contains(document.elementFromPoint(x,y)))throw Error('Covered click target');window.electron.remote.app.focus({steal:true});w.focus();w.webContents.focus();for(const type of ['mouseDown','mouseUp'])w.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,220));};r.reset=async()=>{if(document.querySelector('.lightbox')){w.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});}r.root.querySelector('.markdown-source-view > .cm-editor > .cm-scroller').scrollTop=0;await new Promise(r=>setTimeout(r,100));await r.click(r.root.querySelector('.HyperMD-header'));};r.image=src=>[...r.root.querySelectorAll('table .image-embed img')].find(e=>e.getBoundingClientRect().width&&e.closest('.image-embed').getAttribute('src')===src);r.measure=src=>{const e=r.image(src),rect=e.getBoundingClientRect(),td=e.closest('td'),embed=e.closest('.image-embed'),wrapper=e.closest('.image-wrapper');return {image:[rect.width,rect.height],natural:[e.naturalWidth,e.naturalHeight],table:td.closest('table').getBoundingClientRect().width,cell:td.getBoundingClientRect().width,editing:!!wrapper,wrapperWidth:wrapper&&getComputedStyle(wrapper).width,wrapperMin:wrapper&&getComputedStyle(wrapper).minWidth,embedWidth:getComputedStyle(embed).width,imageWidth:getComputedStyle(e).width};};return JSON.stringify(true);`);
  for (const width of (process.env.SC_TEST_WIDTHS || "620,720,1000").split(",").map(Number)) {
    evaluate(`t.w.setBounds({width:${width},height:878});await new Promise(r=>setTimeout(r,250));return JSON.stringify(true);`);
    for (const [mode, sheet] of [...(baseline ? [['before',baseline]] : []),['fixed',css],['disabled',css]]) {
      evaluate(`t.style.textContent=${JSON.stringify(sheet)};t.root.classList.add(...t.classes);${mode==='disabled'?'t.root.classList.remove(...t.classes);':''}await new Promise(r=>setTimeout(r,100));return JSON.stringify(true);`);
      for (const src of ['Pasted image 20251028174131.png','Pasted image 20251028175240.png','Pasted image 20251028172757.png','Pasted image 20260219161545.png']) {
        for (const focus of ['image','cell']) {
          const row = evaluate(`await t.reset();const src=${JSON.stringify(src)},before=t.measure(src),e=t.image(src);await t.click(${focus==='cell'?'e.closest("td")':'e'},${focus==='cell'});const after=t.measure(src);return JSON.stringify({before,after});`);
          measurements.push({width,mode,src,focus,...row});
          if (mode==='fixed') {
            assert.ok(!row.before.editing && row.after.editing, 'real rendered-to-editable cell transition');
            assert.ok(Math.abs(row.after.table-row.before.table)<0.5, JSON.stringify(measurements.at(-1)));
            assert.ok(Math.abs(row.after.image[0]-row.before.image[0])<0.5, JSON.stringify(measurements.at(-1)));
            assert.ok(Math.abs(row.after.image[0]/row.after.image[1]-row.after.natural[0]/row.after.natural[1])<0.02, 'aspect ratio');
            assert.ok(evaluate(`return JSON.stringify(!!t.image(${JSON.stringify(src)}).closest('td').querySelector('.image-resize-corner'));`), 'native resize handle remains');
          }
        }
      }
      if (mode==='fixed') {
        evaluate(`const e=t.image('Pasted image 20260219161545.png');await t.click(e.closest('.image-embed').querySelector('[aria-label="Zoom in"]'));if(!document.querySelector('.lightbox'))throw Error('Lightbox unavailable');t.w.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});t.w.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await new Promise(r=>setTimeout(r,500));require('fs').writeFileSync(${JSON.stringify(path.join(directory,`${width}-fixed.png`))},(await t.w.webContents.capturePage()).toPNG());return JSON.stringify(true);`);
      }
    }
  }
  writeFileSync(path.join(directory,'table-images.json'),JSON.stringify(measurements,null,2));
  process.stdout.write('PASS: native image and cell clicks; stable table/image widths, explicit sizing, aspect ratios, resize handles and lightbox.\n');
} finally {
  try { evaluate(`if(t){t.style?.remove();if(t.sheet)t.sheet.disabled=false;t.root.classList.add(...t.classes);t.root.removeEventListener('keydown',t.guard,true);t.root.removeEventListener('beforeinput',t.guard,true);t.w.setBounds(t.bounds);await t.leaf.setViewState(t.state);t.leaf.view.setEphemeralState(t.ephemeral);if(t.active)app.workspace.setActiveLeaf(t.active,{focus:false});delete window.__scImageRegression;}return JSON.stringify(true);`); }
  finally {
    writeFileSync(path.join(directory,'table-images.json'),JSON.stringify(measurements,null,2));
    assert.deepEqual(readFileSync(dataPath),data,'data.json byte preservation');
    assert.deepEqual(readFileSync(path.join(vault,note)),original,'note byte preservation');
    for (const a of attachments||[]) assert.equal(hash(readFileSync(path.join(vault,a.path))),a.sha256,a.path);
  }
}
