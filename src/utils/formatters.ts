/**
 * Formatadores compartilhados da aplicação
 * Evita duplicação de lógica em componentes
 */

export const formatarReal = (valor?: number | string | null) => {
  const numero = Number(valor ?? 0);

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const formatarPercentual = (valor: number, decimais: number = 1): string => {
  return `${valor.toFixed(decimais)}%`;
};

export const formatarData = (data: string): string => {
  try {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  } catch {
    return data;
  }
};

export const formatarDataCompleta = (data: string): string => {
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  try {
    const [ano, mes, dia] = data.split('-');
    return `${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`;
  } catch {
    return data;
  }
};
