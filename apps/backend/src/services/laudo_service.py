import secrets
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.laudo import Laudo
from src.schemas.laudo import (
    ClienteInfoResponse,
    LaudoDetalheResponse,
    ParametrosSoloResponse,
)
from src.services.calculos_service import (
    calcular_complexo_sortivo,
    calcular_valor_liquido,
    converter_k_para_cmolc,
    converter_na_para_cmolc,
)

# Mantido para compatibilidade com chamadas síncronas legadas de teste
BASE_LAUDOS_MOCK: dict[str, dict] = {
    "20101.2306": {
        "protocolo": "20101.2306",
        "cpf": "52998224725",
        "status": "CONCLUIDO",
        "cliente_nome": "João da Silva",
        "propriedade": "Fazenda Boa Vista",
        "data_emissao": datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc),
        "parametros": {
            "ph": 6.2,
            "materiaOrganica": "2.8%",
            "fosforo": "15 mg/dm³",
            "potassio": "0.35 cmolc/dm³",
        },
        "tem_pdf": True,
    },
    "2026-SOLO-00123": {
        "protocolo": "2026-SOLO-00123",
        "cpf": "52998224725",
        "status": "CONCLUIDO",
        "cliente_nome": "Maria Santos",
        "propriedade": "Sítio Primavera",
        "data_emissao": datetime(2026, 9, 5, 14, 30, 0, tzinfo=timezone.utc),
        "parametros": {
            "ph": 5.8,
            "materiaOrganica": "3.1%",
            "fosforo": "12 mg/dm³",
            "potassio": "0.40 cmolc/dm³",
        },
        "tem_pdf": True,
    },
}


