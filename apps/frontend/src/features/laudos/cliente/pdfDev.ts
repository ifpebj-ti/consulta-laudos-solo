// TEMPORARIO: gera no navegador um PDF de teste do laudo quando a API não tem o arquivo (só em dev); remover depois.
import type { LaudoDetalhe } from '@/types/laudo';

type Cor = readonly [number, number, number];

const COR = {
  texto: [0.067, 0.067, 0.067],
  cinza: [0.361, 0.361, 0.345],
  filete: [0.851, 0.851, 0.831],
  verde: [0.184, 0.62, 0.255],
  verdeEscuro: [0.122, 0.42, 0.18],
  vermelho: [0.804, 0.098, 0.118],
} satisfies Record<string, Cor>;

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 56;

const WIN_ANSI_EXTRA: Record<string, number> = {
  '—': 0x97,
  '–': 0x96,
  '•': 0x95,
  '’': 0x92,
  '‘': 0x91,
  '“': 0x93,
  '”': 0x94,
};

function paraWinAnsi(texto: string): string {
  let saida = '';
  for (const caractere of texto) {
    const codigo = caractere.charCodeAt(0);
    let byte: number;
    if (WIN_ANSI_EXTRA[caractere] !== undefined) byte = WIN_ANSI_EXTRA[caractere];
    else if (codigo < 0x80 || (codigo >= 0xa0 && codigo <= 0xff)) byte = codigo;
    else byte = 0x3f;
    const c = String.fromCharCode(byte);
    saida += c === '\\' || c === '(' || c === ')' ? `\\${c}` : c;
  }
  return saida;
}

const n = (valor: number) => Number(valor.toFixed(2)).toString();
const cor = ([r, g, b]: Cor, operador: 'rg' | 'RG') => `${n(r)} ${n(g)} ${n(b)} ${operador}`;

class Pagina {
  private comandos: string[] = [];

  texto(x: number, yTopo: number, tamanho: number, conteudo: string, opcoes: { negrito?: boolean; cor?: Cor } = {}) {
    const fonte = opcoes.negrito ? 'F2' : 'F1';
    this.comandos.push(
      `BT /${fonte} ${n(tamanho)} Tf ${cor(opcoes.cor ?? COR.texto, 'rg')} ${n(x)} ${n(ALTURA - yTopo)} Td (${paraWinAnsi(conteudo)}) Tj ET`,
    );
  }

  linha(x1: number, yTopo: number, x2: number, espessura: number, corLinha: Cor) {
    const y = n(ALTURA - yTopo);
    this.comandos.push(`${cor(corLinha, 'RG')} ${n(espessura)} w ${n(x1)} ${y} m ${n(x2)} ${y} l S`);
  }

  retangulo(x: number, yTopo: number, largura: number, altura: number, corFundo: Cor) {
    this.comandos.push(`${cor(corFundo, 'rg')} ${n(x)} ${n(ALTURA - yTopo - altura)} ${n(largura)} ${n(altura)} re f`);
  }

  curva(pontos: [number, number, number, number, number, number, number, number], espessura: number, corLinha: Cor) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = pontos.map(n);
    this.comandos.push(`${cor(corLinha, 'RG')} ${n(espessura)} w ${x0} ${y0} m ${x1} ${y1} ${x2} ${y2} ${x3} ${y3} c S`);
  }

  conteudo() {
    return this.comandos.join('\n');
  }
}

