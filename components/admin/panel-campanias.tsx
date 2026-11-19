"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { Dialogo } from "@/components/ui/dialogo";
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

type FiltroEstado = "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "ALL";
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

  // Filtros y búsqueda (Activas por defecto)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<FiltroEstado>("ACTIVE");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");

  // Feedback de acciones rápidas
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modal para reabrir campaña (vencida o completada)
  const [campaniaAReabrir, setCampaniaAReabrir] = useState<CampaniaDashboard | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaMeta, setNuevaMeta] = useState("");
  const [guardandoReapertura, setGuardandoReapertura] = useState(false);
  const [errorReapertura, setErrorReapertura] = useState<string | null>(null);

  // Modal para modificar cantidad de donantes y meta en campañas activas
  const [campaniaAEditarDonantes, setCampaniaAEditarDonantes] = useState<CampaniaDashboard | null>(null);
  const [editCurrentDonors, setEditCurrentDonors] = useState<number>(0);
  const [editTargetDonors, setEditTargetDonors] = useState<string>("");
  const [guardandoDonantes, setGuardandoDonantes] = useState(false);
  const [errorDonantes, setErrorDonantes] = useState<string | null>(null);

  // Paginación en cliente
  const ELEMENTOS_POR_PAGINA = 30;
  const [paginaActual, setPaginaActual] = useState(1);

  // Métricas globales acumuladas para los 4 KPIs superiores
  const [metricasGlobales, setMetricasGlobales] = useState<{
    totalCampanias: number;
    activas: number;
    totalVisitas: number;
    donantesConseguidos: number;
  } | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await obtenerCampaniasDashboard({
      status: estadoSeleccionado,
    });
    if (res.ok) {
      setCampanias(res.datos.campanias);
      if (res.datos.summary) {
        setMetricasGlobales({
          totalCampanias: res.datos.summary.totalCampanias ?? res.datos.total,
          activas: res.datos.summary.activas ?? 0,
          totalVisitas: res.datos.summary.totalVisitas ?? 0,
          donantesConseguidos: res.datos.summary.donantesConseguidos ?? 0,
        });
      }
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      setError(res.error);
    }
    setCargando(false);
  }, [estadoSeleccionado, router]);

  // Consulta inicial de campañas para la pestaña seleccionada
  useEffect(() => {
    let montado = true;

    void obtenerCampaniasDashboard({
      status: estadoSeleccionado,
    }).then((res) => {
      if (!montado) return;
      if (res.ok) {
        setCampanias(res.datos.campanias);
        if (res.datos.summary) {
          setMetricasGlobales({
            totalCampanias: res.datos.summary.totalCampanias ?? res.datos.total,
            activas: res.datos.summary.activas ?? 0,
            totalVisitas: res.datos.summary.totalVisitas ?? 0,
            donantesConseguidos: res.datos.summary.donantesConseguidos ?? 0,
          });
        }
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

  // Cálculo de KPIs globales para la institución (no varían por pestaña)
  useEffect(() => {
    if (!metricasGlobales) {
      void obtenerCampaniasDashboard({ status: "ALL" }).then((r) => {
        if (r.ok) {
          const list = r.datos.campanias;
          setMetricasGlobales({
            totalCampanias: r.datos.summary?.totalCampanias ?? r.datos.total ?? list.length,
            activas: r.datos.summary?.activas ?? list.filter((c) => c.status === "ACTIVE").length,
            totalVisitas: r.datos.summary?.totalVisitas ?? list.reduce((acc, c) => acc + (c.totalVisits || 0), 0),
            donantesConseguidos: r.datos.summary?.donantesConseguidos ?? list.reduce((acc, c) => acc + (c.currentDonors || 0), 0),
          });
        }
      });
    }
  }, [metricasGlobales]);

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

  // Manejo de −1 donante: aplica decremento atómico seguro (solo campañas activas)
  async function handleRestarDonante(c: CampaniaDashboard) {
    const actuales = c.currentDonors ?? 0;
    if (actuales <= 0) return;

    if (
      c.status === "COMPLETED" &&
      c.targetDonors !== null &&
      actuales >= c.targetDonors
    ) {
      alert(
        "No está permitido restar donantes en una campaña completada con meta alcanzada. Debe reabrir la campaña primero.",
      );
      return;
    }

    const instId = c.institution?.id || INSTITUCION.id;
    setAccionEnCurso(c.id);

    // Intenta decremento atómico primero
    let res = await actualizarCampaniaAdmin(instId, c.id, {
      incrementDonors: -1,
    });

    // Fallback de compatibilidad si el backend aún no desplegó el soporte a incrementDonors negativo
    if (!res.ok) {
      res = await actualizarCampaniaAdmin(instId, c.id, {
        currentDonors: Math.max(0, actuales - 1),
      });
    }

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) => (item.id === c.id ? res.datos : item)),
      );
      setMensajeExito(`Se descontó 1 donante de ${c.patientName}`);
      setTimeout(() => setMensajeExito(null), 3500);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      alert(`Error al descontar donante: ${res.error}`);
    }
    setAccionEnCurso(null);
  }

  // Apertura del modal para modificar cantidad de donantes y meta (campañas activas)
  function abrirModalDonantes(c: CampaniaDashboard) {
    setErrorDonantes(null);
    setCampaniaAEditarDonantes(c);
    setEditCurrentDonors(c.currentDonors ?? 0);
    setEditTargetDonors(
      c.targetDonors !== null && c.targetDonors !== undefined
        ? String(c.targetDonors)
        : "",
    );
  }

  // Guardado de cantidad de donantes y meta
  async function handleGuardarDonantes() {
    if (!campaniaAEditarDonantes) return;
    setErrorDonantes(null);

    const currentParsed = Number(editCurrentDonors);
    if (
      Number.isNaN(currentParsed) ||
      currentParsed < 0 ||
      !Number.isInteger(currentParsed)
    ) {
      setErrorDonantes(
        "La cantidad de donantes conseguidos debe ser un número entero mayor o igual a 0.",
      );
      return;
    }

    let targetParsed: number | null = null;
    if (editTargetDonors.trim() !== "") {
      const t = Number(editTargetDonors);
      if (Number.isNaN(t) || t < 1 || !Number.isInteger(t)) {
        setErrorDonantes(
          "La meta de donantes debe ser un número entero mayor o igual a 1 (o dejarse vacía si es sin límite).",
        );
        return;
      }
      targetParsed = t;
    }

    setGuardandoDonantes(true);
    const instId = campaniaAEditarDonantes.institution?.id || INSTITUCION.id;
    const res = await actualizarCampaniaAdmin(instId, campaniaAEditarDonantes.id, {
      currentDonors: currentParsed,
      targetDonors: targetParsed,
    });

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) =>
          item.id === campaniaAEditarDonantes.id ? res.datos : item,
        ),
      );
      setMensajeExito(
        `Donantes actualizados para ${campaniaAEditarDonantes.patientName}.`,
      );
      setTimeout(() => setMensajeExito(null), 3500);
      setCampaniaAEditarDonantes(null);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      setErrorDonantes(res.error);
    }
    setGuardandoDonantes(false);
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

  // Manejo de cancelar campaña
  async function handleCancelarCampania(c: CampaniaDashboard) {
    if (
      !confirm(
        `¿Estás seguro de que deseas cancelar la campaña de ${c.patientName}? Esta acción dará de baja la solicitud de donación.`,
      )
    ) {
      return;
    }
    const instId = c.institution?.id || INSTITUCION.id;
    setAccionEnCurso(c.id);
    const res = await actualizarCampaniaAdmin(instId, c.id, {
      status: "CANCELLED",
    });

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) => (item.id === c.id ? res.datos : item)),
      );
      setMensajeExito(`Campaña de ${c.patientName} cancelada.`);
      setTimeout(() => setMensajeExito(null), 3500);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      alert(`Error al cancelar la campaña: ${res.error}`);
    }
    setAccionEnCurso(null);
  }

  // Apertura del modal de reapertura (vencidas, completadas o canceladas)
  function abrirModalReapertura(c: CampaniaDashboard) {
    setErrorReapertura(null);
    setCampaniaAReabrir(c);
    // Sugerir fecha límite por defecto a 15 días desde hoy
    const fechaDefecto = new Date();
    fechaDefecto.setDate(fechaDefecto.getDate() + 15);
    setNuevaFecha(fechaDefecto.toISOString().split("T")[0]);

    // Si la campaña ya alcanzó su meta, sugerir ampliación (+5 donantes)
    const metaAlcanzada =
      c.targetDonors !== null && (c.currentDonors ?? 0) >= c.targetDonors;
    if (metaAlcanzada) {
      setNuevaMeta(String((c.currentDonors ?? c.targetDonors ?? 0) + 5));
    } else {
      setNuevaMeta(
        c.targetDonors !== null && c.targetDonors !== undefined
          ? String(c.targetDonors)
          : "",
      );
    }
  }

  // Confirmación de reapertura con reactivación y actualización de meta si correspondía
  async function handleConfirmarReapertura() {
    if (!campaniaAReabrir || !nuevaFecha) return;
    setErrorReapertura(null);

    const actuales = campaniaAReabrir.currentDonors ?? 0;
    const metaAlcanzadaPrevia =
      campaniaAReabrir.targetDonors !== null &&
      actuales >= campaniaAReabrir.targetDonors;

    let metaParaEnviar: number | null | undefined = undefined;

    if (nuevaMeta.trim() !== "") {
      const parsed = Number(nuevaMeta);
      if (Number.isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
        setErrorReapertura("La meta debe ser un número entero mayor a 0.");
        return;
      }
      if (metaAlcanzadaPrevia && parsed <= actuales) {
        setErrorReapertura(
          `Para reactivar la campaña, la nueva meta debe ser mayor a los donantes ya conseguidos (${actuales}) o dejarse vacía para pasar a sin límite.`,
        );
        return;
      }
      metaParaEnviar = parsed;
    } else if (metaAlcanzadaPrevia) {
      // Si se deja vacía al reactivar una con meta alcanzada, pasa a ser sin límite
      metaParaEnviar = null;
    }

    setGuardandoReapertura(true);
    const instId = campaniaAReabrir.institution?.id || INSTITUCION.id;

    const payload: {
      deadline: string;
      status: EstadoCampania;
      targetDonors?: number | null;
    } = {
      deadline: nuevaFecha,
      status: "ACTIVE",
    };

    if (metaParaEnviar !== undefined) {
      payload.targetDonors = metaParaEnviar;
    }

    const res = await actualizarCampaniaAdmin(
      instId,
      campaniaAReabrir.id,
      payload,
    );

    if (res.ok) {
      setCampanias((prev) =>
        prev.map((item) =>
          item.id === campaniaAReabrir.id ? res.datos : item,
        ),
      );
      setMensajeExito(
        `Campaña de ${campaniaAReabrir.patientName} reabierta como Activa.`,
      );
      setTimeout(() => setMensajeExito(null), 3500);
      setCampaniaAReabrir(null);
    } else if (res.requiereLogin) {
      router.replace("/login");
      return;
    } else {
      setErrorReapertura(res.error);
    }
    setGuardandoReapertura(false);
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

  // Paginación en cliente
  const totalPaginas = Math.ceil(campaniasFiltradas.length / ELEMENTOS_POR_PAGINA) || 1;
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
  const campaniasPaginadas = useMemo(() => {
    const inicio = (paginaValida - 1) * ELEMENTOS_POR_PAGINA;
    return campaniasFiltradas.slice(inicio, inicio + ELEMENTOS_POR_PAGINA);
  }, [campaniasFiltradas, paginaValida, ELEMENTOS_POR_PAGINA]);

  // Métricas acumuladas globales (utiliza totales institucionales para que no cambien por pestaña)
  const kpis = useMemo(() => {
    if (metricasGlobales) return metricasGlobales;
    const totalCampanias = campanias.length;
    const activas = campanias.filter((c) => c.status === "ACTIVE").length;
    const totalVisitas = campanias.reduce((acc, c) => acc + (c.totalVisits || 0), 0);
    const donantesConseguidos = campanias.reduce(
      (acc, c) => acc + (c.currentDonors || 0),
      0,
    );
    return { totalCampanias, activas, totalVisitas, donantesConseguidos };
  }, [campanias, metricasGlobales]);

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
          {/* Tabs de estado (Activas por defecto, Todas al final, sin Borradores) */}
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
            {(
              [
                { id: "ACTIVE", label: "Activas" },
                { id: "COMPLETED", label: "Completadas" },
                { id: "EXPIRED", label: "Vencidas" },
                { id: "CANCELLED", label: "Canceladas" },
                { id: "ALL", label: "Todas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={estadoSeleccionado === tab.id}
                onClick={() => {
                  setCargando(true);
                  setEstadoSeleccionado(tab.id);
                  setPaginaActual(1);
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
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
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
              onChange={(e) => {
                setOrden(e.target.value as Orden);
                setPaginaActual(1);
              }}
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
            Mostrando {(paginaValida - 1) * ELEMENTOS_POR_PAGINA + 1} a{" "}
            {Math.min(paginaValida * ELEMENTOS_POR_PAGINA, campaniasFiltradas.length)} de{" "}
            {campaniasFiltradas.length} campañas
          </p>

          <div className="grid gap-3">
            {campaniasPaginadas.map((c) => {
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-text-primary">
                              {actuales} {meta ? `/ ${meta}` : ""}
                            </span>
                            {c.status === "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() => abrirModalDonantes(c)}
                                className="p-0.5 rounded text-text-muted hover:text-navy-700 hover:bg-ink-100 transition-colors cursor-pointer"
                                title="Modificar cantidad de donantes conseguidos o meta"
                                aria-label={`Modificar donantes para ${c.patientName}`}
                              >
                                <Icon name="editar" size={13} />
                              </button>
                            )}
                          </div>
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

                      {/* Botón −1 donante: únicamente en campañas activas (no permitido en completadas con meta alcanzada) */}
                      {c.status === "ACTIVE" && actuales > 0 && (
                        <button
                          onClick={() => handleRestarDonante(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-ink-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Descontar un donante (para corregir un +1 cargado de más)"
                          aria-label={`Descontar un donante de ${c.patientName}`}
                        >
                          <Icon name="menos" size={14} />
                          <span>1</span>
                        </button>
                      )}

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

                      {/* Botón modificar donantes (campañas activas) */}
                      {c.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => abrirModalDonantes(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-ink-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Modificar manualmente la cantidad de donantes conseguidos o la meta"
                        >
                          <Icon name="editar" size={14} />
                          <span className="hidden lg:inline">Donantes</span>
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

                      {/* Botón cancelar campaña */}
                      {(c.status === "ACTIVE" || c.status === "DRAFT") && (
                        <button
                          onClick={() => handleCancelarCampania(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Cancelar la campaña de donación"
                        >
                          <Icon name="cancelar" size={14} />
                          <span className="hidden md:inline">Cancelar</span>
                        </button>
                      )}

                      {/* Botón Reabrir campaña (para vencidas, completadas o canceladas) */}
                      {(c.status === "EXPIRED" ||
                        c.status === "COMPLETED" ||
                        c.status === "CANCELLED") && (
                        <button
                          onClick={() => abrirModalReapertura(c)}
                          disabled={accionEnCurso === c.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                          title="Reabrir la campaña de donación con una nueva fecha límite"
                        >
                          <Icon name="recargar" size={14} />
                          <span>Reabrir</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Controles de Paginación */}
          {campaniasFiltradas.length > ELEMENTOS_POR_PAGINA && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
              <p className="text-xs text-text-muted">
                Mostrando {(paginaValida - 1) * ELEMENTOS_POR_PAGINA + 1} a{" "}
                {Math.min(paginaValida * ELEMENTOS_POR_PAGINA, campaniasFiltradas.length)} de{" "}
                {campaniasFiltradas.length} campañas
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaValida === 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Anterior
                </button>
                <span className="text-xs font-medium text-text-secondary px-1">
                  Página {paginaValida} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaValida === totalPaginas}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Modificación de Donantes (Campañas Activas) */}
      {campaniaAEditarDonantes && (
        <Dialogo
          abierto={Boolean(campaniaAEditarDonantes)}
          alCerrar={() => setCampaniaAEditarDonantes(null)}
          titulo="Modificar donantes de la campaña"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleGuardarDonantes();
            }}
            className="space-y-4 pt-2"
          >
            <p className="text-sm text-text-secondary leading-relaxed">
              Ajustá la cantidad de donantes confirmados y la meta de donantes requeridos para{" "}
              <strong className="text-text-primary font-semibold">
                {campaniaAEditarDonantes.patientName}
              </strong>.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="donantes-conseguidos"
                className="block text-xs font-semibold text-text-primary"
              >
                Donantes conseguidos actuales
              </label>
              <input
                id="donantes-conseguidos"
                type="number"
                min={0}
                max={1000}
                step={1}
                required
                value={editCurrentDonors}
                onChange={(e) =>
                  setEditCurrentDonors(
                    Math.max(0, parseInt(e.target.value, 10) || 0),
                  )
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-navy-500 focus:outline-none"
              />
              <p className="text-xs text-text-muted">
                Cantidad real de personas que asistieron al centro a donar.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="meta-donantes"
                className="block text-xs font-semibold text-text-primary"
              >
                Meta de donantes requeridos (opcional)
              </label>
              <input
                id="meta-donantes"
                type="number"
                min={1}
                max={1000}
                step={1}
                value={editTargetDonors}
                onChange={(e) => setEditTargetDonors(e.target.value)}
                placeholder="Ej: 10 (dejar vacío si es sin límite)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-navy-500 focus:outline-none"
              />
              <p className="text-xs text-text-muted">
                Dejá este campo vacío si la campaña no tiene una meta fijada.
              </p>
            </div>

            {editTargetDonors.trim() !== "" &&
              Number(editCurrentDonors) >= Number(editTargetDonors) && (
                <div className="rounded-lg bg-sky-50 border border-sky-200 p-2.5 text-xs text-sky-800">
                  💡 <strong>Atención:</strong> Al ser la cantidad de donantes igual o mayor a la meta, la campaña se completará automáticamente al guardar.
                </div>
              )}

            {errorDonantes && (
              <p role="alert" className="text-xs font-medium text-danger">
                {errorDonantes}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setCampaniaAEditarDonantes(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-ink-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoDonantes}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardandoDonantes ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Dialogo>
      )}

      {/* Modal de Reapertura de Campaña (BUG-04 / Ampliación de Meta) */}
      {campaniaAReabrir && (() => {
        const metaAlcanzada =
          campaniaAReabrir.targetDonors !== null &&
          (campaniaAReabrir.currentDonors ?? 0) >= campaniaAReabrir.targetDonors;

        return (
          <Dialogo
            abierto={Boolean(campaniaAReabrir)}
            alCerrar={() => setCampaniaAReabrir(null)}
            titulo="Reabrir campaña de donación"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleConfirmarReapertura();
              }}
              className="space-y-4 pt-2"
            >
              <p className="text-sm text-text-secondary leading-relaxed">
                Estás por reabrir la campaña de{" "}
                <strong className="text-text-primary font-semibold">
                  {campaniaAReabrir.patientName}
                </strong>
                . Pasará nuevamente a estado{" "}
                <span className="font-semibold text-emerald-700">Activa</span> y
                volverá a recibir donantes.
              </p>

              {metaAlcanzada && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>🎯</span> Meta previa alcanzada ({campaniaAReabrir.currentDonors ?? 0} de {campaniaAReabrir.targetDonors} donantes)
                  </p>
                  <p>
                    Para que la campaña continúe activa y sume nuevos donantes, definí una nueva meta mayor a {campaniaAReabrir.currentDonors ?? 0} o dejala vacía para no tener límite fijo.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="nueva-fecha"
                  className="block text-xs font-semibold text-text-primary"
                >
                  Nueva fecha límite de donación
                </label>
                <input
                  id="nueva-fecha"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-navy-500 focus:outline-none"
                />
                <p className="text-xs text-text-muted">
                  Elegí hasta qué día estará vigente esta nueva etapa.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="nueva-meta"
                  className="block text-xs font-semibold text-text-primary"
                >
                  Nueva meta de donantes {metaAlcanzada ? "(Requerida mayor a la actual)" : "(Opcional)"}
                </label>
                <input
                  id="nueva-meta"
                  type="number"
                  min={metaAlcanzada ? (campaniaAReabrir.currentDonors ?? 0) + 1 : 1}
                  max={1000}
                  step={1}
                  value={nuevaMeta}
                  onChange={(e) => setNuevaMeta(e.target.value)}
                  placeholder={
                    metaAlcanzada
                      ? `Mayor a ${campaniaAReabrir.currentDonors ?? 0}`
                      : "Ej: 15 (o vacío para sin límite)"
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-navy-500 focus:outline-none"
                />
                <p className="text-xs text-text-muted">
                  Donantes ya asistidos: <strong className="text-text-primary">{campaniaAReabrir.currentDonors ?? 0}</strong>.
                </p>
              </div>

              {errorReapertura && (
                <p role="alert" className="text-xs font-medium text-danger">
                  {errorReapertura}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCampaniaAReabrir(null)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-ink-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoReapertura || !nuevaFecha}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {guardandoReapertura ? "Reabriendo…" : "Confirmar y Reabrir"}
                </button>
              </div>
            </form>
          </Dialogo>
        );
      })()}
    </div>
  );
}

