import { useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';

// A small, single-series trend line for one run-history metric. Kept as
// hand-rolled inline SVG (no charting library exists yet in this app) --
// deliberately "basic", per spec: one hue, a hairline baseline, a direct
// end-value label (never the number on every point), and a hover
// crosshair+tooltip. A single series needs no legend box -- the chart's
// title already names what's plotted (see dataviz skill: marks-and-anatomy).
export interface TrendPoint {
  timestamp: string;
  value: number;
}

interface MetricTrendChartProps {
  title: string;
  color: string;
  points: TrendPoint[];
  formatValue: (value: number) => string;
}

const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 20;

const SURFACE = '#fcfcfb';
const GRIDLINE = '#e1e0d9';
const TEXT_SECONDARY = '#52514e';
const TEXT_MUTED = '#898781';

export function MetricTrendChart({ title, color, points, formatValue }: MetricTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 240 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Not enough run history yet.
        </Typography>
      </Paper>
    );
  }

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? PAD_X + (i / (points.length - 1)) * plotWidth : PAD_X + plotWidth / 2;
    const y = PAD_TOP + plotHeight - ((p.value - minValue) / range) * plotHeight;
    return { x, y, ...p };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const last = coords[coords.length - 1];
  const hovered = hoverIndex != null ? coords[hoverIndex] : null;

  const handleMouseMove: React.MouseEventHandler<SVGSVGElement> = (event) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relativeX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 240, position: 'relative' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          style={{ display: 'block', cursor: 'crosshair' }}
        >
          <line
            x1={PAD_X}
            y1={PAD_TOP + plotHeight}
            x2={WIDTH - PAD_X}
            y2={PAD_TOP + plotHeight}
            stroke={GRIDLINE}
            strokeWidth={1}
          />

          {hovered && (
            <line
              x1={hovered.x}
              y1={PAD_TOP}
              x2={hovered.x}
              y2={PAD_TOP + plotHeight}
              stroke={GRIDLINE}
              strokeWidth={1}
            />
          )}

          <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === hoverIndex ? 5 : 4}
              fill={color}
              stroke={SURFACE}
              strokeWidth={2}
            />
          ))}

          <text x={last.x} y={PAD_TOP - 4} textAnchor="end" fontSize={11} fill={TEXT_SECONDARY}>
            {formatValue(last.value)}
          </text>
        </svg>

        {hovered && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: `${Math.min(Math.max((hovered.x / WIDTH) * 100, 15), 85)}%`,
              transform: 'translate(-50%, -100%)',
              bgcolor: 'grey.900',
              color: 'common.white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: 11,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {formatValue(hovered.value)}
            <br />
            {new Date(hovered.timestamp).toLocaleString()}
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: TEXT_MUTED }}>
        Last {points.length} run{points.length === 1 ? '' : 's'}
      </Typography>
    </Paper>
  );
}
