// Pro-only audit. Historical CSS is swapped in memory; deployed files/settings stay intact.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const directory = process.env.SC_EVIDENCE_DIR;
assert.ok(directory, "Set SC_EVIDENCE_DIR for audit evidence");
mkdirSync(directory, { recursive: true });
const historical = process.env.SC_HISTORICAL_CSS ? JSON.parse(readFileSync(process.env.SC_HISTORICAL_CSS, "utf8")) : {};
historical["0.1.38"] = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const evaluate = code => {
  let output;
  try {
    output = execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code}`], { encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    // Some CLI builds deliver the result but leave the client running.
    // Accept only a complete successful JSON response; never infer success.
    if (error.signal !== "SIGKILL" || !error.stdout?.startsWith("=> ")) throw error;
    JSON.parse(error.stdout.slice(3));
    output = error.stdout;
  }
  assert.ok(output.startsWith("=> "), output);
  return JSON.parse(output.slice(3));
};
const screenshot = name => {
  const target = path.join(directory, name + ".png");
  try { execFileSync("obsidian", ["vault=Obsidian Pro", "dev:screenshot", `path=${target}`], { timeout: 10000, killSignal: "SIGKILL" }); }
  catch (error) { if (!readFileSync(target).subarray(-8, -4).equals(Buffer.from("IEND"))) throw error; }
};
const results = [];
const theme = process.env.SC_THEME || "theme-light";
assert.ok(["theme-light", "theme-dark"].includes(theme));
try {
  evaluate(String.raw`(async()=>{
    if(app.vault.getName()!=='Obsidian Pro')throw Error('Pro only');
    const proWindow=globalThis.electron.remote.getCurrentWindow();proWindow.show();proWindow.focus();
    const p=app.plugins.plugins['style-controller'],original=app.workspace.activeLeaf;
    const stylesheet=[...document.querySelectorAll('style')].find(s=>s.textContent.startsWith('.osc-settings {'));
    if(!stylesheet)throw Error('Plugin stylesheet missing');
    const t=window.__scLiveAudit={p,original,settings:p.settings,stylesheet,css:stylesheet.textContent,bodyClass:document.body.className};
    t.profile={...p.getProfileForPath(original.view.file.path).profile};p.settings=JSON.parse(JSON.stringify(p.settings));
    t.folder='SC Live Audit '+Date.now();await app.vault.createFolder(t.folder);
    t.file=await app.vault.create(t.folder+'/Heading audit.md',Array.from({length:6},(_,i)=>'#'.repeat(i+1)+' Heading').join('\n\n')+'\n\nBody paragraph.\n');
    await new Promise(r=>setTimeout(r,1800));
    t.override={id:'live-audit',name:'Live audit',enabled:true,type:'file',pattern:t.file.path,modules:{baseText:true,headings:true},profile:{...t.profile}};
    p.settings.overrides.push(t.override);
    t.reading=app.workspace.getLeaf('tab');await t.reading.openFile(t.file);await t.reading.view.setState({...t.reading.view.getState(),mode:'preview'},{history:false});
    t.live=app.workspace.getLeaf('split','vertical');await t.live.openFile(t.file);await t.live.view.setState({...t.live.view.getState(),mode:'source',source:false},{history:false});
    t.props=e=>{if(!e)throw Error('Missing text element '+JSON.stringify({visibility:document.visibilityState,live:t.live.view.containerEl.innerText.slice(-700),reading:t.reading.view.containerEl.innerText.slice(-700),states:[t.reading.view.getState(),t.live.view.getState()]}));const c=getComputedStyle(e),r=e.getBoundingClientRect();return Object.fromEntries(['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','color','marginTop','marginBottom','paddingTop','paddingBottom','zoom'].map(k=>[k,c[k]]).concat([['width',r.width],['height',r.height]]));};
    return JSON.stringify('ready');
  })()`);
  for (const [version, css] of Object.entries(historical)) {
    evaluate(`(()=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(${JSON.stringify(theme)});window.__scLiveAudit.stylesheet.textContent=${JSON.stringify(css)};return JSON.stringify(true)})()`);
    for (const variant of ["saved", "native-sizes", "custom"]) {
      const modes = version === "0.1.38" ? ["native", "matched", "document", "document-pdf-blank", "native"] : ["native", "document"];
      let reference, readingReference;
      for (const mode of modes) {
        const data = evaluate(`(async()=>{
          const t=window.__scLiveAudit,proWindow=globalThis.electron.remote.getCurrentWindow();proWindow.show();proWindow.focus();let profile={...t.profile};
          t.p.settings.global={...t.settings.global};
          if(${JSON.stringify(variant)}==='native-sizes')for(let n=1;n<=6;n++){profile['h'+n+'Size']='';t.p.settings.global['h'+n+'Size']='';}
          if(${JSON.stringify(variant)}==='custom')Object.assign(profile,{h1Size:'42px',h2Size:'34px',h3Size:'28px',h4Size:'24px',h5Size:'22px',h6Size:'18px',h1FontFamily:'Georgia, "Times New Roman", serif',h1Weight:'800',textWeight:'500',lineHeight:'1.6',lineHeightValue:'1.6',lineHeightUnit:'unitless'});
          Object.assign(profile,{paragraphSpacing:${JSON.stringify(mode.startsWith('document')?'document':mode)},pdfMatchLivePreview:${JSON.stringify(mode.endsWith('blank')?'on':'off')},preserveExtraBlankLines:${JSON.stringify(mode.endsWith('blank')?'on':'off')}});
          t.override.profile=profile;app.workspace.setActiveLeaf(t.reading,{focus:true});t.p.applyStyles();t.reading.view.previewMode.rerender(true);
          t.live.view.editor.setCursor({line:5,ch:0});t.live.view.editor.cm.scrollDOM.scrollTop=0;t.reading.view.previewMode.applyScroll(0);
          const live=t.live.view.containerEl,reading=t.reading.view.containerEl;
          for(let attempt=0;attempt<30;attempt++){
            await new Promise(r=>setTimeout(r,100));
            if(live.querySelector('.cm-line:not(.HyperMD-header):not(:has(br))') && live.querySelector('.inline-title') && Array.from({length:6},(_,i)=>i+1).every(n=>reading.querySelector('h'+n) && live.querySelector('.cm-line.HyperMD-header-'+n+' .cm-header-'+n+':not(.cm-formatting)')))break;
          }
          return JSON.stringify({version:${JSON.stringify(version)},variant:${JSON.stringify(variant)},mode:${JSON.stringify(mode)},scale:visualViewport.scale,dpr:devicePixelRatio,theme:document.body.className,widths:[reading,live].map(e=>e.getBoundingClientRect().width),
            body:t.props(live.querySelector('.cm-line:not(.HyperMD-header):not(:has(br))')),
            title:t.props(live.querySelector('.inline-title')),
            rows:Array.from({length:6},(_,i)=>{const n=i+1,line=live.querySelector('.cm-line.HyperMD-header-'+n);return {n,configured:profile['h'+n+'Size'],live:t.props(line.querySelector('.cm-header-'+n+':not(.cm-formatting)')),line:t.props(line),reading:t.props(reading.querySelector('h'+n))}})});
        })()`);
        assert.equal(data.scale, 1);
        if (variant === "custom") {
          assert.equal(data.body.fontWeight, "500");
          assert.equal(data.body.lineHeight, "25.6px");
          assert.match(data.rows[0].live.fontFamily, /^Georgia,/);
          assert.equal(data.rows[0].live.fontWeight, "800");
        }
        const snapshot = { body: data.body, title: data.title, rows: data.rows.map(({n,live,line})=>({n,live,line})) };
        if (reference) assert.deepEqual(snapshot, reference, `${version} ${variant}: matching changed Live Preview`);
        reference = snapshot;
        if (mode === "native") {
          const reading = data.rows.map(row => row.reading);
          if (readingReference) assert.deepEqual(reading, readingReference, "Disabling matching did not restore Reading View");
          readingReference = reading;
        }
        if (version === "0.1.38" && mode.startsWith("document")) for (const row of data.rows) for (const property of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "color"]) assert.equal(row.reading[property], row.live[property], `H${row.n} Reading ${property}`);
        if (version === "0.1.38" && variant !== "native-sizes") for (const row of data.rows) assert.equal(row.live.fontSize, row.configured);
        results.push(data);
        writeFileSync(path.join(directory,"measurements.json"),JSON.stringify(results,null,2));
        if (process.env.SC_SCREENSHOTS !== "0" && variant === "saved" && ["0.1.36","0.1.38"].includes(version) && ["native","document"].includes(mode)) screenshot(`${version}-${variant}-${mode}`);
      }
    }
  }
  // With explicit heading sizes cleared, historical and current Live Preview must agree.
  const native = results.filter(x=>x.variant === "native-sizes" && x.mode === "native");
  const snapshot = x=>({body:x.body,title:x.title,rows:x.rows.map(({n,live,line})=>({n,live,line}))});
  for (const row of native.slice(1)) assert.deepEqual(snapshot(row),snapshot(native[0]),`${row.version}: native Live Preview changed`);
  process.stdout.write(JSON.stringify({passed:true,cases:results.length,directory})+"\n");
} finally {
  evaluate(`(async()=>{const t=window.__scLiveAudit;if(!t)return JSON.stringify('clean');t.stylesheet.textContent=t.css;document.body.className=t.bodyClass;t.p.settings=t.settings;t.p.applyStyles();t.live?.detach();t.reading?.detach();app.workspace.setActiveLeaf(t.original,{focus:true});const f=app.vault.getAbstractFileByPath(t.folder);if(f)await app.vault.delete(f,true);delete window.__scLiveAudit;return JSON.stringify('clean');})()`);
}