function montarArquivo(conteudo: string, titulo: string): Uint8Array {
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title (${paraWinAnsi(titulo)}) /Producer (Consulta Laudos Solo - teste) >>`,
  ];

  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const deslocamentos: number[] = [];
  objetos.forEach((objeto, indice) => {
    deslocamentos.push(pdf.length);
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += deslocamentos.map((d) => `${String(d).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

function cabecalhoSecao(pagina: Pagina, yTopo: number, numero: string, titulo: string) {
  pagina.linha(MARGEM, yTopo, LARGURA - MARGEM, 1, COR.texto);
  pagina.texto(MARGEM, yTopo + 24, 9, numero, { negrito: true, cor: COR.cinza });
  pagina.texto(MARGEM + 22, yTopo + 24, 13, titulo, { negrito: true });
}

export function gerarPdfLaudoTeste(laudo: LaudoDetalhe, rotuloStatus: string): Blob {
  const pagina = new Pagina();
  const direita = LARGURA - MARGEM;
  const meio = MARGEM + (direita - MARGEM) / 2;
  const quadrados = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0];
  quadrados.forEach((ativo, i) => {
    if (!ativo) return;
    const coluna = i % 3;
    const linhaGrade = Math.floor(i / 3);
    pagina.retangulo(MARGEM + coluna * 8, 48 + linhaGrade * 8, 6, 6, i === 0 ? COR.vermelho : COR.verdeEscuro);
  });
  pagina.texto(MARGEM + 32, 58, 10, 'INSTITUTO FEDERAL', { negrito: true });
  pagina.texto(MARGEM + 32, 71, 8, 'Pernambuco · Campus Belo Jardim', { cor: COR.cinza });
  pagina.retangulo(direita - 118, 54, 4, 4, COR.vermelho);
  pagina.texto(direita - 108, 58, 8, 'LABORATÓRIO DE SOLOS', { negrito: true, cor: COR.cinza });
  pagina.linha(MARGEM, 96, direita, 0.5, COR.filete);
  pagina.texto(MARGEM, 136, 8, 'LAUDO DE ANÁLISE DE SOLO', { negrito: true, cor: COR.cinza });
  pagina.texto(MARGEM, 172, 30, 'Laudo Técnico', { negrito: true });
  pagina.texto(MARGEM, 206, 24, laudo.protocolo, { negrito: true, cor: COR.verdeEscuro });
  pagina.retangulo(MARGEM, 222, 4, 4, COR.verde);
  pagina.texto(MARGEM + 10, 227, 9, rotuloStatus.toUpperCase(), { negrito: true, cor: COR.verdeEscuro });
  let y = 262;
  cabecalhoSecao(pagina, y, '01', 'Dados do solicitante e da amostra');
  const dataEmissao = new Date(laudo.dataEmissao).toLocaleDateString('pt-BR');
  const dados: Array<[string, string]> = [
    ['Solicitante', laudo.cliente.nome],
    ['CPF do titular', laudo.cliente.cpfMascarado],
    ['Propriedade', laudo.propriedade],
    ['Data de emissão', dataEmissao],
    ['Protocolo', laudo.protocolo],
    ['Situação', rotuloStatus],
  ];
  y += 46;
  dados.forEach(([rotulo, valor], i) => {
    const x = i % 2 === 0 ? MARGEM : meio + 8;
    const yLinha = y + Math.floor(i / 2) * 44;
    pagina.linha(x, yLinha, x + (direita - MARGEM) / 2 - 8, 0.5, COR.filete);
    pagina.texto(x, yLinha + 15, 7.5, rotulo.toUpperCase(), { negrito: true, cor: COR.cinza });
    pagina.texto(x, yLinha + 31, 11.5, valor);
  });
  y += Math.ceil(dados.length / 2) * 44 + 28;
  cabecalhoSecao(pagina, y, '02', 'Indicadores de fertilidade');
  const p = laudo.parametrosSolo;
  const indicadores: Array<[string, string]> = [
    ...(p.ph != null ? [['pH', p.ph.toFixed(2)] as [string, string]] : []),
    ...(p.fosforo ? [['Fósforo (P)', p.fosforo] as [string, string]] : []),
    ...(p.potassio ? [['Potássio (K)', p.potassio] as [string, string]] : []),
    ...(p.materiaOrganica ? [['Matéria Orgânica', p.materiaOrganica] as [string, string]] : []),
  ];
  y += 46;
  pagina.texto(MARGEM, y, 7.5, 'PARÂMETRO', { negrito: true, cor: COR.cinza });
  pagina.texto(meio + 8, y, 7.5, 'RESULTADO', { negrito: true, cor: COR.cinza });
  y += 10;
  indicadores.forEach(([nome, valor]) => {
    pagina.linha(MARGEM, y, direita, 0.5, COR.filete);
    pagina.retangulo(MARGEM, y - 1, 24, 2, COR.verde);
    pagina.texto(MARGEM, y + 24, 11, nome, { cor: COR.cinza });
    pagina.texto(meio + 8, y + 25, 14, valor, { negrito: true });
    y += 38;
  });
  pagina.linha(MARGEM, y, direita, 0.5, COR.filete);
  for (let i = 0; i < 5; i += 1) {
    const corCurva = i === 2 ? COR.vermelho : COR.verde;
    pagina.curva([360, 8 + i * 3, 470, 10 + i * 3, 540, 40 + i * 4, LARGURA + 4, 118 + i * 7], 0.6, corCurva);
  }
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  pagina.linha(MARGEM, 772, direita, 0.5, COR.filete);
  pagina.texto(MARGEM, 790, 8, 'Laboratório de Solos · Instituto Federal de Pernambuco · Campus Belo Jardim', { cor: COR.cinza });
  pagina.retangulo(MARGEM, 801, 4, 4, COR.vermelho);
  pagina.texto(MARGEM + 10, 806, 7.5, `Documento de teste (gerado no navegador em ${geradoEm}) — sem validade oficial`, {
    cor: COR.cinza,
  });

  const bytes = montarArquivo(pagina.conteudo(), `Laudo Técnico ${laudo.protocolo}`);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function baixarPdfLaudoTeste(laudo: LaudoDetalhe, rotuloStatus: string) {
  const url = URL.createObjectURL(gerarPdfLaudoTeste(laudo, rotuloStatus));
  const link = document.createElement('a');
  link.href = url;
  link.download = `laudo-${laudo.protocolo}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
