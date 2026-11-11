import React, { useState } from 'react';
import { WeightEntry } from '../types';
import { WeightForecastAnalysis, addDaysISO, formatDateISO } from '../utils/metabolic';

interface WeightEvolutionChartProps {
  weights: WeightEntry[];
  targetWeightKg: number;
  forecast: WeightForecastAnalysis;
  selectedHorizon?: 30 | 60 | 90;
  onSelectHorizon?: (horizon: 30 | 60 | 90) => void;
}

export const BrandWaveMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 23C9.5 14 14.5 9.5 18 9.5C21.5 9.5 26.5 14 32 23"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M7 27.5C11.5 20 15.2 16.2 18 16.2C20.8 16.2 24.5 20 29 27.5"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M11.5 31C14.2 26.2 16.4 23.5 18 23.5C19.6 23.5 21.8 26.2 24.5 31"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

export const WeightEvolutionChart: React.FC<WeightEvolutionChartProps> = ({
  weights,
  targetWeightKg,
  forecast,
  selectedHorizon: controlledHorizon,
  onSelectHorizon,
}) => {
  const [mode, setMode] = useState<'curve' | 'blocks'>('curve');
  const [internalHorizon, setInternalHorizon] = useState<30 | 60 | 90>(90);

  const horizon = controlledHorizon ?? internalHorizon;
  const handleHorizonChange = (h: 30 | 60 | 90) => {
    setInternalHorizon(h);
    onSelectHorizon?.(h);
  };

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const recentWeights = sorted.slice(-4);

  const todayISO = formatDateISO();
  const future30ISO = addDaysISO(todayISO, 30);
  const future60ISO = addDaysISO(todayISO, 60);
  const future90ISO = addDaysISO(todayISO, 90);

  const actualPoints =
    recentWeights.length > 0
      ? recentWeights.map((w) => ({
          date: w.date,
          label: w.date.slice(8, 10) + '/' + w.date.slice(5, 7),
          weight: w.weightKg,
          type: 'actual' as const,
        }))
      : [
          {
            date: todayISO,
            label: 'Hoje',
            weight: forecast.latestWeightKg,
            type: 'actual' as const,
          },
        ];

  const horizonProjectedKg =
    horizon === 30
      ? forecast.projected30DaysPlannedKg
      : horizon === 60
      ? forecast.projected60DaysPlannedKg
      : forecast.projected90DaysPlannedKg;

  // Build 5 columns for the Lavender Block Matrix
  const blockColumns = [
    {
      header: actualPoints[0]?.label || 'Início',
      valueLabel: `${(actualPoints[0]?.weight ?? forecast.startingWeightKg).toFixed(1)}`,
      blocks: 3,
      waveIndex: -1,
    },
    {
      header: actualPoints.length > 1 ? actualPoints[actualPoints.length - 1].label : 'Hoje',
      valueLabel: `${forecast.latestWeightKg.toFixed(1)}`,
      blocks: 4,
      waveIndex: -1,
    },
    {
      header: '+30d',
      valueLabel: `${forecast.projected30DaysPlannedKg.toFixed(1)}`,
      blocks: horizon === 30 ? 5 : 3,
      waveIndex: horizon === 30 ? 2 : -1,
    },
    {
      header: horizon === 90 ? '+90d' : '+60d',
      valueLabel: `${(horizon === 90
        ? forecast.projected90DaysPlannedKg
        : forecast.projected60DaysPlannedKg
      ).toFixed(1)}`,
      blocks: horizon >= 60 ? 5 : 4,
      waveIndex: horizon >= 60 ? 2 : -1,
    },
    {
      header: 'Meta',
      valueLabel: `${targetWeightKg.toFixed(1)}`,
      blocks: 3,
      waveIndex: -1,
    },
  ];

  // Build projected milestones based on selected horizon (30, 60, or 90 days)
  const projectedMilestones = [
    {
      date: future30ISO,
      label: '+30d',
      weight: forecast.projected30DaysPlannedKg,
    },
    ...(horizon >= 60
      ? [
          {
            date: future60ISO,
            label: '+60d',
            weight: forecast.projected60DaysPlannedKg,
          },
        ]
      : []),
    ...(horizon === 90
      ? [
          {
            date: future90ISO,
            label: '+90d',
            weight: forecast.projected90DaysPlannedKg,
          },
        ]
      : []),
  ];

  // SVG Curve coordinates
  const allValues = [
    ...actualPoints.map((p) => p.weight),
    ...projectedMilestones.map((p) => p.weight),
    targetWeightKg,
  ];

  const minVal = Math.floor(Math.min(...allValues) - 2);
  const maxVal = Math.ceil(Math.max(...allValues) + 2);
  const range = Math.max(4, maxVal - minVal);

  const width = 560;
  const height = 215;
  const padLeft = 42;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const totalSlots = actualPoints.length + projectedMilestones.length;
  const getX = (index: number) => {
    if (totalSlots <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (totalSlots - 1)) * plotW;
  };
  const getY = (val: number) => padTop + plotH - ((val - minVal) / range) * plotH;

  const actualCoords = actualPoints.map((pt, idx) => ({
    ...pt,
    x: getX(idx),
    y: getY(pt.weight),
  }));

  const projCoords = [
    actualCoords[actualCoords.length - 1],
    ...projectedMilestones.map((m, idx) => ({
      ...m,
      x: getX(actualPoints.length + idx),
      y: getY(m.weight),
    })),
  ];

  const actualPath = actualCoords
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const projPath = projCoords
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const targetY = getY(targetWeightKg);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        {/* Horizon Toggle: 30, 60, 90 days */}
        <div className="flex items-center gap-1 bg-white/50 p-1 rounded-full">
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => handleHorizonChange(days)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all ${
                horizon === days
                  ? 'bg-[#582B5E] text-white shadow-xs'
                  : 'text-[#3B1940]/80 hover:bg-white/60'
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-[#3B1940] hidden sm:inline">
            Projeção +{horizon}d: {horizonProjectedKg.toFixed(1)} kg
          </span>
          <button
            type="button"
            onClick={() => setMode(mode === 'blocks' ? 'curve' : 'blocks')}
            className="px-3 py-1 rounded-full bg-white/80 hover:bg-white text-[#3B1940] text-[11px] font-semibold transition-colors shadow-2xs whitespace-nowrap shrink-0"
          >
            {mode === 'blocks' ? 'Ver Curva Linear' : 'Ver Blocos'}
          </button>
        </div>
      </div>

      {mode === 'blocks' ? (
        <div className="w-full pt-1 pb-2">
          {/* Column Period Headers */}
          <div className="grid grid-cols-5 gap-2 text-center mb-3">
            {blockColumns.map((col, idx) => (
              <div
                key={idx}
                className="text-[11px] font-semibold text-[#3B1940]/80 tracking-tight"
              >
                {col.header}
              </div>
            ))}
          </div>

          {/* 5-Row Matrix of Rounded Blocks */}
          <div className="grid grid-cols-5 gap-2 items-end h-48">
            {blockColumns.map((col, colIdx) => {
              return (
                <div key={colIdx} className="flex flex-col justify-end gap-1.5 h-full">
                  {Array.from({ length: col.blocks }).map((_, bIdx) => {
                    const isTopBlock = bIdx === 0;
                    const isWaveCenter = col.waveIndex !== -1 && isTopBlock;

                    if (isWaveCenter) {
                      return (
                        <div
                          key={bIdx}
                          className="h-9 rounded-[14px] border border-[#582B5E]/40 bg-[#582B5E]/15 flex items-center justify-center text-[#582B5E]"
                          title={`Projeção: ${col.valueLabel} kg`}
                        >
                          <BrandWaveMark className="w-6 h-6" />
                        </div>
                      );
                    }

                    if (isTopBlock) {
                      return (
                        <div
                          key={bIdx}
                          className="h-9 rounded-[14px] bg-[#582B5E] text-white flex items-center justify-center font-mono tabular-nums text-xs font-semibold shadow-xs"
                        >
                          {col.valueLabel}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={bIdx}
                        className="h-8 rounded-[14px] border border-[#582B5E]/35 bg-white/10"
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-white/45 rounded-2xl p-3 border border-[#582B5E]/20">
          <div className="flex items-center justify-between text-[10px] font-medium text-[#3B1940]/80 mb-1 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#1B1C20] inline-block" /> Pesagens Reais
              <span className="w-2.5 h-0.5 bg-[#582B5E] border-b border-dashed border-[#582B5E] inline-block ml-2" />{' '}
              Projeção Wishnofsky (7.700 kcal/kg)
            </span>
            <span className="font-mono font-bold">Horizonte: {horizon}d</span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-44 select-none overflow-visible"
            role="img"
            aria-label="Gráfico de evolução de peso real e projetado"
          >
            <line
              x1={padLeft}
              y1={targetY}
              x2={width - padRight}
              y2={targetY}
              stroke="#582B5E"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={width - padRight - 4}
              y={targetY - 6}
              textAnchor="end"
              className="fill-[#582B5E] font-mono text-[10px] font-semibold"
            >
              Meta {targetWeightKg.toFixed(1)} kg
            </text>

            <path
              d={projPath}
              fill="none"
              stroke="#582B5E"
              strokeWidth="2.5"
              strokeDasharray="5 5"
            />
            <path
              d={actualPath}
              fill="none"
              stroke="#1B1C20"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {actualCoords.map((pt, idx) => (
              <g key={`actual-${idx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  className="fill-[#1B1C20] stroke-white"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  className="fill-[#1B1C20] font-mono text-[10px] font-bold"
                >
                  {pt.weight.toFixed(1)}
                </text>
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[#3B1940] font-mono text-[10px]"
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {projCoords.slice(1).map((pt, idx) => (
              <g key={`proj-${idx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  className="fill-[#582B5E] stroke-white"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  className="fill-[#582B5E] font-mono text-[10px] font-bold"
                >
                  {pt.weight.toFixed(1)}
                </text>
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-[#582B5E] font-mono text-[10px] font-semibold"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
