import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PurchaseItem {
    id_empresa: string;
    data_pagamento: string;
    valor_pago: number;
    categoria: string;
    fornecedor: string;
}

interface UsePurchasesDataParams {
    dataInicio: string;
    dataFim: string;
    empresaIds: string[];
}

export const usePurchasesData = ({ dataInicio, dataFim, empresaIds }: UsePurchasesDataParams) => {
    const [data, setData] = useState<PurchaseItem[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!empresaIds || empresaIds.length === 0) {
                    setData(null);
                    setLoading(false);
                    return;
                }

                let allData: PurchaseItem[] = [];
                let from = 0;
                const pageSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    if (signal.aborted) break;

                    let query = supabase
                        .from('tbl_contas')
                        .select('id_empresa, data_pagamento, valor_pago, categoria, fornecedor')
                        .gte('data_pagamento', dataInicio)
                        .lte('data_pagamento', dataFim)
                        .order('data_pagamento', { ascending: true });

                    if (empresaIds && empresaIds.length > 0) {
                        query = query.in('id_empresa', empresaIds);
                    }

                    // Logica de paginação
                    const { data: pageData, error: pageError } = await query
                        .range(from, from + pageSize - 1)
                        .abortSignal(signal);

                    if (pageError) throw pageError;

                    if (pageData) {
                        allData = [...allData, ...(pageData as PurchaseItem[])];

                        // Se retornou menos que o tamanho da página, acabou
                        if (pageData.length < pageSize) {
                            hasMore = false;
                        } else {
                            // Próxima página
                            from += pageSize;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                if (!signal.aborted) {
                    setData(allData);
                }

            } catch (err: any) {
                // Check for various forms of AbortError
                const isAbort =
                    (err instanceof DOMException && err.name === 'AbortError') ||
                    err?.message?.includes('AbortError') ||
                    err?.name === 'AbortError' ||
                    err?.code === '20'; // Supabase/Postgrest abort code sometimes

                if (isAbort) {
                    // Ignore abort errors completely
                    return;
                }

                console.error('Error fetching purchasing data:', err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar dados de compras');
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [dataInicio, dataFim, empresaIds]);

    return { data, loading, error };
};
