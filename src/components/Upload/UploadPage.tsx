import { AlertTriangle, Building2, CheckCircle, ChevronDown, ChevronRight, Copy, FileSpreadsheet, Trash2, Upload, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { Empresa } from '../../types/database';
import { enrichOrdemServicoWithProdutos, enrichVendasWithProdutos, ErrorRecord, parseOrdemServicoExcel, parseProdutosExcel, parseVendasExcel } from '../../utils/excelParsers';
import { CompanyListbox } from '../Dashboard/CompanyListbox';

type FileType = 'vendas' | 'produtos' | 'ordem_servico' | 'resultado_financeiro' | 'relatorio_vendas' | 'produtos_vendidos';

interface FileWithType {
  file: File;
  type: FileType | null;
}



interface ProcessingResult {
  status: 'sucesso' | 'falha';
  total_vendas: number;
  total_produtos: number;
  total_ordens_servico: number;
  erros: ErrorRecord[];
  message?: string;
}

const FileTypeSelector: React.FC<{
  value: FileType | null;
  options: { value: FileType; label: string }[];
  onChange: (value: FileType) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder = "Tipo..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-800/50 border border-white/5 text-[10px] text-white rounded-lg pl-3 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium hover:bg-slate-800/80"
      >
        <span className={!selectedOption ? "text-slate-500" : ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-slate-900 border border-white/5 rounded-lg shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-[10px] text-left text-slate-400 hover:text-white hover:bg-indigo-500/20 transition-colors flex items-center justify-between group"
              >
                <span>{option.label}</span>
                {value === option.value && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export const UploadPage: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileWithType[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [uploadType, setUploadType] = useState<'operacional' | 'financeiro' | 'fluxo_dre' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoadingEmpresas(true);
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('ds_empresa', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error loading empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragging(true);
    } else if (e.type === 'dragleave') {
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (fileList: File[]) => {
    const validFiles = fileList.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'xls' || ext === 'xlsx';
    });

    if (validFiles.length === 0) return;

    if (uploadType === 'financeiro') {
      setFiles([{ file: validFiles[0], type: 'financeiro' as any }]);
    } else if (uploadType === 'fluxo_dre') {
      const newFiles = validFiles.slice(0, 3 - files.length).map(file => ({
        file,
        type: null as FileType | null
      }));
      setFiles(prev => [...prev, ...newFiles].slice(0, 3));
    } else {
      const newFiles = validFiles.slice(0, 3 - files.length).map(file => ({
        file,
        type: null as FileType | null
      }));
      setFiles(prev => [...prev, ...newFiles].slice(0, 3));
    }
  };

  const updateFileType = (index: number, type: FileType) => {
    setFiles(prev => {
      const updated = [...prev];
      const oldType = updated[index].type;

      if (oldType) {
        const otherWithSameType = updated.findIndex((f, i) => i !== index && f.type === oldType);
        if (otherWithSameType === -1) {
          updated.forEach((f, i) => {
            if (i !== index && f.type === type) {
              f.type = oldType;
            }
          });
        }
      }

      updated.forEach((f, i) => {
        if (i !== index && f.type === type) {
          f.type = null;
        }
      });

      updated[index].type = type;
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeLabel = (type: FileType): string => {
    const labels: Record<FileType, string> = {
      vendas: 'Vendas',
      produtos: 'Produtos',
      ordem_servico: 'Ordem de Serviço',
      resultado_financeiro: 'Resultado Financeiro',
      relatorio_vendas: 'Relatório de Vendas',
      produtos_vendidos: 'Produtos Vendidos',
    };
    return labels[type];
  };

  const getAvailableTypes = (currentType: FileType | null): FileType[] => {
    if (uploadType === 'fluxo_dre') {
      const allTypes: FileType[] = ['resultado_financeiro', 'relatorio_vendas', 'produtos_vendidos'];
      const usedTypes = files.filter(f => f.type !== currentType).map(f => f.type);
      return allTypes.filter(type => !usedTypes.includes(type));
    }
    const allTypes: FileType[] = ['vendas', 'produtos', 'ordem_servico'];
    const usedTypes = files.filter(f => f.type !== currentType).map(f => f.type);
    return allTypes.filter(type => !usedTypes.includes(type));
  };

  const areAllFilesReady = (): boolean => {
    if (uploadType === 'financeiro') return files.length === 1;
    if (uploadType === 'fluxo_dre') {
      if (files.length !== 3) return false;
      const types = files.map(f => f.type);
      return types.includes('resultado_financeiro') && types.includes('relatorio_vendas') && types.includes('produtos_vendidos');
    }
    if (files.length !== 3) return false;
    const types = files.map(f => f.type);
    return types.includes('vendas') && types.includes('produtos') && types.includes('ordem_servico');
  };

  const handleUpload = async () => {
    if (!areAllFilesReady() || empresaSelecionada.length === 0) return;

    try {
      setUploading(true);
      setResult(null);

      const empresa = empresas.find(e => e.id_empresa === empresaSelecionada[0]);
      if (!empresa) throw new Error('Empresa não encontrada');

      // ---------------------------------------------------------
      // OPERACIONAL: Processamento Local (Frontend) + RPC Atômica
      // ---------------------------------------------------------
      if (uploadType === 'operacional') {
        const vendasFile = files.find(f => f.type === 'vendas')?.file;
        const produtosFile = files.find(f => f.type === 'produtos')?.file;
        const osFile = files.find(f => f.type === 'ordem_servico')?.file;

        if (!vendasFile || !produtosFile || !osFile) throw new Error('Arquivos faltando');

        // 1. Parse (Frontend RAM)
        console.log('Iniciando parsing local...');
        const [vendasRes, produtosRes, osRes] = await Promise.all([
          parseVendasExcel(vendasFile, empresa.ds_empresa),
          parseProdutosExcel(produtosFile),
          parseOrdemServicoExcel(osFile)
        ]);

        const allErros = [...vendasRes.erros, ...produtosRes.erros, ...osRes.erros];
        if (allErros.length > 0) {
          setResult({
            status: 'falha',
            total_vendas: 0,
            total_produtos: 0,
            total_ordens_servico: 0,
            erros: allErros
          });
          setUploading(false);
          return;
        }

        // 2. Enrich
        console.log('Enriquecendo dados...');
        const { vendasEnriquecidas } = enrichVendasWithProdutos(vendasRes.vendas, produtosRes.produtos);
        const { ordensEnriquecidas } = enrichOrdemServicoWithProdutos(osRes.ordensServico, produtosRes.produtos);

        const uniqueVendasCount = new Set(vendasRes.vendas.map(v => v.numero_venda)).size;
        const uniqueOSCount = new Set(osRes.ordensServico.map(os => os.numero_os)).size;
        const uniqueProdutosParsed = new Set(produtosRes.produtos.map(p => p.item_ds_referencia)).size;

        // 3. Persist (Direct RPC)
        console.log('Enviando para o banco de dados (RPC)...');
        const payload = {
          p_id_empresa: empresa.id_empresa,
          p_file_names: {
            vendas: vendasFile.name,
            produtos: produtosFile.name,
            os: osFile.name
          },
          p_vendas: vendasEnriquecidas,
          p_ordens: ordensEnriquecidas,
          p_upload_stats: {
            total_vendas: uniqueVendasCount,
            total_os: uniqueOSCount
          }
        };

        const { data, error } = await supabase.rpc('process_operacional_import_atomic', payload);

        if (error) throw error;
        if (data?.status === 'falha') throw new Error(data.message);

        setResult({
          status: 'sucesso',
          total_vendas: uniqueVendasCount,
          total_produtos: uniqueProdutosParsed,
          total_ordens_servico: uniqueOSCount,
          erros: [],
          message: 'Importação concluída com sucesso (Frontend Parsing)'
        });
        setFiles([]);

      } else if (uploadType === 'fluxo_dre') {
        // ---------------------------------------------------------
        // FLUXO DE CAIXA + DRE: Processamento LOCAL no frontend
        // ---------------------------------------------------------
        const financeiroFile  = files.find(f => f.type === 'resultado_financeiro')?.file;
        const vendasDREFile   = files.find(f => f.type === 'relatorio_vendas')?.file;
        const produtosDREFile = files.find(f => f.type === 'produtos_vendidos')?.file;

        if (!financeiroFile || !vendasDREFile || !produtosDREFile) throw new Error('Arquivos faltando');

        // ── Helpers locais ──
        const toDateStr = (raw: unknown): string | null => {
          if (!raw) return null;
          if (typeof raw === 'string') {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
          }
          if (typeof raw === 'number') {
            const d = new Date((raw - 25569) * 86400 * 1000);
            return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
          }
          return null;
        };

        const parseBR = (v: unknown): number => {
          if (v === null || v === undefined || v === '') return NaN;
          if (typeof v === 'number') return v;
          let s = String(v).trim().replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.');
          return parseFloat(s);
        };

        const parseCat = (cat: string) => {
          const p = cat.split(' - ');
          const codigo = p[0]?.trim().replace(/\./g, '') ?? '';
          const resto = p.slice(1).join(' - ');
          const sub = resto.split(' >> ');
          return { codigo, grupo: sub[0]?.trim() ?? '', subcategoria: sub[1]?.trim() ?? null };
        };

        interface Lancamento {
          id_empresa: string; id_upload: string; id_origem: number | null;
          codigo: string; grupo: string; subcategoria: string | null;
          data: string; valor: number;
        }

        // ── 1. Registra upload ──
        const { data: uploadRec, error: uploadErr } = await supabase
          .from('tbl_historico_uploads')
          .insert({
            id_empresa: empresa.id_empresa,
            tipo_importacao: 'fluxo_dre',
            arquivo_financeiro: financeiroFile.name,
            arquivo_vendas: vendasDREFile.name,
            arquivo_produtos: produtosDREFile.name,
            status: 'processando',
          })
          .select('id_upload')
          .single();

        if (uploadErr) throw new Error(`Erro ao registrar upload: ${uploadErr.message}`);
        const idUpload = uploadRec.id_upload;
        const idEmpresa = empresa.id_empresa;

        try {
          // ── 2. Lê buffers ──
          const bufFin = await financeiroFile.arrayBuffer();
          const bufVen = await vendasDREFile.arrayBuffer();
          const bufProd = await produtosDREFile.arrayBuffer();

          // ── 3. Parse resultado_financeiro (abas receitas + despesas) ──
          const parseFinanceiro = (buf: ArrayBuffer, aba: string): Lancamento[] => {
            const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: false });
            const sh = wb.Sheets[aba];
            if (!sh) return [];
            const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null }) as unknown[][];
            const lanc: Lancamento[] = [];
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || !row[1] || !row[3] || row[4] === null) continue;
              const cat = String(row[1]).trim();
              const data = toDateStr(row[3]);
              const valor = parseBR(row[4]);
              if (!data || isNaN(valor) || !cat) continue;
              const { codigo, grupo, subcategoria } = parseCat(cat);
              if (!codigo) continue;
              lanc.push({ id_empresa: idEmpresa, id_upload: idUpload, id_origem: row[0] ? Number(row[0]) : null, codigo, grupo, subcategoria, data, valor });
            }
            return lanc;
          };

          const fluxoReceitas = parseFinanceiro(bufFin, 'receitas');
          const fluxoDespesas = parseFinanceiro(bufFin, 'despesas');
          const fluxoLancamentos = [...fluxoReceitas, ...fluxoDespesas];
          console.log(`Fluxo: ${fluxoLancamentos.length} lançamentos`);

          // ── 4. Parse relatorio_vendas → Receita Bruta (1001) ──
          const wbVen = XLSX.read(new Uint8Array(bufVen), { type: 'array', cellDates: false });
          const shVen = wbVen.Sheets[wbVen.SheetNames[0]];
          const rowsVen = XLSX.utils.sheet_to_json(shVen, { header: 1, defval: null }) as unknown[][];
          const agVendas = new Map<string, number>();
          for (let i = 1; i < rowsVen.length; i++) {
            const row = rowsVen[i];
            if (!row || !row[2] || row[15] === null) continue;
            const data = toDateStr(row[2]);
            const valor = parseBR(row[15]);
            if (!data || isNaN(valor)) continue;
            agVendas.set(data, (agVendas.get(data) ?? 0) + valor);
          }
          const dreVendas: Lancamento[] = Array.from(agVendas.entries()).map(([data, valor]) => ({
            id_empresa: idEmpresa, id_upload: idUpload, id_origem: null,
            codigo: '1001', grupo: 'Receita Bruta', subcategoria: null, data, valor,
          }));
          console.log(`DRE Vendas: ${dreVendas.length} lançamentos`);

          // ── 5. Determinar data de competência (mês/ano) do relatório de vendas ──
          let dataCompetencia = new Date().toISOString().split('T')[0];
          if (dreVendas.length > 0) {
            const [ano, mes] = dreVendas[0].data.split('-');
            if (ano && mes) dataCompetencia = `${ano}-${mes}-01`;
          }
          console.log(`Data competência para CMV: ${dataCompetencia}`);

          // ── 6. Parse produtos_vendidos → CMV (2002) usando coluna N ──
          const wbProd = XLSX.read(new Uint8Array(bufProd), { type: 'array', cellDates: false });
          const shProd = wbProd.Sheets[wbProd.SheetNames[0]];
          const rowsProd = XLSX.utils.sheet_to_json(shProd, { header: 'A', defval: null }) as any[];
          let custoTotal = 0;
          let linhasLidas = 0;
          let linhasComValor = 0;
          for (let i = 0; i < rowsProd.length; i++) {
            const row = rowsProd[i];
            if (!row) continue;
            linhasLidas++;
            const valN = row['N'];
            if (valN === null || valN === undefined || valN === '') continue;
            const strN = String(valN).toLowerCase();
            if (strN.includes('custo') || strN.includes('total')) continue;
            const valor = Math.abs(parseBR(valN));
            if (isNaN(valor) || valor === 0) continue;
            linhasComValor++;
            custoTotal += valor;
          }
          console.log(`Produtos: ${linhasLidas} linhas lidas, ${linhasComValor} com custo na col N, total = ${custoTotal}`);

          const dreProdutos: Lancamento[] = custoTotal > 0 ? [{
            id_empresa: idEmpresa, id_upload: idUpload, id_origem: null,
            codigo: '2002', grupo: 'Custo das Mercadorias e Produtos Vendidos',
            subcategoria: null, data: dataCompetencia, valor: custoTotal,
          }] : [];

          // ── 7. Montar DRE completo ──
          const dreFinanceiro = fluxoLancamentos.filter(l => l.codigo !== '1001' && l.codigo !== '2002');
          const dreLancamentos = [...dreFinanceiro, ...dreVendas, ...dreProdutos];
          console.log(`DRE total: ${dreLancamentos.length} lançamentos (${dreProdutos.length} CMV)`);

          // ── 8. Range de datas ──
          const todasDatas = [
            ...fluxoLancamentos.map(l => l.data),
            ...dreVendas.map(l => l.data),
            ...dreProdutos.map(l => l.data),
          ].filter(Boolean).sort();
          const dataInicio = todasDatas[0];
          const dataFim = todasDatas[todasDatas.length - 1];
          if (!dataInicio || !dataFim) throw new Error('Nenhuma data válida encontrada nos arquivos');

          // ── 9. DELETE antigos no período ──
          const { error: delFluxo } = await supabase
            .from('tbl_fluxo_caixa_lancamentos').delete()
            .eq('id_empresa', idEmpresa).gte('data', dataInicio).lte('data', dataFim);
          if (delFluxo) throw new Error(`Erro ao limpar fluxo: ${delFluxo.message}`);

          const { error: delDre } = await supabase
            .from('tbl_dre_lancamentos').delete()
            .eq('id_empresa', idEmpresa).gte('data', dataInicio).lte('data', dataFim);
          if (delDre) throw new Error(`Erro ao limpar DRE: ${delDre.message}`);

          // ── 10. INSERT em lotes de 500 ──
          const chunkSize = 500;
          for (let i = 0; i < fluxoLancamentos.length; i += chunkSize) {
            const chunk = fluxoLancamentos.slice(i, i + chunkSize);
            const { error } = await supabase.from('tbl_fluxo_caixa_lancamentos').insert(chunk);
            if (error) throw new Error(`Erro ao inserir fluxo lote ${i}: ${error.message}`);
          }
          for (let i = 0; i < dreLancamentos.length; i += chunkSize) {
            const chunk = dreLancamentos.slice(i, i + chunkSize);
            const { error } = await supabase.from('tbl_dre_lancamentos').insert(chunk);
            if (error) throw new Error(`Erro ao inserir DRE lote ${i}: ${error.message}`);
          }

          // ── 11. Atualiza status do upload ──
          await supabase
            .from('tbl_historico_uploads')
            .update({
              status: 'sucesso',
              ds_arquivo: `${dataInicio}_${dataFim}`,
              total_financeiro: fluxoLancamentos.length + dreLancamentos.length,
            })
            .eq('id_upload', idUpload);

          setResult({
            status: 'sucesso',
            total_vendas: fluxoLancamentos.length,
            total_produtos: dreLancamentos.length,
            total_ordens_servico: 0,
            erros: [],
            message: `Fluxo: ${fluxoLancamentos.length} | DRE: ${dreLancamentos.length} (CMV: R$ ${custoTotal.toFixed(2)})`,
          });
          setFiles([]);

        } catch (innerError) {
          await supabase.from('tbl_historico_uploads').update({ status: 'falha' }).eq('id_upload', idUpload);
          throw innerError;
        }

      } else {
        // ---------------------------------------------------------
        // FINANCEIRO: Mantém fluxo antigo (Edge Function)
        // ---------------------------------------------------------
        const body = new FormData();
        body.append('ds_empresa', empresa.ds_empresa);
        body.append('contas', files[0].file);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão não encontrada');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-contas-pagar-import`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body
          }
        );

        if (!response.ok) {
          let errorMessage = `Erro no servidor: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData && errorData.message) errorMessage = errorData.message;
            if (errorData && errorData.erros) {
              setResult({
                status: 'falha',
                total_vendas: 0,
                total_produtos: 0,
                total_ordens_servico: 0,
                erros: errorData.erros
              });
              return;
            }
          } catch (e) { }
          throw new Error(errorMessage);
        }

        const resultData: ProcessingResult = await response.json();
        setResult(resultData);
        if (resultData.status === 'sucesso') setFiles([]);
      }

    } catch (error) {
      console.error('Erro ao processar upload:', error);
      setResult({
        status: 'falha',
        total_vendas: 0,
        total_produtos: 0,
        total_ordens_servico: 0,
        erros: [{
          arquivo: '',
          descricao: error instanceof Error ? error.message : 'Erro desconhecido ao processar arquivos'
        }]
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleErrorExpansion = (arquivo: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(arquivo)) {
        newSet.delete(arquivo);
      } else {
        newSet.add(arquivo);
      }
      return newSet;
    });
  };

  const copyErrorsToClipboard = () => {
    if (!result?.erros) return;
    const errorsText = result.erros.map(e =>
      `${e.arquivo}${e.linha ? ` (linha ${e.linha})` : ''}${e.coluna ? ` [${e.coluna}]` : ''}: ${e.descricao}`
    ).join('\n');
    navigator.clipboard.writeText(errorsText);
  };

  const groupedErrors = (result?.erros || []).reduce((acc, error) => {
    const key = error.arquivo || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ErrorRecord[]>);

  return (
    <div className="space-y-6">
      <div className="relative z-20 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-2.5 mb-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
              Empresa
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex-1 max-w-sm">
            {loadingEmpresas ? (
              <div className="flex items-center h-8">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <CompanyListbox
                empresas={empresas}
                empresasSelecionadas={empresaSelecionada}
                onSelectionChange={setEmpresaSelecionada}
                mode="single"
                autoFocus={true}
              />
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 py-1 bg-white/[0.02] border border-white/5 rounded-lg">
            <div className="w-1 h-1 rounded-full bg-indigo-500" />
            <span>Seleção Necessária</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-8 max-w-2xl">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tipo de Upload</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'operacional',
              title: 'Importação Operacional',
              subtitle: 'Vendas, Produtos e OS',
              icon: FileSpreadsheet,
              color: 'indigo'
            },
            {
              id: 'financeiro',
              title: 'Contas a Pagar',
              subtitle: 'Gestão financeira',
              icon: Building2,
              color: 'emerald'
            },
            {
              id: 'fluxo_dre',
              title: 'Fluxo de Caixa + DRE',
              subtitle: 'Resultado, Vendas e Produtos',
              icon: FileSpreadsheet,
              color: 'emerald'
            },
          ].map((type) => (
            <button
              key={type.id}
              disabled={empresaSelecionada.length === 0}
              onClick={() => {
                setUploadType(type.id as any);
                setFiles([]); // Limpiar archivos si cambia el tipo
                setResult(null); // Limpiar resultado previo
              }}
              className={`relative overflow-hidden group flex items-center p-2.5 rounded-lg border transition-all duration-300 ${uploadType === type.id
                ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                } ${empresaSelecionada.length === 0 ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed scale-[0.98]' : ''}`}
            >
              <div className={`p-1.5 rounded-md mr-3 transition-colors ${uploadType === type.id ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500'
                }`}>
                <type.icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] font-bold truncate transition-colors ${uploadType === type.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                    {type.title}
                  </span>
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all ${uploadType === type.id ? 'border-indigo-500' : 'border-slate-800'
                    }`}>
                    {uploadType === type.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  </div>
                </div>
                <p className={`text-[9px] font-medium truncate ${uploadType === type.id ? 'text-indigo-300/60' : 'text-slate-600'
                  }`}>
                  {type.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`relative overflow-hidden bg-white/[0.01] border border-dashed rounded-2xl transition-all duration-500 group/drop ${empresaSelecionada.length === 0 || !uploadType
          ? 'border-white/5 opacity-50 cursor-not-allowed scale-[0.99]'
          : (uploadType === 'operacional' || uploadType === 'fluxo_dre' ? files.length >= 3 : files.length >= 1)
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : dragging
              ? 'border-indigo-500/50 bg-indigo-500/10'
              : 'border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.02]'
          }`}
        onDragEnter={empresaSelecionada.length > 0 && uploadType && ((uploadType === 'operacional' || uploadType === 'fluxo_dre') ? files.length < 3 : files.length < 1) ? handleDrag : undefined}
        onDragLeave={empresaSelecionada.length > 0 && uploadType && ((uploadType === 'operacional' || uploadType === 'fluxo_dre') ? files.length < 3 : files.length < 1) ? handleDrag : undefined}
        onDragOver={empresaSelecionada.length > 0 && uploadType && ((uploadType === 'operacional' || uploadType === 'fluxo_dre') ? files.length < 3 : files.length < 1) ? handleDrag : undefined}
        onDrop={empresaSelecionada.length > 0 && uploadType && ((uploadType === 'operacional' || uploadType === 'fluxo_dre') ? files.length < 3 : files.length < 1) ? handleDrop : undefined}
      >
        {/* Variante COMPACTA cuando los archivos están listos O hay resultados */}
        {areAllFilesReady() || result !== null ? (
          <div className="px-4 py-3 flex items-center justify-center space-x-3 relative z-10">
            <div className={`p-1.5 rounded-lg ${result?.status === 'sucesso' ? 'bg-emerald-500/10' : result?.status === 'falha' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
              {result?.status === 'sucesso' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : result?.status === 'falha' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">
                {result?.status === 'sucesso'
                  ? 'Procesado com Sucesso'
                  : result?.status === 'falha'
                    ? 'Procesado con errores'
                    : uploadType === 'operacional' ? '3 archivos listos' : 'Arquivo Carregado'}
              </span>
              <div className={`w-1 h-1 rounded-full ${result?.status === 'sucesso' ? 'bg-emerald-500' : result?.status === 'falha' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            </div>
          </div>
        ) : (
          /* Variante COMPLETA para upload */
          <div className="p-8 flex flex-col items-center justify-center space-y-4 relative z-10">
            <div className={`p-4 rounded-2xl transition-all duration-500 ${dragging
              ? 'bg-indigo-500 text-white scale-105 shadow-lg shadow-indigo-500/20'
              : 'bg-white/5 text-slate-400 group-hover/drop:text-indigo-400 group-hover/drop:bg-indigo-500/10'
              }`}>
              <Upload className="w-8 h-8" />
            </div>

            <div className="text-center">
              {empresaSelecionada.length === 0 ? (
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-400">Upload Bloqueado</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Selecione uma empresa para continuar</p>
                </div>
              ) : !uploadType ? (
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-indigo-400/80">Quasi lá...</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Escolha o tipo de importação acima</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover/drop:text-indigo-50 transition-colors">
                      {dragging ? 'Solte os arquivos agora' : 'Arraste os arquivos aqui'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {uploadType === 'operacional'
                        ? (files.length === 0 ? '3 arquivos Excel obrigatórios (Vendas, Produtos, OS)' : `Arquivo(s) adicionado(s): ${files.length}/3`)
                        : uploadType === 'fluxo_dre'
                          ? (files.length === 0 ? '3 arquivos Excel (Resultado, Vendas, Produtos)' : `Arquivo(s) adicionado(s): ${files.length}/3`)
                          : 'Arquivo Excel de Contas a Pagar'}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-xs border border-white/10 transition-all"
                  >
                    Procurar Arquivos
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple={uploadType === 'operacional' || uploadType === 'fluxo_dre'}
                accept=".xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex items-center space-x-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              <span className="flex items-center space-x-1.5">
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <span>XLS, XLSX</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <div className="w-1 h-1 rounded-full bg-slate-800" />
                <span>{uploadType === 'operacional' || uploadType === 'fluxo_dre' ? 'Bundle de 3' : 'Arquivo único'}</span>
              </span>
            </div>
          </div>
        )}
      </div>


      {files.length > 0 && (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Arquivos Selecionados</h3>
            </div>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">{files.length}/3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {files.map((fileWithType, index) => (
              <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 group/file hover:bg-white/[0.04] transition-all">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start justify-between min-w-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white font-bold block truncate" title={fileWithType.file.name}>{fileWithType.file.name}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{(fileWithType.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {uploadType === 'operacional' || uploadType === 'fluxo_dre' ? (
                    <FileTypeSelector
                      value={fileWithType.type}
                      onChange={(val) => updateFileType(index, val)}
                      options={getAvailableTypes(fileWithType.type).map(type => ({
                        value: type,
                        label: getFileTypeLabel(type)
                      }))}
                    />
                  ) : (
                    <div className="text-[10px] font-bold text-indigo-400/80 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 uppercase tracking-widest text-center">
                      Contas a Pagar
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>

          {!areAllFilesReady() ? (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 flex items-center space-x-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-slate-400 font-medium">
                {uploadType === 'operacional'
                  ? (files.length < 3 ? `Adicione mais ${3 - files.length} arquivo(s) para completar o bundle.` : 'Selecione o tipo para cada arquivo.')
                  : uploadType === 'fluxo_dre'
                    ? (files.length < 3 ? `Adicione mais ${3 - files.length} arquivo(s).` : 'Selecione o tipo para cada arquivo.')
                    : (files.length === 0 ? 'Adicione o arquivo de contas para processar.' : 'Aguardando processamento.')}
              </p>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                  <span className="uppercase tracking-widest">Processando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-widest">Processar Bundle</span>
                </>
              )}
            </button>
          )}
        </div>
      )}


      {result && result.status === 'sucesso' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] group-hover:bg-emerald-500/20 transition-all duration-500" />

          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Importação finalizada!</h3>
              <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest mt-0.5">Bundle processado com sucesso</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {uploadType === 'operacional' ? [
              { label: 'Vendas Importadas', value: result.total_vendas },
              { label: 'Produtos Processados', value: result.total_produtos },
              { label: 'Ordens de Serviço', value: result.total_ordens_servico }
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-all">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
              </div>
            )) : uploadType === 'fluxo_dre' ? [
              { label: 'Lançamentos Fluxo de Caixa', value: (result as any).totais?.fluxo_caixa ?? result.total_vendas },
              { label: 'Lançamentos DRE', value: (result as any).totais?.dre ?? result.total_produtos },
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-all">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
              </div>
            )) : (
              <div className="col-span-full md:col-span-1 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.05] transition-all">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contas Importadas</p>
                <p className="text-3xl font-black text-white tracking-tighter">{(result as any).total_processados}</p>
              </div>
            )}
          </div>

          {result.message && (
            <p className="text-xs text-emerald-400/80 font-medium mt-6 relative z-10 bg-emerald-500/5 px-4 py-2 rounded-lg inline-block">{result.message}</p>
          )}
        </div>
      )}

      {result && result.erros.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-rose-500/20 p-2.5 rounded-xl border border-rose-500/20">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Erros detectados</h3>
                <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mt-0.5">{result.erros.length} inconsistências no bundle</p>
              </div>
            </div>
            <button
              onClick={copyErrorsToClipboard}
              className="flex items-center space-x-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Lista</span>
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedErrors || {}).map(([arquivo, erros]) => (
              <div key={arquivo} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all hover:bg-white/[0.03]">
                <button
                  onClick={() => toggleErrorExpansion(arquivo)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/10">
                      <FileSpreadsheet className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">{arquivo}</span>
                      <span className="text-[10px] font-bold text-rose-500/60 uppercase tracking-widest">{erros.length} Erros encontrados</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-all ${expandedErrors.has(arquivo) ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-600'}`}>
                    {expandedErrors.has(arquivo) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {expandedErrors.has(arquivo) && (
                  <div className="px-5 pb-5 space-y-3">
                    {erros.map((erro, idx) => (
                      <div key={idx} className="bg-black/20 border border-rose-500/5 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-4 h-4 text-rose-500/50 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">{erro.descricao}</p>
                            <div className="flex items-center space-x-4 mt-3">
                              {erro.linha && (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded uppercase tracking-tighter">Linha {erro.linha}</span>
                              )}
                              {erro.coluna && (
                                <span className="text-[9px] font-bold text-indigo-500/60 bg-indigo-500/5 px-2 py-0.5 rounded uppercase tracking-tighter">Col: {erro.coluna}</span>
                              )}
                              {erro.valor && (
                                <span className="text-[9px] font-medium text-slate-600 truncate max-w-[200px]">Val: {String(erro.valor)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};
