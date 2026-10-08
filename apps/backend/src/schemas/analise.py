<<<<<<< Updated upstream
from typing import Any

=======
from datetime import date, datetime
from typing import Any, List, Literal, Optional
>>>>>>> Stashed changes
from pydantic import BaseModel, Field


class PontoCalibracaoSchema(BaseModel):
    x: float
    y: float


class CalibracaoLinearSchema(BaseModel):
    a: float | None = None
    b: float | None = None
    r2: float | None = None
    pontos: list[PontoCalibracaoSchema] | None = None


class CampoComBrancoSchema(BaseModel):
    medido: float | None = None
    branco: float | None = 0.0


# Schemas para Rascunho (Parcial/Opcional)
class QuimicaRascunhoSchema(BaseModel):
    ph: float | None = None
    fosforoAbsBruta: float | None = None
    sodioMgL: float | None = None
    potassioMgL: float | None = None
    calcio: CampoComBrancoSchema | None = None
    magnesio: CampoComBrancoSchema | None = None
    aluminio: CampoComBrancoSchema | None = None
    acidezPotencial: CampoComBrancoSchema | None = None


class GranulometriaRascunhoSchema(BaseModel):
    tfsa: float | None = None
    areiaBecker: float | None = None
    areiaBeckerVazio: float | None = None
    argilaBecker: float | None = None
    argilaBeckerVazio: float | None = None
    naohBecker: float | None = None
    naohBeckerVazio: float | None = None


class RascunhoAnaliseInput(BaseModel):
    versaoEsperada: int
    quimica: QuimicaRascunhoSchema | None = None
    granulometria: GranulometriaRascunhoSchema | None = None
    calibracao: CalibracaoLinearSchema | None = None


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
    pontos: list[PontoCalibracaoSchema] | None = None


class ProcessarAnaliseInput(BaseModel):
    versaoEsperada: int
    quimica: QuimicaProcessarSchema
    granulometria: GranulometriaProcessarSchema
    calibracao: CalibracaoProcessarSchema


# Respostas da API
class AmostraInfoSchema(BaseModel):
    solicitante: str
    propriedade: str
    dataColeta: str | None = None


class DadosBancadaSchema(BaseModel):
    quimica: QuimicaRascunhoSchema
    granulometria: GranulometriaRascunhoSchema
    calibracao: CalibracaoLinearSchema | None = None


class ObterAnaliseDataSchema(BaseModel):
    protocolo: str
    status: str
    versao: int
    amostra: AmostraInfoSchema
    dadosBancada: DadosBancadaSchema
    atualizadoEm: str | None = None
    atualizadoPor: str | None = None


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
    processadoPor: str | None = None


class ProcessarAnaliseResponse(BaseModel):
    sucesso: bool = True
    mensagem: str = (
        "Dados processados e cálculos consolidados com sucesso. Amostra pronta para homologação."
    )
    dados: ProcessarAnaliseDataSchema


# Schemas para Cadastro de Nova Amostra (Laudo)
class CriarLaudoInput(BaseModel):
    protocolo: str = Field(
        ..., min_length=3, max_length=32, pattern=r"^[A-Za-z0-9\.\-_/]+$"
    )
    cpf_cliente: str = Field(..., min_length=11, max_length=14)
    cliente_nome: str = Field(..., min_length=2, max_length=255)
    propriedade: str = Field(..., min_length=2, max_length=255)
<<<<<<< Updated upstream
    localizacao: str | None = Field(None, max_length=255)
    areaIdentificacao: str | None = Field(None, max_length=100)
    areaHectares: str | None = Field(None, max_length=50)
    profundidadeColeta: str | None = Field(None, max_length=50)
    cultivo: str | None = Field(None, max_length=100)
=======
    localizacao: Optional[str] = Field(None, max_length=255)
    areaIdentificacao: Optional[str] = Field(None, max_length=100)
    areaHectares: Optional[str] = Field(None, max_length=50)
    profundidadeColeta: Optional[str] = Field(None, max_length=50)
    cultivo: Optional[str] = Field(None, max_length=100)
    dataRecebimento: Optional[date] = None
    tipoAnalise: Optional[Literal["fisica", "quimica", "fisico_quimica"]] = None
    culturaExistente: Optional[str] = Field(None, max_length=100)
    # Contato opcional do solicitante
    email: Optional[str] = Field(None, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    telefone: Optional[str] = Field(None, pattern=r"^\d{10,11}$")
>>>>>>> Stashed changes


class CriarLaudoDataSchema(BaseModel):
    protocolo: str
    cliente_nome: str
    propriedade: str
    status: str
    versao: int
    criadoEm: str


class CriarLaudoResponse(BaseModel):
    sucesso: bool = True
    mensagem: str = "Amostra/laudo cadastrado com sucesso."
    dados: CriarLaudoDataSchema
