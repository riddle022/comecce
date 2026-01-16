import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardKPIs {
  faturamento_bruto: number;
  faturamento_liquido: number;
  total_vendas: number;
  ticket_medio: number;
  desconto_total: number;
  itens_vendidos: number;
}

export interface TendenciaItem {
  data: string;
  valor_bruto: number;
  valor_liquido: number;
}

export interface TopVendedor {
  vendedor: string;
  valor: number;
  vendas: number;
}

export interface FormaPagamento {
  forma: string;
  valor: number;
  porcentagem: number;
}

export interface ResumoOS {
  os_nao_entregues: number;
  os_entregues: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  tendencia: TendenciaItem[];
  top_vendedores: TopVendedor[];
  formas_pagamento: FormaPagamento[];
  resumo_os: ResumoOS;
}

interface UseDashboardDataParams {
  dataInicio: string;
  dataFim: string;
  empresaIds: string[];
}

export const useDashboardData = ({ dataInicio, dataFim, empresaIds }: UseDashboardDataParams) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!dataInicio || !dataFim || empresaIds.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase.rpc('get_dashboard_consolidado', {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_empresa_ids: empresaIds
        });

        if (rpcError) {
          console.error('Dashboard RPC Error:', rpcError);
          setError(rpcError.message);
          return;
        }

        setData(result as DashboardData);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dataInicio, dataFim, JSON.stringify(empresaIds)]);

  return { data, loading, error };
};
