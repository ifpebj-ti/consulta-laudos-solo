import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class AnaliseBancada(Base):
    __tablename__ = "analises_bancada"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    laudo_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("laudos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Atributos Químicos Brutos
    ph: Mapped[float | None] = mapped_column(Float, nullable=True)
    fosforo_abs: Mapped[float | None] = mapped_column(Float, nullable=True)
    sodio_mg_l: Mapped[float | None] = mapped_column(Float, nullable=True)
    potassio_mg_l: Mapped[float | None] = mapped_column(Float, nullable=True)

    ca_medido: Mapped[float | None] = mapped_column(Float, nullable=True)
    ca_branco: Mapped[float | None] = mapped_column(Float, default=0.0, nullable=True)
    mg_medido: Mapped[float | None] = mapped_column(Float, nullable=True)
    mg_branco: Mapped[float | None] = mapped_column(Float, default=0.0, nullable=True)
    al_medido: Mapped[float | None] = mapped_column(Float, nullable=True)
    al_branco: Mapped[float | None] = mapped_column(Float, default=0.0, nullable=True)
    h_al_medido: Mapped[float | None] = mapped_column(Float, nullable=True)
    h_al_branco: Mapped[float | None] = mapped_column(Float, default=0.0, nullable=True)

    # Atributos Físicos / Granulometria
    tfsa: Mapped[float | None] = mapped_column(Float, nullable=True)
    areia_becker: Mapped[float | None] = mapped_column(Float, nullable=True)
    areia_vazio: Mapped[float | None] = mapped_column(Float, nullable=True)
    argila_becker: Mapped[float | None] = mapped_column(Float, nullable=True)
    argila_vazio: Mapped[float | None] = mapped_column(Float, nullable=True)
    naoh_becker: Mapped[float | None] = mapped_column(Float, nullable=True)
    naoh_vazio: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Curva de Calibração acoplada à amostra
    calib_a: Mapped[float | None] = mapped_column(Float, nullable=True)
    calib_b: Mapped[float | None] = mapped_column(Float, nullable=True)
    calib_r2: Mapped[float | None] = mapped_column(Float, nullable=True)
    calib_pontos: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )

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

    laudo: Mapped["Laudo"] = relationship("Laudo", back_populates="bancada")
