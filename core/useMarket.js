import { useState, useEffect, useRef } from "react";
import { initStock, tickPool } from "./engine.js";
import { NSE_COMPANIES, NEROB_COMPANIES, EA_COMPANIES, GLOBAL } from "./data.js";

const POOLS = ["nse","nerob","ea","global"];

// Runs the 2s live tick loop for all four markets and returns the live stocks.
// `onAlert(alert)` is invoked once per threshold breach (alert = {ticker,market,changePct,price,currency,time,isUp}).
export function useMarket({ threshold = 2.5, onAlert } = {}){
  const [nse, setNse] = useState(()=>NSE_COMPANIES.map(initStock));
  const [nerob, setNerob] = useState(()=>NEROB_COMPANIES.map(initStock));
  const [ea, setEa] = useState(()=>EA_COMPANIES.map(initStock));
  const [global, setGlobal] = useState(()=>GLOBAL.map(initStock));

  const ref = useRef({ nse, nerob, ea, global });
  useEffect(()=>{ ref.current = { nse, nerob, ea, global }; }, [nse, nerob, ea, global]);

  const threshRef = useRef(threshold);
  threshRef.current = threshold;

  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(()=>{
    const setters = { nse:setNse, nerob:setNerob, ea:setEa, global:setGlobal };
    const iv = setInterval(()=>{
      const t = threshRef.current;
      const cur = ref.current;
      const next = {};
      const alerts = [];
      for(const k of POOLS){
        const { stocks, alerts: al } = tickPool(cur[k], t);
        next[k] = stocks;
        if(al.length) alerts.push(...al);
      }
      ref.current = next;
      for(const k of POOLS) setters[k](next[k]);
      if(alerts.length && onAlertRef.current) alerts.forEach(a=>onAlertRef.current(a));
    }, 2000);
    return ()=>clearInterval(iv);
  }, []);

  return { nse, nerob, ea, global };
}
