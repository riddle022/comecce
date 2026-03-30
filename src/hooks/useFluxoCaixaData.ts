import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FluxoCaixaDiario, FluxoCaixaMensal } from '../types/financeiro';

interface UseFluxoCaixaDataParams {
  dataInicio: string;
  dataFim:    string;
  empresaIds: string[];
}

export const useFluxoCaixaData = ({ dataInicio, dataFim, empresaIds }: UseFluxoCaixaDataParams) => {
  const [dadosMensais, setDadosMensais] = useState<FluxoCaixaMensal[]>([]);
  const [dadosDiarios, setDadosDiarios] = useState<Record<string, FluxoCaixaDiario[]>>({});
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const empresaId = empresaIds[0];

  useEffect(() => {
    if (!empresaId) {
      setDadosMensais([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('fn_fluxo_caixa_mensal', {
          p_id_empresa:  empresaId,
          p_data_inicio: dataInicio,
          p_data_fim:    dataFim,
        });

        if (rpcError) throw rpcError;
        setDadosMensais((data as FluxoCaixaMensal[]) ?? []);
      } catch (err) {
        console.error('Erro ao carregar fluxo de caixa:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        setDadosMensais([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dataInicio, dataFim, empresaId]);

  const buscarDiario = useCallback(async (codigo: string) => {
    if (!empresaId || dadosDiarios[codigo]) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('fn_fluxo_caixa_diario', {
        p_id_empresa:  empresaId,
        p_data_inicio: dataInicio,
        p_data_fim:    dataFim,
        p_codigo:      codigo,
      });

      if (rpcError) throw rpcError;
      setDadosDiarios(prev => ({ ...prev, [codigo]: (data as FluxoCaixaDiario[]) ?? [] }));
    } catch (err) {
      console.error('Erro ao buscar dados diários:', err);
    }
  }, [empresaId, dataInicio, dataFim, dadosDiarios]);

  return { dadosMensais, dadosDiarios, isLoading, error, buscarDiario };
};
