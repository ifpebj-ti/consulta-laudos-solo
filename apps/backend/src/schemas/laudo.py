from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel


class ClienteInfoResponse(BaseModel):
    nome: str
    cpfMascarado: str


class ParametrosSoloResponse(BaseModel):
    ph: Optional[float] = None
    materiaOrganica: Optional[str] = None
    fosforo: Optional[str] = None
    potassio: Optional[str] = None
    dadosAdicionais: Optional[Dict[str, Any]] = None


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
    codigoErro: Optional[str] = None
