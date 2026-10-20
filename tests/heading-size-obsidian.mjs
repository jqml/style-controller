// Native Pro-only heading regression. Restores settings, theme, note and panes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "sc-heading-native-"));
const evaluate = code => execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code}`], { encoding: "utf8", timeout: 60000 });
const screenshot = name => {
  const target = path.join(directory, name);
  try { execFileSync("obsidian", ["vault=Obsidian Pro", "dev:screenshot", `path=${target}`], { timeout: 10000, killSignal: "SIGKILL" }); }
  catch (error) { if (!readFileSync(target).subarray(-8, -4).equals(Buffer.from("IEND"))) throw error; }
};
try {
  const setup = evaluate(String.raw`(async()=>{
    if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');
    const plugin=app.plugins.plugins['style-controller'],reading=app.workspace.activeLeaf,file=app.workspace.getActiveFile();
    const t=window.__scHeadingRegression={plugin,reading,file,state:reading.view.getState(),ephemeral:reading.view.getEphemeralState(),settings:plugin.settings,bodyClass:document.body.className};
    t.profile=plugin.getProfileForPath(file.path).profile;
    plugin.settings=JSON.parse(JSON.stringify(plugin.settings));
    t.folder='SC Heading Regression '+Date.now();await app.vault.createFolder(t.folder);
    t.fixture=await app.vault.create(t.folder+'/Heading comparison.md',Array.from({length:6},(_,i)=>'#'.repeat(i+1)+' Heading\n\nParagraph after heading.\n').join('\n'));
    await new Promise(r=>setTimeout(r,1800));
    t.override={id:'heading-regression',name:'Heading regression',enabled:true,type:'file',pattern:t.fixture.path,modules:{baseText:true,headings:true,title:true},profile:{...t.profile,paragraphSpacing:'document'}};
    plugin.settings.overrides.push(t.override);
    t.live=app.workspace.getLeaf('split','vertical');await reading.openFile(t.fixture);await t.live.openFile(t.fixture);
    await reading.view.setState({...reading.view.getState(),mode:'preview'},{history:false});
    await t.live.view.setState({...t.live.view.getState(),mode:'source',source:false},{history:false});
    t.props=e=>{if(!e)throw Error('Missing heading text');const s=getComputedStyle(e),r=e.getBoundingClientRect(),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node,textRect=null;while((node=walker.nextNode())){if(node.textContent.includes('Heading')){const range=document.createRange();range.selectNodeContents(node);const box=range.getBoundingClientRect();textRect={x:box.x,y:box.y,width:box.width,height:box.height};break;}}return {textRect,kerning:s.fontKerning,ligatures:s.fontVariantLigatures,rendering:s.textRendering,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,margin:s.margin,padding:s.padding,zoom:s.zoom,x:r.x,y:r.y,width:r.width,height:r.height}};
    return 'ready';
  })()`);
  assert.match(setup, /ready/);
  const results=[];
  for (const theme of ["theme-light", "theme-dark"]) for (const alternate of [false, true]) {
    const result=evaluate(`(async()=>{
      const t=window.__scHeadingRegression;
      document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(${JSON.stringify(theme)});
      t.override.profile={...t.profile,paragraphSpacing:'document',...(${alternate}?{h1Size:'42px',h2Size:'34px',h3Size:'28px',h4Size:'24px',h5Size:'22px',h6Size:'18px'}:{})};
      t.plugin.applyStyles();t.reading.view.previewMode.rerender(true);
      t.reading.view.previewMode.applyScroll(0);t.live.view.editor.setCursor({line:5,ch:0});t.live.view.editor.cm.scrollDOM.scrollTop=0;
      await new Promise(r=>setTimeout(r,800));
      return JSON.stringify({theme:${JSON.stringify(theme)},alternate:${alternate},scale:visualViewport.scale,dpr:devicePixelRatio,
        widths:[t.reading,t.live].map(l=>l.view.containerEl.getBoundingClientRect().width),
        title:[t.reading,t.live].map(l=>t.props(l.view.containerEl.querySelector('.inline-title'))),
        rows:Array.from({length:6},(_,i)=>{const n=i+1,line=t.live.view.containerEl.querySelector('.cm-line.HyperMD-header-'+n);return {n,expected:t.override.profile['h'+n+'Size'],reading:t.props(t.reading.view.containerEl.querySelector('h'+n)),line:t.props(line),live:t.props(line?.querySelector('.cm-header-'+n+':not(.cm-formatting)'))}})});
    })()`);
    const data=JSON.parse(result.slice(result.indexOf("=> ")+3));
    writeFileSync(path.join(directory,`case-${theme}-${alternate}.json`),JSON.stringify(data,null,2));
    assert.ok(Math.abs(data.widths[0]-data.widths[1])<1,"Pane widths differ");
    assert.equal(data.scale,1);
    for(const row of data.rows){
      for(const property of ["font","size","weight","color","lineHeight","letterSpacing"])assert.equal(row.reading[property],row.live[property],`H${row.n} ${property}`);
      if(row.expected)assert.equal(row.live.size,row.expected,`H${row.n} custom size ignored`);
      assert.equal(row.reading.zoom,row.live.zoom);
      assert.ok(Math.abs(row.reading.textRect.width-row.live.textRect.width)<0.1,`H${row.n} glyph width differs ${JSON.stringify(row)}`);
      assert.ok(Math.abs(row.reading.textRect.height-row.live.textRect.height)<0.1,`H${row.n} glyph height differs ${JSON.stringify(row)}`);
    }
    for(const property of ["font","size","weight","lineHeight","letterSpacing","height"])assert.equal(data.title[0][property],data.title[1][property],`Title ${property}`);
    results.push(data);screenshot(`headings-${theme}-${alternate?'alternate':'saved-profile'}.png`);
  }
  writeFileSync(path.join(directory,"measurements.json"),JSON.stringify(results,null,2));
  process.stdout.write(JSON.stringify({passed:true,cases:results.length,directory})+"\n");
} finally {
  const cleanup=evaluate(`(async()=>{const t=window.__scHeadingRegression;if(!t)return 'clean';document.body.className=t.bodyClass;t.plugin.settings=t.settings;t.plugin.applyStyles();t.live?.detach();await t.reading.openFile(t.file);await t.reading.view.setState(t.state,{history:false});t.reading.view.setEphemeralState(t.ephemeral);t.reading.view.previewMode?.rerender(true);app.workspace.setActiveLeaf(t.reading,{focus:true});const folder=app.vault.getAbstractFileByPath(t.folder);if(folder)await app.vault.delete(folder,true);delete window.__scHeadingRegression;return 'clean';})()`);
  assert.match(cleanup,/clean/);
}
