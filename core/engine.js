import { rand, fmtTime } from "./format.js";

export function genHistory(base, n=50){
  let p = base * rand(0.94, 1.06);
  return Array.from({length:n}, ()=>{
    p += rand(-p*0.008, p*0.008);
    return parseFloat(Math.max(p*0.1, p).toFixed(3));
  });
}

export function initStock(c){
  const h = genHistory(c.base);
  const price = h[h.length-1];
  const open = h[0];
  return {
    ...c,
    price,
    open,
    prev: price,
    change: price - open,
    changePct: ((price - open)/open)*100,
    volume: Math.floor(rand(50000, 8000000)),
    high: Math.max(...h),
    low: Math.min(...h),
    history: h,
    alerted: false,
    currency: CURRENCY_OF(c.market)
  };
}

function CURRENCY_OF(market){
  const MAP = { NSE:"KES",NEROB:"KES",USE:"UGX",DSE:"TZS",NASDAQ:"USD",NYSE:"USD" };
  return MAP[market] || "KES";
}

export function tickPool(prev, threshold){
  const alerts = [];
  const stocks = prev.map(s=>{
    const delta = rand(-s.price*0.007, s.price*0.007);
    const price = parseFloat(Math.max(0.01, s.price + delta).toFixed(3));
    const changePct = ((price - s.open)/s.open)*100;
    const high = Math.max(s.high, price);
    const low = Math.min(s.low, price);
    const history = [...s.history.slice(-49), price];
    const breached = Math.abs(changePct) >= threshold;
    if(breached && !s.alerted){
      alerts.push({
        ticker: s.ticker,
        market: s.market,
        name: s.name,
        changePct,
        price,
        currency: s.currency,
        time: fmtTime(),
        isUp: changePct >= 0
      });
    }
    return {
      ...s,
      prev: s.price,
      price,
      changePct,
      change: price - s.open,
      high, low, history,
      volume: s.volume + Math.floor(rand(500, 20000)),
      alerted: breached
    };
  });
  return { stocks, alerts };
}
