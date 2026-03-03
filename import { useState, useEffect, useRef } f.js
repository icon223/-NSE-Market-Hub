import { useState, useEffect, useRef } from "react";

const NSE_COMPANIES = [
  { ticker:"SCOM", name:"Safaricom PLC",           sector:"Telecoms",   base:18.50, market:"NSE" },
  { ticker:"EQTY", name:"Equity Group Holdings",   sector:"Banking",    base:42.30, market:"NSE" },
  { ticker:"KCB",  name:"KCB Group PLC",           sector:"Banking",    base:28.75, market:"NSE" },
  { ticker:"COOP", name:"Co-operative Bank",       sector:"Banking",    base:12.90, market:"NSE" },
  { ticker:"EABL", name:"East African Breweries",  sector:"Consumer",   base:155.00,market:"NSE" },
  { ticker:"BAT",  name:"BAT Kenya PLC",           sector:"Consumer",   base:390.00,market:"NSE" },
  { ticker:"BAMB", name:"Bamburi Cement PLC",      sector:"Industrial", base:41.50, market:"NSE" },
  { ticker:"KPLC", name:"Kenya Power & Lighting",  sector:"Energy",     base:2.35,  market:"NSE" },
  { ticker:"ABSA", name:"Absa Bank Kenya PLC",     sector:"Banking",    base:13.20, market:"NSE" },
  { ticker:"NCBA", name:"NCBA Group PLC",          sector:"Banking",    base:31.00, market:"NSE" },
  { ticker:"KEGN", name:"KenGen PLC",              sector:"Energy",     base:4.15,  market:"NSE" },
  { ticker:"BRIT", name:"Britam Holdings",         sector:"Insurance",  base:7.80,  market:"NSE" },
];
const NEROB_COMPANIES = [
  { ticker:"NRBX", name:"NeroBank Exchange",  sector:"Finance",    base:142.50,market:"NEROB" },
  { ticker:"VLTX", name:"VoltaX Energy Corp", sector:"Energy",     base:87.30, market:"NEROB" },
  { ticker:"CYPH", name:"CipherNet Systems",  sector:"Tech",       base:213.80,market:"NEROB" },
  { ticker:"AURM", name:"Aurum Holdings",     sector:"Commodities",base:56.90, market:"NEROB" },
  { ticker:"MDRX", name:"MedroX Pharma",      sector:"Health",     base:178.40,market:"NEROB" },
  { ticker:"SKYX", name:"SkyXpress Logistics",sector:"Transport",  base:34.20, market:"NEROB" },
];
const EA_COMPANIES = [
  { ticker:"UMEME",name:"Umeme Ltd",               sector:"Energy",  base:340,  market:"USE",country:"🇺🇬 Uganda" },
  { ticker:"DFCU", name:"dfcu Limited",            sector:"Banking", base:920,  market:"USE",country:"🇺🇬 Uganda" },
  { ticker:"TPCC", name:"Tanzania Portland Cement",sector:"Indust.", base:1850, market:"DSE",country:"🇹🇿 Tanzania" },
  { ticker:"NMB",  name:"NMB Bank PLC",            sector:"Banking", base:4200, market:"DSE",country:"🇹🇿 Tanzania" },
  { ticker:"CRDB", name:"CRDB Bank PLC",           sector:"Banking", base:520,  market:"DSE",country:"🇹🇿 Tanzania" },
];
const GLOBAL = [
  { ticker:"AAPL",name:"Apple Inc.",      base:182,market:"NASDAQ" },
  { ticker:"TSLA",name:"Tesla Inc.",      base:248,market:"NASDAQ" },
  { ticker:"NVDA",name:"NVIDIA Corp.",    base:875,market:"NASDAQ" },
  { ticker:"MSFT",name:"Microsoft Corp.",base:418,market:"NASDAQ" },
  { ticker:"JPM", name:"JPMorgan Chase", base:195,market:"NYSE" },
  { ticker:"XOM", name:"ExxonMobil Corp.",base:112,market:"NYSE" },
];
const CURRENCY = { NSE:"KES",NEROB:"KES",USE:"UGX",DSE:"TZS",NASDAQ:"USD",NYSE:"USD" };
const NSE_NEWS = [
  { id:1, headline:"Safaricom posts strong H1 2025 results — M-PESA drives 18% revenue growth", source:"Business Daily", time:"2h ago", tag:"SCOM", sentiment:"positive" },
  { id:2, headline:"Equity Bank expands into DRC, targets 5 million new customers by 2026", source:"The Standard", time:"3h ago", tag:"EQTY", sentiment:"positive" },
  { id:3, headline:"KCB Group records KES 45B net profit, eyes regional acquisition", source:"Nation Media", time:"4h ago", tag:"KCB", sentiment:"positive" },
  { id:4, headline:"Kenya Power warns of higher tariffs amid fuel cost pressures", source:"Reuters Kenya", time:"5h ago", tag:"KPLC", sentiment:"negative" },
  { id:5, headline:"NSE 20 Share Index climbs 1.2% as banking stocks rally strongly", source:"Bloomberg Africa", time:"6h ago", tag:"NSE", sentiment:"positive" },
  { id:6, headline:"BAT Kenya faces headwinds as government mulls tobacco tax hike", source:"Business Daily", time:"7h ago", tag:"BAT", sentiment:"negative" },
  { id:7, headline:"EABL reports slowdown in beer volumes amid cost-of-living pressures", source:"The Standard", time:"8h ago", tag:"EABL", sentiment:"negative" },
  { id:8, headline:"Bamburi Cement wins KES 12B infrastructure contract from government", source:"Construction Kenya", time:"9h ago", tag:"BAMB", sentiment:"positive" },
  { id:9, headline:"NCBA Group launches digital lending platform for SMEs in East Africa", source:"TechCabal", time:"10h ago", tag:"NCBA", sentiment:"positive" },
  { id:10, headline:"Kenya shilling strengthens against USD amid improved forex reserves", source:"Central Bank Kenya", time:"11h ago", tag:"NSE", sentiment:"positive" },
  { id:11, headline:"Britam Insurance posts record underwriting surplus in Q3 2025", source:"Insurance News KE", time:"12h ago", tag:"BRIT", sentiment:"positive" },
  { id:12, headline:"KenGen secures World Bank financing for geothermal expansion project", source:"Energy Monitor", time:"1d ago", tag:"KEGN", sentiment:"positive" },
];

