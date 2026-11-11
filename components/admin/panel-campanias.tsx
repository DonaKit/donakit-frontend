"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import {
  obtenerCampaniasDashboard,
  actualizarCampaniaAdmin,
  type CampaniaDashboard,
  type EstadoCampania,
} from "@/lib/api";
import { INSTITUCION } from "@/lib/institucion";
import { diasHasta, fechaCorta } from "@/lib/fechas";

/* ============================================================================
   US-19/US-20 — Panel de Gestión y Métricas de Campañas
   ----------------------------------------------------------------------------
   Muestra el listado de todas las solicitudes de donación con sus métricas
   clave (visitas acumuladas a la landing/QR, donantes asistidos y porcentaje
   de avance), junto con filtros y acciones administrativas rápidas.
   ========================================================================== */

type FiltroEstado = "ALL" | EstadoCampania;
type Orden = "recientes" | "visitas" | "donantes" | "urgencia";

const ETIQUETAS_ESTADO: Record<EstadoCampania, { texto: string; clases: string }> = {
  ACTIVE: {
    texto: "Activa",
    clases: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
  },
  DRAFT: {
    texto: "Borrador",
    clases: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
  },
  COMPLETED: {
    texto: "Completada",
    clases: "bg-sky-50 text-sky-800 ring-1 ring-sky-600/20",
  },
  EXPIRED: {
    texto: "Vencida",
    clases: "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20",
  },
  CANCELLED: {
    texto: "Cancelada",
    clases: "bg-ink-100 text-ink-700 ring-1 ring-ink-300",
  },
};

