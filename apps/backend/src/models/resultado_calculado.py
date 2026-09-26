import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class ResultadoCalculado(Base):
    __tablename__ = "resultados_calculados"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    laudo_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("laudos.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Complexo Sortivo
    soma_bases: Mapped[float] = mapped_column(Float, nullable=False)
    ctc_efetiva: Mapped[float] = mapped_column(Float, nullable=False)
    ctc_potencial: Mapped[float] = mapped_column(Float, nullable=False)
    saturacao_bases_v: Mapped[float] = mapped_column(Float, nullable=False)
    saturacao_al_m: Mapped[float] = mapped_column(Float, nullable=False)
    relacao_ca_mg: Mapped[float | None] = mapped_column(Float, nullable=True)
    relacao_ca_k: Mapped[float | None] = mapped_column(Float, nullable=True)
    relacao_mg_k: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Granulometria e Textura
    pct_areia: Mapped[float] = mapped_column(Float, nullable=False)
    pct_silte: Mapped[float] = mapped_column(Float, nullable=False)
    pct_argila: Mapped[float] = mapped_column(Float, nullable=False)
    classe_textural: Mapped[str] = mapped_column(String(64), nullable=False)

    # Fósforo
    fosforo_mg_dm3: Mapped[float] = mapped_column(Float, nullable=False)

    calculado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    laudo: Mapped["Laudo"] = relationship("Laudo", back_populates="resultado_calculado")
