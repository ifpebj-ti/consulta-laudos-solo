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
