import * as XLSX from "xlsx";

export interface CompraImportadaExcel {
  linha: number;
  fornecedor: string;
  valor: number;
  dataPlanejada: string;
  origemAba: string;
}

export interface ResultadoImportacaoExcel {
  aba: string;
  semana: string;
  teto: number | null;
  compras: CompraImportadaExcel[];
}

const isoDate = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const dateFromCell = (
  cell: XLSX.CellObject | undefined
): Date | null => {
  if (!cell) return null;

  if (
    cell.v instanceof Date &&
    !Number.isNaN(cell.v.getTime())
  ) {
    return cell.v;
  }

  if (typeof cell.v === "number") {
    const parsed = XLSX.SSF.parse_date_code(
      cell.v
    );

    if (parsed) {
      return new Date(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        12,
        0,
        0
      );
    }
  }

  if (typeof cell.v === "string") {
    const br = cell.v
      .trim()
      .match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (br) {
      return new Date(
        Number(br[3]),
        Number(br[2]) - 1,
        Number(br[1]),
        12,
        0,
        0
      );
    }

    const parsed = new Date(cell.v);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const numberFromCell = (
  cell: XLSX.CellObject | undefined
): number | null => {
  if (!cell) return null;

  if (
    typeof cell.v === "number" &&
    Number.isFinite(cell.v)
  ) {
    return cell.v;
  }

  if (typeof cell.v === "string") {
    const text = cell.v.trim();

    if (!text) return null;

    const normalized = text
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(
        /\.(?=\d{3}(?:\D|$))/g,
        ""
      )
      .replace(",", ".");

    const n = Number(normalized);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  /*
   * O modelo TETO SEMANAL pode ter
   * fórmulas simples, por exemplo:
   * =15000+40505.51
   */
  if (
    cell.f &&
    /^[0-9+\-*/().\s]+$/.test(cell.f)
  ) {
    try {
      const result = Function(
        `"use strict"; return (${cell.f});`
      )();

      if (
        typeof result === "number" &&
        Number.isFinite(result)
      ) {
        return result;
      }
    } catch {
      // ignora fórmula não calculável
    }
  }

  return null;
};

const textFromCell = (
  cell: XLSX.CellObject | undefined
) =>
  cell?.v == null
    ? ""
    : String(cell.v).trim();

export async function lerModeloTetoSemanal(
  file: File,
  dataInicioSemana: string
): Promise<ResultadoImportacaoExcel> {
  const buffer =
    await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellFormula: true,
  });

  for (const sheetName of workbook.SheetNames) {
    const ws =
      workbook.Sheets[sheetName];

    if (!ws?.["!ref"]) {
      continue;
    }

    const range =
      XLSX.utils.decode_range(
        ws["!ref"]
      );

    for (
      let row = range.s.r;
      row <= range.e.r;
      row++
    ) {
      const tetoLabel = textFromCell(
        ws[
          XLSX.utils.encode_cell({
            r: row,
            c: 0,
          })
        ]
      ).toUpperCase();

      if (tetoLabel !== "TETO") {
        continue;
      }

      /*
       * Estrutura da planilha:
       *
       * linha TETO
       * linha valor do teto
       * linha SALDO
       * linha datas
       * linha cabeçalho
       * linhas fornecedores
       */

      const dateRow = row + 3;

      /*
       * B / D / F / H / J / L
       *
       * Cada coluna corresponde
       * ao fornecedor do dia.
       * A coluna seguinte contém
       * o valor.
       */
      const supplierCols = [
        1,
        3,
        5,
        7,
        9,
        11,
      ];

      const dates =
        supplierCols.map(col => ({
          col,
          date: dateFromCell(
            ws[
              XLSX.utils.encode_cell({
                r: dateRow,
                c: col,
              })
            ]
          ),
        }));

      const monday =
        dates[0]?.date;

      if (
        !monday ||
        isoDate(monday) !==
          dataInicioSemana
      ) {
        continue;
      }

      const nextBlockRow = (() => {
        for (
          let r = row + 1;
          r <= range.e.r;
          r++
        ) {
          const label =
            textFromCell(
              ws[
                XLSX.utils.encode_cell({
                  r,
                  c: 0,
                })
              ]
            ).toUpperCase();

          if (label === "TETO") {
            return r;
          }
        }

        return range.e.r + 1;
      })();

      const compras: CompraImportadaExcel[] =
        [];

      for (const {
        col,
        date,
      } of dates) {
        if (!date) {
          continue;
        }

        for (
          let r = row + 5;
          r < nextBlockRow;
          r++
        ) {
          const fornecedor =
            textFromCell(
              ws[
                XLSX.utils.encode_cell({
                  r,
                  c: col,
                })
              ]
            );

          const valor =
            numberFromCell(
              ws[
                XLSX.utils.encode_cell({
                  r,
                  c: col + 1,
                })
              ]
            );

          if (
            !fornecedor ||
            !valor ||
            valor <= 0
          ) {
            continue;
          }

          compras.push({
            linha: r + 1,
            fornecedor,
            valor,
            dataPlanejada:
              isoDate(date),
            origemAba:
              sheetName,
          });
        }
      }

      const teto =
        numberFromCell(
          ws[
            XLSX.utils.encode_cell({
              r: row + 1,
              c: 0,
            })
          ]
        );

      return {
        aba: sheetName,

        semana:
          textFromCell(
            ws[
              XLSX.utils.encode_cell({
                r: row,
                c: 2,
              })
            ]
          ) || "Semana",

        teto,
        compras,
      };
    }
  }

  throw new Error(
    `Não encontrei no Excel a semana iniciada em ${
      dataInicioSemana
        .split("-")
        .reverse()
        .join("/")
    }. Verifique se a planilha segue o modelo TETO SEMANAL.`
  );
}