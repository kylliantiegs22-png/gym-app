const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const b=await chromium.launch();const svg=fs.readFileSync(path.join(__dirname,'../icons/icon.svg'),'utf8');
for(const s of [180,192,512]){const pg=await b.newPage({viewport:{width:s,height:s}});await pg.setContent(`<body style="margin:0">${svg.replace('<svg ',`<svg width="${s}" height="${s}" `)}</body>`);await pg.screenshot({path:path.join(__dirname,`../icons/icon-${s}.png`)});}
await b.close();})();
