# PROMPT — CLAUDE CODE
# Tarefa: Criar módulo Fluxo de Caixa + DRE no front-end

---

## CONTEXTO DO PROJETO

Stack: React + TypeScript + Vite + TailwindCSS (tema dark, cor primária #0F172A / #0F4C5C)
Ícones: Lucide React
Gráficos: Recharts
Backend: Supabase (RPCs prontas)
Roteamento: sem React Router — controlado por `activeMenu` (string) no `App.tsx` via switch/case

---

## O QUE FAZER

Criar o módulo completo de **Fluxo de Caixa** e **DRE** seguindo 100% o padrão existente no projeto.

---

## PASSO 1 — TIPOS TYPESCRIPT

Criar arquivo `src/types/financeiro.ts` com os tipos:

```typescript
// Retorno das RPCs
export interface FluxoCaixaMensal {
  ano_mes:   string;       // '2026-01'
  mes_label: string;       // 'Jan/2026'
  codigo:    string;       // '1001', '2003'
  grupo:     string;
  total:     number;
}

export interface FluxoCaixaDiario {
  data:         string;
  codigo:       string;
  grupo:        string;
  subcategoria: string | null;
  total:        number;
}

// Linha calculada do relatório (montada no front)
export interface LinhaRelatorio {
  codigo:       string | null;  // null = linha calculada
  descricao:    string;
  tipo:         'entrada' | 'saida' | 'subtotal' | 'total' | 'percentual';
  nivel:        'pai' | 'filho';
  valor_mensal: Record<string, number>; // chave = ano_mes ex: '2026-01'
  valor_total:  number;
  av_mensal:    Record<string, number>; // % A.V. por mês
  av_total:     number;
  expandido?:   boolean;
  filhos?:      LinhaRelatorio[];
}
```

---

## PASSO 2 — HOOK useFluxoCaixaData.ts

Criar `src/hooks/useFluxoCaixaData.ts` seguindo o padrão dos hooks existentes no projeto (observar como `useSalesData` ou similar chama RPC no Supabase).

O hook deve:
- Receber `empresaIds: string[]` e `dateRange: { start: string; end: string }` do `GlobalFiltersContext`
- Chamar `fn_fluxo_caixa_mensal` para dados do gráfico
- Chamar `fn_fluxo_caixa_diario` para drill-down (acionado ao expandir uma linha)
- Retornar `{ dadosMensais, dadosDiarios, isLoading, error, buscarDiario }`
- Parâmetros da RPC: `p_id_empresa`, `p_data_inicio`, `p_data_fim`, `p_codigo` (opcional)

Exemplo de chamada RPC:
```typescript
const { data } = await supabase.rpc('fn_fluxo_caixa_mensal', {
  p_id_empresa:  empresaId,
  p_data_inicio: dateRange.start,
  p_data_fim:    dateRange.end,
})
```

---

## PASSO 3 — HOOK useDreData.ts

Criar `src/hooks/useDreData.ts` com a mesma estrutura do hook acima, mas chamando:
- `fn_dre_mensal` para dados do gráfico
- `fn_dre_diario` para drill-down

---

## PASSO 4 — LÓGICA DO RELATÓRIO (helper)

Criar `src/utils/buildRelatorio.ts` com função pura que transforma os dados flat das RPCs na estrutura hierárquica do relatório.

### Estrutura hard-coded do Fluxo de Caixa:

```
Receita Bruta              → SUM codigo = '1001'           (entrada)
(-) Impostos               → SUM codigo = '2001'           (saida)
(=) Receita Líquida        → 1001 - 2001                   (subtotal)
(-) CMV                    → SUM codigo = '2002'           (saida)
(-) Desp. Variáveis        → SUM codigo = '2003'           (saida, expansível)
(=) Margem de Contribuição → Rec.Líquida - CMV - 2003      (subtotal)
(-) Custos Fixos           → grupo com filhos:             (saida, expansível)
      Pessoal              → SUM codigo = '2006'
      Ocupação             → SUM codigo = '2005'
      Marketing            → SUM codigo = '2004'
      Outros               → SUM codigo IN ('2008','2009') - SUM codigo = '1004'
(=) Resultado Operacional  → Margem - Custos Fixos         (subtotal)
(=) Resultado Operacional %→ (Res.Op / Rec.Bruta) * 100   (percentual)
(-) Investimentos          → SUM codigo = '2012'           (saida)
(=) Res. após Invest.      → Res.Op - 2012                 (subtotal)
(=) Res. após Invest. %    → percentual
(-) Financiamentos         → SUM '1002' - SUM '2011'       (saida)
(=) Res. após Financ.      → subtotal
(=) Res. após Financ. %    → percentual
(-) Retiradas Sócios       → SUM codigo = '2010'           (saida)
(=) Res. após Retiradas    → subtotal
(=) Res. após Retiradas %  → percentual
(-) Empréstimos Empresas   → SUM '1003' - SUM '2013'       (saida)
(=) Resultado Líquido      → total
(=) Resultado Líquido %    → percentual

Ponto de Equilíbrio 1 → Custos Fixos / Margem de Contribuição (%)
Ponto de Equilíbrio 2 → (CF + Invest. + Financ. + Retiradas) / MC (%)
```

### Estrutura hard-coded da DRE:
Mesma estrutura acima, com diferença:
- `codigo '1001'` vem de `relatorio_vendas` (já está no banco como 1001)
- `codigo '2002'` vem de `produtos_vendidos` (já está no banco como 2002)
- Lógica de cálculo idêntica

### Regra de % A.V.:
```typescript
av = (valor_linha / receita_bruta_do_mes) * 100
```

---

## PASSO 5 — FluxoCaixaPage.tsx

Criar `src/components/FluxoCaixaPage.tsx` com:

### Layout (seguir visual da imagem de referência):
```
┌─────────────────────────────────────────────────┐
│  FilterPanel (empresa + range de data) — padrão │
├─────────────────────────────────────────────────┤
│  Tabela do relatório                            │
│  Colunas: Tipo | Mês1 Valor | %A.V | Mês2... | Total | %A.V │
│  Linhas pai: bold, fundo levemente diferente    │
│  Linhas filho: indentadas, botão ⊕ para expandir│
│  Linhas subtotal: bold, cor de destaque         │
│  Linhas %: cinza, menor                         │
├─────────────────────────────────────────────────┤
│  Gráfico Recharts — LineChart variação mensal   │
│  Linhas: Receita Bruta, Margem, Resultado Líquido│
└─────────────────────────────────────────────────┘
```

### Comportamento:
- Linhas com filhos têm botão `⊕`/`⊖` para expandir/colapsar
- Ao expandir, chama `buscarDiario(codigo)` se ainda não carregado
- Valores negativos exibidos em vermelho
- Valores positivos em verde (apenas subtotais e totais)
- Formatação: `R$ 1.234,56` (pt-BR)
- Loading skeleton enquanto carrega
- Estado vazio com mensagem "Nenhum dado encontrado para o período"

### Cores do tema (manter padrão dark do projeto):
- Background tabela: `#0F172A`
- Linha pai: `#1E293B`
- Linha filho: `#0F172A`
- Subtotal: `#0F4C5C` com text white
- Hover: leve highlight
- Positivo: `#22C55E`
- Negativo: `#EF4444`

---

## PASSO 6 — DrePage.tsx

Criar `src/components/DrePage.tsx` com estrutura idêntica ao `FluxoCaixaPage.tsx`, usando `useDreData` e a estrutura DRE do `buildRelatorio.ts`.

---

## PASSO 7 — REGISTRAR NO APP.TSX E SIDEBAR.TSX

### No `Sidebar.tsx` — adicionar ao array `menuItems`:
```typescript
{ id: 'fluxo_caixa', label: 'Fluxo de Caixa', icon: TrendingUp }
{ id: 'dre',         label: 'DRE',             icon: BarChart2  }
```
Posicionar após o item `financeiro` existente.

### No `App.tsx` — adicionar ao switch/case:
```typescript
case 'fluxo_caixa': return <FluxoCaixaPage />
case 'dre':         return <DrePage />
```

---

## RESTRIÇÕES IMPORTANTES

1. **Não alterar** nenhum componente, hook ou página existente — apenas adicionar
2. **Reutilizar** `FilterPanel`, `GlobalFiltersContext` e o padrão de hook existente
3. **Não criar** React Router — manter o padrão `activeMenu` via switch/case
4. **Seguir** exatamente o padrão de chamada RPC dos hooks existentes
5. **Manter** o tema dark `#0F172A / #0F4C5C` em todos os novos componentes
6. Os valores no banco são **sempre positivos** — o sinal (entrada/saída) é definido pelo `codigo` (1xxx = entrada, 2xxx = saída)

---

## ARQUIVOS A CRIAR (resumo)

```
src/types/financeiro.ts
src/hooks/useFluxoCaixaData.ts
src/hooks/useDreData.ts
src/utils/buildRelatorio.ts
src/components/FluxoCaixaPage.tsx
src/components/DrePage.tsx
```

## ARQUIVOS A EDITAR (resumo)

```
src/components/Sidebar.tsx   → adicionar 2 itens ao menuItems
src/App.tsx                  → adicionar 2 cases ao switch
```