const rand=(a,b)=>Math.random()*(b-a)+a;
const fmt=(n)=>n>=1000?n.toFixed(0):n>=100?n.toFixed(1):n.toFixed(2);
const fmtPct=(n)=>(n>=0?"+":"")+n.toFixed(2)+"%";
const fmtVol=(v)=>v>=1e6?(v/1e6).toFixed(2)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":String(v);
const fmtTime=()=>new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
const fmtDate=()=>new Date().toLocaleDateString("en-KE",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

function genHistory(base,n=50){
  let p=base*rand(0.94,1.06);
  return Array.from({length:n},()=>{p+=rand(-p*0.008,p*0.008);return parseFloat(Math.max(p*0.1,p).toFixed(3));});
}
function initStock(c){
  const h=genHistory(c.base);const price=h[h.length-1];const open=h[0];
  return{...c,price,open,prev:price,change:price-open,changePct:((price-open)/open)*100,
    volume:Math.floor(rand(50000,8000000)),high:Math.max(...h),low:Math.min(...h),
    history:h,alerted:false,currency:CURRENCY[c.market]||"KES"};
}

function Sparkline({data,color,w=88,h=28}){
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*h}`).join(" ");
  const area=`M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  const gid=`g${color.replace(/[^a-z0-9]/gi,"")}`;
  return(
    <svg width={w} height={h} style={{overflow:"visible",display:"block"}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function AreaChart({stock}){
  if(!stock)return null;
  const W=520,H=150,PL=44,PR=10,PT=10,PB=26;
  const data=stock.history,mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const iw=W-PL-PR,ih=H-PT-PB;
  const pts=data.map((v,i)=>[PL+(i/(data.length-1))*iw,PT+ih-((v-mn)/rng)*ih]);
  const line="M"+pts.map(([x,y])=>`${x},${y}`).join(" L");
  const area=line+` L${pts[pts.length-1][0]},${PT+ih} L${PL},${PT+ih} Z`;
  const col=stock.changePct>=0?"#16c784":"#ea3943";
  const yT=[0,.25,.5,.75,1].map(t=>({y:PT+ih-t*ih,v:(mn+t*rng).toFixed(stock.price<100?2:0)}));
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs><linearGradient id="agc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={col} stopOpacity="0.28"/>
        <stop offset="100%" stopColor={col} stopOpacity="0"/>
      </linearGradient></defs>
      {yT.map(({y,v})=>(
        <g key={v}>
          <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <text x={PL-3} y={y+4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#agc)"/>
      <path d={line} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={col}/>
    </svg>
  );
}

async function fetchAI(prompt){
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
  });
  const d=await r.json();
  return d.content?.map(b=>b.text||"").join("")||"Unable to generate.";
}

async function sendDiscord(url,stock,reason){
  if(!url)return false;
  const up=stock.changePct>=0;
  try{
    await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:"NSE Market Hub 🇰🇪",embeds:[{
        title:`${up?"📈":"📉"} ${stock.ticker} — ${stock.name}`,
        description:`**${reason}**`,color:up?0x16c784:0xea3943,
        fields:[
          {name:"Price",value:`${stock.currency} ${fmt(stock.price)}`,inline:true},
          {name:"Change",value:fmtPct(stock.changePct),inline:true},
          {name:"Market",value:stock.market,inline:true},
          {name:"Volume",value:fmtVol(stock.volume),inline:true},
          {name:"High",value:`${stock.currency} ${fmt(stock.high)}`,inline:true},
          {name:"Low",value:`${stock.currency} ${fmt(stock.low)}`,inline:true},
        ],
        footer:{text:`NSE Market Hub • ${new Date().toLocaleString("en-KE")}`}
      }]})
    });
    return true;
  }catch{return false;}
}

