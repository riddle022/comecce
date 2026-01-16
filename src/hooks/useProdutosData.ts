import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Main Dashboard Data (KPIs + Top 50 Charts)
export interface ProdutosKPIs {
    produtos_vendidos: number;
    lucro_bruto_total: number;
    custo_total_cmv: number;
    margem_lucro_media: number;
    margem_bruta_valor: number;
    margem_bruta_percentual: number;
}

export interface PerformanceProduto {
    produto: string;
    faturamento: number;
    custo: number;
    lucro: number;
    margem_percentual: number;
}

export interface PerformanceGrupo {
    grupo: string;
    faturamento: number;
    ticket_medio: number;
    custo: number;
    lucro: number;
    margem_percentual: number;
}

export interface ProdutosData {
    kpis: ProdutosKPIs;
    performance_produtos: PerformanceProduto[];
    performance_grupos: PerformanceGrupo[];
}

interface UseProdutosDataParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
}

export function useProdutosData({ dataInicio, dataFim, empresaIds }: UseProdutosDataParams) {
    const [data, setData] = useState<ProdutosData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                if (empresaIds.length === 0) {
                    setData(null);
                    setLoading(false);
                    return;
                }

                console.log('Fetching main dashboard...');
                const { data: result, error: rpcError } = await supabase.rpc('get_produtos_dashboard', {
                    p_data_inicio: dataInicio,
                    p_data_fim: dataFim,
                    p_empresa_ids: empresaIds
                });

                if (rpcError) throw rpcError;

                setData(result);
            } catch (err) {
                console.error('Erro ao buscar dados de produtos:', err);
                setError('Falha ao carregar indicadores de produtos');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [dataInicio, dataFim, empresaIds]);

    return { data, loading, error };
}
