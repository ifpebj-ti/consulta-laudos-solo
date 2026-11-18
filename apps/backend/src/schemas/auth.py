import re

from pydantic import BaseModel, Field, field_validator


def validar_digitos_cpf(cpf: str) -> bool:
    """Valida os dígitos verificadores do CPF (módulo 11)."""
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    # Primeiro dígito
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10 % 11) % 10
    if digito1 != int(cpf[9]):
        return False

    # Segundo dígito
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10 % 11) % 10
    return digito2 == int(cpf[10])


class LoginGoogleRequest(BaseModel):
    idToken: str = Field(
        ...,
        min_length=10,
        description="Token JWT retornado pelo Google Identity Services",
    )


class LoginLocalRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Nome de usuário local",
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Senha do usuário local",
    )


class UsuarioAnalistaResponse(BaseModel):
    id: str | None = None
    nome: str
    email: str
    role: str = "ANALISTA"
    crea: str | None = None
    escopoAnalistaId: str | None = None
    responsavelNome: str | None = None
    responsavelCrea: str | None = None


class LoginGoogleResponse(BaseModel):
    sucesso: bool = True
    token: str
    tipoToken: str = "Bearer"
    usuario: UsuarioAnalistaResponse


class LoginClienteRequest(BaseModel):
    protocolo: str = Field(
        ...,
        min_length=8,
        max_length=30,
        description="Número identificador do protocolo",
    )
    cpf: str = Field(..., description="CPF do cliente (apenas números ou pontuado)")

    @field_validator("protocolo")
    @classmethod
    def validate_protocolo_format(cls, v: str) -> str:
        protocolo = v.strip().upper()
        # Regex estrito: apenas letras, números e traço/ponto para mitigar Path Traversal e Injeção
        if not re.match(r"^[A-Z0-9.-]{8,30}$", protocolo):
            raise ValueError(
                "Formato de protocolo inválido. Use caracteres alfanuméricos, pontos ou traços."
            )
        return protocolo

    @field_validator("cpf")
    @classmethod
    def validate_cpf_format(cls, v: str) -> str:
        digitos = re.sub(r"\D", "", v)
        if not validar_digitos_cpf(digitos):
            raise ValueError("CPF inválido.")
        return digitos


class UsuarioMeResponse(BaseModel):
    sub: str
    role: str
    nome: str | None = None
    email: str | None = None
    crea: str | None = None
    escopoAnalistaId: str | None = None
    responsavelNome: str | None = None
    responsavelCrea: str | None = None
    protocolo: str | None = None


class CriarAnalistaRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    crea: str = Field(..., min_length=2, max_length=100)


class CriarAuxiliarRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuxiliarItemResponse(BaseModel):
    id: str
    nome: str
    email: str
    criadoEm: str


class AnalistaPrincipalItemResponse(BaseModel):
    id: str
    nome: str
    email: str
    crea: str
    criadoEm: str
    auxiliares: list[AuxiliarItemResponse] = []


class ListarAnalistasResponse(BaseModel):
    sucesso: bool = True
    dados: list[AnalistaPrincipalItemResponse]


class ListarAuxiliaresResponse(BaseModel):
    sucesso: bool = True
    dados: list[AuxiliarItemResponse]
