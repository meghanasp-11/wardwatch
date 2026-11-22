// "Simulate +2 Hours": same trajectory rules as the frontend demo, now server-side.
const r1 = (n) => Number(n.toFixed(1));

export function nextVitals(curr, spo2Scale, direction = 'deteriorate') {
  if (direction === 'recover') {
    return {
      resp_rate: Math.max(14, curr.resp_rate - 1), spo2: Math.min(99, curr.spo2 + 1), on_oxygen: false,
      systolic_bp: Math.min(126, curr.systolic_bp + 2), heart_rate: Math.max(72, curr.heart_rate - 3),
      temp: r1(Math.max(36.7, curr.temp - 0.1)), consciousness: 'A',
    };
  }
  const sbp = Math.max(78, curr.systolic_bp - 8);
  return {
    resp_rate: Math.min(34, curr.resp_rate + 3), spo2: Math.max(85, curr.spo2 - (Number(spo2Scale) === 2 ? 1 : 2)), on_oxygen: true,
    systolic_bp: sbp, heart_rate: Math.min(148, curr.heart_rate + 10), temp: r1(Math.min(40.2, curr.temp + 0.4)),
    consciousness: curr.systolic_bp - 8 <= 92 && curr.consciousness === 'A' ? 'C' : curr.consciousness,
  };
}
