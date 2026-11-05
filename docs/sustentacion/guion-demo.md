# Guion de sustentación y demostración en vivo · Quadro

Duración sugerida: 12 minutos (6 de presentación y 6 de demostración) más preguntas. Las cifras de este guion se verificaron ejecutando el recorrido completo sobre los datos de demostración recién cargados.

## Antes de entrar (preparación, 10 minutos)

1. Cargar datos limpios:

   ```bash
   npm run db:migrate
   npm run db:seed        # si ya existían, borrar y crear de nuevo la base "quadro"
   npm run build && npm start
   ```

2. Abrir dos ventanas del navegador en http://localhost:4000:
   - Ventana normal: ingresar como **ana@demo.quadro.co** (administradora).
   - Ventana de incógnito: dejar lista la pantalla de ingreso para **carla@demo.quadro.co**.
   - Contraseña de las dos: `Quadro2026`.
3. Tener a mano el archivo `e2e/fixtures/comprobante-prueba.png` para adjuntarlo.
4. Dejar abierta una terminal en la carpeta del proyecto para mostrar las pruebas.
5. Plan B si algo falla: las capturas de `docs/manual/capturas/` y el reporte HTML de Playwright en `docs/pruebas/evidencias/reporte-e2e-html/index.html`.

## Parte 1 · Presentación (diapositivas 1 a 7)

| Diapositiva | Quién | Idea central |
|---|---|---|
| 1. Portada | Mariana | Quadro: cuadren las cuentas del emprendimiento |
| 2. Problema | Mariana | En los emprendimientos de varias personas los gastos se pagan entre todos y se anotan en chats y cuadernos. Nadie sabe con certeza quién debe cuánto |
| 3. Solución y alcance | Mariana | Registrar, repartir, ver saldos y liquidar. Qué entra en el MVP y qué queda para después |
| 4. Arquitectura | Sara | Tres capas: React, API Express por módulos y PostgreSQL. Las reglas de cálculo están aisladas y probadas |
| 5. Tecnologías y seguridad | Sara | Stack, sesión en cookie httpOnly, bcrypt, permisos y privacidad |
| 6. Identidad y experiencia | Mariana | Paleta, logotipo y la balanza de saldos |
| 7. Pruebas y resultados | Sara | 99 pruebas automáticas, todas aprobadas, con trazabilidad a las HU |

Luego: "Ahora lo vemos funcionando."

## Parte 2 · Demostración en vivo (6 minutos)

### Paso 1 · Saldos del grupo (HU-06) · Ventana de Ana

1. En **Mis grupos**, abrir **Arepas La Esquina**.
2. Decir: "Este grupo ya tiene cuatro gastos y una liquidación. Lo primero que ve Ana es su posición: le debe **$18.334** al grupo."
3. Señalar la **balanza**: Bruno **+$76.667** a favor, Carla **−$58.333** y Ana **−$18.334**. "La barra verde es lo que el grupo le debe a la persona; la ámbar, lo que ella debe. La suma siempre da cero."
4. Señalar **Deudas pendientes**: Carla le debe $40.000 a Bruno, Ana le debe $36.667 a Bruno y Carla le debe $18.333 a Ana.

### Paso 2 · Registrar un gasto por porcentajes (HU-04, HU-05)

1. Pulsar **Registrar gasto**.
2. Descripción: `Queso costeño para la feria`. Importe: `75000`. Categoría: **Materia prima**. Quién pagó: Ana.
3. Elegir **Porcentajes** y escribir 40, 30 y **20**.
4. Mostrar el aviso: "Los porcentajes deben sumar 100 %. Actualmente suman 90 %." Decir: "El sistema no deja guardar un reparto que no cuadra, ni en la pantalla ni en el servidor."
5. Cambiar 20 por **30**. La vista previa muestra **$30.000, $22.500 y $22.500**.
6. Pulsar **Registrar gasto** y señalar el aviso "Gasto registrado".

### Paso 3 · Historial, filtro y comprobante (HU-07, HU-08)

