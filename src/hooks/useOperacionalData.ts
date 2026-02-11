import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface RankingVendedor {
  vendedor: string;
  total_os: number;
  valor_total: number;
}

export interface RankingGroup {
  grupo: string;
  total_os: number;
  valor_total: number;
}

export interface OperacionalData {
  os_nao_entregues: number;
  os_entregues: number;
  total_os: number;
  faturamento_bruto_os: number;
  ticket_medio_os: number;
  ranking_vendedores: RankingVendedor[];
  ranking_grupos: RankingGroup[];
}

interface UseOperacionalDataParams {
  dataInicio: string;
  dataFim: string;
  empresaIds: string[];
}

export const useOperacionalData = ({
  dataInicio,
  dataFim,
  empresaIds
}: UseOperacionalDataParams) => {
  const [data, setData] = useState<OperacionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOperacionalData = async () => {
      if (!dataInicio || !dataFim || empresaIds.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase.rpc('get_operacional_os_summary', {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_empresa_ids: empresaIds
        });

        if (rpcError) {
          console.error('Operacional RPC Error:', rpcError);
          setError(rpcError.message);
          return;
        }

        setData(result as OperacionalData);
      } catch (err) {
        console.error('Operacional fetch error:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOperacionalData();
  }, [dataInicio, dataFim, JSON.stringify(empresaIds)]);

  return { data, loading, error };
};