export default function App(){
  const [nse,setNse]=useState(()=>NSE_COMPANIES.map(initStock));
  const [nerob,setNerob]=useState(()=>NEROB_COMPANIES.map(initStock));
  const [ea,setEa]=useState(()=>EA_COMPANIES.map(initStock));
  const [global,setGlobal]=useState(()=>GLOBAL.map(initStock));
  const [tab,setTab]=useState("nse");
  const [selected,setSelected]=useState(null);
  const [clock,setClock]=useState(fmtTime());
  const [webhookUrl,setWebhookUrl]=useState("");
  const [threshold,setThreshold]=useState(2.5);
  const [showDiscord,setShowDiscord]=useState(false);
  const [alerts,setAlerts]=useState([]);
  const [discordLog,setDiscordLog]=useState([]);
  const [watchlist,setWatchlist]=useState(["SCOM","EQTY","KCB"]);
  const [portfolio,setPortfolio]=useState([
    {ticker:"SCOM",market:"NSE",shares:1000,buyPrice:17.20},
    {ticker:"EQTY",market:"NSE",shares:200,buyPrice:39.50},
  ]);
  const [showAddPos,setShowAddPos]=useState(false);
  const [newPos,setNewPos]=useState({ticker:"",shares:"",buyPrice:""});
  const [newsFilter,setNewsFilter]=useState("ALL");
  const [report,setReport]=useState("");
  const [tips,setTips]=useState("");
  const [loadingReport,setLoadingReport]=useState(false);
  const [loadingTips,setLoadingTips]=useState(false);
  const threshRef=useRef(threshold);threshRef.current=threshold;
  const webhookRef=useRef(webhookUrl);webhookRef.current=webhookUrl;

  function tickPool(prev){
    return prev.map(s=>{
      const delta=rand(-s.price*0.007,s.price*0.007);
      const price=parseFloat(Math.max(0.01,s.price+delta).toFixed(3));
      const changePct=((price-s.open)/s.open)*100;
      const high=Math.max(s.high,price),low=Math.min(s.low,price);
      const history=[...s.history.slice(-49),price];
      if(Math.abs(changePct)>=threshRef.current&&!s.alerted){
        const reason=`${Math.abs(changePct).toFixed(2)}% ${changePct>=0?"surge":"drop"} on ${s.market}`;
        sendDiscord(webhookRef.current,{...s,price,changePct,high,low},reason)
          .then(ok=>ok&&setDiscordLog(l=>[`✅ ${s.ticker}: ${fmtPct(changePct)}`,...l.slice(0,14)]));
        setAlerts(a=>[{id:Date.now()+s.ticker,ticker:s.ticker,market:s.market,changePct,price,time:fmtTime()},...a.slice(0,29)]);
      }
      return{...s,prev:s.price,price,changePct,change:price-s.open,high,low,history,
        volume:s.volume+Math.floor(rand(500,20000)),alerted:Math.abs(changePct)>=threshRef.current};
    });
  }

  useEffect(()=>{
    const iv=setInterval(()=>{
      setClock(fmtTime());
      setNse(tickPool);setNerob(tickPool);setEa(tickPool);setGlobal(tickPool);
    },2000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    if(!selected)return;
    const live=[...nse,...nerob,...ea,...global].find(s=>s.ticker===selected.ticker&&s.market===selected.market);
    if(live)setSelected(live);
  },[nse,nerob,ea,global]);

  const allStocks=[...nse,...nerob,...ea,...global];
  const getStock=(ticker,market)=>allStocks.find(s=>s.ticker===ticker&&s.market===market);
  const toggleWatch=(ticker)=>setWatchlist(w=>w.includes(ticker)?w.filter(t=>t!==ticker):[...w,ticker]);
  const isWatched=(ticker)=>watchlist.includes(ticker);

  const addPosition=()=>{
    const s=allStocks.find(s=>s.ticker===newPos.ticker.toUpperCase());
    if(!s||!newPos.shares||!newPos.buyPrice)return;
    setPortfolio(p=>[...p,{ticker:s.ticker,market:s.market,shares:parseFloat(newPos.shares),buyPrice:parseFloat(newPos.buyPrice)}]);
    setNewPos({ticker:"",shares:"",buyPrice:""});setShowAddPos(false);
  };

  const portfolioRows=portfolio.map(pos=>{
    const live=getStock(pos.ticker,pos.market);
    if(!live)return null;
    const currentVal=live.price*pos.shares,costBasis=pos.buyPrice*pos.shares;
    const pnl=currentVal-costBasis,pnlPct=(pnl/costBasis)*100;
    return{...pos,live,currentVal,costBasis,pnl,pnlPct};
  }).filter(Boolean);

  const totalValue=portfolioRows.reduce((a,r)=>a+r.currentVal,0);
  const totalCost=portfolioRows.reduce((a,r)=>a+r.costBasis,0);
  const totalPnl=totalValue-totalCost;
  const totalPnlPct=totalCost>0?(totalPnl/totalCost)*100:0;

  const watchlistStocks=watchlist.map(t=>allStocks.find(s=>s.ticker===t)).filter(Boolean);
  const activeStocks=tab==="nse"?nse:tab==="nerob"?nerob:tab==="ea"?ea:tab==="global"?global:[];
  const nseIdx=nse.reduce((a,s)=>a+s.changePct,0)/nse.length;
  const top3=[...nse].sort((a,b)=>b.changePct-a.changePct).slice(0,3);
  const bot3=[...nse].sort((a,b)=>a.changePct-b.changePct).slice(0,3);
  const filteredNews=newsFilter==="ALL"?NSE_NEWS:NSE_NEWS.filter(n=>n.tag===newsFilter||n.tag==="NSE");
  const tapeItems=[...nse.slice(0,8),...nerob.slice(0,4)];

  const manualAlert=async(s)=>{
    if(!webhookUrl){setShowDiscord(true);return;}
    const ok=await sendDiscord(webhookUrl,s,"Manual alert by analyst");
    setDiscordLog(l=>[ok?`✅ Manual: ${s.ticker} ${fmtPct(s.changePct)}`:`❌ Failed: ${s.ticker}`,...l.slice(0,14)]);
  };
  const doReport=async()=>{
    setTab("report");setLoadingReport(true);
    const data=nse.map(s=>`${s.ticker} (${s.name}): KES ${fmt(s.price)}, ${fmtPct(s.changePct)}`).join("\n");
    setReport(await fetchAI(`You are a senior analyst at the Nairobi Securities Exchange (NSE). Write a professional 3-paragraph market report covering overall NSE sentiment, top movers, and outlook for Kenyan investors. Be specific.\n\nNSE Data:\n${data}`));
    setLoadingReport(false);
  };
  const doTips=async()=>{
    setTab("tips");setLoadingTips(true);
    const data=nse.map(s=>`${s.ticker}: KES ${fmt(s.price)}, ${fmtPct(s.changePct)}, ${s.sector}`).join("\n");
    setTips(await fetchAI(`You are a licensed Kenyan financial advisor. Give 4 specific BUY/HOLD/SELL tips for NSE investors with ticker references and KES prices.\n\nNSE Data:\n${data}`));
    setLoadingTips(false);
  };

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --bg:#09101f;--s1:#0e1828;--s2:#131e30;--border:#1c2b42;--border2:#243450;
      --green:#16c784;--red:#ea3943;--gold:#f3ba2f;--blue:#4a90ff;
      --text:#e2eaf5;--sub:#5f7399;--muted:#2d3f5c;
      --ff:'Outfit',sans-serif;--mono:'DM Mono',monospace;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--ff);font-size:14px;min-height:100vh;}
    ::-webkit-scrollbar{width:3px;height:3px;}
    ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
    .ks{height:3px;background:linear-gradient(90deg,#000 0 20%,#bb0000 20% 40%,#006600 40% 60%,#bb0000 60% 80%,#000 80%);}
    .hdr{background:var(--s1);border-bottom:1px solid var(--border);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:200;}
    .logo-text{font-size:19px;font-weight:800;letter-spacing:-.5px;}
    .logo-text em{color:var(--green);font-style:normal;}
    .logo-sub{font-size:9px;color:var(--sub);letter-spacing:2px;text-transform:uppercase;font-family:var(--mono);}
    .hdr-r{display:flex;align-items:center;gap:12px;}
    .live-badge{display:flex;align-items:center;gap:5px;background:rgba(22,199,132,.1);border:1px solid rgba(22,199,132,.3);border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;color:var(--green);}
    .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:blink 1.2s infinite;}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
    .clk{font-family:var(--mono);font-size:11px;color:var(--sub);}
    .btn{padding:6px 14px;border-radius:7px;border:none;font-family:var(--ff);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;}
    .btn-o{background:transparent;border:1px solid var(--border2);color:var(--text);}
    .btn-o:hover{border-color:var(--green);color:var(--green);}
    .btn-g{background:var(--green);color:#000;font-weight:700;}
    .btn-g:hover{filter:brightness(1.1);box-shadow:0 0 14px rgba(22,199,132,.35);}
    .btn-r{background:rgba(234,57,67,.15);border:1px solid rgba(234,57,67,.35);color:var(--red);}
    .btn-r:hover{background:rgba(234,57,67,.25);}
    .btn-sm{padding:3px 9px;font-size:11px;border-radius:5px;}
    .btn-xs{padding:2px 7px;font-size:10px;border-radius:4px;}
    .tape-wrap{overflow:hidden;background:var(--s2);border-bottom:1px solid var(--border);}
    .tape{display:flex;width:max-content;animation:scroll 45s linear infinite;}
    @keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .ti{padding:5px 20px;display:flex;gap:8px;align-items:center;font-size:11px;border-right:1px solid var(--border);white-space:nowrap;}
    .tsym{font-family:var(--mono);font-weight:500;}
    .tpr{font-family:var(--mono);color:var(--sub);}
    .up{color:var(--green);}.dn{color:var(--red);}
    .idx-bar{display:flex;gap:10px;padding:10px 20px;background:var(--s1);border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center;}
    .ic{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;min-width:128px;}
    .il{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);font-family:var(--mono);}
    .iv{font-size:17px;font-weight:700;font-family:var(--mono);margin-top:1px;}
    .ichg{font-size:11px;font-family:var(--mono);}
    .drow{display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap;}
    .inp{background:var(--s2);border:1px solid var(--border2);border-radius:7px;padding:7px 11px;color:var(--text);font-family:var(--mono);font-size:11px;outline:none;width:100%;}
    .inp:focus{border-color:var(--green);}
    .inp-sm{width:56px;text-align:center;color:var(--green);}
    .nav{display:flex;padding:0 20px;background:var(--s1);border-bottom:1px solid var(--border);overflow-x:auto;}
    .nb{padding:11px 16px;font-size:12px;font-weight:600;border:none;background:transparent;color:var(--sub);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .18s;display:flex;align-items:center;gap:5px;}
    .nb:hover{color:var(--text);}
    .nb.active{color:var(--green);border-bottom-color:var(--green);}
    .np{background:var(--muted);color:var(--sub);font-size:9px;padding:1px 5px;border-radius:9px;font-family:var(--mono);}
    .nb.active .np{background:rgba(22,199,132,.18);color:var(--green);}
    .layout{display:grid;grid-template-columns:1fr 290px;min-height:calc(100vh - 230px);}
    .left{padding:16px 20px;border-right:1px solid var(--border);overflow-y:auto;}
    .right{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:var(--s1);}
    @media(max-width:860px){.layout{grid-template-columns:1fr}}
    .tbl{width:100%;border-collapse:collapse;}
    .tbl thead th{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--sub);padding:7px 9px;text-align:left;border-bottom:1px solid var(--border);font-family:var(--mono);font-weight:500;background:var(--s1);position:sticky;top:0;z-index:10;}
    .tbl tbody tr{cursor:pointer;border-bottom:1px solid rgba(28,43,66,.5);transition:background .1s;}
    .tbl tbody tr:hover{background:rgba(255,255,255,.02);}
    .tbl tbody tr.sel{background:rgba(22,199,132,.055);border-left:2px solid var(--green);}
    .tbl td{padding:8px 9px;vertical-align:middle;}
    .sym{font-family:var(--mono);font-size:13px;font-weight:500;}
    .co{font-size:12px;color:var(--sub);}
    .pr{font-family:var(--mono);font-size:13px;font-weight:500;}
    .badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-family:var(--mono);font-weight:500;}
    .badge.up{background:rgba(22,199,132,.12);color:var(--green);}
    .badge.dn{background:rgba(234,57,67,.12);color:var(--red);}
    .stag{display:inline-block;padding:2px 6px;border-radius:3px;font-size:9px;background:rgba(74,144,255,.1);color:#7aaeff;border:1px solid rgba(74,144,255,.2);}
    .fu{animation:fu .5s;}.fd{animation:fd .5s;}
    @keyframes fu{0%{background:rgba(22,199,132,.18)}100%{background:transparent}}
    @keyframes fd{0%{background:rgba(234,57,67,.18)}100%{background:transparent}}
    .panel{background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:13px;}
    .pt{font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--sub);margin-bottom:10px;font-family:var(--mono);}
    .det-sym{font-family:var(--mono);font-size:19px;font-weight:500;}
    .det-name{font-size:12px;color:var(--sub);margin-top:1px;}
    .det-pr{font-family:var(--mono);font-size:24px;font-weight:700;margin-top:8px;}
    .det-chg{font-family:var(--mono);font-size:12px;margin-top:2px;}
    .sg{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px;}
    .sb{background:var(--s1);border:1px solid var(--border);border-radius:6px;padding:6px 9px;}
    .sl{font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;}
    .sv{font-family:var(--mono);font-size:12px;font-weight:500;margin-top:1px;}
    .mv{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(28,43,66,.4);cursor:pointer;}
    .mv:last-child{border:none;}
    .al{display:flex;justify-content:space-between;align-items:center;padding:4px 7px;border-radius:4px;margin-bottom:3px;font-size:11px;border-left:2px solid;}
    .al.up{background:rgba(22,199,132,.06);border-color:var(--green);}
    .al.dn{background:rgba(234,57,67,.06);border-color:var(--red);}
    .star-btn{background:none;border:none;cursor:pointer;font-size:14px;padding:0 2px;transition:transform .15s;}
    .star-btn:hover{transform:scale(1.3);}
    .pf-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
    .pfc{background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
    .pfL{font-size:9px;color:var(--sub);letter-spacing:1px;text-transform:uppercase;font-family:var(--mono);}
    .pfV{font-family:var(--mono);font-size:16px;font-weight:700;margin-top:3px;}
    .pfr{display:grid;grid-template-columns:1.2fr .8fr .8fr 1fr 1fr .5fr;gap:6px;align-items:center;padding:8px 10px;border-radius:7px;margin-bottom:5px;background:var(--s1);border:1px solid var(--border);}
    .apf{background:var(--s2);border:1px solid var(--border2);border-radius:8px;padding:14px;margin-bottom:14px;display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:8px;align-items:end;}
    .fld{display:flex;flex-direction:column;gap:4px;}
    .fld label{font-size:10px;color:var(--sub);letter-spacing:1px;text-transform:uppercase;}
    .fld input{background:var(--s1);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:var(--mono);font-size:12px;outline:none;}
    .fld input:focus{border-color:var(--green);}
    .nf{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
    .nchip{padding:4px 12px;border-radius:20px;border:1px solid var(--border2);background:transparent;color:var(--sub);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--ff);}
    .nchip:hover{border-color:var(--green);color:var(--green);}
    .nchip.active{background:rgba(22,199,132,.15);border-color:rgba(22,199,132,.4);color:var(--green);}
    .ni{padding:13px 0;border-bottom:1px solid rgba(28,43,66,.5);display:flex;gap:12px;align-items:flex-start;}
    .ni:last-child{border:none;}
    .ndot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    .ndot.positive{background:var(--green);}.ndot.negative{background:var(--red);}
    .nh{font-size:13px;font-weight:500;line-height:1.45;margin-bottom:5px;}
    .nm{display:flex;gap:8px;align-items:center;font-size:11px;color:var(--sub);}
    .ntag{padding:1px 7px;border-radius:3px;background:rgba(74,144,255,.1);color:#7aaeff;border:1px solid rgba(74,144,255,.2);font-family:var(--mono);font-size:10px;}
    .ntag.pos{background:rgba(22,199,132,.1);color:var(--green);border-color:rgba(22,199,132,.25);}
    .ntag.neg{background:rgba(234,57,67,.1);color:var(--red);border-color:rgba(234,57,67,.25);}
    .rb{font-size:13px;line-height:1.85;color:#c5d2e8;white-space:pre-wrap;}
    .ld{font-family:var(--mono);font-size:13px;color:var(--green);}
    .bl::after{content:"▋";animation:blink .7s steps(1) infinite;}
    .ll{font-family:var(--mono);font-size:10px;color:var(--sub);padding:2px 0;border-bottom:1px solid rgba(255,255,255,.03);}
    .sh{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .st{font-size:15px;font-weight:700;}
  `;

  return(
    <>
      <style>{CSS}</style>
      <div className="ks"/>
      <div className="hdr">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="data:image/jpeg;base64,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apBOgKbwoxoe4LJpN66B7KQhAAUYmxhOMSAJrrNWINAGINnDQkZQE+TDh0qHSiokrGDzzq5uXLjnOyCGodGg4H8FRLjA5o+aFS4Chw8J5VCOJHJH9VNshF9HzXdtVRXctKgxafxX0lZIN5yz52LgQRRY0/AbgaYnju6ClQpDVtVKWWE7O+3qh0qHRrQ1ygjdq1a/Ab99WZRsMchpMwy5PDdi2zsMO6Gm+gAgwKGVl9lQ6VDpXUaBkZ6h0qHTyYgbBJvr+Er+EoIw2G2uIr+Er+Eq7ascQJo0bHGwRN9RXKySQ3K/hKiutwUlIXU8SNhvrBX8J4SN3rEElbrdg7UpS6tP4Sv4SjYIbil0pd9P4Sv4SjYIbj/yJ//aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888884w04gQ880888888888888888888888888888888Uswk0Mc8Y4c488888888888888888888888888sQ80888888888cw008888888888888888888888sIk4Ac0888888888MIU888888888888888888888g8cwcoU88408wkw88Yc88888888888888888880gY4kAco0gIAU8EEsskYc88888888888888888884MsgcAUQI8w888c88Y0YYw8888888888888888888Es88g888cQ088848888w888888888888888888884I8ss8EUss8888oY8oA8c8888888888888888888s88M888Us48884880IE888888888888888888884Us08k0UM8oc84MY8w88888888888888888888888c4o00EM088UgMcc80U8888888888888888888888MEoQs8M888o84c8w8888888888888888888888888ssM8gE88888oc4I88888888888888888888888888888w8888888kQs888888888888888888888888888884Y888888gc8888888888888888888888888888888YQ8888sM8888888888888888888888888888888884w88kE8888888888888888888888888888888888880w8888888888888888888888888888w40ww008w0w80w88008408888888888888888888oo80sEAUkcAAcQ0UQU888888888888888888888884cU8w0QkUAwUEI8AU8888888888888888888888oE0kggg8YUgEcEI0IQ0844888888888888888888g0ccQkYwccMM8s8MU0UMMM88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAFBEBAAAAAAAAAAAAAAAAAAAAoP/aAAgBAwEBPxBIH//EABQRAQAAAAAAAAAAAAAAAAAAAKD/2gAIAQIBAT8QSB//xAAsEAEAAQMDAwMEAgMBAQAAAAABEQAhMUFRYXGBkRCh8CBQscEw0WDh8UCg/9oACAEBAAE/EP8A5JpqTcqTcqf8FmpN6WG+SE7tI2r1l9qV1N/3Zl7U9B2ij7B+aR7UWeY+1SkW/FItPq8SqOdJxGhjdydGxImn5qiJGml34BpWOaL9o+1CDVCPYn5qP1cfcpPamIiI/MkKIPuDB7lT98BlACVdKdzJZLbQd0qaCDaKUipVCFDs/ana/l491WrtiaDaoaDcX/wVFp52j7ighHdr7CaIu6v+lSMhQCXVCYl1f9iniXzfEigFGJuf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" alt="NSE Market Hub" style={{height:44,width:44,objectFit:"contain",filter:"invert(1)"}}/>
          <div>
            <div className="logo-text">NSE</div>
            <div className="logo-sub">Nairobi Securities Exchange</div>
          </div>
        </div>
        <div className="hdr-r">
          <div className="live-badge"><div className="live-dot"/>LIVE</div>
          <span className="clk">{clock} EAT · {fmtDate()}</span>
          <button className="btn btn-o btn-sm" onClick={()=>setShowDiscord(v=>!v)}>{showDiscord?"✕":"🔔"} Discord</button>
        </div>
      </div>

      <div className="tape-wrap">
        <div className="tape">
          {[...tapeItems,...tapeItems].map((s,i)=>(
            <div className="ti" key={i}>
              <span className="tsym">{s.ticker}</span>
              <span className="tpr">{s.currency} {fmt(s.price)}</span>
              <span className={s.changePct>=0?"up":"dn"}>{fmtPct(s.changePct)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="idx-bar">
        <div className="ic"><div className="il">NSE 20 Index</div><div className={`iv ${nseIdx>=0?"up":"dn"}`}>{(1842+nseIdx*10).toFixed(0)}</div><div className={`ichg ${nseIdx>=0?"up":"dn"}`}>{fmtPct(nseIdx)}</div></div>
        <div className="ic"><div className="il">NASI</div><div className={`iv ${nseIdx>=0?"up":"dn"}`}>{(113.4+nseIdx*2).toFixed(1)}</div><div className={`ichg ${nseIdx>=0?"up":"dn"}`}>{fmtPct(nseIdx*.8)}</div></div>
        <div className="ic"><div className="il">Volume</div><div className="iv" style={{color:"var(--gold)"}}>{fmtVol(nse.reduce((a,s)=>a+s.volume,0))}</div><div className="ichg" style={{color:"var(--sub)"}}>shares</div></div>
        <div className="ic"><div className="il">Market</div><div className="iv up" style={{fontSize:13,paddingTop:4}}>● OPEN</div><div className="ichg" style={{color:"var(--sub)"}}>09:00–15:00 EAT</div></div>
        {showDiscord&&(
          <div className="drow">
            <div style={{flex:1,minWidth:220}}><input className="inp" placeholder="Discord Webhook URL…" value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)}/></div>
            <span style={{fontSize:11,color:"var(--sub)",whiteSpace:"nowrap"}}>Alert ±</span>
            <input type="number" className="inp inp-sm" min="0.5" max="20" step="0.5" value={threshold} onChange={e=>setThreshold(parseFloat(e.target.value))}/>
            <span style={{fontSize:11,color:"var(--sub)"}}>%</span>
            {webhookUrl&&<span style={{fontSize:11,color:"var(--green)",whiteSpace:"nowrap"}}>✓ On</span>}
          </div>
        )}
      </div>

      <div className="nav">
        {[["nse","🇰🇪 NSE Kenya",nse.length],["nerob","🏛 NEROB",nerob.length],["ea","🌍 East Africa",ea.length],["global","🌐 Global",global.length],["watchlist","⭐ Watchlist",watchlist.length],["portfolio","💼 Portfolio",portfolio.length],["news","📰 News",NSE_NEWS.length],["report","🤖 AI Report",null],["tips","💡 Tips",null]].map(([key,label,count])=>(
          <button key={key} className={`nb ${tab===key?"active":""}`} onClick={()=>{key==="report"?doReport():key==="tips"?doTips():setTab(key);}}>
            {label}{count!==null&&<span className="np">{count}</span>}
          </button>
        ))}
      </div>

      {["nse","nerob","ea","global"].includes(tab)&&(
        <div className="layout">
          <div className="left">
            <table className="tbl">
              <thead><tr>
                <th>Ticker</th><th>Company</th>{tab==="ea"&&<th>Country</th>}<th>Sector</th><th>Price</th><th>Chg</th><th>%</th><th>High</th><th>Low</th><th>Vol</th><th>Chart</th><th>⭐</th><th>📣</th>
              </tr></thead>
              <tbody>
                {activeStocks.map(s=>(
                  <tr key={s.ticker+s.market} className={`${selected?.ticker===s.ticker&&selected?.market===s.market?"sel":""} ${s.price>s.prev?"fu":s.price<s.prev?"fd":""}`} onClick={()=>setSelected(s)}>
                    <td><div className="sym">{s.ticker}</div><div style={{fontSize:9,color:"var(--sub)",fontFamily:"var(--mono)"}}>{s.market}</div></td>
                    <td><span className="co">{s.name}</span></td>
                    {tab==="ea"&&<td><span style={{fontSize:12}}>{s.country}</span></td>}
                    <td><span className="stag">{s.sector}</span></td>
                    <td><span className="pr">{s.currency} {fmt(s.price)}</span></td>
                    <td><span className={s.change>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:11}}>{s.change>=0?"+":""}{fmt(Math.abs(s.change))}</span></td>
                    <td><span className={`badge ${s.changePct>=0?"up":"dn"}`}>{fmtPct(s.changePct)}</span></td>
                    <td><span className="up" style={{fontFamily:"var(--mono)",fontSize:11}}>{fmt(s.high)}</span></td>
                    <td><span className="dn" style={{fontFamily:"var(--mono)",fontSize:11}}>{fmt(s.low)}</span></td>
                    <td><span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--sub)"}}>{fmtVol(s.volume)}</span></td>
                    <td><Sparkline data={s.history} color={s.changePct>=0?"#16c784":"#ea3943"}/></td>
                    <td><button className="star-btn" onClick={e=>{e.stopPropagation();toggleWatch(s.ticker);}}>{isWatched(s.ticker)?"⭐":"☆"}</button></td>
                    <td><button className="btn btn-o btn-xs" onClick={e=>{e.stopPropagation();manualAlert(s);}}>📣</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="right">
            {selected?(
              <div className="panel">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div><div className="det-sym">{selected.ticker}</div><div className="det-name">{selected.name}</div><div style={{fontSize:10,color:"var(--sub)",marginTop:2}}>{selected.market} · {selected.sector}</div></div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span className={`badge ${selected.changePct>=0?"up":"dn"}`}>{fmtPct(selected.changePct)}</span>
                    <button className="star-btn" style={{fontSize:16}} onClick={()=>toggleWatch(selected.ticker)}>{isWatched(selected.ticker)?"⭐":"☆"}</button>
                  </div>
                </div>
                <div className={`det-pr ${selected.changePct>=0?"up":"dn"}`}>{selected.currency} {fmt(selected.price)}</div>
                <div className={`det-chg ${selected.changePct>=0?"up":"dn"}`}>{selected.change>=0?"▲":"▼"} {fmt(Math.abs(selected.change))} today</div>
                <div style={{marginTop:10}}><AreaChart stock={selected}/></div>
                <div className="sg">
                  <div className="sb"><div className="sl">Open</div><div className="sv">{selected.currency} {fmt(selected.open)}</div></div>
                  <div className="sb"><div className="sl">Volume</div><div className="sv">{fmtVol(selected.volume)}</div></div>
                  <div className="sb"><div className="sl">High</div><div className="sv up">{fmt(selected.high)}</div></div>
                  <div className="sb"><div className="sl">Low</div><div className="sv dn">{fmt(selected.low)}</div></div>
                </div>
                <div style={{marginTop:8}}><button className="btn btn-o btn-sm" onClick={()=>manualAlert(selected)}>📣 Discord Alert</button></div>
              </div>
            ):(
              <div className="panel" style={{color:"var(--sub)",fontSize:12,textAlign:"center",padding:"28px 0"}}>Click any stock to view details</div>
            )}
            {tab==="nse"&&<>
              <div className="panel"><div className="pt">🔥 Top Gainers</div>{top3.map(s=>(
                <div className="mv" key={s.ticker} onClick={()=>setSelected(s)}>
                  <div><div className="sym" style={{fontSize:12}}>{s.ticker}</div><div style={{fontSize:10,color:"var(--sub)"}}>{s.name}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--mono)",fontSize:11}}>KES {fmt(s.price)}</div><span className="badge up" style={{fontSize:9}}>{fmtPct(s.changePct)}</span></div>
                </div>
              ))}</div>
              <div className="panel"><div className="pt">📉 Top Losers</div>{bot3.map(s=>(
                <div className="mv" key={s.ticker} onClick={()=>setSelected(s)}>
                  <div><div className="sym" style={{fontSize:12}}>{s.ticker}</div><div style={{fontSize:10,color:"var(--sub)"}}>{s.name}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"var(--mono)",fontSize:11}}>KES {fmt(s.price)}</div><span className="badge dn" style={{fontSize:9}}>{fmtPct(s.changePct)}</span></div>
                </div>
              ))}</div>
            </>}
            <div className="panel"><div className="pt">⚡ Alerts</div>
              {alerts.length===0?<div style={{fontSize:11,color:"var(--sub)",fontFamily:"var(--mono)"}}>No alerts yet.</div>
                :alerts.slice(0,8).map(a=><div key={a.id} className={`al ${a.changePct>=0?"up":"dn"}`}><span style={{fontFamily:"var(--mono)",fontSize:11,fontWeight:500}}>{a.ticker}</span><span className={a.changePct>=0?"up":"dn"} style={{fontSize:11}}>{fmtPct(a.changePct)}</span><span style={{color:"var(--sub)",fontSize:10}}>{a.time}</span></div>)}
            </div>
            {discordLog.length>0&&<div className="panel"><div className="pt">📡 Discord</div>{discordLog.map((l,i)=><div key={i} className="ll">{l}</div>)}</div>}
          </div>
        </div>
      )}

      {tab==="watchlist"&&(
        <div style={{padding:"18px 20px"}}>
          <div className="sh"><div className="st">⭐ Watchlist</div><span style={{fontSize:12,color:"var(--sub)"}}>Click ☆ on any stock to watch it</span></div>
          {watchlistStocks.length===0?(
            <div style={{color:"var(--sub)",fontSize:13,textAlign:"center",padding:"40px 0"}}>No stocks watched yet. Click ☆ on any row to add here.</div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:12}}>
              {watchlistStocks.map(s=>(
                <div key={s.ticker} className="panel" style={{cursor:"pointer"}} onClick={()=>{setTab("nse");setTimeout(()=>setSelected(s),50);}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontFamily:"var(--mono)",fontSize:15,fontWeight:500}}>{s.ticker}</div>
                      <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{s.name}</div>
                      <div style={{fontSize:10,color:"var(--sub)"}}>{s.market} · {s.sector}</div>
                    </div>
                    <button className="star-btn" style={{fontSize:16}} onClick={e=>{e.stopPropagation();toggleWatch(s.ticker);}}>⭐</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                    <div>
                      <div className={s.changePct>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:700}}>{s.currency} {fmt(s.price)}</div>
                      <div className={s.changePct>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:12,marginTop:2}}>{fmtPct(s.changePct)} today</div>
                    </div>
                    <Sparkline data={s.history} color={s.changePct>=0?"#16c784":"#ea3943"} w={80} h={36}/>
                  </div>
                  <div style={{marginTop:8}}><button className="btn btn-o btn-xs" onClick={e=>{e.stopPropagation();manualAlert(s);}}>📣 Alert</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==="portfolio"&&(
        <div style={{padding:"18px 20px"}}>
          <div className="sh"><div className="st">💼 Portfolio Tracker</div>
            <button className="btn btn-g btn-sm" onClick={()=>setShowAddPos(v=>!v)}>{showAddPos?"✕ Cancel":"+ Add Position"}</button>
          </div>
          <div className="pf-sum">
            <div className="pfc"><div className="pfL">Total Value</div><div className="pfV">KES {fmtVol(totalValue)}</div></div>
            <div className="pfc"><div className="pfL">Total P&L</div><div className={`pfV ${totalPnl>=0?"up":"dn"}`}>{totalPnl>=0?"+":"-"}KES {fmtVol(Math.abs(totalPnl))}</div><div className={totalPnl>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:11}}>{fmtPct(totalPnlPct)}</div></div>
            <div className="pfc"><div className="pfL">Cost Basis</div><div className="pfV">KES {fmtVol(totalCost)}</div></div>
          </div>
          {showAddPos&&(
            <div className="apf">
              <div className="fld"><label>Ticker</label><input placeholder="e.g. SCOM" value={newPos.ticker} onChange={e=>setNewPos(p=>({...p,ticker:e.target.value.toUpperCase()}))}/></div>
              <div className="fld"><label>Shares</label><input type="number" placeholder="100" value={newPos.shares} onChange={e=>setNewPos(p=>({...p,shares:e.target.value}))}/></div>
              <div className="fld"><label>Buy Price (KES)</label><input type="number" placeholder="17.20" value={newPos.buyPrice} onChange={e=>setNewPos(p=>({...p,buyPrice:e.target.value}))}/></div>
              <button className="btn btn-g" onClick={addPosition}>Add</button>
            </div>
          )}
          {portfolioRows.length===0?(
            <div style={{color:"var(--sub)",fontSize:13,textAlign:"center",padding:"40px 0"}}>No positions yet. Add your first above.</div>
          ):(<>
            <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr .8fr 1fr 1fr .5fr",gap:6,padding:"0 10px 6px",marginBottom:4}}>
              {["Stock","Shares","Buy Price","Current Value","P&L",""].map(h=><span key={h} style={{fontSize:9,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"1.5px",fontFamily:"var(--mono)"}}>{h}</span>)}
            </div>
            {portfolioRows.map((row,i)=>(
              <div className="pfr" key={i}>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:500}}>{row.ticker}</div>
                  <div style={{fontSize:10,color:"var(--sub)"}}>{row.live.name}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,marginTop:2}}>{row.live.currency} {fmt(row.live.price)} <span className={row.live.changePct>=0?"up":"dn"} style={{fontSize:10}}>{fmtPct(row.live.changePct)}</span></div>
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:12}}>{row.shares.toLocaleString()}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--sub)"}}>KES {fmt(row.buyPrice)}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:500}}>KES {fmtVol(row.currentVal)}</div>
                <div>
                  <div className={row.pnl>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600}}>{row.pnl>=0?"+":"-"}KES {fmtVol(Math.abs(row.pnl))}</div>
                  <div className={row.pnl>=0?"up":"dn"} style={{fontFamily:"var(--mono)",fontSize:11}}>{fmtPct(row.pnlPct)}</div>
                </div>
                <button className="btn btn-r btn-xs" onClick={()=>setPortfolio(p=>p.filter((_,idx)=>idx!==i))}>✕</button>
              </div>
            ))}
          </>)}
        </div>
      )}

      {tab==="news"&&(
        <div style={{padding:"18px 20px",maxWidth:820}}>
          <div className="sh"><div className="st">📰 NSE & Kenya Market News</div></div>
          <div className="nf">
            {["ALL",...NSE_COMPANIES.map(s=>s.ticker)].map(t=>(
              <button key={t} className={`nchip ${newsFilter===t?"active":""}`} onClick={()=>setNewsFilter(t)}>{t}</button>
            ))}
          </div>
          <div className="panel">
            {filteredNews.map(n=>(
              <div className="ni" key={n.id}>
                <div className={`ndot ${n.sentiment}`}/>
                <div style={{flex:1}}>
                  <div className="nh">{n.headline}</div>
                  <div className="nm">
                    <span>{n.source}</span><span>·</span><span>{n.time}</span>
                    <span className="ntag">{n.tag}</span>
                    <span className={`ntag ${n.sentiment==="positive"?"pos":"neg"}`}>{n.sentiment==="positive"?"▲ Positive":"▼ Negative"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="report"&&(
        <div style={{padding:"18px 20px",maxWidth:820}}>
          <div className="panel">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700}}>🤖 AI Market Report — NSE Kenya</div>
              <button className="btn btn-g btn-sm" onClick={doReport} disabled={loadingReport}>↻ Refresh</button>
            </div>
            {loadingReport?<div className="ld">Analysing NSE market data<span className="bl"/></div>:report?<div className="rb">{report}</div>:<div style={{color:"var(--sub)"}}>Loading…</div>}
          </div>
        </div>
      )}

      {tab==="tips"&&(
        <div style={{padding:"18px 20px",maxWidth:820}}>
          <div className="panel">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700}}>💡 AI Investment Tips — NSE Kenya</div>
              <button className="btn btn-g btn-sm" onClick={doTips} disabled={loadingTips}>↻ Refresh</button>
            </div>
            {loadingTips?<div className="ld">Evaluating NSE positions<span className="bl"/></div>:tips?<div className="rb">{tips}</div>:<div style={{color:"var(--sub)"}}>Loading…</div>}
          </div>
        </div>
      )}
    </>
  );
}