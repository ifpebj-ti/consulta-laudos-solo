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
    propriedade: str
    dataEmissao: datetime
    parametrosSolo: ParametrosSoloResponse
    temPdfDisponivel: bool = False


class LoginClienteResponse(BaseModel):
    sucesso: bool = True
    token: str
    tipoToken: str = "Bearer"
    laudo: LaudoDetalheResponse


class RespostaErroPadrao(BaseModel):
    sucesso: bool = False
    mensagem: str
    codigoErro: str | None = None
