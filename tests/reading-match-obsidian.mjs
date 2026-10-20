// Pro-only native integration. Settings, theme CSS and panes are restored; no settings save.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "sc-reading-match-"));
const evaluate = code => execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code}`], { encoding: "utf8", timeout: 60000 });
const screenshot = name => {
  const target = path.join(directory, name);
  try {
    execFileSync("obsidian", ["vault=Obsidian Pro", "dev:screenshot", `path=${target}`], { timeout: 10000, killSignal: "SIGKILL" });
  } catch (error) {
    // Some CLI builds save the PNG but leave their screenshot client running.
    // A complete PNG is the evidence; never wait indefinitely for that client.
    const bytes = readFileSync(target);
    if (bytes.length < 100 || !bytes.subarray(-8, -4).equals(Buffer.from("IEND"))) throw error;
  }
};
const setup = String.raw`(async()=>{
 if(app.vault.getName()!=="Obsidian Pro")throw new Error("Pro only");
 const plugin=app.plugins.plugins['style-controller'], reading=app.workspace.activeLeaf,file=app.workspace.getActiveFile();
 const originalState=reading.view.getState(),ephemeral=reading.view.getEphemeralState();
 const live=app.workspace.getLeaf('split','vertical');
 window.__scReadingTest={plugin,settings:plugin.settings,reading,live,file,originalState,ephemeral,bodyClass:document.body.className};
 await reading.view.setState({...originalState,mode:'preview'},{history:false});
 await live.openFile(file);await live.view.setState({...live.view.getState(),mode:'source',source:false},{history:false});
 plugin.settings=JSON.parse(JSON.stringify(plugin.settings));
 plugin.settings.overrides.push({id:'reading-native-test',name:'Reading native test',enabled:true,type:'file',pattern:file.path,modules:{baseText:true,headings:true},profile:{paragraphSpacing:'matched',preserveExtraBlankLines:'off'}});
 reading.view.previewMode.rerender(true);plugin.applyStyles();
 await new Promise(r=>setTimeout(r,1000));
 const t=window.__scReadingTest;
 t.pause=()=>new Promise(r=>setTimeout(r,650));
 t.check=(x,m)=>{if(!x)throw new Error(m)};
 t.props=e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,height:e.getBoundingClientRect().height,paddingTop:s.paddingTop,marginTop:s.marginTop,marginBottom:s.marginBottom}};
 t.align=async()=>{
  reading.view.previewMode.applyScroll(0);live.view.editor.setCursor({line:4,ch:0});live.view.editor.scrollIntoView({from:{line:4,ch:0},to:{line:9,ch:0}},true);await t.pause();
  const rh=[...reading.view.containerEl.querySelectorAll('h4')].find(e=>e.textContent.startsWith('Student:'));
  const lh=[...live.view.containerEl.querySelectorAll('.HyperMD-header-4')].find(e=>e.textContent.startsWith('Student:'));
  t.check(rh&&lh,'Expected original Pro note student heading');
  const rs=reading.view.containerEl.querySelector('.markdown-preview-view'),ls=live.view.editor.cm.scrollDOM;
  rs.scrollTop+=rh.getBoundingClientRect().top-rs.getBoundingClientRect().top-12;
  ls.scrollTop+=lh.getBoundingClientRect().top-ls.getBoundingClientRect().top-12;
  await t.pause();
 };
 t.measure=()=>{
  const rh=[...reading.view.containerEl.querySelectorAll('h4')].find(e=>e.textContent.startsWith('Student:'));
  const lh=[...live.view.containerEl.querySelectorAll('.HyperMD-header-4')].find(e=>e.textContent.startsWith('Student:'));
  const semantic=lh.querySelector('.cm-header-4');
  const next=rh.parentElement.nextElementSibling.firstElementChild;
  const pair=reading.view.containerEl.querySelector('.el-p + .el-p');
  const first=pair.previousElementSibling.querySelector('p'),second=pair.querySelector('p');
  const abstract=[...reading.view.containerEl.querySelectorAll('h3')].find(e=>e.textContent==='Abstract');
  const abstractLine=[...live.view.containerEl.querySelectorAll('.HyperMD-header-3')].find(e=>e.textContent==='Abstract');
  const headingParagraphGap=abstract.parentElement.nextElementSibling.firstElementChild.getBoundingClientRect().top-abstract.getBoundingClientRect().bottom;
  const liveHeadingParagraphGap=abstractLine.nextElementSibling.getBoundingClientRect().top-abstractLine.getBoundingClientRect().bottom;
  const r=t.props(rh),l=t.props(semantic);l.height=lh.getBoundingClientRect().height;l.lineHeight=getComputedStyle(lh).lineHeight;
  const glyph=e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))if(node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();return {width:r.width,height:r.height};}};
  r.glyph=glyph(rh);l.glyph=glyph(semantic);
  return {reading:r,live:l,headingGap:next.getBoundingClientRect().top-rh.getBoundingClientRect().bottom,paragraphGap:second.getBoundingClientRect().top-first.getBoundingClientRect().bottom,headingParagraphGap,liveHeadingParagraphGap};
 };
 await t.align();t.before=t.measure();return JSON.stringify({before:t.before,path:file.path});
})()`;
try {
  const before=evaluate(setup);assert.ok(before.includes('"before":'));
  writeFileSync(path.join(directory,"before.json"),before);
  screenshot("before.png");
  const result=evaluate(String.raw`(async()=>{
   const t=window.__scReadingTest,p=t.plugin,o=p.settings.overrides.at(-1);o.profile.paragraphSpacing='document';
   const minimal=document.createElement('style');t.themeStyle=minimal;
   const minimalCss=await app.vault.adapter.read(app.vault.configDir+'/themes/Minimal/theme.css');
   const rows=[];
   for(const theme of ['default','Minimal'])for(const appearance of ['theme-light','theme-dark'])for(const alternate of [false,true]){
    minimal.textContent=theme==='Minimal'?minimalCss:'';document.head.append(minimal);
    document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(appearance);
    if(alternate){o.profile.h4FontFamily='Georgia, serif';o.profile.h4Color='#985321';o.profile.h4Weight='500';o.profile.lineHeight='32px';o.profile.lineHeightValue='32';o.profile.lineHeightUnit='px';}
    else for(const key of ['h4FontFamily','h4Color','h4Weight','lineHeight','lineHeightValue','lineHeightUnit'])delete o.profile[key];
    p.applyStyles();t.reading.view.previewMode.rerender(true);await t.pause();await t.align();const measured=t.measure();
    for(const key of ['font','size','weight','color','lineHeight','letterSpacing'])t.check(measured.reading[key]===measured.live[key],theme+' '+appearance+' '+key+' '+JSON.stringify(measured));
    // CodeMirror's parent-font strut can add a fractional pixel even when
    // the actual custom-font glyphs and computed line height agree exactly.
    t.check(Math.abs(measured.reading.height-measured.live.height)<1,'Heading line boxes differ '+JSON.stringify(measured));
    for(const key of ['width','height'])t.check(Math.abs(measured.reading.glyph[key]-measured.live.glyph[key])<0.2,'Heading glyph '+key+' differs '+JSON.stringify(measured));
    t.check(Math.abs(measured.headingGap)<0.2,'Consecutive heading gap');
    t.check(Math.abs(measured.headingParagraphGap-measured.liveHeadingParagraphGap)<0.2,'Heading to paragraph gap');
    t.check(Math.abs(measured.paragraphGap-(alternate?32:24))<0.2,'Paragraph gap');
    rows.push({theme,appearance,alternate,...measured});
   }
   minimal.remove();document.body.className=t.bodyClass;
   for(const key of ['h4FontFamily','h4Color','h4Weight','lineHeight','lineHeightValue','lineHeightUnit'])delete o.profile[key];
   p.applyStyles();t.reading.view.previewMode.rerender(true);await t.pause();await t.align();
   t.rows=rows;return JSON.stringify({rows,matched:true});
  })()`);
  writeFileSync(path.join(directory,"profiles-themes.json"),result);assert.ok(result.includes('"matched":true'),result);
  screenshot("headings-after.png");
  const boundaries=evaluate(String.raw`(async()=>{
   const t=window.__scReadingTest,o=t.plugin.settings.overrides.at(-1),r=t.reading.view,l=t.live.view;
   // The user's original note has a table/caption followed by two blank lines.
   r.previewMode.applyScroll(29);l.editor.setCursor({line:0,ch:0});l.editor.scrollIntoView({from:{line:29,ch:0},to:{line:39,ch:0}},true);await t.pause();
   const table=[...r.containerEl.querySelectorAll('.el-table')][0];t.check(table,'Original note table missing');
   table.scrollIntoView({block:'start'});await t.pause();
   const caption=table.nextElementSibling.querySelector('p'),next=table.nextElementSibling.nextElementSibling.querySelector('p');
   const rectgap=()=>next.getBoundingClientRect().top-caption.getBoundingClientRect().bottom;
   const softBefore=next.innerHTML;const collapsed=rectgap();o.profile.preserveExtraBlankLines='on';t.plugin.applyStyles();await t.pause();const preserved=rectgap();
   const tableGap=caption.getBoundingClientRect().top-table.querySelector('table').getBoundingClientRect().bottom;
   const liveTable=l.containerEl.querySelector('.cm-table-widget table');t.check(liveTable,'Native table widget missing');
   const captionLine=[...l.containerEl.querySelectorAll('.cm-line')].find(e=>e.textContent.startsWith('Table 1'));
   t.check(captionLine,'Native table caption missing');
   const liveTableGap=captionLine.getBoundingClientRect().top-liveTable.getBoundingClientRect().bottom;
   t.check(Math.abs(tableGap-liveTableGap)<0.2,'Table boundary differs '+tableGap+' / '+liveTableGap);
   const ls=l.editor.cm.scrollDOM;ls.scrollTop+=liveTable.getBoundingClientRect().top-ls.getBoundingClientRect().top-12;await t.pause();
   t.check(Math.abs(preserved-collapsed-24)<0.2,'Additional blank line not preserved '+collapsed+' / '+preserved);
   t.check(Math.abs(tableGap-16)<0.2,'Table widget padding mismatch '+tableGap);
   const cm=l.editor.cm,doc=cm.state.doc;
   const liveGap=cm.lineBlockAt(doc.line(39).from).top-cm.lineBlockAt(doc.line(36).from).bottom;
   t.check(Math.abs(preserved-liveGap)<0.2,'Source gap differs '+preserved+' / '+liveGap);
   t.check(next.innerHTML===softBefore,'Soft line breaks changed');
   return JSON.stringify({collapsed,preserved,liveGap,tableGap,liveTableGap,softBreaksUnchanged:true,matched:true});
  })()`);
  writeFileSync(path.join(directory,"boundaries.json"),boundaries);assert.ok(boundaries.includes('"matched":true'),boundaries);
  screenshot("table-blank-lines-after.png");
  process.stdout.write(before+result+boundaries+`Evidence: ${directory}\n`);
} finally {
  evaluate(String.raw`(async()=>{const t=window.__scReadingTest;if(!t)return;t.themeStyle?.remove();document.body.className=t.bodyClass;t.plugin.settings=t.settings;t.plugin.applyStyles();t.live.detach();await t.reading.view.setState(t.originalState,{history:false});t.reading.view.setEphemeralState(t.ephemeral);t.reading.view.previewMode?.rerender(true);app.workspace.setActiveLeaf(t.reading,{focus:true});delete window.__scReadingTest;return 'Restored';})()`);
}
