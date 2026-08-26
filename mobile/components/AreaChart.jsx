import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

export default function AreaChart({ stock }) {
  if (!stock) return null;
  const W = 340, H = 150, PL = 40, PR = 8, PT = 10, PB = 22;
  const data = stock.history;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const iw = W - PL - PR, ih = H - PT - PB;
  const pts = data.map((v, i) => [PL + (i / (data.length - 1)) * iw, PT + ih - ((v - mn) / rng) * ih]);
  const line = "M" + pts.map(([x, y]) => `${x},${y}`).join(" L");
  const area = line + ` L${pts[pts.length - 1][0]},${PT + ih} L${PL},${PT + ih} Z`;
  const col = stock.changePct >= 0 ? "#16c784" : "#ea3943";
  const yT = [0, 0.5, 1].map(t => ({ y: PT + ih - t * ih, v: (mn + t * rng).toFixed(stock.price < 100 ? 2 : 0) }));
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="agc" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={col} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={col} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {yT.map(({ y, v }) => (
        <Line key={v} x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <Path d={area} fill="url(#agc)" />
      <Path d={line} fill="none" stroke={col} strokeWidth="2" />
      <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={col} />
    </Svg>
  );
}
