# -*- coding: utf-8 -*-
"""Verifica contraste WCAG de la paleta DonaKit."""

def srgb_to_lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hexs):
    h = hexs.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

NAVY = {
    50: "#F1F5FA", 100: "#DEE8F3", 200: "#BFD0E6", 300: "#93AED3",
    400: "#6586B6", 500: "#436598", 600: "#324E79", 700: "#283E60",
    800: "#1D2E48", 900: "#152237",
}
RED = {
    50: "#FEF2F3", 100: "#FDE1E4", 200: "#FAC6CC", 300: "#F59CA7",
    400: "#EE6879", 500: "#E03E54", 600: "#C62540", 700: "#A41B33",
    800: "#88192D", 900: "#731A2A",
}
INK = {
    0: "#FFFFFF", 50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0",
    300: "#CBD5E1", 400: "#94A3B8", 500: "#64748B", 600: "#475569",
    700: "#334155", 800: "#1E293B", 900: "#0F172A",
}
SEM = {
    "success": "#166534", "success-bg": "#DCFCE7",
    "warning": "#854D0E", "warning-bg": "#FEF9C3",
    "danger":  "#991B1B", "danger-bg":  "#FEE2E2",
    "info":    "#1E40AF", "info-bg":    "#DBEAFE",
}

WHITE, BLACK = "#FFFFFF", "#0F172A"

def check(label, fg, bg, need, size=""):
    r = ratio(fg, bg)
    ok = "PASA" if r >= need else "FALLA"
    print(f"  {ok}  {r:5.2f}:1  (min {need})  {label} {size}")
    return r >= need

print("=== Texto normal sobre fondo claro — AA necesita 4.5:1 ===")
todo = []
todo.append(check("ink-900 sobre blanco", INK[900], WHITE, 4.5))
todo.append(check("ink-700 sobre blanco", INK[700], WHITE, 4.5))
todo.append(check("ink-600 sobre blanco (texto secundario)", INK[600], WHITE, 4.5))
todo.append(check("ink-500 sobre blanco (texto terciario)", INK[500], WHITE, 4.5))
todo.append(check("navy-700 sobre blanco (titulos)", NAVY[700], WHITE, 4.5))
todo.append(check("navy-600 sobre blanco", NAVY[600], WHITE, 4.5))
todo.append(check("red-700 sobre blanco (enlaces/acento)", RED[700], WHITE, 4.5))
todo.append(check("red-600 sobre blanco", RED[600], WHITE, 4.5))

print("\n=== Texto blanco sobre superficies de marca — AA 4.5:1 ===")
todo.append(check("blanco sobre navy-700 (boton primario)", WHITE, NAVY[700], 4.5))
todo.append(check("blanco sobre navy-800", WHITE, NAVY[800], 4.5))
todo.append(check("blanco sobre red-600 (boton urgencia)", WHITE, RED[600], 4.5))
todo.append(check("blanco sobre red-700", WHITE, RED[700], 4.5))

print("\n=== Texto sobre fondos suaves — AA 4.5:1 ===")
todo.append(check("navy-800 sobre navy-50", NAVY[800], NAVY[50], 4.5))
todo.append(check("red-800 sobre red-50 (alerta)", RED[800], RED[50], 4.5))
todo.append(check("ink-800 sobre ink-100", INK[800], INK[100], 4.5))

print("\n=== Semanticos: texto sobre su fondo — AA 4.5:1 ===")
for k in ("success", "warning", "danger", "info"):
    todo.append(check(f"{k} sobre {k}-bg", SEM[k], SEM[k + "-bg"], 4.5))

print("\n=== Bordes y elementos no textuales — AA 3:1 ===")
print("  (ink-200/300 quedan SOLO para separadores decorativos: WCAG 1.4.11 no les aplica)")
todo.append(check("border-interactive = ink-500 (borde de input)", INK[500], WHITE, 3.0))
todo.append(check("icon-default = ink-600 (iconos con significado)", INK[600], WHITE, 3.0))
todo.append(check("focus-ring = navy-500", NAVY[500], WHITE, 3.0))
todo.append(check("icon-on-brand = blanco sobre navy-700", WHITE, NAVY[700], 3.0))

print("\n=== Texto grande (>=24px o 19px bold) — AA 3:1 ===")
todo.append(check("navy-600 sobre navy-50", NAVY[600], NAVY[50], 3.0, "[grande]"))
todo.append(check("red-500 sobre blanco", RED[500], WHITE, 3.0, "[grande]"))

print(f"\nRESULTADO: {sum(todo)}/{len(todo)} combinaciones pasan.")
if not all(todo):
    print("HAY FALLOS — ajustar antes de publicar los tokens.")
