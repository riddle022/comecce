Você vai atuar como um **arquiteto frontend sênior** especializado em **React, TypeScript, Tailwind e UX para produtos financeiros**.

Quero que você **refatore apenas os menus DRE e Fluxo de Caixa** do meu sistema, com foco em **usabilidade, legibilidade, hierarquia visual e análise financeira**, **sem alterar backend**, **sem alterar RPCs do Supabase**, **sem mexer em outras telas do sistema** e **sem quebrar a identidade visual atual**.

## Restrições obrigatórias

* Não mexer no backend
* Não alterar estrutura de banco
* Não alterar RPCs existentes
* Não mexer em outras páginas do sistema
* Não trocar stack
* Não reescrever a aplicação inteira
* Trabalhar apenas no frontend dos menus:

  * DRE
  * Fluxo de Caixa

## Stack atual

* React 18
* TypeScript
* Vite
* Tailwind CSS
* lucide-react
* Recharts
* Supabase via RPC
* hooks customizados
* tema dark já consolidado no restante do sistema

## Contexto funcional

Essas telas serão usadas por um **BPO financeiro responsável por orientar empresas na tomada de decisão**.

Logo, a interface precisa priorizar:

* leitura rápida
* análise financeira confiável
* comparação entre períodos
* drill-down por grupo
* detalhamento diário quando expandir
* clareza com múltiplos meses
* aparência premium e profissional

## Problema atual

As telas atuais de DRE e Fluxo de Caixa estão difíceis de analisar porque:

* parecem planilhas renderizadas
* têm fonte pequena
* têm muitas colunas ao mesmo tempo
* têm pouca hierarquia visual
* repetem %AV demais
* ficam ruins com vários meses
* DRE e Fluxo estão visualmente parecidos demais
* o gráfico atual não ajuda a leitura principal

## O que deve ser preservado

* identidade visual geral do sistema
* dark mode
* linguagem premium das outras telas
* filtros globais já existentes
* integração atual com hooks e Supabase
* comportamento das demais páginas do produto

## Estrutura dos dados

### Payload mensal bruto

```json id="mcs7ud"
[
  {
    "ano_mes": "2023-10",
    "mes_label": "Out/2023",
    "codigo": "1.0",
    "grupo": "Receita Operacional Bruta",
    "total": 150000.00
  },
  {
    "ano_mes": "2023-10",
    "mes_label": "Out/2023",
    "codigo": "2.0",
    "grupo": "Custos Variáveis",
    "total": -45000.00
  }
]
```

### Payload diário ao expandir linha

```json id="52xfvm"
[
  {
    "data": "2023-10-05T00:00:00Z",
    "codigo": "2.0",
    "grupo": "Custos Variáveis",
    "subcategoria": "Pagamento de Frete",
    "total": -1200.00
  },
  {
    "data": "2023-10-12T00:00:00Z",
    "codigo": "2.0",
    "grupo": "Custos Variáveis",
    "subcategoria": "Compra de Embalagens",
    "total": -3500.50
  }
]
```

### Estrutura final usada no frontend

```json id="ow3q8s"
{
  "codigo": "1.0",
  "descricao": "Receita Operacional Bruta",
  "tipo": "entrada",
  "nivel": "pai",
  "valor_mensal": {
    "2023-09": 140000.00,
    "2023-10": 150000.00
  },
  "valor_total": 290000.00,
  "av_mensal": {
    "2023-09": 100,
    "2023-10": 100
  },
  "av_total": 100,
  "expandido": false,
  "filhos": []
}
```

## Direção esperada para a DRE

A DRE deve parecer um **demonstrativo financeiro gerencial interativo**, e não uma planilha crua.

Quero que você proponha:

* topo com KPIs principais
* tabela financeira com primeira coluna sticky
* header sticky
* hierarquia visual forte
* subtotais e totais muito bem destacados
* grupos expansíveis
* indentação por nível
* valores alinhados à direita
* tipografia numérica melhor
* modo compacto e modo analítico
* esconder métricas secundárias por padrão
* boa leitura com múltiplos meses
* um gráfico realmente útil para DRE, não decorativo

## Direção esperada para o Fluxo de Caixa

O Fluxo de Caixa deve parecer um **painel gerencial de movimentação e tendência**, com linguagem diferente da DRE.

Quero que você proponha:

* KPIs específicos de caixa
* gráfico principal mais forte que o da DRE
* leitura temporal clara
* tabela abaixo com grupos e subcategorias
* expansão para detalhe diário
* destaque para entradas e saídas relevantes
* melhor leitura para vários meses
* visual mais dinâmico, sem perder coerência com o sistema

## Boas práticas obrigatórias

Quero que a solução siga boas práticas de:

* componentização
* separação entre regra, transformação e UI
* performance
* tipagem forte
* baixo acoplamento
* manutenção futura
* reaproveitamento entre DRE e Fluxo quando fizer sentido
* componentes customizados apenas onde realmente valer a pena

## Arquitetura esperada

Sem mexer na base inteira do projeto, proponha uma organização local e segura para esses dois menus, por exemplo:

* componentes específicos por tela
* componentes compartilhados entre os dois menus
* adapters/transformers para dados
* types locais
* hooks já existentes reaproveitados
* lazy loading dos detalhes diários ao expandir linha

## O que eu quero na sua resposta

Responda com foco prático e sem enrolação.

Entregue nesta ordem:

1. diagnóstico objetivo do problema atual
2. proposta visual da nova DRE
3. proposta visual do novo Fluxo de Caixa
4. diferenças de linguagem entre as duas telas
5. arquitetura de componentes recomendada
6. estrutura de pastas sugerida sem afetar o restante do sistema
7. tipos TypeScript sugeridos
8. estratégia de expansão de linhas
9. estratégia para múltiplos meses
10. estratégia de performance
11. exemplo inicial de JSX/Tailwind
12. sugestões de componentes shadcn que valem a pena usar
13. pontos onde a tabela deve ser customizada
14. plano de implementação incremental sem risco para outras telas

## Entrega técnica

Quero que você já pense como alguém que vai implementar de verdade no meu projeto.
Não quero resposta genérica.
Quero proposta específica para esse cenário de:

* React
* TypeScript
* Tailwind
* Supabase via RPC
* dados mensais cruzados por linha e mês
* drill-down diário por expansão de grupos

## Importante

Não refatore o sistema inteiro.
Não proponha mudar backend.
Não proponha trocar stack.
Não sugira mexer em páginas que já estão boas.
Foque só em melhorar profundamente DRE e Fluxo de Caixa.
