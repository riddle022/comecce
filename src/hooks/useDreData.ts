import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FluxoCaixaDiario, FluxoCaixaMensal } from '../types/financeiro';

interface UseDreDataParams {
  dataInicio: string;
  dataFim:    string;
  empresaIds: string[];
}

export const useDreData = ({ dataInicio, dataFim, empresaIds }: UseDreDataParams) => {
  const [dadosMensais, setDadosMensais] = useState<FluxoCaixaMensal[]>([]);
  const [dadosDiarios, setDadosDiarios] = useState<Record<string, FluxoCaixaDiario[]>>({});
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    if (!empresaIds || empresaIds.length === 0) {
      setDadosMensais([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

        const promises = ids.map(id =>
          supabase.rpc('fn_dre_mensal', {
            p_id_empresa:  id,
            p_data_inicio: dataInicio,
            p_data_fim:    dataFim,
          })
        );

        const results = await Promise.all(promises);

        let allData: FluxoCaixaMensal[] = [];
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data) {
            allData = allData.concat(res.data as FluxoCaixaMensal[]);
          }
        }

        setDadosMensais(allData);
      } catch (err) {
        console.error('Erro ao carregar DRE:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        setDadosMensais([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dataInicio, dataFim, empresaIds]);

  const buscarDiario = useCallback(async (codigo: string) => {
    if (!empresaIds || empresaIds.length === 0 || dadosDiarios[codigo]) return;

    try {
      const ids = Array.isArray(empresaIds) ? empresaIds : [empresaIds];

      const promises = ids.map(id =>
        supabase.rpc('fn_dre_diario', {
          p_id_empresa:  id,
          p_data_inicio: dataInicio,
          p_data_fim:    dataFim,
          p_codigo:      codigo,
        })
      );

      const results = await Promise.all(promises);
      let allDiario: FluxoCaixaDiario[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) {
          allDiario = allDiario.concat(res.data as FluxoCaixaDiario[]);
        }
      }

      // Sort by date to maintain chronological order
      allDiario.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      setDadosDiarios(prev => ({ ...prev, [codigo]: allDiario }));
    } catch (err) {
      console.error('Erro ao buscar dados diários DRE:', err);
    }
  }, [empresaIds, dataInicio, dataFim, dadosDiarios]);

  return { dadosMensais, dadosDiarios, isLoading, error, buscarDiario };
};
