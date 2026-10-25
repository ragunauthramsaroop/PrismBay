import pptxgen from "pptxgenjs";
import {sanitizeDeck,THEMES,bulletLines,safeFileName} from "./core.js";

const W=13.3333,H=7.5,Font="Aptos",Head="Aptos Display";
function block(slide,pptx,x,y,w,h,color,radius=0){
  slide.addShape(radius?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{x,y,w,h,rectRadius:radius,fill:{color},line:{color,transparency:100}});
}
function ellipse(slide,pptx,x,y,w,h,color,transparency=0){
  slide.addShape(pptx.ShapeType.ellipse,{x,y,w,h,fill:{color,transparency},line:{color,transparency:100}});
}
function line(slide,pptx,x,y,w,h,color,width=1){
  slide.addShape(pptx.ShapeType.line,{x,y,w,h,line:{color,width,beginArrowType:"none",endArrowType:"none"}});
}
function txt(slide,value,x,y,w,h,style={}){
  slide.addText(String(value??""),{
    x,y,w,h,margin:0,breakLine:false,fit:"shrink",valign:"mid",fontFace:Font,
    color:"FFFFFF",fontSize:16,wrap:true,...style
  });
}
function kicker(slide,pptx,value,t,x=.95,y=.8){
  block(slide,pptx,x,y+.07,.28,.04,t.accent);
  txt(slide,String(value||"STRATEGIC BRIEF").toUpperCase(),x+.39,y,9,.25,{fontSize:10,bold:true,charSpacing:1.3,color:t.accent});
}
function footer(slide,pptx,index,count,t){
  txt(slide,"PRISMDECK STUDIO",.95,7.04,4,.16,{fontSize:8,bold:true,charSpacing:1,color:t.muted,transparency:20});
  txt(slide,String(index+1).padStart(2,"0")+" / "+String(count).padStart(2,"0"),11.45,7.04,.93,.16,{fontSize:8,bold:true,align:"right",color:t.muted,transparency:20});
}
function heading(slide,value,t,opts={}){
  txt(slide,value,opts.x??.95,opts.y??1.35,opts.w??11.45,opts.h??1.04,{fontFace:Head,fontSize:opts.fontSize??34,bold:true,color:t.ink,breakLine:false});
}
function subheading(slide,value,t,opts={}){
  if(!value)return;
  txt(slide,value,opts.x??.95,opts.y??2.43,opts.w??10.7,opts.h??.48,{fontSize:opts.fontSize??15,color:t.muted});
}
function footnoteOnSlide(slide,s){
  if(s.notes&&typeof slide.addNotes==="function")slide.addNotes(s.notes);
}
function addCover(slide,pptx,s,t){
  ellipse(slide,pptx,9.36,.48,3.3,3.3,t.accent,83);
  ellipse(slide,pptx,8.35,1.65,4.5,4.5,t.accent,92);
  kicker(slide,pptx,s.eyebrow,t,1.08,1.12);
  heading(slide,s.title,t,{x:1.08,y:2.06,w:10.4,h:2.54,fontSize:45});
  subheading(slide,s.subtitle,t,{x:1.08,y:5.13,w:9.1,h:.88,fontSize:18});
  txt(slide,"P.",10.3,5.06,2.1,1.48,{fontFace:Head,fontSize:93,bold:true,color:t.accent,transparency:70});
}
function addSection(slide,pptx,s,t){
  txt(slide,"0",.72,.38,2.1,3.0,{fontSize:165,bold:true,color:t.accent,transparency:86});
  kicker(slide,pptx,s.eyebrow,t,2.15,2.06);
  heading(slide,s.title,t,{x:2.15,y:2.64,w:9.45,h:1.75,fontSize:44});
  subheading(slide,s.subtitle,t,{x:2.15,y:4.76,w:8.65,h:.72,fontSize:18});
}
function addBullets(slide,pptx,s,t){
  kicker(slide,pptx,s.eyebrow,t);
  heading(slide,s.title,t);
  subheading(slide,s.subtitle,t);
  const lines=bulletLines(s,6);
  if(!lines.length)txt(slide,"Add supporting points in the editor.",1.05,3.55,9,.4,{fontSize:15,color:t.muted});
  lines.forEach((b,i)=>{
    const y=3.23+i*.52;
    txt(slide,String(i+1).padStart(2,"0"),1.0,y,.49,.29,{fontSize:11,bold:true,color:t.accent});
    txt(slide,b,1.74,y-.09,10.42,.49,{fontSize:18,color:t.ink});
    if(i<lines.length-1)line(slide,pptx,1.76,y+.44,9.74,0,t.panel,.55);
  });
}
function addSplit(slide,pptx,s,t){
  block(slide,pptx,6.85,0,6.483,H,t.panel);
  kicker(slide,pptx,s.eyebrow,t,.9,1.35);
  heading(slide,s.title,t,{x:.9,y:2.07,w:5.55,h:1.64,fontSize:34});
  subheading(slide,s.subtitle,t,{x:.9,y:4.2,w:5.05,h:1.04,fontSize:16});
  txt(slide,"DECISION FRAMEWORK",7.48,1.07,4.5,.29,{fontSize:11,bold:true,color:t.accent,charSpacing:1.2});
  bulletLines(s,5).forEach((b,i)=>{
    const y=2.0+i*.78;
    line(slide,pptx,7.42,y-.25,5.13,0,t.muted,.3);
    txt(slide,String(i+1).padStart(2,"0"),7.47,y,.43,.31,{fontSize:11,bold:true,color:t.accent});
    txt(slide,b,8.11,y-.1,4.5,.61,{fontSize:16,color:t.ink});
  });
}
function addStats(slide,pptx,s,t){
  kicker(slide,pptx,s.eyebrow,t);
  heading(slide,s.title,t);
  subheading(slide,s.subtitle,t);
  const gap=.18,cardW=3.66,x0=.95;
  s.metrics.slice(0,3).forEach((m,i)=>{
    const x=x0+i*(cardW+gap),y=3.44;
    block(slide,pptx,x,y,cardW,2.42,t.panel);
    block(slide,pptx,x,y,cardW,.065,t.accent);
    txt(slide,"MEASURE 0"+(i+1),x+.25,y+.32,cardW-.5,.24,{fontSize:10,bold:true,charSpacing:1.0,color:t.muted});
    txt(slide,m.value,x+.25,y+.8,cardW-.5,.67,{fontSize:32,bold:true,color:t.accent});
    txt(slide,m.label,x+.25,y+1.83,cardW-.5,.43,{fontSize:13,color:t.ink});
  });
}
function addChart(slide,pptx,s,t){
  kicker(slide,pptx,s.eyebrow,t);
  heading(slide,s.title,t);
  subheading(slide,s.subtitle,t);
  block(slide,pptx,.95,3.08,11.4,3.59,t.panel);
  const labels=s.chartLabels.slice(0,8),values=s.chartValues.slice(0,8);
  if(!labels.length||!values.length)return;
  slide.addChart(pptx.ChartType.bar,[{name:"Value",labels:values.map((_,i)=>labels[i]||"Item "+(i+1)),values}],{
    x:1.4,y:3.48,w:10.38,h:2.73,
    barDir:"col",grouping:"clustered",showTitle:false,showLegend:false,showValue:true,
    chartColors:[t.accent],showCatName:false,showSerName:false,
    valAxisLabelColor:t.muted,catAxisLabelColor:t.muted,
    valAxisLabelFontSize:9,catAxisLabelFontSize:10,
    showValAxisTitle:false,showCatAxisTitle:false,
    showMarker:false,showBorder:false,
    valGridLine:{color:t.muted,transparency:78,width:.5},
    catAxisLineColor:t.muted,valAxisLineColor:t.muted,
    showShadow:false,showDataLabelLegendKey:false,showLeaderLines:false,
    dataLabelPosition:"outEnd",dataLabelColor:t.ink,dataLabelFormatCode:"0.##",
    showValue:true,showCatName:false,showSerName:false
  });
  txt(slide,"VALUES MUST BE VERIFIED BEFORE SHARING",8.8,6.4,3.3,.16,{fontSize:7,color:t.muted,align:"right"});
}
function addQuote(slide,pptx,s,t){
  kicker(slide,pptx,s.eyebrow,t,1.2,.99);
  txt(slide,"“",1.24,1.48,1.7,1.38,{fontFace:"Georgia",fontSize:115,color:t.accent});
  heading(slide,s.title,t,{x:1.25,y:2.81,w:10.35,h:1.52,fontSize:43});
  subheading(slide,s.subtitle,t,{x:1.25,y:4.64,w:9.8,h:.74,fontSize:18});
  block(slide,pptx,1.26,5.95,.41,.05,t.accent);
  txt(slide,s.quoteAttribution,1.83,5.83,8.0,.34,{fontSize:12,bold:true,color:t.muted});
}
function addClosing(slide,pptx,s,t){
  ellipse(slide,pptx,9.7,1.0,3.1,3.1,t.accent,89);
  kicker(slide,pptx,s.eyebrow,t,1.08,1.22);
  heading(slide,s.title,t,{x:1.08,y:2.03,w:10.3,h:1.83,fontSize:46});
  subheading(slide,s.subtitle,t,{x:1.08,y:4.27,w:9.4,h:.7,fontSize:18});
  bulletLines(s,3).forEach((b,i)=>{
    const x=1.08+i*3.56;
    block(slide,pptx,x,5.61,2.93,.05,t.accent);
    txt(slide,String(i+1).padStart(2,"0"),x,5.86,.41,.18,{fontSize:9,color:t.accent,bold:true});
    txt(slide,b,x,6.15,2.93,.48,{fontSize:11,bold:true,color:t.ink});
  });
}
export function buildPowerpoint(deck){
  const d=sanitizeDeck(deck),t=THEMES[d.theme],pptx=new pptxgen();
  pptx.layout="LAYOUT_WIDE";
  pptx.author="PrismDeck Studio";
  pptx.subject="Editable professional presentation";
  pptx.title=d.title;
  pptx.company="PrismDeck Studio";
  pptx.lang="en-US";
  pptx.theme={headFontFace:Head,bodyFontFace:Font,lang:"en-US"};
  d.slides.forEach((model,i)=>{
    const slide=pptx.addSlide();
    slide.background={color:t.canvas};
    switch(model.layout){
    case "cover":addCover(slide,pptx,model,t);break;
    case "section":addSection(slide,pptx,model,t);break;
    case "split":addSplit(slide,pptx,model,t);break;
    case "stats":addStats(slide,pptx,model,t);break;
    case "chart":addChart(slide,pptx,model,t);break;
    case "quote":addQuote(slide,pptx,model,t);break;
    case "closing":addClosing(slide,pptx,model,t);break;
    default:addBullets(slide,pptx,model,t);
    }
    footnoteOnSlide(slide,model);
    footer(slide,pptx,i,d.slides.length,t);
  });
  return pptx;
}
export async function exportPowerpoint(deck){
  const pptx=buildPowerpoint(deck);
  return await pptx.writeFile({fileName:safeFileName(deck.title)+".pptx",compression:true});
}
