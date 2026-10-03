import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};
function taskId(action){return `${action.owner}:first-sale-rescue:${action.id}`;}
function toTask(action,primary,priority){
  return {id:taskId(action),companyId:action.owner||'commerce-control',priority,status:'active',title:`Execute ${action.id.replaceAll('_',' ')} for ${primary}`,evidenceRequired:['current rescue-board evidence','authoritative supplier/offer/product evidence','measurable decision result'],doneWhen:'The rescue action is either validated and ready for its existing approval/checkout gate, or rejected with evidence and the next rescue path is promoted.',context:{rescueAction:action.id,action:action.action,frictionScore:action.frictionScore,evidenceStrength:action.evidenceStrength,...action.context},prohibitedShortcuts:['automatic live price change','automatic supplier remap','automatic supplier ordering','fabricated demand or conversion','bypassing final-ZIP, payment, identity or security gates']};
}

export function bridgeFirstSaleRescue({taskboard={},rescueBoard={}}={}){
  const tasks=Array.isArray(taskboard.tasks)?[...taskboard.tasks]:[];
  const actions=[];
  if(rescueBoard.recommendedAction)actions.push({action:rescueBoard.recommendedAction,priority:1});
  for(const action of rescueBoard.parallelActions||[])actions.push({action,priority:2});
  for(const row of actions)tasks.push(toTask(row.action,rescueBoard.primaryProduct||'primary-product',row.priority));
  const seen=new Set();
  const deduped=tasks.filter(row=>{if(!row?.id||seen.has(row.id))return false;seen.add(row.id);return true;});
  const companies={...(taskboard.companies||{})};
  for(const row of deduped)if(!Array.isArray(companies[row.companyId]))companies[row.companyId]=[];
  for(const id of Object.keys(companies))companies[id]=deduped.filter(row=>row.companyId===id);
  return {...taskboard,schemaVersion:Math.max(4,Number(taskboard.schemaVersion||1)),generatedAt:new Date().toISOString(),totalTasks:deduped.length,tasks:deduped,companies,firstSaleRescue:{primaryProduct:rescueBoard.primaryProduct||null,recommendedAction:rescueBoard.recommendedAction?.id||null,parallelActions:(rescueBoard.parallelActions||[]).map(x=>x.id)}};
}

export async function main(){
  const output=bridgeFirstSaleRescue({taskboard:await readJson('growth-reports/autonomous-company-taskboard.json'),rescueBoard:await readJson('growth-reports/first-sale-rescue-board.json')});
  await fs.writeFile('growth-reports/autonomous-company-taskboard.json',JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({totalTasks:output.totalTasks,recommendedRescue:output.firstSaleRescue.recommendedAction,parallelRescues:output.firstSaleRescue.parallelActions},null,2));
  return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
