// Tiny static server: node serve.js [port]
const http=require('http'),fs=require('fs'),path=require('path');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const port=+process.argv[2]||8080;
http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p+='index.html';
  const f=path.join(__dirname,path.normalize(p));
  if(!f.startsWith(__dirname)||f.includes(path.sep+'.git')||f.includes('node_modules')||f.includes(path.sep+'tests')){r.writeHead(404);return r.end('nope');}
  fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);return r.end('not found');} r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); r.end(d);});
}).listen(port,()=>console.log('Lifts on http://localhost:'+port));
