export const rand = (a,b)=>Math.random()*(b-a)+a;

export const fmt = (n)=>n>=1000?n.toFixed(0):n>=100?n.toFixed(1):n.toFixed(2);
export const fmtPct = (n)=>(n>=0?"+":"")+n.toFixed(2)+"%";
export const fmtVol = (v)=>v>=1e6?(v/1e6).toFixed(2)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":String(v);
export const fmtTime = ()=>new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
export const fmtDate = ()=>new Date().toLocaleDateString("en-KE",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
