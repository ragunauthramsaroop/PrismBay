// Pure presentation model. No external service, credentials, or fabricated market data.
export const THEMES = Object.freeze({
  midnight: {name:"Midnight", bg:"0B1324", canvas:"101D32", ink:"FFFFFF", muted:"BBC7D8", accent:"72E1CA", panel:"172A43", soft:"D9F8F0"},
  cobalt: {name:"Cobalt", bg:"F6F8FC", canvas:"FFFFFF", ink:"13213A", muted:"526582", accent:"315EEB", panel:"EAF0FF", soft:"DCE6FF"},
  sand: {name:"Atelier", bg:"F4F0E8", canvas:"FFFDF7", ink:"292B2D", muted:"6B6A67", accent:"BB764A", panel:"EEE2D1", soft:"F5E3D3"},
  emerald: {name:"Emerald", bg:"0C2420", canvas:"10342D", ink:"FFFFFF", muted:"BED8CF", accent:"B5E47A", panel:"1C4C41", soft:"DDF6C8"}
});
export const LAYOUTS = Object.freeze(["cover","section","bullets","split","stats","chart","quote","closing"]);
export const AUDIENCES = Object.freeze(["Executive board","Investors","Clients","Internal team","Classroom"]);
export const STORAGE_KEY = "prismdeck-studio-v1";
export function id() { return "s"+Math.random().toString(36).slice(2,11); }
export function clamp(n,min,max) { return Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min)); }
export function short(s,max=180) { return String(s??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max); }
export function safeTheme(key) { return THEMES[key]?key:"midnight"; }
export function safeLayout(key) { return LAYOUTS.includes(key)?key:"bullets"; }
export function makeSlide(layout="bullets", data={}) {
  return {
    id:short(data.id,50)||id(), layout:safeLayout(layout),
    eyebrow:short(data.eyebrow??"STRATEGIC BRIEF",65),
    title:short(data.title??"Your slide headline",180),
    subtitle:short(data.subtitle??"",320),
    body:short(data.body??"",2500),
    notes:short(data.notes??"",2000),
    metrics:Array.isArray(data.metrics)?data.metrics.slice(0,3).map(m=>({value:short(m.value,22),label:short(m.label,64)})):[
      {value:"[Metric]",label:"Performance indicator"},
      {value:"[Metric]",label:"Strategic outcome"},
      {value:"[Metric]",label:"Next milestone"}],
    chartLabels:Array.isArray(data.chartLabels)?data.chartLabels.slice(0,8).map(x=>short(x,28)):["Phase 1","Phase 2","Phase 3"],
    chartValues:Array.isArray(data.chartValues)?data.chartValues.slice(0,8).map(x=>clamp(x,0,1000000)):[35,58,82],
    quoteAttribution:short(data.quoteAttribution??"Source / speaker",110)
  };
}
export function starterDeck() {
  return {
    id:"prismdeck-demo", title:"A clearer way to present", theme:"midnight", audience:"Executive board",
    createdAt:new Date().toISOString(), slides:[
      makeSlide("cover",{eyebrow:"PRISMDECK / EXECUTIVE PRESENTATION",title:"Ideas deserve an exceptional presentation.",subtitle:"A polished, editable deck built for high-stakes conversations."}),
      makeSlide("section",{eyebrow:"01 / CONTEXT",title:"Start with the decision, not the detail.",subtitle:"Every slide should help your audience understand, evaluate, or act."}),
      makeSlide("bullets",{eyebrow:"THE OPPORTUNITY",title:"Put the audience first.",subtitle:"Three questions to shape your message.",body:"What decision should the audience make?\nWhat evidence would support the decision?\nWhat is the most useful next step?"}),
      makeSlide("split",{eyebrow:"OUR APPROACH",title:"Build the story around outcomes.",subtitle:"A practical framework for stronger presentations.",body:"Define the central message\nSelect evidence that supports the claim\nTurn the decision into clear action"}),
      makeSlide("stats",{eyebrow:"KEY MEASURES",title:"Make the numbers meaningful.",subtitle:"Replace these labeled placeholders with verified data.",metrics:[{value:"[01]",label:"Primary business result"},{value:"[02]",label:"Leading performance measure"},{value:"[03]",label:"Next delivery milestone"}]}),
      makeSlide("chart",{eyebrow:"ILLUSTRATIVE DATA",title:"Show the trajectory clearly.",subtitle:"Demo chart only. Replace with verified values before publication.",chartLabels:["Baseline","Current","Target"],chartValues:[30,57,82]}),
      makeSlide("quote",{eyebrow:"KEY MESSAGE",title:"Clarity builds confidence.",subtitle:"Present one decisive idea per slide.",quoteAttribution:"PrismDeck design principle"}),
      makeSlide("closing",{eyebrow:"NEXT STEPS",title:"Make the next move obvious.",subtitle:"Define the decision, owner, and timeline.",body:"Decision requested\nAccountable owner\nTarget date"})
    ]
  };
}
export function sanitizeDeck(raw) {
  if(!raw||typeof raw!=="object") throw new Error("Invalid deck format.");
  if(!Array.isArray(raw.slides)||!raw.slides.length) throw new Error("A deck requires at least one slide.");
  const result={id:short(raw.id,50)||id(),title:short(raw.title||"Untitled presentation",140),theme:safeTheme(raw.theme),audience:AUDIENCES.includes(raw.audience)?raw.audience:"Executive board",createdAt:short(raw.createdAt,40)||new Date().toISOString(),slides:raw.slides.slice(0,50).map(s=>makeSlide(s.layout,s))};
  const seen=new Set();
  result.slides.forEach(s=>{if(seen.has(s.id))s.id=id();seen.add(s.id);});
  return result;
}
function lines(s) { return String(s||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean); }
export function generateDeck(prompt, options={}) {
  const topic=short(prompt,160);
  if(topic.length<5) throw new Error("Describe your topic in at least five characters.");
  const count=clamp(Math.round(options.count||8),4,14);
  const audience=AUDIENCES.includes(options.audience)?options.audience:"Executive board";
  const kind=/sales|client|product|pitch|customer/i.test(topic)?"commercial":/school|training|education|learning/i.test(topic)?"learning":"strategic";
  const structure=[
    makeSlide("cover",{eyebrow:"PRISMDECK / "+audience.toUpperCase(),title:topic,subtitle:"A decision-ready presentation framework. Verify all evidence before sharing."}),
    makeSlide("section",{eyebrow:"01 / THE CONTEXT",title:"Why "+topic+" matters",subtitle:"Frame the problem, audience, and current situation."}),
    makeSlide("bullets",{eyebrow:"OBJECTIVES",title:"What success should look like",subtitle:"Agree on concrete outcomes before discussing execution.",body:"Define the audience and objective\nIdentify the constraints and assumptions\nAgree on the standard for success"}),
    makeSlide("split",{eyebrow:"INSIGHTS",title:"Organize the evidence",subtitle:"Build a credible narrative from sourced material.",body:"Verified finding and citation\nWhat the finding means\nRecommended response"}),
    makeSlide("stats",{eyebrow:"MEASUREMENT",title:"Measure the outcomes",subtitle:"Illustrative placeholders. Enter verified metrics.",metrics:[{value:"[TBD]",label:"Outcome metric"},{value:"[TBD]",label:"Efficiency or reach"},{value:"[TBD]",label:"Delivery milestone"}]}),
    makeSlide("chart",{eyebrow:"DATA STORY / DEMO",title:"Show the comparison",subtitle:"Illustrative chart values only. Replace before distribution.",chartLabels:["Baseline","Current","Goal"],chartValues:[25,55,85]}),
    makeSlide("quote",{eyebrow:"CORE INSIGHT",title:kind==="learning"?"Progress follows clear practice.":kind==="commercial"?"A good offer solves a specific need.":"Better decisions begin with better evidence.",subtitle:"Replace this sample principle with a sourced quotation or finding.",quoteAttribution:"Editorial placeholder"}),
    makeSlide("bullets",{eyebrow:"EXECUTION",title:"Turn the strategy into work",subtitle:"Set sequence, ownership, and review cadence.",body:"Priority action and accountable owner\nDependencies, resources, and controls\nDates and measurable review criteria"}),
    makeSlide("split",{eyebrow:"RISKS & MITIGATION",title:"Make trade-offs explicit",subtitle:"Separate assumptions, evidence, and open decisions.",body:"Most important risk\nProposed mitigation\nEvidence needed to proceed"}),
    makeSlide("stats",{eyebrow:"ACCOUNTABILITY",title:"Set delivery checkpoints",subtitle:"Replace placeholders with approved milestones.",metrics:[{value:"[Date]",label:"Decision checkpoint"},{value:"[Owner]",label:"Delivery lead"},{value:"[KPI]",label:"Success measure"}]}),
    makeSlide("bullets",{eyebrow:"RECOMMENDATION",title:"Present the preferred path",subtitle:"Explain why this approach best meets the stated objective.",body:"Recommended option\nEvidence for the recommendation\nWhat the alternative would require"}),
    makeSlide("closing",{eyebrow:"FINAL DECISION",title:"What happens next",subtitle:"End with an explicit request for action.",body:"Decision required\nWho will lead\nWhen to reconvene"}),
    makeSlide("section",{eyebrow:"APPENDIX",title:"Supporting references",subtitle:"Add citations, definitions, detailed assumptions, and source documents."}),
    makeSlide("closing",{eyebrow:"THANK YOU",title:"Questions and discussion",subtitle:"Invite specific questions about the decision and evidence."})
  ];
  const idx=count===4?[0,2,7,11]:count===5?[0,1,2,7,11]:count===6?[0,1,2,4,7,11]:count===7?[0,1,2,3,4,7,11]:Array.from({length:count-1},(_,i)=>i).concat([11]);
  return sanitizeDeck({title:topic,theme:safeTheme(options.theme),audience,slides:idx.map(i=>structure[i])});
}
export function parseOutline(text) {
  const clean=String(text||"").trim();
  if(!clean)throw new Error("Paste an outline with at least one slide.");
  const chunks=clean.split(/(?=^##\s)|^\s*---\s*$/gm).map(x=>x.trim()).filter(Boolean);
  const slides=[];
  for(const chunk of chunks) {
    const rows=lines(chunk).filter(x=>!/^#\s/.test(x));
    if(!rows.length)continue;
    let heading=rows.shift().replace(/^##?\s*/,"").trim();
    if(!heading)heading="Untitled slide";
    slides.push(makeSlide(slides.length===0?"cover":"bullets",{title:heading,eyebrow:"IMPORTED OUTLINE",body:rows.map(x=>x.replace(/^[-*\d.)\s]+/,"")).join("\n")}));
  }
  if(!slides.length)throw new Error("No valid slides found.");
  return sanitizeDeck({title:slides[0].title,theme:"midnight",slides});
}
export function setTheme(deck,theme) { return sanitizeDeck({...deck,theme:safeTheme(theme)}); }
export function bulletLines(slide,max=7) { return lines(slide.body).slice(0,max); }
export function safeFileName(s) { return short(s,90).toLowerCase().replace(/[^a-z0-9 _-]+/g,"").replace(/\s+/g,"-").replace(/-+/g,"-")||"presentation"; }
export function markdownExport(deck) {
  const d=sanitizeDeck(deck);
  return "# "+d.title+"\n\n"+d.slides.map(s=>"## "+s.title+"\n"+(s.subtitle?s.subtitle+"\n":"")+bulletLines(s,30).map(b=>"- "+b).join("\n")).join("\n\n---\n\n")+"\n";
}
