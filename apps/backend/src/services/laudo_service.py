from datetime import datetime, timezone
import secrets
from typing import Dict, Optional

# Base de dados simulada em memória (mock temporário até camada de persistência/banco)
BASE_LAUDOS_MOCK: Dict[str, dict] = {
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
    }
}


class LaudoAuthService:
    @staticmethod
    def autenticar_cliente(protocolo: str, cpf_limpo: str) -> Optional[dict]:
        """
        Valida a consulta do cliente.
        Mitigação de timing attacks e enumeração (VULN-02):
        Usa secrets.compare_digest para comparar o CPF em tempo constante.
        Retorna o laudo se tudo bater ou None se inválido/inexistente.
        """
        laudo = BASE_LAUDOS_MOCK.get(protocolo)
        if not laudo:
            # Timing mitigation: executa comparação dummy para manter o tempo equivalente
            secrets.compare_digest(cpf_limpo, "00000000000")
            return None

        # Comparação em tempo constante
        if not secrets.compare_digest(laudo["cpf"], cpf_limpo):
            return None

        return laudo

    @staticmethod
    def mascarar_cpf(cpf: str) -> str:
        """Formata o CPF no padrão: ***.456.789-**"""
        if len(cpf) != 11:
            return "***.***.***-**"
        return f"***.{cpf[3:6]}.{cpf[6:9]}-**"
