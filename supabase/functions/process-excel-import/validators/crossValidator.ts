import { VendaBase, VendaEnriquecida, ProdutoData, OrdemServicoData, ErrorRecord } from '../types.ts';

export function enrichVendasWithProdutos(
  vendas: VendaBase[],
  produtos: ProdutoData[]
): { vendasEnriquecidas: VendaEnriquecida[]; erros: ErrorRecord[] } {
  const vendasEnriquecidas: VendaEnriquecida[] = [];
  const erros: ErrorRecord[] = [];

  const produtosByVenda = new Map<number, ProdutoData[]>();

  for (const produto of produtos) {
    for (const numero_venda of produto.vendas_referencias) {
      if (!produtosByVenda.has(numero_venda)) {
        produtosByVenda.set(numero_venda, []);
      }
      produtosByVenda.get(numero_venda)!.push(produto);
    }
  }

  const vendasNumeros = new Set(vendas.map(v => v.numero_venda));

  for (const venda of vendas) {
    const produtosRelacionados = produtosByVenda.get(venda.numero_venda) || [];

    if (produtosRelacionados.length === 0) {
      erros.push({
        arquivo: 'Produtos',
        valor: venda.numero_venda,
        descricao: `Venda ${venda.numero_venda} não possui produtos associados`
      });
      continue;
    }

    const produto = produtosRelacionados.find(p => p.item_ds_referencia === venda.item_ds_referencia) || produtosRelacionados[0];

    vendasEnriquecidas.push({
      ...venda,
      item_ds_grupo: produto.item_ds_grupo,
      item_ds_grife: produto.item_ds_grife,
      item_ds_fornecedor: produto.item_ds_fornecedor,
      item_vl_custo_unitario: produto.custo_unitario
    });
  }

  for (const produto of produtos) {
    for (const numero_venda of produto.vendas_referencias) {
      if (!vendasNumeros.has(numero_venda)) {
        erros.push({
          arquivo: 'Produtos',
          valor: numero_venda,
          descricao: `Produto referencia venda inexistente: ${numero_venda}`
        });
      }
    }
  }

  return { vendasEnriquecidas, erros };
}

export function enrichOrdemServicoWithProdutos(
  ordensServico: OrdemServicoData[],
  produtos: ProdutoData[]
): { ordensEnriquecidas: OrdemServicoData[]; erros: ErrorRecord[] } {
  const ordensEnriquecidas: OrdemServicoData[] = [];
  const erros: ErrorRecord[] = [];

  const produtosByOS = new Map<number, ProdutoData[]>();

  for (const produto of produtos) {
    for (const numero_os of produto.os_referencias) {
      if (!produtosByOS.has(numero_os)) {
        produtosByOS.set(numero_os, []);
      }
      produtosByOS.get(numero_os)!.push(produto);
    }
  }

  const osNumeros = new Set(ordensServico.map(os => os.numero_os));

  for (const os of ordensServico) {
    const produtosRelacionados = produtosByOS.get(os.numero_os) || [];
    const produto = produtosRelacionados.find(p => p.item_ds_referencia === os.item_ds_referencia) || produtosRelacionados[0];

    if (produto) {
      let custo_unitario = null;
      if (produto.custo_total !== null) {
        const quantidade = os.item_nr_quantidade || produto.quantidade;
        if (quantidade && quantidade > 0) {
          custo_unitario = produto.custo_total / quantidade;
        }
      }

      ordensEnriquecidas.push({
        ...os,
        item_ds_grupo: produto.item_ds_grupo,
        item_ds_grife: produto.item_ds_grife,
        item_ds_fornecedor: produto.item_ds_fornecedor,
        item_vl_custo_unitario: custo_unitario
      });
    } else {
      ordensEnriquecidas.push(os);
    }
  }

  for (const produto of produtos) {
    for (const numero_os of produto.os_referencias) {
      if (!osNumeros.has(numero_os)) {
        erros.push({
          arquivo: 'Produtos',
          valor: numero_os,
          descricao: `Produto referencia OS inexistente: ${numero_os}`
        });
      }
    }
  }

  return { ordensEnriquecidas, erros };
}

export function validateOrdemServicoIntegrity(
  vendas: VendaBase[],
  ordensServico: OrdemServicoData[]
): ErrorRecord[] {
  const erros: ErrorRecord[] = [];

  const vendasComOS = vendas.filter(v => v.numero_os !== null);
  const vendasOSNumeros = new Set(vendasComOS.map(v => v.numero_os).filter(n => n !== null));
  const osNumeros = new Set(ordensServico.map(os => os.numero_os));

  for (const numero_os of vendasOSNumeros) {
    if (numero_os && !osNumeros.has(numero_os)) {
      erros.push({
        arquivo: 'Ordem de Serviço',
        valor: numero_os,
        descricao: `Venda referencia OS inexistente: ${numero_os}`
      });
    }
  }

  for (const os of ordensServico) {
    if (!vendasOSNumeros.has(os.numero_os)) {
      erros.push({
        arquivo: 'Vendas',
        valor: os.numero_os,
        descricao: `OS ${os.numero_os} existe sem venda correspondente`
      });
    }
  }

  return erros;
}
