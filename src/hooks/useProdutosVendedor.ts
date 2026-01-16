import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Types for Seller Detailed Data
export interface ProdutoVendedor {
    ds_vendedor: string;
    produto: string;
    faturamento: number;
    cantidad: number;
    desconto: number;
}

interface UseProdutosVendedorParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
    vendedor: string; // 'Todos' or specific name
}

export function useProdutosVendedor({ dataInicio, dataFim, empresaIds, vendedor }: UseProdutosVendedorParams) {
    const [vendedoresList, setVendedoresList] = useState<string[]>([]);
    const [tableData, setTableData] = useState<ProdutoVendedor[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingTable, setLoadingTable] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Sellers List (Only on mount or company change)
    useEffect(() => {
        async function fetchVendedores() {
            try {
                setLoadingList(true);
                if (empresaIds.length === 0) return;

                const { data, error } = await supabase.rpc('get_lista_vendedores', {
                    p_empresa_ids: empresaIds
                });

                if (error) throw error;
                // Sort alphabetically
                setVendedoresList((data || []).sort());
            } catch (err) {
                console.error('Erro ao buscar lista de vendedores:', err);
            } finally {
                setLoadingList(false);
            }
        }

        fetchVendedores();
    }, [empresaIds]); // Depend on empresaIds only

    // 2. Fetch Detailed Table (Depends on filters + selected Vendedor)
    useEffect(() => {
        async function fetchTableData() {
            try {
                setLoadingTable(true);
                setError(null);

                if (empresaIds.length === 0 || !vendedor) {
                    setTableData([]);
                    setLoadingTable(false);
                    return;
                }

                console.log(`Fetching detail for vendedor: ${vendedor}`);
                const { data, error } = await supabase.rpc('get_detalhe_produtos_vendedor', {
                    p_data_inicio: dataInicio,
                    p_data_fim: dataFim,
                    p_empresa_ids: empresaIds,
                    p_vendedor: vendedor,
                    p_limit: 100 // Loading 100 at a time for now as per plan to keep it simple but scalable
                });

                if (error) throw error;
                setTableData(data || []);
            } catch (err) {
                console.error('Erro ao buscar detalhe de produtos por vendedor:', err);
                setError('Falha ao carregar tabela de vendedores');
            } finally {
                setLoadingTable(false);
            }
        }

        // Debounce slightly to prevent thrashing if user clicks fast
        const timeoutId = setTimeout(fetchTableData, 100);
        return () => clearTimeout(timeoutId);

    }, [dataInicio, dataFim, empresaIds, vendedor]);

    return { vendedoresList, tableData, loadingList, loadingTable, error };
}
