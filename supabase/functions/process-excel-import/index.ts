import { createClient } from 'npm:@supabase/supabase-js@2';
import { ProcessingResult } from './types.ts';
import { parseVendasExcel } from './parsers/vendasParser.ts';
import { parseProdutosExcel } from './parsers/produtosParser.ts';
import { parseOrdemServicoExcel } from './parsers/ordemServicoParser.ts';
import {
  enrichVendasWithProdutos,
  enrichOrdemServicoWithProdutos,
  validateOrdemServicoIntegrity
} from './validators/crossValidator.ts';
import { validateClienteEmpresa, validateNoDuplicates } from './validators/dataValidator.ts';
import { getEmpresaIdByName } from './services/empresaService.ts';
import { persistData } from './services/persistenceService.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        status: 'falha',
        total_vendas: 0,
        total_produtos: 0,
        total_ordens_servico: 0,
        erros: [{ arquivo: '', descricao: 'Método não permitido' }]
      } as ProcessingResult),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: 0,
          total_produtos: 0,
          total_ordens_servico: 0,
          erros: [{ arquivo: '', descricao: 'Não autorizado' }]
        } as ProcessingResult),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formData = await req.formData();

    const ds_empresa = formData.get('ds_empresa')?.toString();
    if (!ds_empresa) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: 0,
          total_produtos: 0,
          total_ordens_servico: 0,
          erros: [{ arquivo: '', descricao: 'ds_empresa é obrigatório' }]
        } as ProcessingResult),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const vendasFile = formData.get('vendas') as File;
    const produtosFile = formData.get('produtos') as File;
    const ordemServicoFile = formData.get('ordem_servico') as File;

    if (!vendasFile || !produtosFile || !ordemServicoFile) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: 0,
          total_produtos: 0,
          total_ordens_servico: 0,
          erros: [{ arquivo: '', descricao: 'Os 3 arquivos Excel são obrigatórios' }]
        } as ProcessingResult),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Iniciando processamento...');
    console.log('Empresa:', ds_empresa);

    const id_empresa = await getEmpresaIdByName(supabase, ds_empresa);
    if (!id_empresa) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: 0,
          total_produtos: 0,
          total_ordens_servico: 0,
          erros: [{ arquivo: '', descricao: `Empresa "${ds_empresa}" não encontrada` }]
        } as ProcessingResult),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Empresa ID:', id_empresa);

    const vendasBuffer = await vendasFile.arrayBuffer();
    const produtosBuffer = await produtosFile.arrayBuffer();
    const ordemServicoBuffer = await ordemServicoFile.arrayBuffer();

    console.log('Fase 1: Processando Vendas...');
    const { vendas, erros: errosVendas } = parseVendasExcel(vendasBuffer);
    console.log(`Vendas processadas: ${vendas.length}, Erros: ${errosVendas.length}`);

    console.log('Fase 2: Processando Produtos...');
    const { produtos, erros: errosProdutos } = parseProdutosExcel(produtosBuffer);
    console.log(`Produtos processados: ${produtos.length}, Erros: ${errosProdutos.length}`);

    console.log('Fase 3: Processando Ordem de Serviço...');
    const { ordensServico, erros: errosOS } = parseOrdemServicoExcel(ordemServicoBuffer);
    console.log(`Ordens de Serviço processadas: ${ordensServico.length}, Erros: ${errosOS.length}`);

    let allErros = [...errosVendas, ...errosProdutos, ...errosOS];

    if (allErros.length > 0) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: vendas.length,
          total_produtos: produtos.length,
          total_ordens_servico: ordensServico.length,
          erros: allErros
        } as ProcessingResult),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Validando cliente vs empresa...');
    const errosCliente = validateClienteEmpresa(vendas, ds_empresa);
    allErros = [...allErros, ...errosCliente];

    console.log('Validando duplicatas...');
    const errosDuplicatas = validateNoDuplicates(vendas);
    allErros = [...allErros, ...errosDuplicatas];

    console.log('Enriquecendo vendas com produtos...');
    const { vendasEnriquecidas, erros: errosEnrich } = enrichVendasWithProdutos(vendas, produtos);
    allErros = [...allErros, ...errosEnrich];

    console.log('Enriquecendo ordens de serviço...');
    const { ordensEnriquecidas, erros: errosEnrichOS } = enrichOrdemServicoWithProdutos(ordensServico, produtos);
    allErros = [...allErros, ...errosEnrichOS];

    console.log('Validando integridade de ordens de serviço...');
    const errosIntegridade = validateOrdemServicoIntegrity(vendas, ordensServico);
    allErros = [...allErros, ...errosIntegridade];

    if (allErros.length > 0) {
      return new Response(
        JSON.stringify({
          status: 'falha',
          total_vendas: vendas.length,
          total_produtos: produtos.length,
          total_ordens_servico: ordensServico.length,
          erros: allErros
        } as ProcessingResult),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fase 4: Persistindo dados...');
    const { vendas_inseridas, os_inseridas } = await persistData(
      supabase,
      id_empresa,
      vendasEnriquecidas,
      ordensEnriquecidas
    );

    console.log(`Sucesso! Vendas: ${vendas_inseridas}, OS: ${os_inseridas}`);

    const result: ProcessingResult = {
      status: 'sucesso',
      total_vendas: vendas_inseridas,
      total_produtos: produtos.length,
      total_ordens_servico: os_inseridas,
      erros: [],
      message: 'Importação concluída com sucesso'
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);

    return new Response(
      JSON.stringify({
        status: 'falha',
        total_vendas: 0,
        total_produtos: 0,
        total_ordens_servico: 0,
        erros: [
          {
            arquivo: '',
            descricao: `Erro no processamento: ${error.message}`
          }
        ]
      } as ProcessingResult),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});