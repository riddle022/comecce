export interface FluxoCaixaMensal {
  ano_mes:   string;
  mes_label: string;
  codigo:    string;
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

export interface LinhaRelatorio {
  codigo:       string | null;
  descricao:    string;
  tipo:         'entrada' | 'saida' | 'subtotal' | 'total' | 'percentual';
  nivel:        'pai' | 'filho';
  valor_mensal: Record<string, number>;
  valor_total:  number;
  av_mensal:    Record<string, number>;
  av_total:     number;
  expandido?:   boolean;
  filhos?:      LinhaRelatorio[];
}
