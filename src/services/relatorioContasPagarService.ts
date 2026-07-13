import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

interface GerarRelatorioContasPagarParams {
  contas: any[];
  fornecedores: any[];
  empresas: any[];
  titulo: string;
  periodoInicio?: string;
  periodoFim?: string;
  filtrosDescricao?: string;
}

const numeroSeguro = (valor: unknown) => {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
};

const formatarReal = (valor: unknown) =>
  numeroSeguro(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const formatarData = (
  data?: string | null
) => {
  if (!data) return '-';

  const somenteData = String(data).split('T')[0];
  const partes = somenteData.split('-');

  if (partes.length !== 3) {
    return String(data);
  }

  const [ano, mes, dia] = partes;

  return `${dia}/${mes}/${ano}`;
};

const obterValorPago = (conta: any) =>
  numeroSeguro(conta.valorPago);

const obterSaldo = (conta: any) =>
  Math.max(
    numeroSeguro(conta.valor) -
      obterValorPago(conta),
    0
  );

const obterFavorecido = (
  conta: any,
  fornecedores: any[]
) => {
  if (conta.tipoPagamento === 'interno') {
    return (
      conta.beneficiarioInterno ||
      'Pagamento interno'
    );
  }

  return (
    fornecedores.find(
      fornecedor =>
        fornecedor.id === conta.fornecedorId
    )?.nome || 'Fornecedor não encontrado'
  );
};

const obterSituacao = (conta: any) => {
  const saldo = obterSaldo(conta);

  if (
    saldo <= 0.001 ||
    ['conciliacao', 'finalizado'].includes(
      String(conta.status)
    )
  ) {
    return 'Paga';
  }

  const hoje = new Date()
    .toISOString()
    .split('T')[0];

  const vencimento =
    conta.dataProgramadaPagamento ||
    conta.prazo ||
    '';

  if (vencimento && vencimento < hoje) {
    return 'Vencida';
  }

  if (
    conta.statusProgramacao === 'programado'
  ) {
    return 'Programada';
  }

  if (obterValorPago(conta) > 0) {
    return 'Parcial';
  }

  return 'A vencer';
};

const limparNomeArquivo = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

export const gerarRelatorioContasPagar = ({
  contas,
  fornecedores,
  empresas,
  titulo,
  periodoInicio,
  periodoFim,
  filtrosDescricao,
}: GerarRelatorioContasPagarParams) => {
  if (!Array.isArray(contas) || contas.length === 0) {
    throw new Error(
      'Não existem contas nos filtros selecionados.'
    );
  }

  const documento = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalGeral = contas.reduce(
    (total, conta) =>
      total + numeroSeguro(conta.valor),
    0
  );

  const totalPago = contas.reduce(
    (total, conta) =>
      total + obterValorPago(conta),
    0
  );

  const saldoTotal = contas.reduce(
    (total, conta) =>
      total + obterSaldo(conta),
    0
  );

  const totalVencido = contas
    .filter(
      conta => obterSituacao(conta) === 'Vencida'
    )
    .reduce(
      (total, conta) =>
        total + obterSaldo(conta),
      0
    );

  documento.setFont('helvetica', 'bold');
  documento.setFontSize(17);
  documento.setTextColor(15, 23, 42);
  documento.text(
    `FLOWFINANCE — ${titulo}`,
    14,
    16
  );

  documento.setFont('helvetica', 'normal');
  documento.setFontSize(8);
  documento.setTextColor(100, 116, 139);
  documento.text(
    `Gerado em ${new Date().toLocaleString(
      'pt-BR'
    )}`,
    14,
    22
  );

  let linhaY = 28;

  if (periodoInicio || periodoFim) {
    documento.text(
      `Período: ${formatarData(
        periodoInicio
      )} até ${formatarData(periodoFim)}`,
      14,
      linhaY
    );
    linhaY += 5;
  }

  if (filtrosDescricao) {
    const linhasFiltro = documento.splitTextToSize(
      `Filtros: ${filtrosDescricao}`,
      260
    );

    documento.text(
      linhasFiltro,
      14,
      linhaY
    );

    linhaY += linhasFiltro.length * 4 + 2;
  }

  documento.setDrawColor(226, 232, 240);
  documento.line(14, linhaY, 283, linhaY);
  linhaY += 7;

  documento.setFont('helvetica', 'bold');
  documento.setFontSize(9);
  documento.setTextColor(15, 23, 42);

  documento.text(
    `Quantidade: ${contas.length}`,
    14,
    linhaY
  );
  documento.text(
    `Valor total: ${formatarReal(totalGeral)}`,
    58,
    linhaY
  );
  documento.text(
    `Valor pago: ${formatarReal(totalPago)}`,
    126,
    linhaY
  );
  documento.text(
    `Saldo: ${formatarReal(saldoTotal)}`,
    190,
    linhaY
  );
  documento.text(
    `Vencido: ${formatarReal(totalVencido)}`,
    240,
    linhaY
  );

  const inicioTabela = linhaY + 6;

  autoTable(documento, {
    startY: inicioTabela,
    margin: {
      left: 8,
      right: 8,
      bottom: 14,
    },
    head: [
      [
        'Situação',
        'Processo',
        'Favorecido',
        'Empresa',
        'Descrição',
        'Valor',
        'Pago',
        'Saldo',
        'Vencimento',
        'Programado',
        'Pagamento',
        'Forma',
      ],
    ],
    body: contas.map(conta => {
      const empresa = empresas.find(
        item => item.id === conta.empresaId
      );

      return [
        obterSituacao(conta),
        conta.id || '-',
        obterFavorecido(
          conta,
          fornecedores
        ),
        empresa?.nome || '-',
        conta.descricao || '-',
        formatarReal(conta.valor),
        formatarReal(
          obterValorPago(conta)
        ),
        formatarReal(obterSaldo(conta)),
        formatarData(conta.prazo),
        formatarData(
          conta.dataProgramadaPagamento
        ),
        formatarData(
          conta.dataPagamento
        ),
        String(
          conta.metodoPagamento ||
            conta.formaPagamento ||
            '-'
        ).toUpperCase(),
      ];
    }),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.6,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 17 },
      1: { cellWidth: 22 },
      2: { cellWidth: 31 },
      3: { cellWidth: 29 },
      4: { cellWidth: 42 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 21, halign: 'right' },
      7: { cellWidth: 21, halign: 'right' },
      8: { cellWidth: 19 },
      9: { cellWidth: 19 },
      10: { cellWidth: 19 },
      11: { cellWidth: 16 },
    },
    didDrawPage: () => {
      const paginaAtual =
        documento.getNumberOfPages();
      const larguraPagina =
        documento.internal.pageSize.getWidth();
      const alturaPagina =
        documento.internal.pageSize.getHeight();

      documento.setFont(
        'helvetica',
        'normal'
      );
      documento.setFontSize(7);
      documento.setTextColor(
        100,
        116,
        139
      );

      documento.text(
        'FLOWFINANCE — Relatório de Contas a Pagar',
        8,
        alturaPagina - 7
      );

      documento.text(
        `Página ${paginaAtual}`,
        larguraPagina - 24,
        alturaPagina - 7
      );
    },
  });

  const nomeBase =
    limparNomeArquivo(titulo) ||
    'relatorio_contas_a_pagar';

  const dataArquivo = new Date()
    .toISOString()
    .split('T')[0];

  documento.save(
    `${nomeBase}_${dataArquivo}.pdf`
  );
};