'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LeaderboardEntry } from '@/lib/guerra-data/sectors';
import { formatPercent } from '@/lib/guerra-utils';
import { useTVMode } from '@/contexts/TVModeContext';

interface TvModeChartProps {
  entries: LeaderboardEntry[];
  dataKey?: 'eff' | 'points';
  title?: string;
  subtitle?: string;
  colorByEfficiency?: boolean;
}

interface ChartDataItem {
  name: string;
  fullName: string;
  baseValue: number;
  value: number;
  rank: number;
  rawEfficiency: number;
}

export function TvModeChart({ 
  entries, 
  dataKey = 'eff', 
  title, 
  subtitle,
  colorByEfficiency = true 
}: TvModeChartProps) {
  const { isTVMode } = useTVMode();
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  
  if (!isTVMode) return null;

  const chartConfig: ChartConfig = {
    efficiency: {
      label: dataKey === 'eff' ? 'Eficiência' : 'Pontos',
      color: 'hsl(var(--primary))',
    },
  };

  // Preparar dados base - top 12 setores
  const baseData: ChartDataItem[] = useMemo(() => {
    return entries.slice(0, 12).map((entry) => ({
      name: entry.name.length > 15 ? entry.name.substring(0, 15) + '...' : entry.name,
      fullName: entry.name,
      baseValue: dataKey === 'eff' ? entry.eff : entry.points,
      value: dataKey === 'eff' ? entry.eff : entry.points,
      rank: entry.rank,
      rawEfficiency: entry.eff,
    }));
  }, [entries, dataKey]);

  // Inicializar valores animados
  useEffect(() => {
    if (baseData.length > 0) {
      setAnimatedValues(baseData.map(d => d.baseValue));
    }
  }, [baseData]);

  // Animação contínua das barras
  useEffect(() => {
    if (!isAnimating || baseData.length === 0) return;

    let animationId: number;
    let startTime: number = performance.now();
    const duration = 3000; // ciclo de 3 segundos
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = (elapsed % duration) / duration;
      
      setAnimatedValues(prevValues => {
        return prevValues.map((baseValue, index) => {
          const data = baseData[index];
          if (!data) return baseValue;
          
          // Gerar onda sinusoidal com variação aleatória para cada barra
          // Cada barra tem uma fase diferente para não serem todas sincronizadas
          const phase = (index * 0.7) + (progress * Math.PI * 2);
          const wave1 = Math.sin(phase) * 0.15; // Variação de ±15%
          const wave2 = Math.sin(phase * 2.3 + 1) * 0.08; // Segunda onda
          const wave3 = Math.sin(phase * 0.5) * 0.05; // Onda lenta
          
          // Adicionar um pouco de ruído aleatório que muda lentamente
          const noisePhase = (progress * 10 + index * 2) % 100;
          const noise = Math.sin(noisePhase) * 0.03;
          
          const variation = wave1 + wave2 + wave3 + noise;
          const newValue = data.baseValue * (1 + variation);
          
          // Manter dentro de limites razoáveis
          const maxValue = dataKey === 'eff' ? 115 : data.baseValue * 1.3;
          const minValue = dataKey === 'eff' ? 50 : Math.max(data.baseValue * 0.5, 10);
          
          return Math.max(minValue, Math.min(maxValue, newValue));
        });
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [baseData, isAnimating, dataKey]);

  // Combinar dados base com valores animados
  const chartData = useMemo(() => {
    return baseData.map((item, index) => ({
      ...item,
      value: animatedValues[index] ?? item.baseValue,
    }));
  }, [baseData, animatedValues]);

  const getBarColor = (baseValue: number, rawEfficiency?: number) => {
    if (colorByEfficiency && rawEfficiency !== undefined) {
      if (rawEfficiency >= 100) return 'var(--color-secondary)';
      if (rawEfficiency > 75) return 'var(--color-primary)';
      return 'hsl(var(--destructive))';
    }
    return 'var(--color-primary)';
  };

  // Função para formatação do valor com animação suave
  const formatAnimatedValue = (value: number): string => {
    if (dataKey === 'eff') {
      return formatPercent(value);
    }
    return Math.round(value).toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-end mb-4 px-2">
        <div>
          <h3 className="text-3xl font-headline font-black text-primary tracking-tighter uppercase italic leading-none">
            {title || 'Gráfico de Desempenho'}
          </h3>
          <p className="text-foreground/40 font-label text-[10px] uppercase tracking-[0.4em] mt-1">
            {subtitle || 'Visualização em barras horizontais'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-foreground/20 font-headline font-black text-4xl uppercase leading-none">
              {entries.length} SETORES
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="w-full h-full min-h-[400px]">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              type="number" 
              domain={[0, dataKey === 'eff' ? 120 : 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 'bold' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-black/90 border border-white/20 p-3 rounded-lg shadow-xl">
                      <p className="font-headline font-bold text-white text-sm mb-1">
                        #{data.rank} - {data.fullName}
                      </p>
                      <p className="text-foreground/70 text-xs">
                        {dataKey === 'eff' ? 'Eficiência' : 'Pontos'}: {formatAnimatedValue(data.value)}
                      </p>
                      <p className="text-foreground/50 text-[10px] mt-1">
                        Base: {dataKey === 'eff' ? formatPercent(data.baseValue) : data.baseValue.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar 
              dataKey="value"
              radius={[0, 4, 4, 0]}
              barSize={24}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.baseValue, entry.rawEfficiency)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[var(--color-secondary)]" />
          <span className="text-xs text-foreground/60 font-label uppercase">≥ 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[var(--color-primary)]" />
          <span className="text-xs text-foreground/60 font-label uppercase">&gt; 75%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-destructive" />
          <span className="text-xs text-foreground/60 font-label uppercase">≤ 75%</span>
        </div>
      </div>
    </div>
  );
}
