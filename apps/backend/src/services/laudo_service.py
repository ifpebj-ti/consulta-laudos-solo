import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.laudo import Laudo


class LaudoAuthService:
    @staticmethod
    async def autenticar_cliente(
        protocolo: str, cpf_limpo: str, db: AsyncSession
    ) -> dict | None:
        """
        Valida a consulta do cliente buscando no banco de dados.
        Mitigação de timing attacks e enumeração (VULN-02):
        Usa secrets.compare_digest para comparar o CPF em tempo constante.
        Retorna os dados do laudo se tudo bater ou None se inválido/inexistente.
        """
        stmt = select(Laudo).where(Laudo.protocolo == protocolo)
        result = await db.execute(stmt)
        laudo = result.scalar_one_or_none()

        if not laudo:
            # Timing mitigation: executa comparação dummy para manter tempo equivalente
            secrets.compare_digest(cpf_limpo, "00000000000")
            return None

        # Laudo existe mas não está concluído — cliente não pode consultar ainda
        if laudo.status not in ("CONCLUIDO", "AGUARDANDO_HOMOLOGACAO"):
            secrets.compare_digest(cpf_limpo, "00000000000")
            return None

        # Comparação em tempo constante
        if not secrets.compare_digest(laudo.cpf_cliente, cpf_limpo):
            return None

        return {
            "protocolo": laudo.protocolo,
            "cpf": laudo.cpf_cliente,
            "status": laudo.status,
            "cliente_nome": laudo.cliente_nome,
            "propriedade": laudo.propriedade,
            "data_emissao": laudo.atualizado_em or laudo.criado_em,
            "parametros": {
                "ph": None,
                "materiaOrganica": None,
                "fosforo": None,
                "potassio": None,
            },
            "tem_pdf": False,
        }

    @staticmethod
    def mascarar_cpf(cpf: str) -> str:
        """Formata o CPF no padrão: ***.456.789-**"""
        if len(cpf) != 11:
            return "***.***.***-**"
        return f"***.{cpf[3:6]}.{cpf[6:9]}-**"
