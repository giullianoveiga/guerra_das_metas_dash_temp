'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GuerraLayoutWrapper } from '@/components/guerra/GuerraLayoutWrapper';
import { useTVMode } from '@/contexts/TVModeContext';
import { cn } from '@/lib/guerra-utils';
import { 
  Save, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Database, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X
} from 'lucide-react';

interface Sector {
  id: number;
  name: string;
}

interface Indicator {
  id: string;
  name: string;
  realized: string;
  efficiency: string;
}

interface SectorData {
  sectorId: number;
  sectorName: string;
  indicators: Indicator[];
  hasAtendimento: boolean;
  atendimento: {
    note: string;
    efficiency: string;
  };
  average: number;
}

// Gera ID único para indicadores
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Converte percentual brasileiro para número
function parseEff(text: string): number {
  if (!text || text.trim() === '') return 0;
  return parseFloat(text.replace('%', '').replace(',', '.')) || 0;
}

// Formata número para padrão brasileiro
function formatEff(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

// Cria indicador vazio
function createEmptyIndicator(): Indicator {
  return {
    id: generateId(),
    name: '',
    realized: '',
    efficiency: ''
  };
}

export default function SettingsPage() {
  const { isTVMode } = useTVMode();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Set<number>>(new Set());

  // Dados do formulário
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  // Calcula média de um setor - divide pela quantidade de indicadores COM NOME (não pelos preenchidos)
  const calculateAverage = useCallback((data: SectorData): number => {
    // Só conta indicadores que têm nome definido
    const indicators = data.indicators.filter(ind => ind.name.trim() !== '');
    const indicatorCount = data.hasAtendimento ? indicators.length + 1 : indicators.length;
    
    if (indicatorCount === 0) return 0;
    
    // Pegar percentuais dos indicadores (0 se vazio)
    const percentuais: number[] = indicators.map(ind => {
      if (ind.efficiency && ind.efficiency.trim() !== '') {
        return parseEff(ind.efficiency);
      }
      return 0;  // Vazio conta como 0
    });

    // Incluir atendimento se existir
    if (data.hasAtendimento) {
      if (data.atendimento.efficiency && data.atendimento.efficiency.trim() !== '') {
        percentuais.push(parseEff(data.atendimento.efficiency));
      } else {
        percentuais.push(0);  // Vazio conta como 0
      }
    }

    const sum = percentuais.reduce((a, b) => a + b, 0);
    return sum / indicatorCount;
  }, []);

  useEffect(() => {
    loadSectors();
  }, []);

  // Carregar dados quando mudar ano/mês ou sectores
  useEffect(() => {
    if (sectors.length > 0) {
      loadIndicators();
    }
  }, [sectors, year, month]);

  async function loadSectors() {
    try {
      const res = await fetch('/api/sectors');
      const data = await res.json();
      if (data.sectors) {
        setSectors(data.sectors);
        // Expande todos por padrão
        const allIds = new Set(data.sectors.map((s: Sector) => s.id));
        setExpandedSectors(allIds);
      }
    } catch (err) {
      console.error('Failed to load sectors:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadIndicators() {
    try {
      const res = await fetch(`/api/settings/indicators?year=${year}&month=${month}`);
      const result = await res.json();
      
      console.log('[DEBUG] loadIndicators result:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        // Mapear dados do banco para formato da UI
        console.log('[DEBUG] result.data[0]:', JSON.stringify(result.data[0]));

        const newData: SectorData[] = sectors.map(s => {
          // Buscar dados do setor no resultado da API
          const existing = result.data.find((d: any) => d.sectorId === s.id || d.sector_id === s.id);

          console.log('[DEBUG] Sector:', s.name, 'existing:', existing ? { id: existing.sectorId, indicators: existing.indicators?.length, average: existing.average } : 'null');
          
          if (existing) {
            // API retorna 'indicators' direto, não 'indicators_json'
            const indicatorsFromDb = existing.indicators || (existing.indicators_json ? JSON.parse(existing.indicators_json || '[]') : []);
            const hasAtend = existing.hasAtendimento === 1 || existing.hasAtendimento === true;

            console.log('[DEBUG] indicatorsFromDb:', indicatorsFromDb);

            return {
              sectorId: s.id,
              sectorName: s.name,
              indicators: indicatorsFromDb.length > 0 ? indicatorsFromDb : [createEmptyIndicator(), createEmptyIndicator(), createEmptyIndicator()],
              hasAtendimento: hasAtend,
              atendimento: existing.atendimento || { note: '', efficiency: '' },
              average: existing.average || 0
            };
          }
          
          // Setor sem dados no banco - criar estrutura vazia
          return {
            sectorId: s.id,
            sectorName: s.name,
            indicators: [createEmptyIndicator(), createEmptyIndicator(), createEmptyIndicator()],
            hasAtendimento: false,
            atendimento: { note: '', efficiency: '' },
            average: 0
          };
        });
        
        setSectorData(newData);
      } else {
        // Sem dados - criar estrutura vazia
        const newData: SectorData[] = sectors.map(s => ({
          sectorId: s.id,
          sectorName: s.name,
          indicators: [createEmptyIndicator(), createEmptyIndicator(), createEmptyIndicator()],
          hasAtendimento: false,
          atendimento: { note: '', efficiency: '' },
          average: 0
        }));
        
        setSectorData(newData);
      }
    } catch (err) {
      console.error('[DEBUG] Failed to load indicators:', err);
      // Criar estrutura vazia em caso de erro
      const newData: SectorData[] = sectors.map(s => ({
        sectorId: s.id,
        sectorName: s.name,
        indicators: [createEmptyIndicator(), createEmptyIndicator(), createEmptyIndicator()],
        hasAtendimento: false,
        atendimento: { note: '', efficiency: '' },
        average: 0
      }));
      setSectorData(newData);
    }
  }

  function toggleSector(sectorId: number) {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorId)) {
        next.delete(sectorId);
      } else {
        next.add(sectorId);
      }
      return next;
    });
  }

  function updateIndicator(sectorId: number, indicatorId: string, field: keyof Indicator, value: string) {
    setSectorData(prev => prev.map(sector => {
      if (sector.sectorId !== sectorId) return sector;
      
      const newIndicators = sector.indicators.map(ind => 
        ind.id === indicatorId ? { ...ind, [field]: value } : ind
      );
      
      // Recalcular média
      const average = calculateAverage({
        ...sector,
        indicators: newIndicators
      });
      
      return {
        ...sector,
        indicators: newIndicators,
        average
      };
    }));
  }

  function addIndicator(sectorId: number) {
    setSectorData(prev => prev.map(sector => {
      if (sector.sectorId !== sectorId) return sector;
      if (sector.indicators.length >= 6) return sector;
      
      return {
        ...sector,
        indicators: [...sector.indicators, createEmptyIndicator()],
        average: calculateAverage({
          ...sector,
          indicators: [...sector.indicators, createEmptyIndicator()]
        })
      };
    }));
  }

  function removeIndicator(sectorId: number, indicatorId: string) {
    setSectorData(prev => prev.map(sector => {
      if (sector.sectorId !== sectorId) return sector;
      if (sector.indicators.length <= 1) return sector;
      
      const newIndicators = sector.indicators.filter(ind => ind.id !== indicatorId);
      
      return {
        ...sector,
        indicators: newIndicators,
        average: calculateAverage({
          ...sector,
          indicators: newIndicators
        })
      };
    }));
  }

  function updateAtendimento(sectorId: number, field: 'note' | 'efficiency', value: string) {
    setSectorData(prev => prev.map(sector => {
      if (sector.sectorId !== sectorId) return sector;
      
      const newAtendimento = { ...sector.atendimento, [field]: value };
      
      return {
        ...sector,
        atendimento: newAtendimento,
        average: calculateAverage({
          ...sector,
          atendimento: newAtendimento
        })
      };
    }));
  }

  function toggleAtendimento(sectorId: number) {
    setSectorData(prev => prev.map(sector => {
      if (sector.sectorId !== sectorId) return sector;
      
      const newHas = !sector.hasAtendimento;
      
      return {
        ...sector,
        hasAtendimento: newHas,
        average: calculateAverage({
          ...sector,
          hasAtendimento: newHas
        })
      };
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      // Debug: verificar dados antes de enviar
      const sectorsPayload = sectorData.map(s => ({
        sectorId: s.sectorId,
        indicators: s.indicators.filter(ind => ind.name.trim() !== ''),
        hasAtendimento: s.hasAtendimento,
        atendimento: s.atendimento || { note: '', efficiency: '' }
      }));

      console.log('[handleSave] Enviando:', { year, month, sectorsPayload });

      const res = await fetch('/api/settings/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          sectors: sectorsPayload
        })
      });

      const result = await res.json();

      console.log('[handleSave] Resposta:', result);

      if (result.success) {
        setMessage({ type: 'success', text: 'Dados salvos com sucesso!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao salvar dados' });
      }
    } catch (err) {
      console.error('[handleSave] Erro:', err);
      setMessage({ type: 'error', text: 'Erro ao salvar dados' });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAll() {
    if (!confirm('Tem certeza que deseja limpar TODOS os dados de indicadores? Esta ação não pode ser desfeita.')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Limpar dados - enviar array vazio
      const res = await fetch('/api/settings/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          sectors: sectors.map(s => ({
            sectorId: s.id,
            indicators: [],
            hasAtendimento: false,
            atendimento: { note: '', efficiency: '' }
          }))
        })
      });

      const result = await res.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Todos os dados foram removidos!' });
        // Recarregar dados
        await loadIndicators();
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao limpar dados' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao limpar dados' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GuerraLayoutWrapper>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </GuerraLayoutWrapper>
    );
  }

  return (
    <GuerraLayoutWrapper>
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-end gap-6",
        isTVMode ? "mb-4" : "mb-12"
      )}>
        <div>
          <h1 className={cn(
            "font-headline font-black tracking-tighter text-foreground leading-none",
            isTVMode ? "text-3xl" : "text-5xl md:text-6xl"
          )}>
            Configurações <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">e Indicadores</span>
          </h1>
          <p className={cn(
            "text-foreground/60 font-label uppercase tracking-widest mt-2",
            isTVMode ? "text-xs" : "text-sm"
          )}>
            Cadastre os indicadores e eficiências de cada setor
          </p>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-xl mb-6 border",
          message.type === 'success' 
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-label uppercase tracking-widest">{message.text}</span>
        </div>
      )}

      {/* Seletor de período */}
      <div className={cn(
        "bg-white/5 border border-white/10 rounded-2xl p-6 mb-6",
        isTVMode ? "p-4" : ""
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-lg text-foreground">Período de Referência</h2>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-[10px] font-label text-foreground/60 uppercase tracking-widest mb-2">
              Ano
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-label text-foreground/60 uppercase tracking-widest mb-2">
              Mês
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary min-w-[150px]"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de setores com indicadores */}
      <div className="space-y-4 mb-6">
        {sectorData.map((sector) => {
          const isExpanded = expandedSectors.has(sector.sectorId);
          const averageStr = sector.average > 0 ? `${formatEff(sector.average)}%` : '-';
          
          return (
            <div 
              key={sector.sectorId}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Header do setor */}
              <button
                onClick={() => toggleSector(sector.sectorId)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-foreground/40" />
                  )}
                  <h3 className="font-headline font-bold text-lg text-foreground text-left">
                    {sector.sectorName}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] font-label text-foreground/60 uppercase tracking-widest block">
                      Média
                    </span>
                    <span className={cn(
                      "font-headline font-bold text-xl",
                      sector.average >= 100 ? "text-green-400" :
                      sector.average >= 80 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {averageStr}
                    </span>
                  </div>
                </div>
              </button>

              {/* Corpo do setor - indicadores */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/10">
                  {/* Table header */}
                  <div className="grid grid-cols-[2fr,2fr,1.5fr,40px] gap-3 py-3 text-[10px] font-label text-foreground/60 uppercase tracking-widest border-b border-white/10 mb-3">
                    <div>Indicador</div>
                    <div>Realizado</div>
                    <div>Eficiência</div>
                    <div></div>
                  </div>

                  {/* Indicadores */}
                  {sector.indicators.map((indicator, idx) => (
                    <div 
                      key={indicator.id}
                      className="grid grid-cols-[2fr,2fr,1.5fr,40px] gap-3 py-2 items-center"
                    >
                      <input
                        type="text"
                        value={indicator.name}
                        onChange={(e) => updateIndicator(sector.sectorId, indicator.id, 'name', e.target.value)}
                        className="bg-background border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-sm"
                        placeholder={`Indicador ${idx + 1}`}
                      />
                      <input
                        type="text"
                        value={indicator.realized}
                        onChange={(e) => updateIndicator(sector.sectorId, indicator.id, 'realized', e.target.value)}
                        className="bg-background border border-white/10 rounded-lg px-3 py-2 text-right text-foreground focus:outline-none focus:border-primary text-sm"
                        placeholder="0"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          value={indicator.efficiency}
                          onChange={(e) => updateIndicator(sector.sectorId, indicator.id, 'efficiency', e.target.value)}
                          className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 pr-8 text-right text-foreground focus:outline-none focus:border-primary text-sm"
                          placeholder="0,00%"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 text-sm">%</span>
                      </div>
                      <button
                        onClick={() => removeIndicator(sector.sectorId, indicator.id)}
                        disabled={sector.indicators.length <= 1}
                        className="p-2 text-foreground/40 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Adicionar indicador */}
                  {sector.indicators.length < 6 && (
                    <button
                      onClick={() => addIndicator(sector.sectorId)}
                      className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-label uppercase tracking-widest mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar indicador
                    </button>
                  )}

                  {/* Atendimento */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sector.hasAtendimento}
                        onChange={() => toggleAtendimento(sector.sectorId)}
                        className="w-4 h-4 rounded border-white/20 bg-background text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-label text-foreground/80 uppercase tracking-widest">
                        Incluir Atendimento
                      </span>
                    </label>

                    {sector.hasAtendimento && (
                      <div className="grid grid-cols-[2fr,2fr,1.5fr] gap-3 mt-3">
                        <input
                          type="text"
                          value={sector.atendimento.note}
                          onChange={(e) => updateAtendimento(sector.sectorId, 'note', e.target.value)}
                          className="bg-background border border-white/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-sm"
                          placeholder="Nota (ex: 4,3)"
                        />
                        <div></div>
                        <div className="relative">
                          <input
                            type="text"
                            value={sector.atendimento.efficiency}
                            onChange={(e) => updateAtendimento(sector.sectorId, 'efficiency', e.target.value)}
                            className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 pr-8 text-right text-foreground focus:outline-none focus:border-primary text-sm"
                            placeholder="0,00%"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 text-sm">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-widest transition-all"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Dados
        </button>

        <button
          onClick={handleClearAll}
          disabled={saving}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-widest transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Todos os Dados
        </button>
      </div>

      {/* Info */}
      <div className={cn(
        "mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl",
        isTVMode ? "text-xs" : "text-sm"
      )}>
        <p className="text-blue-400 font-label uppercase tracking-widest">
          <strong>Como funciona:</strong> Preencha o nome, valor realizado e percentual 
          de eficiência de cada indicador. A média é calculada automaticamente. 
          O percentual deve usar vírgula como separador decimal (ex: 54,22%).
        </p>
      </div>
    </GuerraLayoutWrapper>
  );
}