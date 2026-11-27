from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ClienteInfoResponse(BaseModel):
    nome: str
    cpfMascarado: str


class ParametrosSoloResponse(BaseModel):
    ph: float | None = None
    materiaOrganica: str | None = None
    fosforo: str | None = None
    potassio: str | None = None
    dadosAdicionais: dict[str, Any] | None = None


class LaudoDetalheResponse(BaseModel):
    protocolo: str
    status: str
    cliente: ClienteInfoResponse
    propriedade: str | None = None
    dataEmissao: datetime | None = None
    parametrosSolo: ParametrosSoloResponse
    temPdfDisponivel: bool = False
    dataPrevistaEntrega: str | None = None
    versao: int | None = None
    atualizadoEm: str | None = None


class SituacaoLaudoResponse(BaseModel):
    sucesso: bool = True
    laudo: LaudoDetalheResponse


class LoginClienteResponse(BaseModel):
    sucesso: bool = True
    token: str
    tipoToken: str = "Bearer"
    laudo: LaudoDetalheResponse


class RespostaErroPadrao(BaseModel):
    sucesso: bool = False
    mensagem: str
    codigoErro: str | None = None
