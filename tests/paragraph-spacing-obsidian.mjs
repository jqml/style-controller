// Opt-in Pro-only spacing and visual verification; never saves plugin settings.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const directory = mkdtempSync(path.join(tmpdir(), "sc-paragraph-verification-"));
const evaluate = code => execFileSync("obsidian", ["vault=Obsidian Pro", "eval", `code=${code}`], { encoding: "utf8", timeout: 60000 });
const screenshot = name => {
  const target = path.join(directory, name);
  try {
    execFileSync("obsidian", ["vault=Obsidian Pro", "dev:screenshot", `path=${target}`], { timeout: 10000, killSignal: "SIGKILL" });
  } catch (error) {
    const bytes = readFileSync(target);
    if (bytes.length < 100 || !bytes.subarray(-8, -4).equals(Buffer.from("IEND"))) throw error;
  }
};
const code = String.raw`(async()=>{
 if(app.vault.getName()!=="Obsidian Pro")throw new Error("Pro only");
 const original=app.workspace.activeLeaf, plugin=app.plugins.plugins["style-controller"];
 const file=app.workspace.getActiveFile(); const settings=plugin.settings;
 const leaf=app.workspace.getLeaf("tab");
 window.__scParagraphTest={original,plugin,settings,leaf};
 const pause=()=>new Promise(r=>setTimeout(r,800));
 const check=(x,m)=>{if(!x)throw new Error(m)};
 await leaf.openFile(file);await leaf.view.setState({...leaf.view.getState(),mode:"preview"},{history:false});await pause();
 const view=leaf.view;
 view.previewMode.applyScroll(0);await pause();
 const sectionInfo=e=>view.previewMode.renderer.getSectionInfo(e);
 const pair=[...view.containerEl.querySelectorAll(".markdown-preview-sizer > .el-p + .el-p")].find(e=>{
   const before=sectionInfo(e.previousElementSibling),after=sectionInfo(e);
   return before&&after&&after.lineStart-before.lineEnd===2;
 });
 check(pair,"Choose a note with adjacent prose paragraphs");
 const first=pair.previousElementSibling.querySelector("p"),second=pair.querySelector("p");
 const gap=()=>second.getBoundingClientRect().top-first.getBoundingClientRect().bottom;
 const margins=e=>{const s=getComputedStyle(e);return {start:s.marginBlockStart,end:s.marginBlockEnd,lineHeight:s.lineHeight}};
 const unaffected=()=>[...view.containerEl.querySelectorAll(".markdown-preview-sizer > :not(.el-p) > :is(h1,h2,h3,h4,h5,h6,ul,ol,pre,table,blockquote,.callout,.math-block),.callout p,li p")].map(e=>{const s=getComputedStyle(e);return [e.className,e.tagName,s.margin,s.padding,s.fontSize,s.lineHeight]});
 plugin.settings=JSON.parse(JSON.stringify(settings));plugin.settings.overrides.push({id:"paragraph-fixture",enabled:true,name:"Paragraph test",type:"file",pattern:file.path,modules:{baseText:true},profile:{paragraphSpacing:"native"}});
 plugin.applyStyles();await pause();
 const before={gap:gap(),first:margins(first),second:margins(second),unaffected:unaffected()};
 plugin.settings.overrides.at(-1).profile.paragraphSpacing="matched";
 plugin.applyStyles();await pause();
 const matched={gap:gap(),first:margins(first),second:margins(second)};
 check(Math.abs(matched.gap-parseFloat(matched.second.lineHeight))<0.1,"Reading gap does not match line height");
 check(JSON.stringify(before.unaffected)===JSON.stringify(unaffected()),"Non-paragraph styling changed");
 const override=plugin.settings.overrides.at(-1);override.profile.lineHeight="32px";override.profile.lineHeightValue="32";override.profile.lineHeightUnit="px";
 plugin.applyStyles();await pause();check(Math.abs(gap()-32)<0.1,"Profile line height was ignored");
 override.profile.paragraphSpacing="native";plugin.applyStyles();await pause();check(Math.abs(gap()-before.gap)<0.1,"Native override failed");
 delete override.profile.lineHeight;delete override.profile.lineHeightValue;delete override.profile.lineHeightUnit;override.profile.paragraphSpacing="matched";
 plugin.applyStyles();await pause();first.scrollIntoView({block:"start"});await pause();
 window.__scParagraphTest.text=first.textContent.slice(0,70);
 window.__scParagraphTest.firstLine=sectionInfo(first.parentElement).lineEnd;
 window.__scParagraphTest.nextLine=sectionInfo(second.parentElement).lineStart;
 window.__scParagraphTest.results={path:file.path,before:{gap:before.gap,first:before.first,second:before.second},matched,profile32px:true,nativeOverride:true,nonParagraphStylesUnchanged:true};
 return JSON.stringify(window.__scParagraphTest.results);
})()`;
try {
  const reading = evaluate(code);
  writeFileSync(path.join(directory, "reading.json"), reading);
  assert.ok(reading.includes('"matched":'), reading);
  screenshot("reading.png");
  const live = evaluate(String.raw`(async()=>{
    const t=window.__scParagraphTest,v=t.leaf.view;await v.setState({...v.getState(),mode:"source",source:false},{history:false});
    const number=t.firstLine;
    if(number<0)throw new Error("Original paragraph source missing");
    v.editor.setCursor({line:number,ch:0});v.editor.scrollIntoView({from:{line:number,ch:0},to:{line:number+2,ch:0}},true);
    await new Promise(r=>setTimeout(r,900));
    const cm=v.editor.cm;const first=cm.lineBlockAt(cm.state.doc.line(number+1).from);const next=cm.lineBlockAt(cm.state.doc.line(t.nextLine+1).from);
    const gap=next.top-first.bottom;const line=[...v.containerEl.querySelectorAll(".cm-line")].find(e=>e.textContent.startsWith(t.text.slice(0,35)));
    const lineHeight=getComputedStyle(line).lineHeight;
    if(Math.abs(gap-t.results.matched.gap)>0.1)throw new Error("Reading / Live Preview gap mismatch: "+gap);
    return JSON.stringify({gap,lineHeight,readingGap:t.results.matched.gap,match:true});
  })()`);
  assert.ok(live.includes('"match":true'), live);
  writeFileSync(path.join(directory, "live.json"), live);
  screenshot("live.png");
  process.stdout.write(reading + live + `Visual evidence: ${directory}\n`);
} finally {
  evaluate(`(()=>{const t=window.__scParagraphTest;if(!t)return; t.leaf.detach();t.plugin.settings=t.settings;t.plugin.applyStyles();if(t.original?.parent)app.workspace.setActiveLeaf(t.original,{focus:true});delete window.__scParagraphTest;return "Restored"})()`);
}
