import Svg, { Polyline, LinearGradient, Stop, Defs, Path } from "react-native-svg";

export default function Sparkline({ data, color, w = 88, h = 28 }) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`)
    .join(" ");
  const area = `M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gid})`} />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}
