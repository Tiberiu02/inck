import { StrokePoint } from "../types";
import { V2 } from "../Math/V2";

const MAX_ANGLE = Math.PI * 0.9;
const SAME_POINT_DIST = 0.1; // 10%

const WOBBLINESS_THRESHOLD = 0.002;

export function DetectPolyline3(points: StrokePoint[]): StrokePoint[] {
  const N = points.length;
  const K = Math.min(20, Math.floor(N / 3));

  const dp = CreateMatrix(K, N, 0);
  const prev = CreateMatrix(K, N, 0);
  // dp[i][j] = cost of best segmentation of first i + 1 points into j + 1 segments
  // prev[i][j] = previous vertex chosen to achieve that segmentation

  const pointSet = new PointSet();
  for (let i = 1; i < N; i++) {
    const [a, b, c] = GetLine(points[0], points[i]);
    dp[0][i] = pointSet.sumDistSq(a, b, c) / i / Dist(points[i], points[0]) ** 2;
    prev[0][i] = 0;

    pointSet.insert(points[i]);
  }

  for (let k = 1; k < K; k++) {
    for (let i = 1; i < N; i++) {
      dp[k][i] = Infinity;
      const pointSet = new PointSet();
      for (let j = i - 2; j >= 0; j--) {
        const [a, b, c] = GetLine(points[j], points[i]);
        const costJI = pointSet.sumDistSq(a, b, c) / (i - j) / Dist(points[i], points[j]) ** 2;
        pointSet.insert(points[j]);

        const costJ = Math.max(costJI, dp[k - 1][j]);
        if (costJ < dp[k][i]) {
          dp[k][i] = costJ;
          prev[k][i] = j;
        }
      }
    }
  }

  let k = 1;
  while (k < K && dp[k - 1][N - 1] > WOBBLINESS_THRESHOLD) {
    k++;
  }
  k--;

  let polyline: StrokePoint[] = [];
  for (let i = N - 1; k >= 0; i = prev[k][i], k--) {
    polyline.unshift(points[i]);
  }
  polyline.unshift(points[0]);

  if (Dist(polyline[0], polyline[polyline.length - 1]) < SAME_POINT_DIST * GetSize(polyline)) {
    const p = Interpolate(polyline[0], polyline[polyline.length - 1], 0.5);
    polyline[0] = {
      ...p,
      timestamp: polyline[0].timestamp,
    };
    polyline[polyline.length - 1] = {
      ...p,
      timestamp: polyline[polyline.length - 1].timestamp,
    };

    const p0 = polyline.at(-2) as StrokePoint;
    const p1 = polyline[0];
    const p2 = polyline[1];
    if (Math.abs(V2.angle(V2.sub(p0, p1), V2.sub(p2, p1))) > MAX_ANGLE) {
      polyline.pop();
      polyline.shift();
      polyline.push({ ...polyline[0], timestamp: polyline.at(-1).timestamp });

      const t0 = polyline[0].timestamp;
      polyline = polyline.map(p => ({ ...p, timestamp: p.timestamp - t0 }));
    }
  }
  polyline = polyline.map(p => ({ ...p, timestamp: p.timestamp * 5 }));

  return polyline;
}

class PointSet {
  private cnt: number;
  private sumX: number;
  private sumY: number;
  private sumXY: number;
  private sumX2: number;
  private sumY2: number;

  constructor() {
    this.cnt = 0;
    this.sumX = 0;
    this.sumY = 0;
    this.sumXY = 0;
    this.sumX2 = 0;
    this.sumY2 = 0;
  }

  insert(p: StrokePoint) {
    this.cnt += 1;
    this.sumX += p.x;
    this.sumY += p.y;
    this.sumXY += p.x * p.y;
    this.sumX2 += p.x ** 2;
    this.sumY2 += p.y ** 2;
  }

  sumDistSq(a: number, b: number, c: number) {
    return (
      a ** 2 * this.sumX2 +
      b ** 2 * this.sumY2 +
      c ** 2 * this.cnt +
      2 * (a * b * this.sumXY + a * c * this.sumX + b * c * this.sumY)
    );
  }
}

function Dist(a: StrokePoint, b: StrokePoint) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function GetSize(polyline: StrokePoint[]) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const p of polyline) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
  }

  return Math.sqrt((xMax - xMin) ** 2 + (yMax - yMin) ** 2);
}

function CreateMatrix(rows: number, cols: number, value: number) {
  return Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(value));
}

function GetLine(p1: StrokePoint, p2: StrokePoint) {
  let a, b, c;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  a = -dy;
  b = dx;

  const n = Math.sqrt(a ** 2 + b ** 2);
  if (n > 0) {
    a /= n;
    b /= n;
  } else {
    a = 1;
    b = 0;
  }

  c = -a * p1.x - b * p1.y;

  return [a, b, c];
}

function Interpolate(a: StrokePoint, b: StrokePoint, k: number): StrokePoint {
  return {
    x: a.x * k + b.x * (1 - k),
    y: a.y * k + b.y * (1 - k),
    pressure: a.pressure * k + b.pressure * (1 - k),
    timestamp: a.timestamp * k + b.timestamp * (1 - k),
  };
}
