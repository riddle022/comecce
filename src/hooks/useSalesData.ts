import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SalesKPIs {
  faturamento_bruto: number;
  faturamento_liquido: number;
  total_vendas: number;
  ticket_medio: number;
  desconto_total: number;
  itens_vendidos: number;
  margem_global: number;
  indice_desconto_medio: number;
  custo_total: number;
  lucro_bruto: number;
  margem_lucro_media: number;
}

export interface SalesTrend {
  data: string;
  valor_bruto: number;
  valor_liquido: number;
  quantidade_vendida: number;
  desconto_total: number;
  numero_vendas: number;
  custo_total: number;
}

export interface TopSeller {
  vendedor: string;
  valor: number;
  vendas: number;
}

export interface PaymentMethod {
  forma: string;
  valor: number;
  porcentagem: number;
}

export interface OSResume {
  os_abertas: number;
  os_entregues: number;
  os_em_atraso: number;
}

export interface DescontoRanking {
  vendedor: string;
  desconto_total: number;
  percentual: number;
}

export interface RecorrenciaCliente {
  cliente: string;
  qtd_compras: number;
  valor_total: number;
}

export interface SalesData {
  kpis: SalesKPIs;
  tendencia: SalesTrend[];
  top_vendedores: TopSeller[];
  formas_pagamento: PaymentMethod[];
  resumo_os: OSResume;
  ranking_descontos: DescontoRanking[];
  ranking_recorrencia: RecorrenciaCliente[];
}

interface UseSalesDataParams {
  dataInicio: string;
  dataFim: string;
  empresaIds: string[];
}

export const useSalesData = ({ dataInicio, dataFim, empresaIds }: UseSalesDataParams) => {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!empresaIds.length) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase.rpc(
          'get_dashboard_consolidado',
          {
            p_data_inicio: dataInicio,
            p_data_fim: dataFim,
            p_empresa_ids: empresaIds
          }
        );

        if (rpcError) throw rpcError;

        setData(result as SalesData);
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataInicio, dataFim, empresaIds]);

  return { data, loading, error };
};
