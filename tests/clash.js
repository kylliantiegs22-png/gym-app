// Clash detector: text/controls that are covered, clipped by a diagonal edge, overlapping, or off-screen.
// Wrapped inline text is checked line by line (getClientRects), so empty corners of a wrapped box do not count.
module.exports=async function clashes(pg){
  return pg.evaluate(()=>{
    const out=[];
    const modal=document.body.classList.contains('open'); // side panel open: only the panel is interactive
    const vis=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>0;};
    const els=[];
    document.querySelectorAll(modal?'#tabs *':'main *, #bar *, #tabs *, #rest *, #banner *').forEach(e=>{
      if(!vis(e)||(e.closest('svg')&&!e.matches('svg'))) return;
      const text=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(text||e.matches('button,a,input,select')) els.push(e);
    });
    const name=e=>(e.dataset&&e.dataset.act||e.tagName.toLowerCase())+':'+((e.textContent||e.value||e.placeholder||'').trim().slice(0,22));
    const fixed=e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const p=getComputedStyle(n).position;if(p==='fixed'||p==='sticky')return true;}return false;};
    const lines=e=>[...e.getClientRects()].filter(r=>r.width>1&&r.height>1);
    for(const e of els){
      e.scrollIntoView({block:'center',inline:'nearest'});
      let hidden=0,total=0,off=false;
      for(const r of lines(e)){
        if(r.bottom<0||r.top>innerHeight) continue;
        if(r.right>innerWidth+1||r.left<-1) off=true;
        for(const fx of [.22,.5,.78])for(const fy of [.3,.5,.7]){
          const x=r.left+r.width*fx,y=r.top+r.height*fy; if(x<0||y<0||x>=innerWidth||y>=innerHeight) continue; total++;
          const h=document.elementFromPoint(x,y); if(!h||!(e===h||e.contains(h))) hidden++;
        }
      }
      if(total&&hidden/total>=0.34) out.push('covered/clipped ('+hidden+'/'+total+'): '+name(e));
      if(off) out.push('off-screen horizontally: '+name(e));
    }
    window.scrollTo(0,0);
    const flow=els.filter(e=>!fixed(e));
    for(let i=0;i<flow.length;i++)for(let j=i+1;j<flow.length;j++){
      const A=flow[i],B=flow[j]; if(A.contains(B)||B.contains(A)) continue;
      let hit=false;
      for(const a of lines(A)){for(const b of lines(B)){
        const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(w>3&&h>3){hit=true;break;}} if(hit)break;}
      if(hit) out.push('overlap: '+name(A)+' x '+name(B));
    }
    // 3. text must stay on the dark shape: clear of the slanted edge of .band, .diag and the side panel
    const cut=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cut'))||40, M=4;
    for(const e of els){
      const band=e.closest('.band'),diag=e.closest('.diag'),panel=e.closest('#tabs');
      for(const r of lines(e)){
        if(band){const B=band.getBoundingClientRect(),W=B.width,edge=x=>B.bottom-cut*((x-B.left)/W);
          if(r.bottom>edge(r.right)-M) out.push('text runs past the diagonal edge of the header band: '+name(e));}
        if(diag){const D=diag.getBoundingClientRect(),W=D.width,edge=x=>D.top+cut*(1-(x-D.left)/W);
          if(r.top<edge(r.left)+M) out.push('text is above the diagonal edge of the angled section: '+name(e));}
        if(panel&&!e.matches('#tabs')){const P=panel.getBoundingClientRect(),H=P.height,edge=y=>P.right-44*((y-P.top)/H);
          if(r.right>edge(r.bottom)-M) out.push('text runs past the slanted edge of the side panel: '+name(e));}
      }
    }
    // 4. text contrast against the fill actually painted behind it, including ::before/::after fills (which axe cannot see)
    const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
    const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b);};
    const fillOf=e=>{
      for(let n=e;n&&n!==document.documentElement;n=n.parentElement){
        for(const ps of ['::after','::before']){const cs=getComputedStyle(n,ps);if(cs.content&&cs.content!=='none'&&cs.display!=='none'&&cs.position==='absolute'){const c=parse(cs.backgroundColor);if(c&&c.a>.9)return c;}}
        const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>.9)return c;
      }
      return {r:255,g:255,b:255,a:1};
    };
    for(const e of els){
      if(e.disabled||e.matches('input,select')||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) continue;
      const cs=getComputedStyle(e),fg=parse(cs.color),bg=fillOf(e); if(!fg||fg.a<.9) continue;
      const L1=lum(fg),L2=lum(bg),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
      const size=parseFloat(cs.fontSize),big=size>=24||(size>=18.66&&+cs.fontWeight>=700);
      if(ratio<(big?3:4.5)) out.push('low contrast '+ratio.toFixed(1)+':1 '+name(e));
    }
    return [...new Set(out)];
  });
};
