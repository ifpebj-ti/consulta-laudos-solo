import logging

from sqlalchemy import select

from src.core.database import Base, async_engine, async_session_factory
from src.models import AnaliseBancada, Laudo

logger = logging.getLogger(__name__)

AMOSTRAS_SEED = [
    {
        "protocolo": "LAB-2026-0142",
        "cpf_cliente": "52998224725",
        "cliente_nome": "Antônio S. Lima",
        "propriedade": "Sítio Boa Vista",
        "status": "EM_ANALISE",
        "versao": 3,
        "quimica": {
            "ph": 5.4,
            "fosforo_abs": 0.612,
            "sodio_mg_l": 12.0,
            "potassio_mg_l": 45.0,
            "ca_medido": 2.1,
            "ca_branco": 0.0,
            "mg_medido": 0.85,
            "mg_branco": 0.0,
            "al_medido": 0.3,
            "al_branco": 0.0,
            "h_al_medido": 3.2,
            "h_al_branco": 0.0,
        },
        "granulometria": {
            "tfsa": 20.0,
            "areia_becker": 15.9312,
            "areia_vazio": 4.492,
            "argila_becker": 4.5824,
            "argila_vazio": 4.4899,
            "naoh_becker": 4.479,
            "naoh_vazio": 4.4711,
        },
        "calibracao": {
            "calib_a": 0.033,
            "calib_b": 0.019,
            "calib_r2": 0.9998,
            "calib_pontos": [
                {"x": 0.0, "y": 0.02},
                {"x": 5.0, "y": 0.18},
                {"x": 10.0, "y": 0.35},
                {"x": 15.0, "y": 0.52},
                {"x": 20.0, "y": 0.68},
            ],
        },
    },
    {
        "protocolo": "20101.2306",
        "cpf_cliente": "52998224725",
        "cliente_nome": "João da Silva",
        "propriedade": "Fazenda Boa Vista",
        "status": "PENDENTE",
        "versao": 1,
    },
    {
        "protocolo": "2026-SOLO-00123",
        "cpf_cliente": "52998224725",
        "cliente_nome": "Maria Santos",
        "propriedade": "Sítio Primavera",
        "status": "PENDENTE",
        "versao": 1,
    },
]


async def init_db():
    """Cria tabelas no banco de dados e semeia amostras padrão caso não existam."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        for seed in AMOSTRAS_SEED:
            stmt = select(Laudo).where(Laudo.protocolo == seed["protocolo"])
            result = await session.execute(stmt)
            existente = result.scalar_one_or_none()

            if not existente:
                laudo = Laudo(
                    protocolo=seed["protocolo"],
                    cpf_cliente=seed["cpf_cliente"],
                    cliente_nome=seed["cliente_nome"],
                    propriedade=seed["propriedade"],
                    status=seed["status"],
                    versao=seed["versao"],
                )
                session.add(laudo)
                await session.flush()

                if "quimica" in seed:
                    bancada = AnaliseBancada(
                        laudo_id=laudo.id,
                        **seed["quimica"],
                        **seed["granulometria"],
                        **seed["calibracao"],
                    )
                    session.add(bancada)

        await session.commit()
