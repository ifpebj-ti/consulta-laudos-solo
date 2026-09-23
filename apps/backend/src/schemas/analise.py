from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class PontoCalibracaoSchema(BaseModel):
    x: float
    y: float


class CalibracaoLinearSchema(BaseModel):
    a: Optional[float] = None
    b: Optional[float] = None
    r2: Optional[float] = None
    pontos: Optional[List[PontoCalibracaoSchema]] = None


class CampoComBrancoSchema(BaseModel):
    medido: Optional[float] = None
    branco: Optional[float] = 0.0


# Schemas para Rascunho (Parcial/Opcional)
class QuimicaRascunhoSchema(BaseModel):
    ph: Optional[float] = None
    fosforoAbsBruta: Optional[float] = None
    sodioMgL: Optional[float] = None
    potassioMgL: Optional[float] = None
    calcio: Optional[CampoComBrancoSchema] = None
    magnesio: Optional[CampoComBrancoSchema] = None
    aluminio: Optional[CampoComBrancoSchema] = None
    acidezPotencial: Optional[CampoComBrancoSchema] = None


class GranulometriaRascunhoSchema(BaseModel):
    tfsa: Optional[float] = None
    areiaBecker: Optional[float] = None
    areiaBeckerVazio: Optional[float] = None
    argilaBecker: Optional[float] = None
    argilaBeckerVazio: Optional[float] = None
    naohBecker: Optional[float] = None
    naohBeckerVazio: Optional[float] = None


class RascunhoAnaliseInput(BaseModel):
    versaoEsperada: int
    quimica: Optional[QuimicaRascunhoSchema] = None
    granulometria: Optional[GranulometriaRascunhoSchema] = None
    calibracao: Optional[CalibracaoLinearSchema] = None


# Schemas para Processamento Oficial
class CampoComBrancoObrigatorio(BaseModel):
    medido: float
    branco: float = 0.0


class QuimicaProcessarSchema(BaseModel):
    ph: float
    fosforoAbsBruta: float
    sodioMgL: float
    potassioMgL: float
    calcio: CampoComBrancoObrigatorio
    magnesio: CampoComBrancoObrigatorio
    aluminio: CampoComBrancoObrigatorio
    acidezPotencial: CampoComBrancoObrigatorio


class GranulometriaProcessarSchema(BaseModel):
    tfsa: float
    areiaBecker: float
    areiaBeckerVazio: float
    argilaBecker: float
    argilaBeckerVazio: float
    naohBecker: float
    naohBeckerVazio: float


class CalibracaoProcessarSchema(BaseModel):
    a: float
    b: float
    r2: float
    pontos: Optional[List[PontoCalibracaoSchema]] = None


class ProcessarAnaliseInput(BaseModel):
    versaoEsperada: int
    quimica: QuimicaProcessarSchema
    granulometria: GranulometriaProcessarSchema
    calibracao: CalibracaoProcessarSchema


# Respostas da API
class AmostraInfoSchema(BaseModel):
    solicitante: str
    propriedade: str
    dataColeta: Optional[str] = None


class DadosBancadaSchema(BaseModel):
    quimica: QuimicaRascunhoSchema
    granulometria: GranulometriaRascunhoSchema
    calibracao: Optional[CalibracaoLinearSchema] = None


class ObterAnaliseDataSchema(BaseModel):
    protocolo: str
    status: str
    versao: int
    amostra: AmostraInfoSchema
    dadosBancada: DadosBancadaSchema
    atualizadoEm: Optional[str] = None
    atualizadoPor: Optional[str] = None


class ObterAnaliseResponse(BaseModel):
    sucesso: bool = True
    dados: ObterAnaliseDataSchema


class RascunhoSalvoDataSchema(BaseModel):
    protocolo: str
    status: str
    novaVersao: int
    salvoEm: str


class RascunhoSalvoResponse(BaseModel):
    sucesso: bool = True
    mensagem: str = "Rascunho salvo com sucesso."
    dados: RascunhoSalvoDataSchema


class CalculosOficiaisSchema(BaseModel):
    valoresLiquidos: dict[str, float]
    conversoes: dict[str, float]
    complexoSortivo: dict[str, Any]
    granulometria: dict[str, Any]
    fosforo: dict[str, float]


class ProcessarAnaliseDataSchema(BaseModel):
    protocolo: str
    status: str
    novaVersao: int
    calculosOficiais: CalculosOficiaisSchema
    processadoEm: str
    processadoPor: Optional[str] = None


class ProcessarAnaliseResponse(BaseModel):
    sucesso: bool = True
    mensagem: str = "Dados processados e cálculos consolidados com sucesso. Amostra pronta para homologação."
    dados: ProcessarAnaliseDataSchema
