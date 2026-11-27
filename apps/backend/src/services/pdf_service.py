import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from src.models.analise_bancada import AnaliseBancada
from src.models.laudo import Laudo
from src.models.resultado_calculado import ResultadoCalculado
from src.services.calculos_service import (
    calcular_complexo_sortivo,
    calcular_valor_liquido,
    converter_k_para_cmolc,
    converter_na_para_cmolc,
)


class PdfService:
    @staticmethod
    def gerar_pdf(
        laudo: Laudo,
        bancada: AnaliseBancada | None,
        res_calc: ResultadoCalculado | None,
    ) -> bytes:
        """
        Gera o documento PDF oficial do Laudo de Análise de Solo sob demanda em memória (BytesIO).
        Utiliza o Nome e o CREA dinâmicos do Analista Principal vinculado ao laudo.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=32,
            rightMargin=32,
            topMargin=28,
            bottomMargin=28,
        )

        styles = getSampleStyleSheet()

        verde_escuro = colors.HexColor("#0D5C3A")
        verde_medio = colors.HexColor("#1B4D3E")
        cinza_fundo = colors.HexColor("#F8FAFC")
        cinza_borda = colors.HexColor("#CBD5E1")
        cinza_texto = colors.HexColor("#475569")
        texto_padrao = colors.HexColor("#0F172A")

        style_cabecalho_inst = ParagraphStyle(
            "CabecalhoInst",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13,
            textColor=verde_escuro,
        )
        style_cabecalho_sub = ParagraphStyle(
            "CabecalhoSub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=cinza_texto,
        )
        style_titulo_secao = ParagraphStyle(
            "TituloSecao",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=verde_medio,
        )
        style_tabela_th = ParagraphStyle(
            "TabelaTh",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=colors.white,
            alignment=1,
        )
        style_tabela_td = ParagraphStyle(
            "TabelaTd",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
            textColor=texto_padrao,
            alignment=1,
        )
        style_tabela_td_left = ParagraphStyle(
            "TabelaTdLeft",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
            textColor=texto_padrao,
            alignment=0,
        )
        style_tabela_td_bold = ParagraphStyle(
            "TabelaTdBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=texto_padrao,
            alignment=1,
        )
        style_nota = ParagraphStyle(
            "NotaMetodologia",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=6.5,
            leading=8,
            textColor=cinza_texto,
        )
        style_resp_nome = ParagraphStyle(
            "RespNome",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=verde_escuro,
            alignment=1,
        )
        style_resp_cargo = ParagraphStyle(
            "RespCargo",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=cinza_texto,
            alignment=1,
        )
        style_chancela = ParagraphStyle(
            "ChancelaDigital",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7,
            leading=9,
            textColor=verde_medio,
            alignment=1,
        )

        elementos = []

        # 1. CABEÇALHO INSTITUCIONAL
        data_ref = (
            laudo.homologado_em or laudo.atualizado_em or datetime.now(timezone.utc)
        )
        data_emissao_str = data_ref.strftime("%d/%m/%Y")
        data_hora_homologacao_str = data_ref.strftime("%d/%m/%Y às %H:%M UTC")

        header_data = [
            [
                Paragraph(
                    "<b>LAUDO TÉCNICO DE ANÁLISE DE SOLO</b><br/>"
                    "Laboratório de Análise de Solos e Água (LSSA)",
                    style_cabecalho_inst,
                ),
                Paragraph(
                    f"<b>PROTOCOLO OFICIAL</b><br/>"
                    f"<font size=11 color='#0D5C3A'><b>{laudo.protocolo}</b></font><br/>"
                    f"<font size=7 color='#64748B'>Emissão: {data_emissao_str}</font>",
                    ParagraphStyle(
                        "HeaderDir",
                        parent=style_cabecalho_sub,
                        alignment=2,
                        leading=11,
                    ),
                ),
            ]
        ]
        t_header = Table(header_data, colWidths=[360, 170])
        t_header.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elementos.append(t_header)
        elementos.append(
            HRFlowable(
                width="100%",
                thickness=1.5,
                color=verde_escuro,
                spaceBefore=2,
                spaceAfter=6,
            )
        )

        # 2. IDENTIFICAÇÃO DO REQUERENTE E DA PROPRIEDADE
        cpf_mascarado = (
            f"***.{laudo.cpf_cliente[3:6]}.{laudo.cpf_cliente[6:9]}-**"
            if len(laudo.cpf_cliente) == 11
            else laudo.cpf_cliente
        )
        localizacao_str = laudo.localizacao or "Não informada"
        profundidade_str = laudo.profundidade_coleta or "0 - 20 cm"
        cultivo_str = (
            laudo.cultivo or laudo.cultura_existente or "Análise de Fertilidade"
        )

        dados_cliente = [
            [
                Paragraph("<b>Proprietário / Solicitante:</b>", style_tabela_td_left),
                Paragraph(laudo.cliente_nome, style_tabela_td_left),
                Paragraph("<b>CPF do Titular:</b>", style_tabela_td_left),
                Paragraph(cpf_mascarado, style_tabela_td_left),
            ],
            [
                Paragraph("<b>Propriedade:</b>", style_tabela_td_left),
                Paragraph(laudo.propriedade, style_tabela_td_left),
                Paragraph("<b>Localização:</b>", style_tabela_td_left),
                Paragraph(localizacao_str, style_tabela_td_left),
            ],
            [
                Paragraph("<b>Profundidade de Coleta:</b>", style_tabela_td_left),
                Paragraph(profundidade_str, style_tabela_td_left),
                Paragraph("<b>Finalidade / Cultivo:</b>", style_tabela_td_left),
                Paragraph(cultivo_str, style_tabela_td_left),
            ],
        ]
        t_cliente = Table(dados_cliente, colWidths=[120, 170, 100, 140])
        t_cliente.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), cinza_fundo),
                    ("BOX", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elementos.append(t_cliente)
        elementos.append(Spacer(1, 8))

        # Obtenção de variáveis para as tabelas químicas e físicas
        ph = bancada.ph if bancada and bancada.ph is not None else 0.0
        p_fosforo = (
            res_calc.fosforo_mg_dm3
            if res_calc
            else (
                bancada.fosforo_abs
                if bancada and bancada.fosforo_abs is not None
                else 0.0
            )
        )
        k_mgl = bancada.potassio_mg_l if bancada and bancada.potassio_mg_l else 0.0
        na_mgl = bancada.sodio_mg_l if bancada and bancada.sodio_mg_l else 0.0

        k_cmolc = converter_k_para_cmolc(k_mgl)
        na_cmolc = converter_na_para_cmolc(na_mgl)

        ca_liq = (
            calcular_valor_liquido(bancada.ca_medido, bancada.ca_branco or 0.0)
            if bancada and bancada.ca_medido is not None
            else 0.0
        )
        mg_liq = (
            calcular_valor_liquido(bancada.mg_medido, bancada.mg_branco or 0.0)
            if bancada and bancada.mg_medido is not None
            else 0.0
        )
        al_liq = (
            calcular_valor_liquido(bancada.al_medido, bancada.al_branco or 0.0)
            if bancada and bancada.al_medido is not None
            else 0.0
        )
        h_al_liq = (
            calcular_valor_liquido(bancada.h_al_medido, bancada.h_al_branco or 0.0)
            if bancada and bancada.h_al_medido is not None
            else 0.0
        )

        sortivo = calcular_complexo_sortivo(
            ca=ca_liq,
            mg=mg_liq,
            al=al_liq,
            h_al=h_al_liq,
            na_cmolc=na_cmolc,
            k_cmolc=k_cmolc,
        )

        sb = res_calc.soma_bases if res_calc else sortivo["somaBases"]
        ctc_ef = res_calc.ctc_efetiva if res_calc else sortivo["ctcEfetiva"]
        ctc_pot = res_calc.ctc_potencial if res_calc else sortivo["ctcPotencial"]
        v_pct = res_calc.saturacao_bases_v if res_calc else sortivo["saturacaoBases"]
        m_pct = res_calc.saturacao_al_m if res_calc else sortivo["saturacaoAluminio"]

        rel_ca_mg = (
            res_calc.relacao_ca_mg
            if res_calc and res_calc.relacao_ca_mg is not None
            else sortivo["relacaoCaMg"]
        )
        rel_ca_k = (
            res_calc.relacao_ca_k
            if res_calc and res_calc.relacao_ca_k is not None
            else sortivo["relacaoCaK"]
        )
        rel_mg_k = (
            res_calc.relacao_mg_k
            if res_calc and res_calc.relacao_mg_k is not None
            else sortivo["relacaoMgK"]
        )

        pct_areia = res_calc.pct_areia if res_calc else 0.0
        pct_silte = res_calc.pct_silte if res_calc else 0.0
        pct_argila = res_calc.pct_argila if res_calc else 0.0
        classe_textural = res_calc.classe_textural if res_calc else "A Classificar"

        # 3. TABELA DE ATRIBUTOS QUÍMICOS
        elementos.append(
            Paragraph("<b>1. ATRIBUTOS QUÍMICOS DO SOLO</b>", style_titulo_secao)
        )
        elementos.append(Spacer(1, 3))

        tab_quimica_data = [
            [
                Paragraph("<b>pH (H₂O)</b>", style_tabela_th),
                Paragraph("<b>P Mehlich</b><br/>(mg/dm³)", style_tabela_th),
                Paragraph("<b>K⁺</b><br/>(cmolc/dm³)", style_tabela_th),
                Paragraph("<b>Na⁺</b><br/>(cmolc/dm³)", style_tabela_th),
                Paragraph("<b>Ca²⁺</b><br/>(cmolc/dm³)", style_tabela_th),
                Paragraph("<b>Mg²⁺</b><br/>(cmolc/dm³)", style_tabela_th),
                Paragraph("<b>Al³⁺</b><br/>(cmolc/dm³)", style_tabela_th),
                Paragraph("<b>H+Al</b><br/>(cmolc/dm³)", style_tabela_th),
            ],
            [
                Paragraph(f"{ph:.2f}", style_tabela_td_bold),
                Paragraph(f"{p_fosforo:.2f}", style_tabela_td_bold),
                Paragraph(f"{k_cmolc:.2f}", style_tabela_td),
                Paragraph(f"{na_cmolc:.2f}", style_tabela_td),
                Paragraph(f"{ca_liq:.2f}", style_tabela_td),
                Paragraph(f"{mg_liq:.2f}", style_tabela_td),
                Paragraph(f"{al_liq:.2f}", style_tabela_td),
                Paragraph(f"{h_al_liq:.2f}", style_tabela_td),
            ],
        ]
        t_quimica = Table(tab_quimica_data, colWidths=[66] * 8)
        t_quimica.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), verde_escuro),
                    ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        elementos.append(t_quimica)
        elementos.append(Spacer(1, 7))

        # 4. TABELA DE COMPLEXO SORTIVO E ÍNDICES
        elementos.append(
            Paragraph(
                "<b>2. COMPLEXO SORTIVO, CAPACIDADE DE TROCA CATIÔNICA E SATURAÇÃO</b>",
                style_titulo_secao,
            )
        )
        elementos.append(Spacer(1, 3))

        def formatar_relacao(valor: float | None) -> str:
            return f"{valor:.2f}" if valor is not None else "—"

        tab_sortivo_data = [
            [
                Paragraph("<b>Soma de Bases (SB)</b>", style_tabela_th),
                Paragraph("<b>CTC Efetiva (t)</b>", style_tabela_th),
                Paragraph("<b>CTC Potencial (T)</b>", style_tabela_th),
                Paragraph("<b>Saturação Bases (V)</b>", style_tabela_th),
                Paragraph("<b>Saturação Al (m)</b>", style_tabela_th),
                Paragraph("<b>Relação Ca/Mg</b>", style_tabela_th),
                Paragraph("<b>Relação Ca/K</b>", style_tabela_th),
                Paragraph("<b>Relação Mg/K</b>", style_tabela_th),
            ],
            [
                Paragraph(f"{sb:.2f} cmolc", style_tabela_td_bold),
                Paragraph(f"{ctc_ef:.2f} cmolc", style_tabela_td),
                Paragraph(f"{ctc_pot:.2f} cmolc", style_tabela_td_bold),
                Paragraph(f"{v_pct:.1f}%", style_tabela_td_bold),
                Paragraph(f"{m_pct:.1f}%", style_tabela_td),
                Paragraph(formatar_relacao(rel_ca_mg), style_tabela_td),
                Paragraph(formatar_relacao(rel_ca_k), style_tabela_td),
                Paragraph(formatar_relacao(rel_mg_k), style_tabela_td),
            ],
        ]
        t_sortivo = Table(tab_sortivo_data, colWidths=[66] * 8)
        t_sortivo.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), verde_medio),
                    ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        elementos.append(t_sortivo)
        elementos.append(Spacer(1, 7))

        # 5. TABELA DE ATRIBUTOS FÍSICOS / GRANULOMETRIA
        elementos.append(
            Paragraph(
                "<b>3. ATRIBUTOS FÍSICOS E CLASSE TEXTURAL</b>", style_titulo_secao
            )
        )
        elementos.append(Spacer(1, 3))

        tab_fisica_data = [
            [
                Paragraph("<b>Fração Areia (%)</b>", style_tabela_th),
                Paragraph("<b>Fração Silte (%)</b>", style_tabela_th),
                Paragraph("<b>Fração Argila (%)</b>", style_tabela_th),
                Paragraph("<b>Classificação Textural Oficial</b>", style_tabela_th),
            ],
            [
                Paragraph(f"{pct_areia:.1f}%", style_tabela_td),
                Paragraph(f"{pct_silte:.1f}%", style_tabela_td),
                Paragraph(f"{pct_argila:.1f}%", style_tabela_td),
                Paragraph(f"<b>{classe_textural.upper()}</b>", style_tabela_td_bold),
            ],
        ]
        t_fisica = Table(tab_fisica_data, colWidths=[110, 110, 110, 200])
        t_fisica.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), verde_escuro),
                    ("BACKGROUND", (0, 1), (-1, 1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        elementos.append(t_fisica)
        elementos.append(Spacer(1, 6))

        # 6. METODOLOGIA E NOTAS TÉCNICAS
        elementos.append(
            Paragraph(
                "<b>Metodologias Analíticas de Referência:</b> "
                "Análises executadas conforme metodologia padrão da Embrapa Solos (Manual de Métodos de Análise de Solo). "
                "Extrator Mehlich-1 para P, Na e K. Cátions trocáveis (Ca, Mg, Al) extraídos com KCl 1 mol/L. "
                "Acidez potencial (H+Al) determinada com Acetato de Cálcio 0,5 mol/L a pH 7,0. "
                "Granulometria por dispersão com NaOH e sedimentação.",
                style_nota,
            )
        )

        elementos.append(Spacer(1, 16))

        # 7. BLOCO DO RESPONSÁVEL TÉCNICO (DINÂMICO VIA POWER USER) E CHANCELA ELETRÔNICA
        resp_nome = laudo.analista_nome or "Responsável Técnico não informado"
        resp_crea = laudo.analista_crea or "CREA não informado"

        bloco_assinatura_itens = [
            Paragraph(
                f"Documento assinado e homologado eletronicamente em {data_hora_homologacao_str}",
                style_chancela,
            ),
            HRFlowable(
                width=260,
                thickness=0.8,
                color=cinza_borda,
                spaceBefore=4,
                spaceAfter=4,
                hAlign="CENTER",
            ),
            Paragraph(f"<b>{resp_nome}</b>", style_resp_nome),
            Paragraph(
                f"Responsável Técnico(a) &middot; Registro Profissional: {resp_crea}",
                style_resp_cargo,
            ),
        ]

        t_assinatura = Table([[bloco_assinatura_itens]], colWidths=[530])
        t_assinatura.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BACKGROUND", (0, 0), (-1, -1), cinza_fundo),
                    ("BOX", (0, 0), (-1, -1), 0.5, cinza_borda),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elementos.append(t_assinatura)

        doc.build(elementos)
        buffer.seek(0)
        return buffer.getvalue()