1. En **Gastos**, filtrar Categoría = **Materia prima**: quedan "Queso costeño para la feria" y "Harina de maíz y queso para la feria".
2. Abrir **Queso costeño para la feria** y mostrar el reparto por persona.
3. Pulsar **Adjuntar comprobante** y elegir `comprobante-prueba.png`. Decir: "Solo acepta imágenes o PDF de hasta 2 MB, y revisa el contenido real del archivo, no solo la extensión."

### Paso 4 · Editar el gasto (HU-09)

1. En el mismo detalle, pulsar **Editar gasto**, cambiar el importe a `90000` y señalar la nueva vista previa: **$36.000, $27.000 y $27.000**.
2. Pulsar **Guardar cambios**. En el historial aparece la etiqueta **Modificado**.
3. Ir a **Saldos**: Ana pasa a **+$35.666**, Bruno **+$49.667** y Carla **−$85.333**. "Los saldos no se guardan aparte: se recalculan siempre, por eso nunca quedan desactualizados."

### Paso 5 · Liquidación desde otra cuenta (HU-13, RNF-04) · Ventana de Carla

1. Ingresar como **carla@demo.quadro.co** y abrir el grupo. Su posición: le debe **$85.333** al grupo.
2. En **Deudas pendientes**, junto a "Le debes a Ana Torres $45.333", pulsar **Registrar liquidación**.
3. El formulario ya trae quién paga y quién recibe, y muestra "Carla Gómez le debe $45.333 a Ana Torres".
4. Importe: `20000`. Nota: `Transferencia por Nequi`. Pulsar **Registrar liquidación**.
5. Ir a **Saldos**: Carla queda en **−$65.333** y su deuda con Ana baja a **$25.333**.
6. Abrir **Integrantes**: Carla ve "Solo el administrador del grupo puede agregar o retirar integrantes." Decir: "Cada acción revisa permisos en el servidor, no solo en la pantalla."

### Paso 6 · Celular (RNF-07)

1. En la ventana de Ana, abrir las herramientas de desarrollo (F12), activar la vista de dispositivo y elegir un ancho de 390 px (o abrir la app en un celular de la misma red).
2. Mostrar el botón de menú, la balanza en una columna y el botón **Registrar gasto**.

### Paso 7 · Pruebas (30 segundos)

En la terminal:

```bash
npm test
```

Señalar el resultado: **83 pruebas aprobadas** (37 unitarias y 46 de integración). Mencionar que las 16 E2E (`npm run test:e2e`) toman cerca de un minuto y que su reporte está en `docs/pruebas`.

## Cierre (30 segundos)

"Quadro resuelve el problema que planteamos: cada integrante sabe cuánto aportó, cuánto le corresponde y a quién le debe. Implementamos todas las historias del MVP más las liquidaciones, con 99 pruebas automáticas aprobadas y trazadas a los requisitos. Para una siguiente versión quedan presupuestos, inventario y alertas, como lo definimos en el Entregable 1."

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué el sobrante del redondeo va al primero? | Es la regla que definimos en PU-02. Así el reparto siempre suma el total y la regla es fácil de explicar |
| ¿Qué pasa si dos personas registran al mismo tiempo? | Cada operación que afecta saldos bloquea el grupo dentro de una transacción, así no quedan datos parciales ni cruzados |
| ¿Dónde se guardan los comprobantes? | En PostgreSQL. Así no se pierden si el servidor se redespliega |
| ¿Por qué "anular" y no borrar? | Para no perder el historial, como en el diagrama de estados. El gasto anulado deja de contar en los saldos |
| ¿Cómo se protege la contraseña? | Se guarda con bcrypt y la sesión va en una cookie httpOnly que el JavaScript de la página no puede leer |
| ¿Qué cambiaron del Entregable 2? | Pasamos las liquidaciones al MVP y completamos el modelo (categoría, comprobante, contraseña, método de reparto). Además corregimos la numeración de los casos de uso en los diagramas de secuencia |
