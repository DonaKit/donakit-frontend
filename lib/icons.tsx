import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Droplet,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Share2,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/* ============================================================================
   US-006/ST-03 — Catálogo de íconos tipado
   ----------------------------------------------------------------------------
   Un único lugar donde se decide qué ícono representa cada concepto del
   producto. Los componentes piden el concepto ("sede"), no el dibujo ("MapPin").

   Por qué importa: si mañana cambiamos el ícono de sede, se cambia acá y queda
   cambiado en toda la app. Y como el objeto es `as const`, TypeScript solo
   acepta nombres que existan: escribir <Icon name="sedes" /> no compila.
   ========================================================================== */

export const icons = {
  // --- Donación
  donacion: Droplet,
  grupoSanguineo: Droplet,
  requisitos: ClipboardCheck,

  // --- Caso y paciente
  paciente: User,
  institucion: Building2,
  fechaLimite: CalendarClock,

  // --- Sede
  sede: MapPin,
  horario: Clock,
  telefono: Phone,

  // --- Kit de difusión
  placa: ImageIcon,
  descargar: Download,
  copiar: Copy,
  compartir: Share2,
  whatsapp: MessageCircle,
  enlace: Link2,
  qr: QrCode,
  enlaceExterno: ExternalLink,

  // --- Estados
  exito: CheckCircle2,
  error: XCircle,
  alerta: AlertTriangle,
  info: Info,
} as const;

/** Nombres válidos. TypeScript rechaza cualquier otro. */
export type IconName = keyof typeof icons;

export interface IconProps {
  /** Concepto del producto, no el nombre del dibujo. */
  name: IconName;
  /** Tamaño en píxeles. 20 para texto, 24 por defecto, 32 para destacados. */
  size?: number;
  className?: string;
  /**
   * Texto para lectores de pantalla. Si el ícono solo acompaña a un texto que
   * ya dice lo mismo, dejarlo vacío: se marca como decorativo y no se lee dos veces.
   */
  label?: string;
}

/**
 * Único punto de entrada para dibujar un ícono.
 *
 *   <Icon name="sede" />                        decorativo
 *   <Icon name="descargar" label="Descargar" /> con significado propio
 */
export function Icon({ name, size = 24, className, label }: IconProps) {
  const Glyph: LucideIcon = icons[name];
  return (
    <Glyph
      size={size}
      className={className}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}

/** Lista de nombres, para la página de design system. */
export const iconNames = Object.keys(icons) as IconName[];
