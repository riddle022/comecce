import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PerformanceGrupo } from './useProdutosData';

interface UseGruposPaginatedParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
    search: string;
    page: number;
    limit: number;
    sortField: string;
    sortDir: 'asc' | 'desc';
}

export function useGruposPaginated({
    dataInicio,
    dataFim,
    empresaIds,
    search,
    page,
    limit,
    sortField,
    sortDir
}: UseGruposPaginatedParams) {
    const [data, setData] = useState<PerformanceGrupo[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                if (empresaIds.length === 0) {
                    setData([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }

                const offset = (page - 1) * limit;

                const { data: result, error: rpcError } = await supabase.rpc('get_performance_grupos_paginated', {
                    p_data_inicio: dataInicio,
                    p_data_fim: dataFim,
                    p_empresa_ids: empresaIds,
                    p_search: search,
                    p_limit: limit,
                    p_offset: offset,
                    p_sort_field: sortField,
                    p_sort_dir: sortDir
                });

                if (rpcError) throw rpcError;

                setData(result.data || []);
                setTotalCount(result.total_count || 0);
            } catch (err) {
                console.error('Erro ao buscar grupos paginados:', err);
                setError('Falha ao carregar grupos');
            } finally {
                setLoading(false);
            }
        }

        const timeoutId = setTimeout(fetchData, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [dataInicio, dataFim, empresaIds, search, page, limit, sortField, sortDir]);

    return { data, totalCount, loading, error };
}
