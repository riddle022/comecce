import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export interface SalesTrend {
    data: string;
    valor_bruto: number;
    valor_liquido: number;
}

export interface FaturamentoRankingsData {
    ranking_descontos: DescontoRanking[];
    ranking_recorrencia: RecorrenciaCliente[];
    tendencia: SalesTrend[];
}

interface UseFaturamentoRankingsParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
}

export const useFaturamentoRankings = ({ dataInicio, dataFim, empresaIds }: UseFaturamentoRankingsParams) => {
    const [data, setData] = useState<FaturamentoRankingsData | null>(null);
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
                    'get_faturamento_rankings',
                    {
                        p_data_inicio: dataInicio,
                        p_data_fim: dataFim,
                        p_empresa_ids: empresaIds
                    }
                );

                if (rpcError) throw rpcError;

                setData(result as FaturamentoRankingsData);
            } catch (err) {
                console.error('Error fetching faturamento rankings:', err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar rankings');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dataInicio, dataFim, JSON.stringify(empresaIds)]);

    return { data, loading, error };
};
