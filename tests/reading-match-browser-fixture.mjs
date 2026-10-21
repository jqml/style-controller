import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proSnippets = process.env.OBSIDIAN_PRO_SNIPPETS;
assert.ok(process.env.OBSIDIAN_ASAR_PATH, "Set OBSIDIAN_ASAR_PATH to the active Obsidian runtime .asar, not the bundled fallback");
assert.ok(proSnippets, "Set OBSIDIAN_PRO_SNIPPETS to Pro's active snippet directory");
const asar = readFileSync(process.env.OBSIDIAN_ASAR_PATH);
const headerLength = asar.readUInt32LE(12);
const header = JSON.parse(asar.subarray(16, 16 + headerLength).toString());
const appCss = asar.subarray(16 + headerLength + Number(header.files["app.css"].offset), 16 + headerLength + Number(header.files["app.css"].offset) + header.files["app.css"].size).toString();
const pluginCss = readFileSync(path.join(root, "styles.css"), "utf8");
const appearance = JSON.parse(readFileSync(path.join(proSnippets, "..", "appearance.json"), "utf8"));
const activeSnippets = (appearance.enabledCssSnippets || [])
  .map((name) => path.join(proSnippets, `${name}.css`)).filter(existsSync).map((file) => readFileSync(file, "utf8")).join("\n");
