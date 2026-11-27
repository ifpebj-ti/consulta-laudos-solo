import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class Laudo(Base):
    __tablename__ = "laudos"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    protocolo: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, nullable=False
    )
    cpf_cliente: Mapped[str] = mapped_column(String(11), nullable=False)
    cliente_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    propriedade: Mapped[str] = mapped_column(String(255), nullable=False)
    localizacao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    area_identificacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    area_hectares: Mapped[str | None] = mapped_column(String(50), nullable=True)
    profundidade_coleta: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cultivo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_recebimento: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tipo_analise: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cultura_existente: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email_cliente: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefone_cliente: Mapped[str | None] = mapped_column(String(50), nullable=True)

    analista_id: Mapped[str | None] = mapped_column(
        String(255), index=True, nullable=True
    )
    analista_nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    analista_crea: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[str] = mapped_column(
        String(32), default="PENDENTE", index=True, nullable=False
    )
    versao: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    atualizado_por: Mapped[str | None] = mapped_column(String(255), nullable=True)
    homologado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    homologado_por: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relacionamentos 1:1
    bancada: Mapped["AnaliseBancada | None"] = relationship(
        "AnaliseBancada",
        back_populates="laudo",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    resultado_calculado: Mapped["ResultadoCalculado | None"] = relationship(
        "ResultadoCalculado",
        back_populates="laudo",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
