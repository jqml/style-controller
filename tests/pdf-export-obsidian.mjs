// Pro-only native PDF integration: invokes Obsidian's own export dialog/renderer.
// Settings overrides and dialog automation are temporary; source notes are read-only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "sc-pdf-native-"));
const evaluate = code => execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code}`], { encoding: "utf8", timeout: 45000 });
const parse = output => { assert.ok(output.startsWith("=> "),output);return JSON.parse(output.slice(3)); };
const setup = String.raw`(async()=>{
 if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');
 const plugin=app.plugins.plugins['style-controller'],originalLeaf=app.workspace.activeLeaf,originalFile=originalLeaf.view.file,leaf=app.workspace.getLeaf('tab');
 const file=app.vault.getAbstractFileByPath('Cambridge/Part 2/Practical/Physical/Experiment A — Determination of the Rate Constant for the Alkaline Hydrolysis of Ethyl Acetate.md');
 if(!file)throw Error('Reference chemistry report not found');
 const t=window.__scPdfTest={plugin,leaf,file,originalLeaf,originalFile,state:leaf.view.getState(),ephemeral:leaf.view.getEphemeralState(),settings:plugin.settings,bodyClass:document.body.className,source:await app.vault.cachedRead(file)};
 await leaf.openFile(file);await leaf.view.setState({...leaf.view.getState(),mode:'source',source:false},{history:false});
 plugin.settings=JSON.parse(JSON.stringify(plugin.settings));
 t.profile=plugin.getProfileForPath(file.path).profile;
 t.override={id:'pdf-test',name:'PDF test',enabled:true,type:'file',pattern:file.path,modules:{baseText:true},profile:{pdfMatchLivePreview:'off'}};
 plugin.settings.overrides.push(t.override);
 return JSON.stringify({path:file.path});
})()`;
try {
  process.stdout.write(evaluate(setup));
  const fixtureSource=readFileSync(new URL("./fixtures/pdf-layout.md",import.meta.url),"utf8");
  evaluate(`(async()=>{const t=window.__scPdfTest;t.folder='SC PDF Fixture '+Date.now();await app.vault.createFolder(t.folder);t.fixtureSource=${JSON.stringify(fixtureSource)};t.fixture=await app.vault.create(t.folder+'/PDF layout.md',t.fixtureSource);await new Promise(r=>setTimeout(r,1800));return 'fixture ready';})()`);
  for (const mode of ["off", "on", "dark", "fixture"]) {
    const target=path.join(directory,`chemistry-${mode}.pdf`);
    const result=parse(evaluate(`(async()=>{
      const t=window.__scPdfTest,p=t.plugin,dialog=window.electron.remote.dialog,save=dialog.showSaveDialog;
      t.override.profile.pdfMatchLivePreview=${JSON.stringify(mode==='off'?'off':'on')};
      document.body.className=t.bodyClass;
      if(${mode==='dark'}){document.body.classList.remove('theme-light');document.body.classList.add('theme-dark');}
      t.plugin.applyStyles();
      if(${mode==='fixture'}){
        t.override.pattern=t.fixture.path;t.override.modules.headings=true;t.override.profile.h1Size='42px';
        p.settings.callouts.spacingByView={enabled:true,reading:{marginTop:'11px',paddingTop:'9px'},live:{marginTop:'23px',paddingTop:'13px'}};
        await t.leaf.openFile(t.fixture);await t.leaf.view.setState({...t.leaf.view.getState(),mode:'source',source:false},{history:false});
      }
      const liveSnapshot=()=>[...t.leaf.view.containerEl.querySelectorAll('.inline-title,.cm-content,.cm-line:not(.HyperMD-header):not(:has(br)),.HyperMD-header > .cm-header:not(.cm-formatting)')].map(e=>{const c=getComputedStyle(e);return {text:e.textContent,...Object.fromEntries(['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','marginTop','marginBottom','paddingTop','paddingBottom'].map(k=>[k,c[k]]))}});
      const liveBefore=liveSnapshot();
      const result=window.__scPdfLastResult={mode:${JSON.stringify(mode)},file:t.leaf.view.file?.path};
      let done,fail;const completed=new Promise((resolve,reject)=>{done=resolve;fail=reject});
      const timeout=setTimeout(()=>fail(Error('Native PDF timed out '+JSON.stringify({mode:result.mode,file:result.file,rendered:result.renderedPath}))),25000);
      p.registerMarkdownPostProcessor(async(element,context)=>{
        const root=context.containerEl;
        if(element!==root||!root?.parentElement?.matches('body > .print'))return;result.renderedPath=context.sourcePath;
        root.ownerDocument.defaultView.electron.ipcRenderer.once('print-to-pdf',()=>done());
        await new Promise(resolve=>setTimeout(resolve,700));
        const scope=root.parentElement,computed=e=>{const s=e.ownerDocument.defaultView.getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,margin:s.margin,padding:s.padding}};
        result.appearance=root.ownerDocument.body.className;result.body=computed(root);
        result.styled=scope.classList.contains('osc-pdf-export');result.profile=scope.getAttribute('data-osc-profile');
        result.annotated=root.querySelectorAll('.osc-reading-block').length;
        result.title=computed(root.querySelector('.inline-title')||root.querySelector('h1'));
        result.headings=[...root.querySelectorAll('[data-heading]')].map(e=>({text:e.textContent,...computed(e)}));
        result.extraGap=[...root.querySelectorAll('.osc-reading-block')].filter(e=>e.style.getPropertyValue('--osc-source-gap-lines')==='3').map(e=>e.firstElementChild.getBoundingClientRect().top-e.previousElementSibling.firstElementChild.getBoundingClientRect().bottom);
        result.callouts=root.querySelectorAll('.callout').length;if(result.callouts)result.calloutStyle=computed(root.querySelector('.callout'));
        result.math=root.querySelectorAll('mjx-container').length;result.tables=root.querySelectorAll('table').length;
        result.images=[...root.querySelectorAll('img')].map(e=>({loaded:e.complete&&e.naturalWidth>0,width:e.naturalWidth}));
        if(${mode==='fixture'}){
          result.liveHeadings=[];
          for(const heading of app.metadataCache.getFileCache(t.fixture).headings){
            t.leaf.view.editor.setCursor({line:heading.position.start.line+1,ch:0});
            t.leaf.view.editor.scrollIntoView({from:{line:heading.position.start.line,ch:0},to:{line:heading.position.start.line+1,ch:0}},true);
            await new Promise(r=>setTimeout(r,80));
            const text=t.leaf.view.containerEl.querySelector('.cm-header-'+heading.level+':not(.cm-formatting)');
            if(!text)throw Error('Missing actual Live Preview H'+heading.level);
            result.liveHeadings.push({level:heading.level,...computed(text)});
          }
        }
        result.html=root.outerHTML;result.sourceSections=app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(context.sourcePath))?.sections;
        const pair=root.querySelector('.el-p.osc-reading-block + .el-p.osc-reading-block');
        if(pair){const first=pair.previousElementSibling.firstElementChild,last=pair.firstElementChild;result.paragraphGap=last.getBoundingClientRect().top-first.getBoundingClientRect().bottom;}
      });
      // Component.register stores this processor's own unregister callback.
      // Remove only the test observer; leave production registration untouched.
      const unregister=p._events.pop();
      dialog.showSaveDialog=async()=>({canceled:false,filePath:${JSON.stringify(target)}});
      try {
        t.leaf.view.printToPdf();document.querySelector('.modal .mod-cta').click();
        await completed;await new Promise(r=>setTimeout(r,150));
        result.cleanup=p.pdfExportScopes?.size||0;
        if(${mode!=='fixture'}){result.liveBefore=liveBefore;result.liveAfter=liveSnapshot();}
        if(await app.vault.cachedRead(t.file)!==t.source)throw Error('Source changed');
        return JSON.stringify(result);
      }finally{clearTimeout(timeout);unregister();dialog.showSaveDialog=save;}
    })()`));
    writeFileSync(path.join(directory,`chemistry-${mode}-dom.json`),JSON.stringify(result,null,2));
    assert.equal(result.styled,mode!=="off");
    assert.equal(result.cleanup,0);
    if(mode!=="fixture")assert.deepEqual(result.liveAfter,result.liveBefore,"PDF export changed Live Preview typography or spacing");
    assert.ok(result.images.every(image=>image.loaded));
    if(mode!=="fixture"){
      assert.equal(result.images.length,7,"Reference chemistry report should contain seven figures");
      assert.equal(result.tables,2);
      assert.ok(result.math>20);
    }else{
      assert.equal(result.tables,1);
      assert.equal(result.images.length,1);
      assert.equal(result.callouts,1);
      assert.ok(result.calloutStyle.margin.startsWith("23px"));
      assert.ok(result.calloutStyle.padding.startsWith("13px"));
      assert.ok(result.extraGap.some(gap=>Math.abs(gap-72)<0.2));
      assert.equal(result.headings.length,6);
      assert.equal(result.headings[0].size,"42px");
      assert.equal(result.liveHeadings.length,6);
      for(let index=0;index<6;index++)for(const key of ['font','size','weight','color','lineHeight','letterSpacing'])assert.equal(result.headings[index][key],result.liveHeadings[index][key],`PDF H${index+1} ${key}`);
      assert.ok(result.html.includes("ROW090")&&result.html.includes("CODE080")&&result.html.includes("PDF COMPLETENESS SENTINEL 038"));
    }
    if(mode==="on"){
      assert.ok(result.annotated>25);
      assert.equal(result.title.size,"40px");
      assert.equal(result.title.margin,"0px 0px 20px");
      assert.equal(result.paragraphGap,24);
      for(const heading of result.headings)assert.equal(heading.size,heading.text==="Abstract"||heading.text==="Discussion"||heading.text==="Results and Analysis"||heading.text.startsWith("Appendix")?"25px":"23px");
    }
    assert.ok(statSync(target).size>100000);
    writeFileSync(path.join(directory,`chemistry-${mode}-dom.json`),JSON.stringify(result,null,2));
  }
  process.stdout.write(JSON.stringify({passed:true,directory})+"\n");
} finally {
  const result=evaluate(`(async()=>{const t=window.__scPdfTest;if(!t)return 'clean';document.body.className=t.bodyClass;t.plugin.settings=t.settings;t.plugin.applyStyles();t.leaf.detach();if(t.originalLeaf.parent)app.workspace.setActiveLeaf(t.originalLeaf,{focus:true});const folder=app.vault.getAbstractFileByPath(t.folder);if(folder)await app.vault.delete(folder,true);delete window.__scPdfTest;delete window.__scPdfLastResult;return 'clean';})()`);
  assert.match(result,/clean/);
}
// Keep a content read as a final guard against reporting a nonexistent output.
assert.ok(readFileSync(path.join(directory,"chemistry-on.pdf")).subarray(0,5).equals(Buffer.from("%PDF-")));
