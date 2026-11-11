import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface MacrosDonutChartProps {
  consumedProteinG: number;
  targetProteinG: number;
  consumedCarbsG: number;
  targetCarbsG: number;
  consumedFatG: number;
  targetFatG: number;
  consumedCalories: number;
  targetCalories: number;
}

interface MacroSlice {
  name: string;
  consumed: number;
  target: number;
  value: number;
  color: string;
  bgBadge: string;
  textBadge: string;
  kcalPerGram: number;
}

export const MacrosDonutChart: React.FC<MacrosDonutChartProps> = ({
  consumedProteinG,
  targetProteinG,
  consumedCarbsG,
  targetCarbsG,
  consumedFatG,
  targetFatG,
  consumedCalories,
  targetCalories,
}) => {
  const macros: MacroSlice[] = [
    {
      name: 'Proteínas',
      consumed: Math.round(consumedProteinG * 10) / 10,
      target: Math.max(1, Math.round(targetProteinG)),
      value: Math.max(0, Math.round(consumedProteinG * 10) / 10),
      color: '#2563EB', // Crisp Cobalt / Sky Blue
      bgBadge: 'bg-[#8AC4F2]/35',
      textBadge: 'text-[#0A468E]',
      kcalPerGram: 4,
    },
    {
      name: 'Carboidratos',
      consumed: Math.round(consumedCarbsG * 10) / 10,
      target: Math.max(1, Math.round(targetCarbsG)),
      value: Math.max(0, Math.round(consumedCarbsG * 10) / 10),
      color: '#9333EA', // Orchid Purple
      bgBadge: 'bg-[#DDA3E6]/35',
      textBadge: 'text-[#582B5E]',
      kcalPerGram: 4,
    },
    {
      name: 'Gorduras',
      consumed: Math.round(consumedFatG * 10) / 10,
      target: Math.max(1, Math.round(targetFatG)),
      value: Math.max(0, Math.round(consumedFatG * 10) / 10),
      color: '#D97706', // Warm Amber / Sand
      bgBadge: 'bg-[#F3E3CA]',
      textBadge: 'text-[#78350F]',
      kcalPerGram: 9,
    },
  ];

  const totalConsumedGrams = macros.reduce((acc, m) => acc + m.consumed, 0);
  const totalTargetGrams = macros.reduce((acc, m) => acc + m.target, 0);
  const overallMacroPct = Math.min(
    100,
    Math.round((totalConsumedGrams / Math.max(1, totalTargetGrams)) * 100)
  );

  // Outer ring data: actual consumed macros (plus remaining placeholder if below target)
  const remainingTotalGrams = Math.max(0, Math.round((totalTargetGrams - totalConsumedGrams) * 10) / 10);
  const outerRingData =
    totalConsumedGrams > 0
      ? [
          ...macros.map((m) => ({
            name: `${m.name} (Atual)`,
            macroName: m.name,
            value: m.value,
            consumed: m.consumed,
            target: m.target,
            color: m.color,
            isRemaining: false,
          })),
          ...(remainingTotalGrams > 0
            ? [
                {
                  name: 'Restante p/ Meta',
                  macroName: 'Restante da Meta',
                  value: remainingTotalGrams,
                  consumed: totalConsumedGrams,
                  target: totalTargetGrams,
                  color: '#E2E8F0',
                  isRemaining: true,
                },
              ]
            : []),
        ]
      : [
          {
            name: 'Aguardando Refeições',
            macroName: 'Meta Total',
            value: totalTargetGrams || 100,
            consumed: 0,
            target: totalTargetGrams,
            color: '#E2E8F0',
            isRemaining: true,
          },
        ];

  // Inner ring data: target distribution
  const innerRingData = macros.map((m) => ({
    name: `${m.name} (Meta)`,
    macroName: m.name,
    value: m.target,
    consumed: m.consumed,
    target: m.target,
    color: m.color,
    isTargetRing: true,
  }));

  return (
    <div className="rounded-[26px] bg-slate-50 border border-slate-200/80 p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
            COMPARATIVO DE MACRONUTRIENTES · CONSUMO VS META
          </span>
          <h4 className="text-sm font-display font-bold text-[#1B1C20]">
            Distribuição de Proteínas, Carboidratos e Gorduras
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block" />
            Anel Externo: <strong>Atual</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]/55 inline-block" />
            Anel Interno: <strong>Meta</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Donut Chart Column */}
        <div className="sm:col-span-5 relative h-44 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Inner Ring: Target Macro Proportions */}
              <Pie
                data={innerRingData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={48}
                paddingAngle={2}
                stroke="none"
              >
                {innerRingData.map((entry, index) => (
                  <Cell
                    key={`inner-${index}`}
                    fill={entry.color}
                    fillOpacity={0.35}
                  />
                ))}
              </Pie>

              {/* Outer Ring: Consumed vs Remaining */}
              <Pie
                data={outerRingData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={74}
                paddingAngle={2}
                cornerRadius={5}
                stroke="none"
              >
                {outerRingData.map((entry, index) => (
                  <Cell key={`outer-${index}`} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                formatter={(_value: unknown, _name: unknown, item: { payload?: { macroName?: string; consumed?: number; target?: number; isRemaining?: boolean } }) => {
                  const p = item?.payload;
                  if (!p) return ['', ''];
                  if (p.isRemaining) {
                    return [`Faltam ${Math.max(0, (p.target ?? 0) - (p.consumed ?? 0)).toFixed(0)}g no total`, p.macroName || 'Meta'];
                  }
                  const pct = Math.round(((p.consumed ?? 0) / Math.max(1, p.target ?? 1)) * 100);
                  return [`${p.consumed}g / ${p.target}g (${pct}%)`, p.macroName || ''];
                }}
                contentStyle={{
                  backgroundColor: '#1B1C20',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  padding: '8px 12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                }}
                itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-base font-mono tabular-nums font-bold text-[#1B1C20] leading-none">
              {overallMacroPct}%
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
              da Meta
            </span>
          </div>
        </div>

        {/* Macro Comparison Cards Column */}
        <div className="sm:col-span-7 space-y-2.5">
          {macros.map((m) => {
            const pct = Math.min(100, Math.round((m.consumed / m.target) * 100));
            const rawPct = Math.round((m.consumed / m.target) * 100);
            const diff = Math.round((m.target - m.consumed) * 10) / 10;
            const isMet = diff <= 0;

            return (
              <div
                key={m.name}
                className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="font-bold text-[#1B1C20]">{m.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${m.bgBadge} ${m.textBadge}`}
                    >
                      {rawPct}%
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-xs">
                    <span className="font-bold text-[#1B1C20]">{m.consumed}g</span>
                    <span className="text-slate-400"> / {m.target}g</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>{Math.round(m.consumed * m.kcalPerGram)} kcal ingeridas</span>
                  <span className={isMet ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                    {isMet
                      ? `Meta batida (+${Math.abs(diff)}g)`
                      : `Faltam ${diff}g`}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between px-1 pt-0.5 text-[11px] text-slate-500">
            <span>Calorias Totais das Refeições:</span>
            <span className="font-mono tabular-nums font-bold text-[#1B1C20]">
              {consumedCalories} / {targetCalories} kcal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
