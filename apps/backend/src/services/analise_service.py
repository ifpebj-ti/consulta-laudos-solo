from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.analise_bancada import AnaliseBancada
from src.models.laudo import Laudo
from src.models.resultado_calculado import ResultadoCalculado
from src.schemas.analise import (
    AmostraInfoSchema,
    CalibracaoLinearSchema,
    CalculosOficiaisSchema,
    CampoComBrancoSchema,
    DadosBancadaSchema,
    GranulometriaRascunhoSchema,
    ObterAnaliseDataSchema,
    ObterAnaliseResponse,
    PontoCalibracaoSchema,
    ProcessarAnaliseDataSchema,
    ProcessarAnaliseInput,
    ProcessarAnaliseResponse,
    QuimicaRascunhoSchema,
    RascunhoAnaliseInput,
    RascunhoSalvoDataSchema,
    RascunhoSalvoResponse,
)
from src.services.calculos_service import (
    calcular_complexo_sortivo,
    calcular_concentracao_fosforo,
    calcular_granulometria,
    calcular_valor_liquido,
    classificar_textura,
    converter_k_para_cmolc,
    converter_na_para_cmolc,
)


class AnaliseService:
    @staticmethod
    async def obter_analise(protocolo: str, db: AsyncSession) -> ObterAnaliseResponse:
        """Obtém os dados da bancada laboratorial para o protocolo informado."""
        query = (
            select(Laudo)
            .options(selectinload(Laudo.bancada), selectinload(Laudo.resultado_calculado))
            .where(Laudo.protocolo == protocolo)
        )
        result = await db.execute(query)
        laudo = result.scalar_one_or_none()

        if not laudo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"sucesso": False, "mensagem": "Laudo ou amostra não localizada para o protocolo informado."},
            )

        bancada = laudo.bancada
        if not bancada:
            # Inicializa bancada vazia
            bancada = AnaliseBancada(laudo_id=laudo.id)
            db.add(bancada)
            await db.commit()
            await db.refresh(bancada)

        calib_pontos = None
        if bancada.calib_pontos:
            calib_pontos = [PontoCalibracaoSchema(**p) for p in bancada.calib_pontos]

        dados_bancada = DadosBancadaSchema(
            quimica=QuimicaRascunhoSchema(
                ph=bancada.ph,
                fosforoAbsBruta=bancada.fosforo_abs,
                sodioMgL=bancada.sodio_mg_l,
                potassioMgL=bancada.potassio_mg_l,
                calcio=CampoComBrancoSchema(medido=bancada.ca_medido, branco=bancada.ca_branco or 0.0),
                magnesio=CampoComBrancoSchema(medido=bancada.mg_medido, branco=bancada.mg_branco or 0.0),
                aluminio=CampoComBrancoSchema(medido=bancada.al_medido, branco=bancada.al_branco or 0.0),
                acidezPotencial=CampoComBrancoSchema(medido=bancada.h_al_medido, branco=bancada.h_al_branco or 0.0),
            ),
            granulometria=GranulometriaRascunhoSchema(
                tfsa=bancada.tfsa,
                areiaBecker=bancada.areia_becker,
                areiaBeckerVazio=bancada.areia_vazio,
                argilaBecker=bancada.argila_becker,
                argilaBeckerVazio=bancada.argila_vazio,
                naohBecker=bancada.naoh_becker,
                naohBeckerVazio=bancada.naoh_vazio,
            ),
            calibracao=CalibracaoLinearSchema(
                a=bancada.calib_a,
                b=bancada.calib_b,
                r2=bancada.calib_r2,
                pontos=calib_pontos,
            ),
        )

        return ObterAnaliseResponse(
            sucesso=True,
            dados=ObterAnaliseDataSchema(
                protocolo=laudo.protocolo,
                status=laudo.status,
                versao=laudo.versao,
                amostra=AmostraInfoSchema(
                    solicitante=laudo.cliente_nome,
                    propriedade=laudo.propriedade,
                    dataColeta=laudo.criado_em.strftime("%Y-%m-%d") if laudo.criado_em else None,
                ),
                dadosBancada=dados_bancada,
                atualizadoEm=laudo.atualizado_em.isoformat() if laudo.atualizado_em else None,
                atualizadoPor=laudo.atualizado_por,
            ),
        )

    @staticmethod
    async def salvar_rascunho(
        protocolo: str,
        payload: RascunhoAnaliseInput,
        usuario: Dict[str, Any],
        db: AsyncSession,
    ) -> RascunhoSalvoResponse:
        """Salva incrementalmente os dados parciais de bancada com bloqueio otimista."""
        query = (
            select(Laudo)
            .options(selectinload(Laudo.bancada))
            .where(Laudo.protocolo == protocolo)
        )
        result = await db.execute(query)
        laudo = result.scalar_one_or_none()

        if not laudo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"sucesso": False, "mensagem": "Laudo ou amostra não localizada para o protocolo informado."},
            )

        # Bloqueio Concorrente Otimista (409 Conflict)
        if laudo.versao != payload.versaoEsperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "sucesso": False,
                    "mensagem": "Conflito de edição: a análise foi atualizada por outro analista ou aba. Recarregue os dados mais recentes.",
                    "codigoErro": "CONFLITO_CONCORRENCIA",
                },
            )

        bancada = laudo.bancada
        if not bancada:
            bancada = AnaliseBancada(laudo_id=laudo.id)
            db.add(bancada)

        # Atualizações Incrementais da Química
        if payload.quimica is not None:
            q = payload.quimica
            if q.ph is not None:
                bancada.ph = q.ph
            if q.fosforoAbsBruta is not None:
                bancada.fosforo_abs = q.fosforoAbsBruta
            if q.sodioMgL is not None:
                bancada.sodio_mg_l = q.sodioMgL
            if q.potassioMgL is not None:
                bancada.potassio_mg_l = q.potassioMgL
            if q.calcio is not None:
                if q.calcio.medido is not None:
                    bancada.ca_medido = q.calcio.medido
                if q.calcio.branco is not None:
                    bancada.ca_branco = q.calcio.branco
            if q.magnesio is not None:
                if q.magnesio.medido is not None:
                    bancada.mg_medido = q.magnesio.medido
                if q.magnesio.branco is not None:
                    bancada.mg_branco = q.magnesio.branco
            if q.aluminio is not None:
                if q.aluminio.medido is not None:
                    bancada.al_medido = q.aluminio.medido
                if q.aluminio.branco is not None:
                    bancada.al_branco = q.aluminio.branco
            if q.acidezPotencial is not None:
                if q.acidezPotencial.medido is not None:
                    bancada.h_al_medido = q.acidezPotencial.medido
                if q.acidezPotencial.branco is not None:
                    bancada.h_al_branco = q.acidezPotencial.branco

        # Atualizações Incrementais da Granulometria
        if payload.granulometria is not None:
            g = payload.granulometria
            if g.tfsa is not None:
                bancada.tfsa = g.tfsa
            if g.areiaBecker is not None:
                bancada.areia_becker = g.areiaBecker
            if g.areiaBeckerVazio is not None:
                bancada.areia_vazio = g.areiaBeckerVazio
            if g.argilaBecker is not None:
                bancada.argila_becker = g.argilaBecker
            if g.argilaBeckerVazio is not None:
                bancada.argila_vazio = g.argilaBeckerVazio
            if g.naohBecker is not None:
                bancada.naoh_becker = g.naohBecker
            if g.naohBeckerVazio is not None:
                bancada.naoh_vazio = g.naohBeckerVazio

        # Atualizações da Curva de Calibração
        if payload.calibracao is not None:
            c = payload.calibracao
            if c.a is not None:
                bancada.calib_a = c.a
            if c.b is not None:
                bancada.calib_b = c.b
            if c.r2 is not None:
                bancada.calib_r2 = c.r2
            if c.pontos is not None:
                bancada.calib_pontos = [p.model_dump() for p in c.pontos]

        agora = datetime.now(timezone.utc)
        bancada.atualizado_em = agora

        # Transição de Status e Versionamento
        if laudo.status == "PENDENTE":
            laudo.status = "EM_ANALISE"

        laudo.versao += 1
        laudo.atualizado_em = agora
        laudo.atualizado_por = usuario.get("email") or usuario.get("sub") or "analista"

        await db.commit()
        await db.refresh(laudo)

        return RascunhoSalvoResponse(
            sucesso=True,
            mensagem="Rascunho salvo com sucesso.",
            dados=RascunhoSalvoDataSchema(
                protocolo=laudo.protocolo,
                status=laudo.status,
                novaVersao=laudo.versao,
                salvoEm=agora.isoformat(),
            ),
        )

    @staticmethod
    async def processar_analise(
        protocolo: str,
        payload: ProcessarAnaliseInput,
        usuario: Dict[str, Any],
        db: AsyncSession,
    ) -> ProcessarAnaliseResponse:
        """Valida completude, reexecuta cálculos no backend e avança para AGUARDANDO_HOMOLOGACAO."""
        query = (
            select(Laudo)
            .options(selectinload(Laudo.bancada), selectinload(Laudo.resultado_calculado))
            .where(Laudo.protocolo == protocolo)
        )
        result = await db.execute(query)
        laudo = result.scalar_one_or_none()

        if not laudo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"sucesso": False, "mensagem": "Laudo ou amostra não localizada para o protocolo informado."},
            )

        # Concorrência Otimista
        if laudo.versao != payload.versaoEsperada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "sucesso": False,
                    "mensagem": "Conflito de edição: a análise foi atualizada por outro analista ou aba. Recarregue os dados mais recentes.",
                    "codigoErro": "CONFLITO_CONCORRENCIA",
                },
            )

        # Validação de Domínio e Completude Essencial (400 Bad Request)
        erros: List[str] = []
        if payload.granulometria.tfsa <= 0:
            erros.append("O campo 'granulometria.tfsa' é obrigatório e deve ser maior que zero para processar os cálculos.")
        if payload.calibracao.a == 0:
            erros.append("A curva de calibração de fósforo deve ser aplicada antes do processamento com coeficiente angular diferente de zero.")

        if erros:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "sucesso": False,
                    "mensagem": "Não é possível processar cálculos com parâmetros essenciais incompletos.",
                    "erros": erros,
                },
            )

        # 1. Cálculos de Líquidos e Cátions
        liq_ca = calcular_valor_liquido(payload.quimica.calcio.medido, payload.quimica.calcio.branco)
        liq_mg = calcular_valor_liquido(payload.quimica.magnesio.medido, payload.quimica.magnesio.branco)
        liq_al = calcular_valor_liquido(payload.quimica.aluminio.medido, payload.quimica.aluminio.branco)
        liq_h_al = calcular_valor_liquido(payload.quimica.acidezPotencial.medido, payload.quimica.acidezPotencial.branco)

        na_cmolc = converter_na_para_cmolc(payload.quimica.sodioMgL)
        k_cmolc = converter_k_para_cmolc(payload.quimica.potassioMgL)

        # 2. Complexo Sortivo
        sortivo = calcular_complexo_sortivo(
            ca=liq_ca,
            mg=liq_mg,
            al=liq_al,
            h_al=liq_h_al,
            na_cmolc=na_cmolc,
            k_cmolc=k_cmolc,
        )

        # 3. Granulometria e Textura
        granulo = calcular_granulometria(
            tfsa=payload.granulometria.tfsa,
            areia_becker=payload.granulometria.areiaBecker,
            areia_becker_vazio=payload.granulometria.areiaBeckerVazio,
            argila_becker=payload.granulometria.argilaBecker,
            argila_becker_vazio=payload.granulometria.argilaBeckerVazio,
            naoh_becker=payload.granulometria.naohBecker,
            naoh_becker_vazio=payload.granulometria.naohBeckerVazio,
        )

        classe_textura = classificar_textura(
            granulo["pctAreia"], granulo["pctSilte"], granulo["pctArgila"]
        )

        # 4. Fósforo
        fosforo_calc = calcular_concentracao_fosforo(
            leitura_amostra=payload.quimica.fosforoAbsBruta,
            coef={"a": payload.calibracao.a, "b": payload.calibracao.b},
            fator_diluicao=1.0,
        )
        fosforo_final = fosforo_calc["fosforo"] if fosforo_calc else 0.0

        # Persistência na Bancada
        bancada = laudo.bancada
        if not bancada:
            bancada = AnaliseBancada(laudo_id=laudo.id)
            db.add(bancada)

        bancada.ph = payload.quimica.ph
        bancada.fosforo_abs = payload.quimica.fosforoAbsBruta
        bancada.sodio_mg_l = payload.quimica.sodioMgL
        bancada.potassio_mg_l = payload.quimica.potassioMgL
        bancada.ca_medido = payload.quimica.calcio.medido
        bancada.ca_branco = payload.quimica.calcio.branco
        bancada.mg_medido = payload.quimica.magnesio.medido
        bancada.mg_branco = payload.quimica.magnesio.branco
        bancada.al_medido = payload.quimica.aluminio.medido
        bancada.al_branco = payload.quimica.aluminio.branco
        bancada.h_al_medido = payload.quimica.acidezPotencial.medido
        bancada.h_al_branco = payload.quimica.acidezPotencial.branco

        bancada.tfsa = payload.granulometria.tfsa
        bancada.areia_becker = payload.granulometria.areiaBecker
        bancada.areia_vazio = payload.granulometria.areiaBeckerVazio
        bancada.argila_becker = payload.granulometria.argilaBecker
        bancada.argila_vazio = payload.granulometria.argilaBeckerVazio
        bancada.naoh_becker = payload.granulometria.naohBecker
        bancada.naoh_vazio = payload.granulometria.naohBeckerVazio

        bancada.calib_a = payload.calibracao.a
        bancada.calib_b = payload.calibracao.b
        bancada.calib_r2 = payload.calibracao.r2
        if payload.calibracao.pontos:
            bancada.calib_pontos = [p.model_dump() for p in payload.calibracao.pontos]

        agora = datetime.now(timezone.utc)
        bancada.atualizado_em = agora

        # Persistência nos Resultados Calculados
        res_calc = laudo.resultado_calculado
        if not res_calc:
            res_calc = ResultadoCalculado(laudo_id=laudo.id, soma_bases=0, ctc_efetiva=0, ctc_potencial=0, saturacao_bases_v=0, saturacao_al_m=0, pct_areia=0, pct_silte=0, pct_argila=0, classe_textural="", fosforo_mg_dm3=0)
            db.add(res_calc)

        res_calc.soma_bases = round(sortivo["somaBases"], 4)
        res_calc.ctc_efetiva = round(sortivo["ctcEfetiva"], 4)
        res_calc.ctc_potencial = round(sortivo["ctcPotencial"], 4)
        res_calc.saturacao_bases_v = round(sortivo["saturacaoBases"], 2)
        res_calc.saturacao_al_m = round(sortivo["saturacaoAluminio"], 2)
        res_calc.relacao_ca_mg = round(sortivo["relacaoCaMg"], 2) if sortivo["relacaoCaMg"] is not None else None
        res_calc.relacao_ca_k = round(sortivo["relacaoCaK"], 2) if sortivo["relacaoCaK"] is not None else None
        res_calc.relacao_mg_k = round(sortivo["relacaoMgK"], 2) if sortivo["relacaoMgK"] is not None else None

        res_calc.pct_areia = round(granulo["pctAreia"], 2)
        res_calc.pct_silte = round(granulo["pctSilte"], 2)
        res_calc.pct_argila = round(granulo["pctArgila"], 2)
        res_calc.classe_textural = classe_textura

        res_calc.fosforo_mg_dm3 = round(fosforo_final, 4)
        res_calc.calculado_em = agora

        # Transição de Status e Versionamento
        laudo.status = "AGUARDANDO_HOMOLOGACAO"
        laudo.versao += 1
        laudo.atualizado_em = agora
        laudo.atualizado_por = usuario.get("email") or usuario.get("sub") or "analista"

        await db.commit()
        await db.refresh(laudo)

        calculos_oficiais = CalculosOficiaisSchema(
            valoresLiquidos={
                "calcio": round(liq_ca, 2),
                "magnesio": round(liq_mg, 2),
                "aluminio": round(liq_al, 2),
                "acidezPotencial": round(liq_h_al, 2),
            },
            conversoes={
                "sodioCmolc": round(na_cmolc, 4),
                "potassioCmolc": round(k_cmolc, 4),
            },
            complexoSortivo={
                "somaBases": round(sortivo["somaBases"], 4),
                "ctcEfetiva": round(sortivo["ctcEfetiva"], 4),
                "ctcPotencial": round(sortivo["ctcPotencial"], 4),
                "saturacaoBases": round(sortivo["saturacaoBases"], 2),
                "saturacaoAluminio": round(sortivo["saturacaoAluminio"], 2),
                "relacaoCaMg": round(sortivo["relacaoCaMg"], 2) if sortivo["relacaoCaMg"] is not None else None,
                "relacaoCaK": round(sortivo["relacaoCaK"], 2) if sortivo["relacaoCaK"] is not None else None,
                "relacaoMgK": round(sortivo["relacaoMgK"], 2) if sortivo["relacaoMgK"] is not None else None,
                "caSobreT": round(sortivo["caSobreT"], 2),
                "mgSobreT": round(sortivo["mgSobreT"], 2),
                "hAlSobreT": round(sortivo["hAlSobreT"], 2),
            },
            granulometria={
                "pesoAreia": round(granulo["pesoAreia"], 4),
                "pesoSecoNaoh": round(granulo["pesoSecoNaoh"], 4),
                "argila10mlCorrigido": round(granulo["argila10mlCorrigido"], 4),
                "argila1000ml": round(granulo["argila1000ml"], 2),
                "pctAreia": round(granulo["pctAreia"], 1),
                "pctSilte": round(granulo["pctSilte"], 1),
                "pctArgila": round(granulo["pctArgila"], 1),
                "classeTextural": classe_textura,
            },
            fosforo={
                "curva": round(fosforo_calc["curva"], 1) if fosforo_calc else 0.0,
                "concentracaoFinal": round(fosforo_final, 1),
            },
        )

        return ProcessarAnaliseResponse(
            sucesso=True,
            mensagem="Dados processados e cálculos consolidados com sucesso. Amostra pronta para homologação.",
            dados=ProcessarAnaliseDataSchema(
                protocolo=laudo.protocolo,
                status=laudo.status,
                novaVersao=laudo.versao,
                calculosOficiais=calculos_oficiais,
                processadoEm=agora.isoformat(),
                processadoPor=laudo.atualizado_por,
            ),
        )
