import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalFilters } from '../../contexts/GlobalFiltersContext';
import { useFluxoCaixaData } from '../../hooks/useFluxoCaixaData';
import { useViewMode } from '../../hooks/useViewMode';
import { LinhaRelatorio } from '../../types/financeiro';
import { buildRelatorio } from '../../utils/buildRelatorio';
import { FilterPanel } from '../Common/FilterPanel';
import { translateMonth } from '../Financeiro/formatters';
import { FinanceiroTable } from '../Financeiro/FinanceiroTable/FinanceiroTable';
import { FluxoCaixaChart } from './FluxoCaixaChart';
import { FluxoCaixaKpis } from './FluxoCaixaKpis';
import { useFluxoCaixaKpis } from './useFluxoCaixaKpis';

export const FluxoCaixaPage: React.FC = () => {
  const { filters } = useGlobalFilters();

  const [dateRange, setDateRange] = useState({
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim,
  });
  const [empresaIds, setEmpresaIds] = useState<string[]>(filters.empresaIds);

  const { dadosMensais, dadosDiarios, isLoading, error, buscarDiario } = useFluxoCaixaData({
    dataInicio: dateRange.dataInicio,
    dataFim: dateRange.dataFim,
    empresaIds,
  });

  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([]);
  const [meses, setMeses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useViewMode();
  const [expandedDaily, setExpandedDaily] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (dadosMensais.length > 0) {
      const { linhas: l, meses: m } = buildRelatorio(dadosMensais);
      setLinhas(l);
      setMeses(m);
    } else {
      setLinhas([]);
      setMeses([]);
    }
    setExpandedDaily({});
  }, [dadosMensais]);

  const toggleLinha = useCallback((idx: number) => {
    setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, expandido: !l.expandido } : l));
  }, []);

  const handleDrillDown = useCallback((codigo: string) => {
    setExpandedDaily(prev => {
      const next = { ...prev, [codigo]: !prev[codigo] };
      if (next[codigo]) buscarDiario(codigo);
      return next;
    });
  }, [buscarDiario]);

  const mesLabels = useMemo(() =>
    dadosMensais.reduce<Record<string, string>>((acc, d) => {
      acc[d.ano_mes] = translateMonth(d.mes_label);
      return acc;
    }, {}),
    [dadosMensais]
  );

  const kpis = useFluxoCaixaKpis(linhas, meses);

  return (
    <div className="space-y-4">
      <FilterPanel
        onDateRangeChange={r => setDateRange({ dataInicio: r.dataInicio, dataFim: r.dataFim })}
        onEmpresasChange={setEmpresaIds}
        initialDateRange={dateRange}
      />

      <FluxoCaixaKpis kpis={kpis} />

      {!isLoading && linhas.length > 0 && (
        <FluxoCaixaChart linhas={linhas} meses={meses} mesLabels={mesLabels} />
      )}

      <FinanceiroTable
        title="Fluxo de Caixa"
        subtitle="Movimentação mensal"
        linhas={linhas}
        meses={meses}
        mesLabels={mesLabels}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToggle={toggleLinha}
        isLoading={isLoading}
        error={error}
        onDrillDown={handleDrillDown}
        dailyData={dadosDiarios}
        expandedDaily={expandedDaily}
      />
    </div>
  );
};
