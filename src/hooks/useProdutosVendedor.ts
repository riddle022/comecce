import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PerformanceVendedor {

    vendedor: string;
    faturamento: number;
    ticket_medio: number;
    quantidade_vendida: number;
    total_desconto: number;
}

interface UseProdutosVendedorParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
}

export function useProdutosVendedor({ dataInicio, dataFim, empresaIds }: UseProdutosVendedorParams) {
    const [tableData, setTableData] = useState<PerformanceVendedor[]>([]);
    const [loadingTable, setLoadingTable] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Performance Vendedores Data
    useEffect(() => {
        async function fetchTableData() {
            try {
                setLoadingTable(true);
                setError(null);

                if (empresaIds.length === 0) {
                    setTableData([]);
                    setLoadingTable(false);
                    return;
                }

                console.log('Fetching performance performance vendedores...');
                const { data, error } = await supabase.rpc('get_performance_vendedores', {
                    p_data_inicio: dataInicio,
                    p_data_fim: dataFim,
                    p_empresa_ids: empresaIds
                });

                if (error) throw error;
                setTableData(data || []);
            } catch (err) {
                console.error('Erro ao buscar performance de vendedores:', err);
                setError('Falha ao carregar performance de vendedores');
            } finally {
                setLoadingTable(false);
            }
        }

        fetchTableData();
    }, [dataInicio, dataFim, empresaIds]);

    return { tableData, loadingTable, error };
}