class LaudoAuthService:
    @staticmethod
    def autenticar_cliente(protocolo: str, cpf_limpo: str) -> dict | None:
        """Valida consulta no mock em memória (fallback síncrono)."""
        laudo = BASE_LAUDOS_MOCK.get(protocolo)
        if not laudo:
            secrets.compare_digest(cpf_limpo, "00000000000")
            return None

        if not secrets.compare_digest(laudo["cpf"], cpf_limpo):
            return None

        return laudo

    @staticmethod
    def _calcular_previsao_entrega(laudo: Laudo) -> str | None:
        if laudo.data_recebimento:
            try:
                dt_rec = date.fromisoformat(laudo.data_recebimento[:10])
                return (dt_rec + timedelta(days=15)).isoformat()
            except ValueError:
                pass
        if laudo.criado_em:
            return (laudo.criado_em.date() + timedelta(days=15)).isoformat()
        return None

    @classmethod
    def construir_detalhe_laudo(cls, laudo: Laudo) -> LaudoDetalheResponse:
        """
        Constrói o payload de consulta do cliente a partir da entidade Laudo no banco.
        Os indicadores finais e o download do PDF só são liberados quando status == 'CONCLUIDO'.
        """
        concluido = laudo.status == "CONCLUIDO"
        bancada = laudo.bancada
        res_calc = laudo.resultado_calculado

        if concluido:
            ph_val = bancada.ph if bancada else None
            fosforo_num = (
                res_calc.fosforo_mg_dm3
                if res_calc and res_calc.fosforo_mg_dm3 is not None
                else None
            )
            fosforo_val = (
                f"{fosforo_num:.2f} mg/dm³" if fosforo_num is not None else None
            )

            k_cmolc = (
                converter_k_para_cmolc(bancada.potassio_mg_l)
                if bancada and bancada.potassio_mg_l is not None
                else None
            )
            potassio_val = f"{k_cmolc:.2f} cmolc/dm³" if k_cmolc is not None else None

            na_cmolc = (
                converter_na_para_cmolc(bancada.sodio_mg_l)
                if bancada and bancada.sodio_mg_l is not None
                else 0.0
            )
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
                k_cmolc=k_cmolc or 0.0,
            )

            sb = res_calc.soma_bases if res_calc else sortivo["somaBases"]
            ctc_ef = res_calc.ctc_efetiva if res_calc else sortivo["ctcEfetiva"]
            ctc_pot = res_calc.ctc_potencial if res_calc else sortivo["ctcPotencial"]
            v_pct = (
                res_calc.saturacao_bases_v if res_calc else sortivo["saturacaoBases"]
            )
            m_pct = (
                res_calc.saturacao_al_m if res_calc else sortivo["saturacaoAluminio"]
            )
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

            dados_adicionais = {
                "quimica": {
                    "sodio": f"{na_cmolc:.2f} cmolc/dm³",
                    "calcio": f"{ca_liq:.2f} cmolc/dm³",
                    "magnesio": f"{mg_liq:.2f} cmolc/dm³",
                    "aluminio": f"{al_liq:.2f} cmolc/dm³",
                    "acidezPotencial": f"{h_al_liq:.2f} cmolc/dm³",
                },
                "complexoSortivo": {
                    "somaBases": f"{sb:.2f} cmolc/dm³",
                    "ctcEfetiva": f"{ctc_ef:.2f} cmolc/dm³",
                    "ctcPotencial": f"{ctc_pot:.2f} cmolc/dm³",
                    "saturacaoBases": f"{v_pct:.1f}%",
                    "saturacaoAluminio": f"{m_pct:.1f}%",
                    "relacaoCaMg": f"{rel_ca_mg:.2f}" if rel_ca_mg is not None else "—",
                    "relacaoCaK": f"{rel_ca_k:.2f}" if rel_ca_k is not None else "—",
                    "relacaoMgK": f"{rel_mg_k:.2f}" if rel_mg_k is not None else "—",
                },
                "granulometria": (
                    {
                        "areia": f"{res_calc.pct_areia:.1f}%",
                        "silte": f"{res_calc.pct_silte:.1f}%",
                        "argila": f"{res_calc.pct_argila:.1f}%",
                        "classeTextural": res_calc.classe_textural,
                    }
                    if res_calc
                    else None
                ),
                "amostra": {
                    "localizacao": laudo.localizacao,
                    "profundidadeColeta": laudo.profundidade_coleta,
                    "cultivo": laudo.cultivo or laudo.cultura_existente,
                    "responsavelNome": laudo.analista_nome,
                    "responsavelCrea": laudo.analista_crea,
                },
            }

            parametros = ParametrosSoloResponse(
                ph=ph_val,
                materiaOrganica=None,
                fosforo=fosforo_val,
                potassio=potassio_val,
                dadosAdicionais=dados_adicionais,
            )
            data_emissao = laudo.homologado_em or laudo.atualizado_em
        else:
            parametros = ParametrosSoloResponse()
            data_emissao = None

        return LaudoDetalheResponse(
            protocolo=laudo.protocolo,
            status=laudo.status,
            cliente=ClienteInfoResponse(
                nome=laudo.cliente_nome,
                cpfMascarado=cls.mascarar_cpf(laudo.cpf_cliente),
            ),
            propriedade=laudo.propriedade,
            dataEmissao=data_emissao,
            parametrosSolo=parametros,
            temPdfDisponivel=concluido,
            dataPrevistaEntrega=cls._calcular_previsao_entrega(laudo),
            versao=laudo.versao,
            atualizadoEm=(
                laudo.atualizado_em.isoformat() if laudo.atualizado_em else None
            ),
        )

    @classmethod
    async def autenticar_cliente_db(
        cls, protocolo: str, cpf_limpo: str, db: AsyncSession
    ) -> LaudoDetalheResponse | None:
        """
        Valida a consulta pública do cliente diretamente no banco de dados.
        Usa secrets.compare_digest para comparar o CPF em tempo constante (mitigação VULN-02).
        """
        protocolo_norm = protocolo.strip().upper()
        stmt = (
            select(Laudo)
            .options(
                selectinload(Laudo.bancada), selectinload(Laudo.resultado_calculado)
            )
            .where(func.upper(Laudo.protocolo) == protocolo_norm)
        )
        res = await db.execute(stmt)
        laudo = res.scalar_one_or_none()

        if not laudo:
            secrets.compare_digest(cpf_limpo, "00000000000")
            return None

        if not secrets.compare_digest(laudo.cpf_cliente, cpf_limpo):
            return None

        return cls.construir_detalhe_laudo(laudo)

    @classmethod
    async def obter_situacao_laudo_db(
        cls, protocolo: str, db: AsyncSession
    ) -> LaudoDetalheResponse | None:
        """Obtém o estado atualizado do laudo no banco para o protocolo informado."""
        protocolo_norm = protocolo.strip().upper()
        stmt = (
            select(Laudo)
            .options(
                selectinload(Laudo.bancada), selectinload(Laudo.resultado_calculado)
            )
            .where(func.upper(Laudo.protocolo) == protocolo_norm)
        )
        res = await db.execute(stmt)
        laudo = res.scalar_one_or_none()
        if not laudo:
            return None
        return cls.construir_detalhe_laudo(laudo)

    @staticmethod
    def mascarar_cpf(cpf: str) -> str:
        """Formata o CPF no padrão: ***.456.789-**"""
        if len(cpf) != 11:
            return "***.***.***-**"
        return f"***.{cpf[3:6]}.{cpf[6:9]}-**"
