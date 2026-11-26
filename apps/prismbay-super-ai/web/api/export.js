export default function handler(req,res){res.setHeader("Cache-Control","no-store");return res.status(410).json({error:"Office generation now runs privately in the browser. Open Office studio."});}
