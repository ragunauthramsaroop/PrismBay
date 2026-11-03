// Original, dependency-free PrismBay incubation demos.
// No customer data is sent to any server; no LLM or external API is called.
export const UPSTREAM = "https://github.com/Shubhamsaboo/awesome-llm-apps";
export const products = [
  { id:"cashflow-cloud",name:"Cashflow Cloud",category:"Finance",buyer:"Service businesses",price:19,stage:"existing external pilot",value:"Track receivables, identify late invoices, and prepare human-approved reminders.",source:"starter_ai_agents/ai_data_analysis_agent",example:{asOf:"2026-11-02",invoices:[{customer:"Northstar",amount:1450,dueDate:"2026-10-10",status:"unpaid"},{customer:"Harbor",amount:650,dueDate:"2026-11-08",status:"unpaid"},{customer:"Cedar",amount:500,dueDate:"2026-10-15",status:"paid"}]}},
  { id:"document-intelligence",name:"Document Intelligence",category:"Operations",buyer:"Small firms and compliance teams",price:39,stage:"incubator",value:"Retrieve evidence excerpts from uploaded text, without inventing citations.",source:"rag_tutorials/agentic_typed_rag_pydanticai",example:{query:"insurance requirements",documents:[{title:"Supplier terms",text:"Every supplier must keep active liability insurance. Evidence is required before contract renewal."},{title:"Safety checklist",text:"Training records must be signed by supervisors."}]}},
  { id:"market-intelligence",name:"Market Intelligence",category:"Growth",buyer:"Founders and product marketers",price:49,stage:"incubator",value:"Compare manually entered competitor claims, price points, and channels.",source:"advanced_ai_agents/multi_agent_apps/product_launch_intelligence_agent",example:{ourPrice:29,competitors:[{name:"Alpha",price:35,channel:"SEO",strength:"Integrations"},{name:"Bravo",price:19,channel:"Communities",strength:"Simple onboarding"}]}},
  { id:"customer-support",name:"AI Customer Support",category:"Operations",buyer:"Online shops",price:49,stage:"incubator",value:"Retrieve relevant approved FAQ replies and escalate unanswered questions.",source:"voice_ai_agents/customer_support_voice_agent",example:{question:"When will my order arrive?",knowledge:[{question:"When will my order arrive?",answer:"See the order tracking link provided after dispatch. Contact support for unresolved delays."},{question:"How do refunds work?",answer:"Refunds follow the published refund policy."}]}},
  { id:"opportunity-cloud",name:"Opportunity Cloud",category:"Career and Funding",buyer:"Professionals, nonprofits, SMEs",price:29,stage:"incubator",value:"Filter sourced award and grant records by eligibility, dates, and costs.",source:"advanced_ai_agents/single_agent_apps/ai_deep_research_agent",example:{country:"Guyana",asOf:"2026-11-02",needTravelCovered:true,opportunities:[{name:"Sample Fellowship A",countries:["Guyana","Barbados"],deadline:"2026-12-10",travelCovered:true,entryFee:0},{name:"Sample Prize B",countries:["Canada"],deadline:"2027-01-15",travelCovered:false,entryFee:25}]}},
  { id:"global-careers",name:"Global Careers",category:"Career and Funding",buyer:"International job seekers",price:39,stage:"incubator",value:"Filter employer-verified vacancies by visa support, relocation and housing.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_recruitment_agent_team",example:{requireVisa:true,requireRelocation:true,requireHousing:true,roles:[{title:"Director of External Affairs",company:"Example Co",visa:true,relocation:true,housing:true,sourceVerified:true},{title:"ESG Lead",company:"Example Group",visa:true,relocation:true,housing:false,sourceVerified:true}]}},
  { id:"bid-intelligence",name:"Bid Intelligence",category:"Enterprise",buyer:"Contractors and suppliers",price:79,stage:"incubator",value:"Check tender eligibility gaps and build a bid preparation checklist.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_services_agency",example:{deadline:"2026-12-01",asOf:"2026-11-02",requirements:["tax clearance","two references","insurance"],evidence:["tax clearance","insurance"]}},
  { id:"sustainability-os",name:"Sustainability OS",category:"Enterprise",buyer:"Industrial operators and ESG teams",price:99,stage:"incubator",value:"Calculate transparent emissions estimates using explicitly supplied factors.",source:"generative_ui_agents/ai-dashboard-canvas-agent",example:{period:"October",dieselLitres:12000,solarKwh:29000,displacedDieselLitres:2000,kgCo2PerDieselLitre:2.68}},
  { id:"website-intelligence",name:"Website Intelligence",category:"Growth",buyer:"Agencies and website owners",price:29,stage:"incubator",value:"Audit pasted HTML for basic accessibility and SEO signals.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/multimodal_uiux_feedback_agent_team",example:{url:"https://example.com",html:"<html><head><title>Example Company</title><meta name=\"description\" content=\"Business automation tools\"></head><body><h1>Welcome</h1><img src=\"hero.png\" alt=\"Product overview\"></body></html>"}},
  { id:"recruitment-assistant",name:"Recruitment Assistant",category:"Enterprise",buyer:"HR and recruitment teams",price:49,stage:"incubator",value:"Compare documented skills with job requirements for human review only.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_recruitment_agent_team",example:{requiredSkills:["stakeholder relations","reporting","project management"],candidates:[{name:"Candidate A",skills:["reporting","project management"]},{name:"Candidate B",skills:["stakeholder relations","reporting","project management"]}]}},
  { id:"dashboard-builder",name:"Dashboard Builder",category:"Operations",buyer:"SMEs and analysts",price:39,stage:"incubator",value:"Turn user-provided CSV into basic reconciled performance summaries.",source:"starter_ai_agents/ai_data_analysis_agent",example:{csv:"month,revenue,cost\nJan,10000,5800\nFeb,12000,7000\nMar,9000,6000",revenueColumn:"revenue",costColumn:"cost"}},
  { id:"meeting-secretary",name:"Meeting Secretary",category:"Operations",buyer:"Teams and executives",price:19,stage:"incubator",value:"Capture explicit decisions and action owners from meeting notes.",source:"advanced_ai_agents/single_agent_apps/ai_meeting_agent",example:{meeting:"Weekly delivery review",notes:"DECISION: Delay launch until QA passes.\nACTION: Alex | Finish login tests | Friday\nACTION: Sam | Confirm billing process | Monday\nNOTE: Finance requests weekly updates."}},
  { id:"training-academy",name:"Training Academy",category:"Operations",buyer:"Coaches and employers",price:29,stage:"incubator",value:"Build study questions from educator-provided facts, with no invented curriculum.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_teaching_agent_team",example:{course:"Onboarding",facts:[{question:"What comes before access?",answer:"Identity verification"},{question:"Who approves a change?",answer:"The designated owner"}]}},
  { id:"property-research",name:"Property Research",category:"Research",buyer:"Property investors",price:39,stage:"incubator",value:"Compare cash yields using disclosed rental and expense assumptions.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_real_estate_agent_team",example:{properties:[{name:"Apartment A",price:140000,monthlyRent:1200,annualOperatingCosts:2800},{name:"Apartment B",price:190000,monthlyRent:1450,annualOperatingCosts:3900}]}},
  { id:"travel-planner",name:"Travel Planner",category:"Research",buyer:"Travelers and agencies",price:9,stage:"incubator",value:"Arrange user-selected activities across days; no booking or route claims.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/ai_travel_planner_agent_team",example:{destination:"Panama City",days:3,stops:["Casco Viejo","Canal museum","Amador Causeway","Metropolitan park"],budgetPerDay:90}},
  { id:"podcast-studio",name:"Podcast Studio",category:"Creative",buyer:"Creators and educators",price:19,stage:"incubator",value:"Produce an editable original narration outline from supplied text.",source:"starter_ai_agents/ai_blog_to_podcast_agent",example:{title:"Operating with AI",text:"A practical AI pilot begins with a narrowly defined problem. Teams should set privacy rules and measurable outcomes before connecting customer systems. Human review remains essential for consequential decisions."}},
  { id:"due-diligence",name:"Due Diligence Assistant",category:"Enterprise",buyer:"Procurement and risk teams",price:79,stage:"incubator",value:"Track verified documents and unresolved checks without making accusations.",source:"advanced_ai_agents/single_agent_apps/ai_fraud_investigation_agent",example:{entity:"Sample Supplier",checks:[{name:"Registration document",status:"verified"},{name:"Beneficial ownership",status:"pending"},{name:"Insurance certificate",status:"missing"}]}},
  { id:"design-review",name:"Design Review Studio",category:"Creative",buyer:"Designers and agencies",price:29,stage:"incubator",value:"Test text-color contrast and report design-review prompts.",source:"advanced_ai_agents/multi_agent_apps/agent_teams/multimodal_uiux_feedback_agent_team",example:{foreground:"#222222",background:"#ffffff",hasVisibleFocus:true,hasAltDescriptions:false}},
  { id:"business-research",name:"Business Research Assistant",category:"Research",buyer:"Founders and consultants",price:49,stage:"incubator",value:"Structure provided evidence into SWOT, identify missing supporting sources.",source:"advanced_ai_agents/single_agent_apps/ai_consultant_agent",example:{business:"Sample Software",strengths:["Low onboarding time"],weaknesses:["No integrations"],opportunities:["SME reporting gap"],threats:["Established competitors"],sources:["https://example.com/research"]}}
];
const round=(x,n=2)=>Number(Number(x).toFixed(n));
const cleanString=x=>String(x??"").trim();
const asArray=x=>Array.isArray(x)?x:[];
const days=(a,b)=>Math.round((Date.parse(a+"T00:00:00Z")-Date.parse(b+"T00:00:00Z"))/86400000);
const words=s=>new Set(cleanString(s).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
const common=(a,b)=>[...words(a)].filter(x=>words(b).has(x)).length;
const result=(headline,metrics,findings,actions,disclaimer)=>({headline,metrics,findings,actions,disclaimer,mode:"local deterministic prototype"});
function parseCsv(text){
  const rows=[]; let field="", row=[], quoted=false; const src=String(text||"");
  for(let i=0;i<src.length;i++){const c=src[i];
    if(c==='"' && quoted && src[i+1]==='"'){field+='"';i++;}
    else if(c==='"'){quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&src[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==""))rows.push(row);field="";row=[];}
    else field+=c;
  }
  if(quoted)throw Error("CSV contains an unclosed quoted field.");
  row.push(field);if(row.some(x=>x!==""))rows.push(row);
  if(rows.length<2)throw Error("CSV requires a header and at least one row.");
  const headers=rows.shift().map(s=>s.trim());
  if(new Set(headers).size!==headers.length)throw Error("CSV contains duplicate headers.");
  if(rows.some(r=>r.length!==headers.length))throw Error("CSV row lengths do not match the header.");
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
function luminance(hex){
  if(!/^#[0-9a-fA-F]{6}$/.test(String(hex)))throw Error("Enter a six-digit hex colour, such as #222222.");
  const nums=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  return [0.2126,0.7152,0.0722].reduce((s,w,i)=>s+w*(nums[i]<=0.04045?nums[i]/12.92:Math.pow((nums[i]+0.055)/1.055,2.4)),0);
}
export function runProduct(id,input){
  if(!products.some(p=>p.id===id))throw Error("Unknown product.");
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Enter a JSON object.");
  const x=input;
  switch(id){
    case "cashflow-cloud":{
      const invoices=asArray(x.invoices).filter(r=>Number.isFinite(Number(r.amount)));
      const open=invoices.filter(r=>r.status!=="paid");
      const late=open.filter(r=>days(r.dueDate,x.asOf)<0);
      return result("Receivables workspace",{openInvoices:open.length,openValue:round(open.reduce((s,r)=>s+Number(r.amount),0)),overdueValue:round(late.reduce((s,r)=>s+Number(r.amount),0))},late.map(r=>r.customer+": "+round(r.amount)+" due "+r.dueDate),["Review all figures against your ledger.","Approve payment reminders before sending."],"No bank feeds, customer accounts, payment processing or messages sent.");
    }
    case "document-intelligence":{
      const ranked=asArray(x.documents).map(d=>({title:cleanString(d.title),score:common(x.query,d.text),excerpt:cleanString(d.text).slice(0,260)})).sort((a,b)=>b.score-a.score);
      const hits=ranked.filter(r=>r.score>0);
      return result(hits.length?"Matching document excerpts":"No supported answer in supplied documents",{documents:ranked.length,matches:hits.length},hits.slice(0,5).map(h=>h.title+": "+h.excerpt),["Open original documents to check context.","Request a human review for consequential interpretation."],"This is keyword retrieval, not legal advice or an AI answer.");
    }
    case "market-intelligence":{
      const cs=asArray(x.competitors),priced=cs.filter(c=>Number.isFinite(Number(c.price)));
      return result("Competitor comparison from supplied information",{competitors:cs.length,lowestListedPrice:priced.length?Math.min(...priced.map(c=>Number(c.price))):null,ourTestPrice:Number(x.ourPrice)||null},cs.map(c=>c.name+": $"+c.price+"; "+c.strength+"; channel "+c.channel),["Verify all competitor prices and dates from original sources.","Interview buyers about missing features."],"No external market research or verification performed.");
    }
    case "customer-support":{
      const ranked=asArray(x.knowledge).map(k=>({score:common(x.question,k.question),answer:k.answer,question:k.question})).sort((a,b)=>b.score-a.score);
      const match=ranked[0]; const ok=match&&match.score>0;
      return result(ok?"Approved knowledge-base draft reply":"Escalate to human support",{knowledgeItems:ranked.length,matched:!!ok},[ok?cleanString(match.answer):"No matching approved response."],["Review reply for policy accuracy.","Do not send without explicit approval."],"No communication sent, and no new policy or promise invented.");
    }
    case "opportunity-cloud":{
      const matches=asArray(x.opportunities).filter(o=>asArray(o.countries).includes(x.country)&&days(o.deadline,x.asOf)>=0&&(!x.needTravelCovered||o.travelCovered)&&Number(o.entryFee||0)===0);
      return result("Eligibility filter for supplied opportunities",{matching:matches.length,considered:asArray(x.opportunities).length},matches.map(o=>o.name+"; deadline "+o.deadline),["Confirm programme eligibility and active applications at official websites.","Record evidence links and deadlines."],"Entries are fictional examples unless independently verified.");
    }
    case "global-careers":{
      const matches=asArray(x.roles).filter(r=>r.sourceVerified&&(!x.requireVisa||r.visa)&&(!x.requireRelocation||r.relocation)&&(!x.requireHousing||r.housing));
      return result("Employer benefits matching",{matches:matches.length,screened:asArray(x.roles).length},matches.map(r=>r.title+" at "+r.company),["Inspect each current employer vacancy and written benefits.","Check immigration eligibility individually."],"No live job availability, visa guarantee, or employer verification performed by this demo.");
    }
    case "bid-intelligence":{
      const evidence=new Set(asArray(x.evidence).map(s=>cleanString(s).toLowerCase()));
      const missing=asArray(x.requirements).filter(s=>!evidence.has(cleanString(s).toLowerCase()));
      return result(missing.length?"Bid evidence gaps identified":"All listed evidence items present",{requirements:asArray(x.requirements).length,missing:missing.length,daysLeft:days(x.deadline,x.asOf)},missing.length?missing.map(s=>"Missing: "+s):["No gaps among the input checklist."],["Validate original tender requirements.","Gather missing documents and obtain management sign-off."],"Evidence presence is not proof of bid eligibility.");
    }
    case "sustainability-os":{
      const f=Number(x.kgCo2PerDieselLitre);
      if(!(f>0&&f<100))throw Error("Supply a positive diesel emission factor in kg CO2 per litre.");
      return result("Illustrative emissions accounting",{dieselTonnesCo2:round(Number(x.dieselLitres||0)*f/1000),avoidedTonnesCo2:round(Number(x.displacedDieselLitres||0)*f/1000),solarKwh:Number(x.solarKwh||0)},["Period: "+cleanString(x.period),"Emission factor supplied by user: "+f+" kg CO2 per litre."],["Verify emission factor, system boundaries and metering.","Review under the relevant reporting standard."],"Estimates are not verified greenhouse-gas inventory or creditable offsets.");
    }
    case "website-intelligence":{
      const h=cleanString(x.html);
      const title=/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(h)?.[1]?.trim()||"";
      const h1=(h.match(/<h1\b/gi)||[]).length,images=(h.match(/<img\b[^>]*>/gi)||[]);
      const noAlt=images.filter(t=>!/\balt\s*=/i.test(t)).length;
      const hasDesc=/<meta\s+[^>]*name\s*=\s*["']description["']/i.test(h)||/<meta\s+[^>]*content\s*=\s*["'][^"']+["'][^>]*name\s*=\s*["']description["']/i.test(h);
      return result("Pasted HTML inspection",{headingsH1:h1,imagesWithoutAlt:noAlt,titleLength:title.length,hasMetaDescription:hasDesc},[title?"Page title: "+title:"Missing page title",h1===1?"One H1 present":"Review H1 heading count",noAlt?"Image alternative text needs review":"No missing alt attributes detected"],["Test a real page with a browser accessibility tool.","Review content, performance, structured data, and search indexing."],"Only pasted HTML was inspected; no website was fetched.");
    }
    case "recruitment-assistant":{
      const required=asArray(x.requiredSkills).map(s=>cleanString(s).toLowerCase());
      const candidates=asArray(x.candidates).map(c=>{const found=new Set(asArray(c.skills).map(s=>cleanString(s).toLowerCase()));const match=required.filter(s=>found.has(s));return{name:c.name,documentedMatch:required.length?round(match.length/required.length*100):0,unconfirmed:required.filter(s=>!found.has(s))};});
      return result("Documented skills comparison",{candidates:candidates.length,requiredSkills:required.length},candidates.map(c=>c.name+": "+c.documentedMatch+"% of listed skills; unconfirmed: "+c.unconfirmed.join(", ")),["Ask candidates to clarify gaps.","Use validated criteria and human-led evaluation."],"Not a hiring recommendation; unlisted skills are not proof of inability.");
    }
    case "dashboard-builder":{
      const rows=parseCsv(x.csv),revenue=rows.reduce((s,r)=>s+Number(r[x.revenueColumn]||0),0),cost=rows.reduce((s,r)=>s+Number(r[x.costColumn]||0),0);
      if(!Number.isFinite(revenue)||!Number.isFinite(cost))throw Error("Revenue and cost columns must contain numbers.");
      return result("CSV financial snapshot",{rows:rows.length,revenue:round(revenue),cost:round(cost),difference:round(revenue-cost)},rows.slice(0,5).map(r=>Object.entries(r).map(([k,v])=>k+": "+v).join("; ")),["Reconcile totals against source systems.","Validate column units and accounting definitions."],"Sample math only; no professional financial assurance.");
    }
    case "meeting-secretary":{
      const lines=cleanString(x.notes).split(/\r?\n/),decisions=lines.filter(s=>/^DECISION:/i.test(s)).map(s=>s.replace(/^DECISION:\s*/i,"")),actions=lines.filter(s=>/^ACTION:/i.test(s)).map(s=>s.replace(/^ACTION:\s*/i,""));
      return result("Structured meeting action register",{decisions:decisions.length,actions:actions.length},decisions.map(v=>"Decision: "+v).concat(actions.map(v=>"Action: "+v)),["Confirm owners and due dates with attendees.","Distribute minutes after review."],"Extracts explicit labels only; no meeting was recorded.");
    }
    case "training-academy":{
      const facts=asArray(x.facts);
      return result("Educator-supplied quiz cards",{questions:facts.length,course:cleanString(x.course)},facts.map((f,i)=>(i+1)+". "+f.question+" | Instructor key: "+f.answer),["Review for instructional quality and bias.","Collect learner feedback and revise."],"No independently generated or accredited course content.");
    }
    case "property-research":{
      const ps=asArray(x.properties).map(p=>{const price=Number(p.price),net=Number(p.monthlyRent)*12-Number(p.annualOperatingCosts||0);return{name:p.name,netYieldPct:price>0?round(net/price*100):null,annualNetBeforeDebtTax:round(net)};});
      return result("Indicative property income comparison",{properties:ps.length},ps.map(p=>p.name+": "+p.netYieldPct+"% yield; annual pre-tax/pre-debt net "+p.annualNetBeforeDebtTax),["Validate market rents and operating expenses.","Model vacancy, financing, taxes, acquisition costs and repair reserves."],"Not a valuation, investment recommendation or property availability check.");
    }
    case "travel-planner":{
      const dayCount=Math.max(1,Math.min(30,Math.trunc(Number(x.days)||1))),stops=asArray(x.stops);
      const schedule=Array.from({length:dayCount},(_,i)=>"Day "+(i+1)+": "+stops.filter((_,j)=>j%dayCount===i).join(", "));
      return result("User-defined draft travel schedule",{days:dayCount,indicativeBudget:round(dayCount*Number(x.budgetPerDay||0))},schedule,["Check transport connections, operating hours, reservations and visa rules.","Confirm travel budget against current prices."],"No live booking, route calculation, dates or availability verified.");
    }
    case "podcast-studio":{
      const txt=cleanString(x.text),sentences=(txt.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(s=>s.trim()).filter(Boolean);
      return result("Editable narration outline",{sourceSentences:sentences.length,estimatedWords:txt.split(/\s+/).filter(Boolean).length},["Opening: Today we discuss "+cleanString(x.title)+".","Core ideas: "+sentences.slice(0,3).join(" "),"Closing: Review the source and identify one action to take."],["Edit for accuracy and spoken rhythm.","Secure appropriate rights before publishing or narrating third-party text."],"Text outline only; no audio generated, distributed or licensed.");
    }
    case "due-diligence":{
      const cs=asArray(x.checks),pending=cs.filter(c=>c.status!=="verified");
      return result("Document-verification checklist",{total:cs.length,verified:cs.length-pending.length,unresolved:pending.length},pending.map(c=>c.name+": "+c.status),["Request primary records for unresolved items.","Assign an independent reviewer before onboarding."],"No sanctions lookup, background investigation or allegation has been made.");
    }
    case "design-review":{
      const a=luminance(x.foreground),b=luminance(x.background),ratio=round((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05));
      return result("Basic interface accessibility review",{contrastRatio:ratio,meetsWcagAaNormalText:ratio>=4.5,visibleFocus:!!x.hasVisibleFocus},[ratio>=4.5?"Sample contrast passes WCAG AA normal-text threshold":"Sample contrast is below the WCAG AA normal-text threshold",x.hasAltDescriptions?"Image descriptions reported":"Review missing image descriptions"],["Verify actual CSS and all component states.","Test with keyboard and assistive technology."],"Checks only supplied colours and statements; not a comprehensive accessibility audit.");
    }
    case "business-research":{
      const sections=["strengths","weaknesses","opportunities","threats"];
      return result("Evidence-led SWOT outline",{sections:sections.length,citedSources:asArray(x.sources).length},sections.map(k=>k.toUpperCase()+": "+asArray(x[k]).join("; ")),["Attach primary citations to each claimed fact.","Interview customers and quantify market size."],"No independent research, market-size confirmation or live external retrieval.");
    }
    default:throw Error("Product workflow not implemented.");
  }
}
