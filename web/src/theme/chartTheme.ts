export const CHART_COLORS = {
  cyan: '#06B6D4',
  sky: '#38BDF8',
  violet: '#8B5CF6',
  indigo: '#6366F1',
  emerald: '#10B981',
  rose: '#F43F5E',
  amber: '#F59E0B',
  slateMuted: '#64748B',
  slateText: '#94A3B8',
  slateLight: '#E2E8F0',
  gridLine: 'rgba(148, 163, 184, 0.10)',
  tooltipBg: 'rgba(9, 14, 26, 0.95)',
  tooltipBorder: 'rgba(56, 189, 248, 0.30)',
};

export const ECHARTS_DARK_TOOLTIP = {
  backgroundColor: CHART_COLORS.tooltipBg,
  borderColor: CHART_COLORS.tooltipBorder,
  borderWidth: 1,
  textStyle: {
    color: '#F1F5F9',
    fontSize: 12,
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  extraCssText: 'backdrop-filter: blur(12px); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.55); padding: 10px 14px;',
};

export const NIVO_DARK_THEME = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: '#94A3B8',
    fontFamily: 'Inter, sans-serif',
  },
  axis: {
    domain: {
      line: {
        stroke: 'rgba(148, 163, 184, 0.2)',
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: '#CBD5E1',
        fontWeight: 600,
      },
    },
    ticks: {
      line: {
        stroke: 'rgba(148, 163, 184, 0.2)',
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: '#94A3B8',
      },
    },
  },
  grid: {
    line: {
      stroke: 'rgba(148, 163, 184, 0.12)',
      strokeWidth: 1,
    },
  },
  tooltip: {
    container: {
      background: '#090E1A',
      color: '#F8FAFC',
      fontSize: 12,
      borderRadius: '10px',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
    },
  },
};

export function formatUSD(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatCompactUSD(val: number): string {
  if (Math.abs(val) >= 1000) {
    return `$${(val / 1000).toFixed(0)}k`;
  }
  return `$${val.toFixed(0)}`;
}
