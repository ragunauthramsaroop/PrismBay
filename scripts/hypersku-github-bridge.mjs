import fs from 'node:fs/promises';
const info = {provider:'hypersku', status:'awaiting_supplier_api_documentation', physicalCheckoutEnabled:false, supplierOrdersEnabled:false};
await fs.mkdir('growth-reports',{recursive:true});
await fs.writeFile('growth-reports/hypersku-github-bridge.json',JSON.stringify(info,null,2)+'\n');
console.log(JSON.stringify(info));
