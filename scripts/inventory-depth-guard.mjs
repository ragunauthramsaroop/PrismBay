import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const readJson=async(path,fallback={})=>{try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return fallback;}};

export function buildInventoryDepthBoard({supplierBoard={},minimumPrimaryInventory=5,minimumBackupInventory=3}={}){
  const products=(supplierBoard.products||[]).map(product=>{
    const inventories=(product.routes||[]).map(r=>Number(r.inventory||0)).filter(Number.isFinite).sort((a,b)=>b-a);
    const maxInventory=inventories[0]||0;
    const totalInventory=inventories.reduce((a,b)=>a+b,0);
    const viableRouteCount=(product.routes||[]).filter(r=>Number(r.inventory||0)>=minimumBackupInventory&&r.variantInventoryVerified===true&&r.screeningFreightVerified===true).length;
    const fragilePrimary=maxInventory<minimumPrimaryInventory;
    return {
      slug:product.slug,
      storeSku:product.storeSku||null,
      maxVerifiedRouteInventory:maxInventory,
      totalVerifiedInventoryAcrossRoutes:totalInventory,
      viableRouteCountAtBackupFloor:viableRouteCount,
      fragilePrimary,
      inventoryRisk:fragilePrimary?'critical':maxInventory<minimumPrimaryInventory*2?'high':'normal',
      requiredAction:fragilePrimary?'accelerate_backup_supplier_and_backup_product_work':'maintain_stock_revalidation',
      rule:'Low inventory does not fabricate an outage or block a valid one-unit checkout, but it cannot count as resilient operating capacity.'
    };
  });
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    minimumPrimaryInventory,
    minimumBackupInventory,
    fragileProductCount:products.filter(p=>p.fragilePrimary).length,
    products
  };
}

export async function main(){
  const supplierBoard=await readJson('growth-reports/supplier-route-promotion-board.json');
  const board=buildInventoryDepthBoard({supplierBoard});
  await fs.mkdir('growth-reports',{recursive:true});
  await fs.writeFile('growth-reports/inventory-depth-board.json',JSON.stringify(board,null,2)+'\n');
  console.log(JSON.stringify({fragileProductCount:board.fragileProductCount,fragile:board.products.filter(p=>p.fragilePrimary).map(p=>p.slug)},null,2));
  return board;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
