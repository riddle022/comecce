import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- UTILS ---
function removeDiacritics(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text.toString().trim().replace(/\s+/g, ' ').substring(0, 100);
}

function compareNormalized(text1: string | null | undefined, text2: string | null | undefined): boolean {
    if (!text1 || !text2) return normalizeText(text1) === normalizeText(text2);
    const n1 = removeDiacritics(normalizeText(text1).toLowerCase());
    const n2 = removeDiacritics(normalizeText(text2).toLowerCase());
    return n1 === n2;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const formData = await req.formData();
        const ds_empresa = formData.get('ds_empresa') as string;
        const file = formData.get('contas') as File;

        if (!ds_empresa || !file) {
            return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: 'Parâmetros ausentes' }] }), { status: 400, headers: corsHeaders });
        }

        // 1. Get Empresa ID
        const { data: empresaData, error: empresaError } = await supabase
            .from('empresas')
            .select('id_empresa')
            .eq('ds_empresa', ds_empresa)
            .single();

        if (empresaError || !empresaData) {
            return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: 'Empresa não encontrada' }] }), { status: 404, headers: corsHeaders });
        }
        const id_empresa = empresaData.id_empresa;

        // 2. Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // 3. Detect Headers and Filter/Validate Rows
        // Read as array of arrays to find header row and validate column A
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Find header row (the one containing "Categoria")
        const headerRowIndex = rawData.findIndex(row =>
            row.some(cell => String(cell).trim() === 'Categoria')
        );

        if (headerRowIndex === -1) {
            return new Response(JSON.stringify({
                status: 'falha',
                erros: [{ arquivo: file.name, descricao: 'Arquivo inválido: Coluna "Categoria" não encontrada.' }]
            }), { status: 400, headers: corsHeaders });
        }

        const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
        const colIndices = {
            empresa: 0, // Column A as clarified by user
            categoria: headers.indexOf('Categoria'),
            dataEmissao: headers.indexOf('Data de Emissão'),
            vencimento: headers.indexOf('Vencimento'),
            mesCompetencia: headers.indexOf('Mês Competência'),
            valorOriginal: headers.indexOf('Valor Original'),
            valorPago: headers.indexOf('Valor Pago'),
            dataPagamento: headers.indexOf('Data de Pagamento'),
            status: headers.indexOf('Status'),
            tipoDocumento: headers.indexOf('Tipo Documento'),
            numeroDocumento: headers.indexOf('Número Documento'),
            parcela: headers.indexOf('Parcela'),
            descricao: headers.indexOf('Descrição'),
            fornecedor: headers.indexOf('Fornecedor')
        };

        const filteredRows: any[] = [];
        const dataRows = rawData.slice(headerRowIndex + 1);

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (!row || row.length === 0) continue;

            const categoria = String(row[colIndices.categoria] || '').trim();

            // Filter by Category 2002
            if (/^[- ]*2\.002/.test(categoria)) {
                // Validate Empresa (Column A)
                const empresaNoArquivo = String(row[colIndices.empresa] || '').trim();
                if (empresaNoArquivo && !compareNormalized(empresaNoArquivo, ds_empresa)) {
                    return new Response(JSON.stringify({
                        status: 'falha',
                        erros: [{
                            arquivo: file.name,
                            linha: headerRowIndex + i + 2,
                            descricao: `A empresa no arquivo ("${empresaNoArquivo}") não coincide com a selecionada ("${ds_empresa}"). Por favor, verifique se selecionou a empresa correta no filtro.`
                        }]
                    }), { status: 400, headers: corsHeaders });
                }

                // Map to object format for processing
                filteredRows.push({
                    'Data de Emissão': row[colIndices.dataEmissao],
                    'Vencimento': row[colIndices.vencimento],
                    'Mês Competência': row[colIndices.mesCompetencia],
                    'Valor Original': row[colIndices.valorOriginal],
                    'Valor Pago': row[colIndices.valorPago],
                    'Data de Pagamento': row[colIndices.dataPagamento],
                    'Status': row[colIndices.status],
                    'Tipo Documento': row[colIndices.tipoDocumento],
                    'Número Documento': row[colIndices.numeroDocumento],
                    'Parcela': row[colIndices.parcela],
                    'Descrição': row[colIndices.descricao],
                    'Categoria': row[colIndices.categoria],
                    'Fornecedor': row[colIndices.fornecedor]
                });
            }
        }

        if (filteredRows.length === 0) {
            return new Response(JSON.stringify({
                status: 'sucesso',
                total_processados: 0,
                erros: [],
                message: 'Nenhuma conta encontrada para a categoria 2002.'
            }), { status: 200, headers: corsHeaders });
        }

        // 4. Cleanup previous 'financeiro' uploads for this company to avoid list duplication
        // This will also cascade delete rows in tbl_contas
        await supabase
            .from('tbl_historico_uploads')
            .delete()
            .eq('id_empresa', id_empresa)
            .eq('tipo_importacao', 'financeiro');

        // Create new upload history record
        const { data: uploadData, error: uploadError } = await supabase
            .from('tbl_historico_uploads')
            .insert({
                id_empresa,
                ds_arquivo: file.name,
                total_registros: filteredRows.length,
                tipo_importacao: 'financeiro'
            })
            .select('id_upload')
            .single();

        if (uploadError) throw uploadError;
        const id_upload = uploadData.id_upload;

        // 5. Map and Deduplicate local data with reporting
        const uniqueRowsMap = new Map();
        const internalDuplicates: any[] = [];

        filteredRows.forEach((row) => {
            const formatDate = (val: any) => {
                if (val === null || val === undefined || val === '') return null;
                if (val instanceof Date) return val.toISOString().split('T')[0];
                try {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
                } catch {
                    return null;
                }
            };

            const parseNumber = (val: any) => {
                if (val === null || val === undefined || val === '') return 0;
                if (typeof val === 'number') return val;
                const cleaned = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            };

            const parseString = (val: any) => {
                if (val === null || val === undefined || String(val).trim() === '') return null;
                return String(val).trim();
            };

            const mappedRow = {
                id_empresa,
                id_upload,
                data_emissao: formatDate(row['Data de Emissão']),
                data_vencimento: formatDate(row['Vencimento']),
                mes_competencia: parseString(row['Mês Competência']),
                valor_original: parseNumber(row['Valor Original']),
                valor_pago: parseNumber(row['Valor Pago']),
                data_pagamento: formatDate(row['Data de Pagamento']),
                status: parseString(row['Status']),
                tipo_documento: parseString(row['Tipo Documento']),
                numero_documento: parseString(row['Número Documento']),
                parcela: row['Parcela'] !== undefined && row['Parcela'] !== null ? parseInt(row['Parcela']) : null,
                descricao: parseString(row['Descrição']),
                categoria: parseString(row['Categoria']),
                fornecedor: parseString(row['Fornecedor'])
            };

            const key = `${id_empresa}|${mappedRow.numero_documento}|${mappedRow.parcela}|${mappedRow.fornecedor}|${mappedRow.data_vencimento}`;

            if (uniqueRowsMap.has(key)) {
                internalDuplicates.push({
                    arquivo: file.name,
                    descricao: `Duplicado no Excel (omitido): Doc ${mappedRow.numero_documento}, Parcela ${mappedRow.parcela}, Fornecedor ${mappedRow.fornecedor}`
                });
            }

            uniqueRowsMap.set(key, mappedRow);
        });

        const finalRows = Array.from(uniqueRowsMap.values());

        // 6. Bulk upsert based on natural key
        const { error: upsertError } = await supabase
            .from('tbl_contas')
            .upsert(finalRows, {
                onConflict: 'id_empresa,numero_documento,parcela,fornecedor,data_vencimento'
            });

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify({
            status: 'sucesso',
            total_processados: finalRows.length,
            erros: internalDuplicates,
            message: `${finalRows.length} contas processadas com sucesso para ${ds_empresa}. ${internalDuplicates.length > 0 ? `(${internalDuplicates.length} duplicados internos omitidos)` : ''}`
        }), { status: 200, headers: corsHeaders });

    } catch (error: any) {
        return new Response(JSON.stringify({ status: 'falha', erros: [{ arquivo: '', descricao: error.message }] }), { status: 500, headers: corsHeaders });
    }
});