const bundle = await build({
  entryPoints: [path.join(root, "src/main.ts")], bundle: true, format: "iife", platform: "browser", globalName: "StyleControllerFixture", write: false,
  plugins: [{ name: "obsidian-stub", setup(api) {
    api.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
    api.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export class Plugin {} export class MarkdownRenderChild { constructor(containerEl) { this.containerEl = containerEl; } } export class PluginSettingTab {} export class Modal {} export class Notice {} export class Setting {} export class TFolder {} export const MarkdownRenderer = {}; export const prepareFuzzySearch = () => () => null; export const renderMatches = () => {}; export const normalizePath = (value) => value; export const setIcon = () => {};",
      loader: "js"
    }));
  } }]
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${appCss}</style><style>${activeSnippets}</style><style>${pluginCss}</style></head><body class="theme-light"><script>${bundle.outputFiles[0].text}</script><script>
const api=StyleControllerFixture,results=[];
HTMLElement.prototype.createEl=function(tag,opts={}){const el=document.createElement(tag);el.className=opts.cls||'';el.textContent=opts.text||'';this.append(el);return el};
HTMLElement.prototype.createDiv=function(opts){return this.createEl('div',opts)};
HTMLElement.prototype.createSpan=function(opts){return this.createEl('span',opts)};
HTMLElement.prototype.toggleClass=function(c,on){this.classList.toggle(c,on)};
HTMLElement.prototype.setCssProps=function(props){for(const [k,v]of Object.entries(props))this.style.setProperty(k,v)};
HTMLElement.prototype.addClass=function(...classes){this.classList.add(...classes)};
HTMLElement.prototype.removeClass=function(...classes){this.classList.remove(...classes)};
const check=(v,message)=>{if(!v)throw new Error(message)};
(async()=>{
for(const appearance of ['theme-light','theme-dark'])for(const lineHeight of [24,32])for(const customSizes of [false,true]){
 document.body.className=appearance;
 const scope=document.createElement('div');scope.className='osc-style-scope';scope.style.width='700px';document.body.append(scope);
 const sizes=customSizes?Object.fromEntries([30,27,25,23,21,20].map((size,i)=>['h'+(i+1)+'Size',size+'px'])):{};
 const profile=api.normalizeProfile({...sizes,paragraphSpacing:'document',preserveExtraBlankLines:'off',lineHeight:lineHeight+'px',h3FontFamily:'Georgia',h3Weight:'500',h3Color:'#123456'});
 api.applyProfileCssVariables(scope,profile);api.applyProfileStateClasses(scope,profile);api.measureReadingReference(scope);
 // Use the real app rule that forces .cm-header font-size to inherit.
 // Comparing only the parent line misses a broken semantic text cascade.
 const editor=scope.createDiv({cls:'markdown-source-view mod-cm6 is-live-preview'}).createDiv({cls:'cm-editor cm-s-obsidian'}).createDiv({cls:'cm-content'});
 const preview=scope.createDiv({cls:'markdown-preview-view markdown-rendered'}).createDiv({cls:'markdown-preview-sizer'});
 for(let level=1;level<=6;level++){
  const line=editor.createDiv({cls:'cm-line HyperMD-header HyperMD-header-'+level});
  const text=line.createSpan({cls:'cm-header cm-header-'+level,text:'Heading'});
  const heading=preview.createDiv({cls:'el-h'+level+' osc-reading-block'}).createEl('h'+level,{text:'Heading'});
  const live=getComputedStyle(text),reading=getComputedStyle(heading);
  for(const prop of ['fontFamily','fontSize','fontWeight','fontStyle','color','lineHeight','letterSpacing'])check(live[prop]===reading[prop],'H'+level+' '+prop+': '+live[prop]+' / '+reading[prop]);
  if(customSizes)check(live.fontSize===sizes['h'+level+'Size'],'Custom H'+level+' size was ignored: '+live.fontSize);
 }
 scope.innerHTML='<div class="markdown-preview-view markdown-rendered"><div class="markdown-preview-sizer"></div></div>';
 const sizer=scope.querySelector('.markdown-preview-sizer');
 const source='### Heading\\nParagraph soft\\ncontinuation\\n\\nNext paragraph\\n\\n\\n\\nLast paragraph\\n\\n| Column |\\n| --- |\\n| Cell |\\nCaption\\n\\n- Outer\\n  - Nested\\n\\n> Quote\\n> second line';
 const specs=[['el-h3','<h3>Heading</h3>',0],['el-p','<p>Paragraph soft\\ncontinuation</p>',1],['el-p','<p>Next paragraph</p>',4],['el-p','<p>Last paragraph</p>',8],['el-table','<table><tbody><tr><td>Cell</td></tr></tbody></table>',10],['el-p','<p>Caption</p>',13],['el-ul','<ul><li>Outer<ul><li>Nested</li></ul></li></ul>',15],['el-blockquote','<blockquote><p>Quote\\nsecond line</p></blockquote>',18],['el-pre','<pre><code>Code\\n\\nCode</code></pre>',20],['el-div','<div class="math-block">Math</div>',23],['el-div','<div class="callout"><p>Callout</p></div>',25],['el-p','<p><img alt="Image"></p>',27]];
 const elements=specs.map(([cls,markup])=>{const e=document.createElement('div');e.className=cls;e.innerHTML=markup;sizer.append(e);return e});
 const nested=elements[6].querySelector('ul ul'),nestedStyles=getComputedStyle(nested).margin;
 const nestedBefore=nested.outerHTML,codeBefore=elements[8].innerHTML,mathBefore=elements[9].innerHTML;
 const plugin=new api.default();plugin.getMarkdownViews=()=>[{containerEl:scope,file:{path:'Target.md'}}];
 const children=[];
 for(let i=0;i<elements.length;i++)await plugin.styleReadingSection(elements[i],{containerEl:sizer,sourcePath:'Target.md',getSectionInfo:()=>({text:source,lineStart:specs[i][2]}),addChild:c=>children.push(c)});
 check(elements.slice(0,8).every(e=>e.classList.contains('osc-reading-block')),'Safe blocks missing');
 check(elements.slice(8).every(e=>!e.classList.contains('osc-reading-block')),'Unsupported block annotated');
 const gap=()=>elements[3].firstElementChild.getBoundingClientRect().top-elements[2].firstElementChild.getBoundingClientRect().bottom;
 const collapsed=gap();check(Math.abs(collapsed-lineHeight)<0.2,'Collapsed gap '+collapsed);
 api.applyProfileStateClasses(scope,{...profile,preserveExtraBlankLines:'on'});
 const preserved=gap();check(Math.abs(preserved-lineHeight*3)<0.2,'Preserved gap '+preserved);
 const tableGap=elements[5].firstElementChild.getBoundingClientRect().top-elements[4].firstElementChild.getBoundingClientRect().bottom;
 check(Math.abs(tableGap-16)<0.2,'Table widget gap '+tableGap);
 for(const index of [6,7]){const block=elements[index].firstElementChild,previous=elements[index-1].firstElementChild;const gap=block.getBoundingClientRect().top-previous.getBoundingClientRect().bottom;check(Math.abs(gap-lineHeight)<0.2,'List/quote boundary '+index+' / '+gap)}
 check(getComputedStyle(nested).margin===nestedStyles,'Nested list margins changed');
 check(nestedBefore===elements[6].querySelector('ul ul').outerHTML,'Nested markup changed');
 check(codeBefore===elements[8].innerHTML&&mathBefore===elements[9].innerHTML,'Code/math changed');
 check(!elements[1].querySelector('br'),'Soft line breaks changed');
 // Extra blank lines remain an independent opt-in, additive to native spacing.
 api.applyProfileStateClasses(scope,{...profile,paragraphSpacing:'native',preserveExtraBlankLines:'off'});const native=gap();
 api.applyProfileStateClasses(scope,{...profile,paragraphSpacing:'native',preserveExtraBlankLines:'on'});const independent=gap();
 check(Math.abs(independent-native-2*lineHeight)<0.2,'Independent preservation '+native+' / '+independent);
 const recycled=elements[2];recycled.className='el-div osc-reading-block';recycled.innerHTML='<div class="math-block">Recycled math</div>';
 await plugin.styleReadingSection(recycled,{containerEl:sizer,sourcePath:'Target.md',getSectionInfo:()=>({text:source,lineStart:4}),addChild:c=>children.push(c)});
 check(!recycled.classList.contains('osc-reading-block')&&!recycled.style.getPropertyValue('--osc-source-gap-lines'),'Recycled unsupported section retained styling');
 children.forEach(c=>c.onunload());check(!scope.querySelector('.osc-reading-block'),'Section cleanup failed');
 results.push({appearance,lineHeight,customSizes,collapsed,preserved,tableGap,native,independent,cleanup:true});scope.remove();
}
document.documentElement.dataset.result=encodeURIComponent(JSON.stringify(results));
})().catch(e=>{document.documentElement.dataset.error=e.stack});
</script></body></html>`;
const directory=mkdtempSync(path.join(tmpdir(),"sc-reading-browser-"));
try {
 const file=path.join(directory,"fixture.html");writeFileSync(file,html);
 const output=execFileSync(process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",["--headless=new","--no-sandbox","--disable-gpu","--virtual-time-budget=1000","--dump-dom",`file://${file}`],{encoding:"utf8",timeout:30000,maxBuffer:8*1024*1024,stdio:["ignore","pipe","ignore"]});
 const encoded=output.match(/data-result="([^"]+)"/)?.[1];assert.ok(encoded,output.match(/data-error="([^"]+)"/)?.[1]||"Fixture did not complete");
 const results=JSON.parse(decodeURIComponent(encoded));assert.equal(results.length,8);process.stdout.write(JSON.stringify(results,null,2)+"\n");
}finally{rmSync(directory,{recursive:true,force:true})}
