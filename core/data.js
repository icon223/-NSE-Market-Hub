export const NSE_COMPANIES = [
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

export const NEROB_COMPANIES = [
  { ticker:"NRBX", name:"NeroBank Exchange",  sector:"Finance",    base:142.50,market:"NEROB" },
  { ticker:"VLTX", name:"VoltaX Energy Corp", sector:"Energy",     base:87.30, market:"NEROB" },
  { ticker:"CYPH", name:"CipherNet Systems",  sector:"Tech",       base:213.80,market:"NEROB" },
  { ticker:"AURM", name:"Aurum Holdings",     sector:"Commodities",base:56.90, market:"NEROB" },
  { ticker:"MDRX", name:"MedroX Pharma",      sector:"Health",     base:178.40,market:"NEROB" },
  { ticker:"SKYX", name:"SkyXpress Logistics",sector:"Transport",  base:34.20, market:"NEROB" },
];

export const EA_COMPANIES = [
  { ticker:"UMEME",name:"Umeme Ltd",               sector:"Energy",  base:340,  market:"USE",country:"🇺🇬 Uganda" },
  { ticker:"DFCU", name:"dfcu Limited",            sector:"Banking", base:920,  market:"USE",country:"🇺🇬 Uganda" },
  { ticker:"TPCC", name:"Tanzania Portland Cement",sector:"Indust.", base:1850, market:"DSE",country:"🇹🇿 Tanzania" },
  { ticker:"NMB",  name:"NMB Bank PLC",            sector:"Banking", base:4200, market:"DSE",country:"🇹🇿 Tanzania" },
  { ticker:"CRDB", name:"CRDB Bank PLC",           sector:"Banking", base:520,  market:"DSE",country:"🇹🇿 Tanzania" },
];

export const GLOBAL = [
  { ticker:"AAPL",name:"Apple Inc.",      base:182,market:"NASDAQ" },
  { ticker:"TSLA",name:"Tesla Inc.",      base:248,market:"NASDAQ" },
  { ticker:"NVDA",name:"NVIDIA Corp.",    base:875,market:"NASDAQ" },
  { ticker:"MSFT",name:"Microsoft Corp.",base:418,market:"NASDAQ" },
  { ticker:"JPM", name:"JPMorgan Chase", base:195,market:"NYSE" },
  { ticker:"XOM", name:"ExxonMobil Corp.",base:112,market:"NYSE" },
];

export const NSE_NEWS = [
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

export const CURRENCY = { NSE:"KES",NEROB:"KES",USE:"UGX",DSE:"TZS",NASDAQ:"USD",NYSE:"USD" };
