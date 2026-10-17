# Design System · DonaKit

> US-006 — *Como organización, quiero un paquete de diseño estandarizado para ser consistente la marca.*
> Épica: Arquitectura · Sprint 1 · 2 puntos

Este documento es el registro de decisiones del paquete de diseño. Cierra las tres
tarjetas de definición de la historia: paleta, fuentes e íconos.

---

## 1. Paleta de colores

### Decisión

Tres rampas de 10 pasos y cuatro pares semánticos.

| Rampa | Para qué | Paso base |
|---|---|---|
| **navy** | Color institucional. Títulos, acción primaria, superficies de marca. | `navy-700` `#283e60` |
| **red** | Urgencia y donación. Uso acotado: acentos y una sola acción por pantalla. | `red-600` `#c62540` |
| **ink** | Texto, fondos y bordes. | `ink-900` `#0f172a` |

Semánticos: `success`, `warning`, `danger`, `info`, cada uno con su fondo `-bg`.

### Por qué así

**Dos colores de marca, no más.** Navy sostiene la estructura y rojo marca la urgencia.
Si el rojo se usa en todos lados deja de significar urgencia, que es justo lo que este
producto necesita comunicar.

**El rojo nunca es fondo de página.** Una landing roja sobre un paciente internado
transmite alarma, no claridad. El rojo aparece en el dato del grupo sanguíneo, en la
fecha límite y en una sola acción destacada.

**Accesibilidad verificada, no declarada.** Las 25 combinaciones texto/fondo del sistema
se midieron contra WCAG 2.1 AA (4.5:1 para texto normal, 3:1 para texto grande y
elementos no textuales). Todas pasan. El script de verificación está en
`scripts/check-contrast.py`.

No es un detalle formal: la landing la abre gente de cualquier edad, desde el celular,
muchas veces a la intemperie y con poca batería. Si el contraste es flojo, no se lee.

### Regla de uso

Los pasos **200 y 300 son solo para separadores decorativos**. Un borde de campo de
formulario usa `border-interactive` (`ink-500`) y un ícono con significado usa
`ink-600` o más oscuro. Son los únicos que llegan a 3:1 contra blanco.

### Modo oscuro

Fuera del alcance de la Release 1. Los tokens están definidos como roles
(`surface`, `text-primary`, `border`) justamente para que agregarlo después sea
redefinir variables y no reescribir componentes.

---

## 2. Tipografía

### Decisión

| Familia | Uso | Pesos |
|---|---|---|
| **Outfit** | Títulos y datos destacados | 500, 600, 700 |
| **Inter** | Cuerpo, formularios, texto auxiliar | variable |

Ambas se cargan con `next/font/google`.

### Por qué así

**Outfit** es geométrica y de formas redondeadas, en línea con el logo de DonaKit.
Funciona bien en tamaños grandes, que es donde van a vivir los títulos y el dato del
grupo sanguíneo en las placas.

**Inter** está diseñada específicamente para pantallas y para tamaños chicos. Sus
números son inconfundibles entre sí, lo que importa en un producto donde se leen
fechas, horarios y direcciones.

**Dos familias y ninguna más.** Cada fuente extra suma peso a una página que se abre
desde el navegador interno de WhatsApp, con datos móviles, en el momento en que
alguien decide si ayuda o no.

**Por qué `next/font` y no una etiqueta `<link>` a Google.** `next/font` descarga las
fuentes durante el build y las sirve desde nuestro propio dominio. Eso elimina un
pedido de red a un tercero al abrir la página, evita el salto de texto cuando la
fuente termina de cargar, y no filtra la IP del visitante a Google.

### Escala

Mobile-first, de 12 a 48 px. El cuerpo es 16 px y **los campos de formulario nunca
bajan de ahí**: iOS hace zoom automático en inputs con menos de 16 px, lo que rompe
el layout en pleno formulario.

---

## 3. Paquete de íconos

### Decisión

**lucide-react**, con un catálogo tipado propio en `lib/icons.tsx`.

### Por qué así

- Trae sus propios tipos de TypeScript: no hace falta instalar `@types` aparte.
- Es *tree-shakeable*: al build solo entran los íconos que realmente se usan.
- Todos los íconos comparten grilla de 24 px y grosor de trazo, así que el conjunto
  se ve coherente sin ajustes manuales.
- Licencia ISC, sin restricciones para este proyecto.

### El catálogo

Los componentes piden el **concepto del producto**, no el nombre del dibujo:

```tsx
<Icon name="sede" />        // correcto
<MapPin />                  // evitar
```

Si mañana cambia el ícono de sede, se cambia en un solo archivo. Y como el catálogo
es `as const`, TypeScript rechaza cualquier nombre que no exista: `<Icon name="sedes" />`
no compila.

### Accesibilidad

Un ícono que acompaña a un texto que ya dice lo mismo es decorativo y va sin `label`:
se marca `aria-hidden` para que el lector de pantalla no lo lea dos veces. Un ícono
que es la única indicación de algo lleva `label`.

---

## 4. Base de layout

### Decisión

El sistema se ancla en **360 px**, con 16 px de margen a cada lado.

| Token | Valor | Para qué |
|---|---|---|
| `--spacing-gutter` | 16px | Margen lateral en móvil |
| `--container-app` | 480px | Formulario y landing centrados |
| `--container-prose` | 640px | Ancho máximo de lectura |
| `--tap-min` | 44px | Área mínima tocable |

### Por qué así

El backlog lo fija en US-12/ST-03: *"garantizar diseño 100% responsivo Mobile-First
desde 360px"*. Está acá y no en esa historia porque es una decisión del paquete de
diseño: si cada historia la define por su cuenta, terminan con breakpoints distintos.

**360 menos 32 de márgenes son 328 px útiles.** Ese es el número con el que hay que
verificar toda grilla y todo dato grande antes de darlo por terminado. Una grilla de
tres columnas con 10 px de separación entra en 328 px, pero justo: cada columna queda
en 102 px, y un dato como `AB-` a 22 px lo llena casi entero.

Los 44 px de área tocable son el mínimo de WCAG 2.5.5. Importa más que de costumbre:
la landing se abre con una mano, caminando, muchas veces apurado.

---

## Archivos

| Archivo | Contenido |
|---|---|
| `app/globals.css` | Tokens en `@theme` y estilos base |
| `app/layout.tsx` | Carga de fuentes y metadatos |
| `lib/icons.tsx` | Catálogo tipado y componente `Icon` |
| `app/design-system/page.tsx` | Página de verificación — `/design-system` |
| `scripts/check-contrast.py` | Verificación WCAG de la paleta |

## Cómo verificar que está hecho

```bash
npm run dev
# abrir http://localhost:3000/design-system
```

Criterios de aceptación de US-006:

- [ ] Las tres rampas y los semánticos se ven en `/design-system`.
- [ ] Outfit se aplica en títulos e Inter en el cuerpo.
- [ ] El catálogo de íconos se renderiza completo.
- [ ] `npm run build` termina sin errores de tipos.
- [ ] `python3 scripts/check-contrast.py` da 25/25.
- [ ] La página se ve bien en un celular real, no solo en el navegador achicado.
- [ ] A 360 px de ancho no aparece scroll horizontal en ninguna sección.