export function PanelCampanias() {
  const router = useRouter();
  const [campanias, setCampanias] = useState<CampaniaDashboard[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y búsqueda
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<FiltroEstado>("ALL");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");

  // Feedback de acciones rápidas
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerCampaniasDashboard({
      status: estadoSeleccionado === "ALL" ? undefined : estadoSeleccionado,
    });
    if (res.ok) {
      setCampanias(res.datos.campanias);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      setError(res.error);
    }
    setCargando(false);
  }, [estadoSeleccionado, router]);

  useEffect(() => {
    let montado = true;

    void obtenerCampaniasDashboard({
      status: estadoSeleccionado === "ALL" ? undefined : estadoSeleccionado,
    }).then((res) => {
      if (!montado) return;
      if (res.ok) {
        setCampanias(res.datos.campanias);
      } else if (res.requiereLogin) {
        router.replace("/login");
        return;
      } else {
        setError(res.error);
      }
      setCargando(false);
    });

    return () => {
      montado = false;
    };
  }, [estadoSeleccionado, router]);

  // Manejo de +1 Donante
  async function handleSumarDonante(c: CampaniaDashboard) {
    const instId = c.institution?.id || INSTITUCION.id;
    setAccionEnCurso(c.id);
    const res = await actualizarCampaniaAdmin(instId, c.id, {
      incrementDonors: 1,
    });

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) => (item.id === c.id ? res.datos : item)),
      );
      setMensajeExito(`Se registró +1 donante para ${c.patientName}`);
      setTimeout(() => setMensajeExito(null), 3500);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      alert(`Error al sumar donante: ${res.error}`);
    }
    setAccionEnCurso(null);
  }

  // Manejo de cerrar/completar campaña
  async function handleCompletarCampania(c: CampaniaDashboard) {
    if (!confirm(`¿Marcar la campaña de ${c.patientName} como completada?`)) {
      return;
    }
    const instId = c.institution?.id || INSTITUCION.id;
    setAccionEnCurso(c.id);
    const res = await actualizarCampaniaAdmin(instId, c.id, {
      status: "COMPLETED",
    });

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) => (item.id === c.id ? res.datos : item)),
      );
      setMensajeExito(`Campaña de ${c.patientName} marcada como completada.`);
      setTimeout(() => setMensajeExito(null), 3500);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      alert(`Error al completar la campaña: ${res.error}`);
    }
    setAccionEnCurso(null);
  }

  // Filtrado y ordenamiento en cliente
  const campaniasFiltradas = useMemo(() => {
    let lista = [...campanias];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      lista = lista.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.bloodType.toLowerCase().includes(q),
      );
    }

    lista.sort((a, b) => {
      if (orden === "visitas") {
        return (b.totalVisits ?? 0) - (a.totalVisits ?? 0);
      }
      if (orden === "donantes") {
        return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
      }
      if (orden === "urgencia") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      // "recientes" por defecto
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return lista;
  }, [campanias, busqueda, orden]);

  // Métricas acumuladas globales
  const kpis = useMemo(() => {
    const totalCampanias = campanias.length;
    const activas = campanias.filter((c) => c.status === "ACTIVE").length;
    const totalVisitas = campanias.reduce((acc, c) => acc + (c.totalVisits || 0), 0);
    const donantesConseguidos = campanias.reduce(
      (acc, c) => acc + (c.currentDonors || 0),
      0,
    );
    return { totalCampanias, activas, totalVisitas, donantesConseguidos };
  }, [campanias]);

  return (
    <div className="space-y-6">
      {/* Alerta de notificación flotante */}
      {mensajeExito && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all animate-bounce"
        >
          <Icon name="listo" size={18} />
          {mensajeExito}
        </div>
      )}

      {/* Tarjetas de Métricas Globales (KPIs) */}
      <section aria-label="Métricas globales" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-text-muted">Total Campañas</p>
          <p className="mt-1 font-display text-2xl font-bold text-navy-800 sm:text-3xl">
            {kpis.totalCampanias}
          </p>
          <p className="mt-1 text-xs text-text-secondary">En el sistema</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-700">Campañas Activas</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700 sm:text-3xl">
            {kpis.activas}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Recibiendo donantes</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-navy-600">
            <Icon name="visitas" size={15} />
            <span>Visitas Acumuladas</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-navy-700 sm:text-3xl">
            {kpis.totalVisitas}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Vistas a landings y QR</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <Icon name="donantes" size={15} />
            <span>Donantes Asistidos</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-red-600 sm:text-3xl">
            {kpis.donantesConseguidos}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Confirmados en hospital</p>
        </div>
      </section>

      {/* Barra de Filtros, Búsqueda y Orden */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs de estado */}
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
            {(
              [
                { id: "ALL", label: "Todas" },
                { id: "ACTIVE", label: "Activas" },
                { id: "DRAFT", label: "Borradores" },
                { id: "COMPLETED", label: "Completadas" },
                { id: "EXPIRED", label: "Vencidas" },
                { id: "CANCELLED", label: "Canceladas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={estadoSeleccionado === tab.id}
                onClick={() => {
                  setCargando(true);
                  setEstadoSeleccionado(tab.id);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  estadoSeleccionado === tab.id
                    ? "bg-navy-700 text-white"
                    : "bg-ink-100 text-text-secondary hover:bg-ink-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Botón de Refrescar */}
          <button
            onClick={recargar}
            disabled={cargando}
            aria-label="Actualizar datos"
            className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-ink-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icon
              name="recargar"
              size={14}
              className={cargando ? "animate-spin" : ""}
            />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Input de búsqueda */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              <Icon name="buscar" size={16} />
            </div>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por paciente, slug o grupo (ej. A+, Garrahan)..."
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>

          {/* Selector de ordenamiento */}
          <div className="flex items-center gap-2">
            <label htmlFor="ordenar" className="text-xs font-medium text-text-muted whitespace-nowrap">
              Ordenar por:
            </label>
            <select
              id="ordenar"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary focus:border-navy-500 focus:outline-none cursor-pointer"
            >
              <option value="recientes">Más recientes</option>
              <option value="visitas">Más visitas (Métricas)</option>
              <option value="donantes">Mayor avance de donantes</option>
              <option value="urgencia">Fecha límite (Urgencia)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estado de Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={recargar}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Skeletons de Carga */}
      {cargando && (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-border bg-surface p-4 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {!cargando && !error && campaniasFiltradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface py-12 px-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-600">
            <Icon name="buscar" size={24} />
          </div>
          <h3 className="mt-3 text-base font-semibold text-text-primary">
            No se encontraron campañas
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {busqueda
              ? "Probá ajustando el término de búsqueda o seleccionando otro filtro."
              : "No hay campañas cargadas en este estado."}
          </p>
        </div>
      )}

      {/* Lista de Campañas */}
      {!cargando && !error && campaniasFiltradas.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-muted">
            Mostrando {campaniasFiltradas.length} de {campanias.length} campañas
          </p>

          <div className="grid gap-3">
            {campaniasFiltradas.map((c) => {
              const estado = ETIQUETAS_ESTADO[c.status] || {
                texto: c.status,
                clases: "bg-ink-100 text-ink-700",
              };

              const meta = c.targetDonors;
              const actuales = c.currentDonors ?? 0;
              const porcentaje =
                c.progressPercentage ?? (meta ? Math.min(100, Math.round((actuales / meta) * 100)) : null);

              // Cálculo de días restantes
              const dias = c.deadline ? diasHasta(c.deadline) : null;
              const esVencida = dias !== null && dias < 0;
              const esUrgente = dias !== null && dias >= 0 && dias <= 3;

              return (
                <article
                  key={c.id}
                  className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs hover:border-navy-300 transition-colors"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Datos del Paciente e Institución */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white">
                          {c.bloodType}
                        </span>
                        <h3 className="font-display text-base sm:text-lg font-bold text-text-primary truncate">
                          {c.patientName}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${estado.clases}`}
                        >
                          {estado.texto}
                        </span>
                        {c.donationType && (
                          <span className="text-xs text-text-muted bg-ink-100 px-2 py-0.5 rounded">
                            {c.donationType}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Icon name="institucion" size={14} className="text-text-muted" />
                          {c.institution?.name ?? INSTITUCION.nombre}
                        </span>
                        <span>•</span>
                        <span>Creado: {fechaCorta(c.createdAt)}</span>
                        {c.deadline && (
                          <>
                            <span>•</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${
                                esVencida
                                  ? "text-rose-700 font-bold"
                                  : esUrgente
                                    ? "text-amber-700 font-bold"
                                    : "text-text-secondary"
                              }`}
                            >
                              <Icon name="fechaLimite" size={14} />
                              {esVencida
                                ? `Venció el ${fechaCorta(c.deadline)}`
                                : dias === 0
                                  ? "Vence hoy"
                                  : `Límite: ${fechaCorta(c.deadline)} (${dias} d)`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Métricas destacadas: Visitas y Donantes */}
                    <div className="flex items-center gap-4 sm:gap-6 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                      {/* Métrica de Visitas */}
                      <div className="text-center sm:text-right min-w-[80px]">
                        <p className="flex items-center justify-center sm:justify-end gap-1 text-xs font-medium text-navy-600">
                          <Icon name="visitas" size={15} />
                          <span>Visitas</span>
                        </p>
                        <p className="mt-0.5 font-display text-xl font-bold text-navy-800">
                          {c.totalVisits}
                        </p>
                      </div>

                      {/* Métrica de Donantes y Avance */}
                      <div className="min-w-[130px] sm:min-w-[150px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-text-secondary">Donantes</span>
                          <span className="font-bold text-text-primary">
                            {actuales} {meta ? `/ ${meta}` : ""}
                          </span>
                        </div>
                        {meta ? (
                          <div className="w-full h-2 rounded-full bg-ink-200 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                (porcentaje ?? 0) >= 100 ? "bg-emerald-600" : "bg-red-600"
                              }`}
                              style={{ width: `${Math.min(100, porcentaje ?? 0)}%` }}
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-text-muted italic">Sin meta fijada</p>
                        )}
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                      {/* Ver Landing Pública (modo vista previa para no sumar a las métricas) */}
                      <Link
                        href={`/c/${encodeURIComponent(c.slug)}?preview=true`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-ink-50 transition-colors"
                        title="Ver landing pública del pedido (modo vista previa, no suma visitas)"
                      >
                        <Icon name="enlaceExterno" size={14} />
                        <span className="hidden sm:inline">Landing</span>
                      </Link>

                      {/* Botón rápido +1 donante */}
                      {c.status === "ACTIVE" && (
                        <button
                          onClick={() => handleSumarDonante(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                          title="Registrar un nuevo donante que asistió al hospital"
                        >
                          <Icon name="mas" size={14} />
                          <span>+1 Donante</span>
                        </button>
                      )}

                      {/* Botón marcar completada */}
                      {c.status === "ACTIVE" && (
                        <button
                          onClick={() => handleCompletarCampania(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Marcar la campaña como completada"
                        >
                          <Icon name="listo" size={14} />
                          <span className="hidden md:inline">Completar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

