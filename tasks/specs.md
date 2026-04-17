Especificación de Funcionalidad: Alternancia de Vista Desktop/Teléfono en Vista Previa

1. Resumen de la Funcionalidad (Feature Overview)

Agregar una barra de herramientas secundaria en la sección de "Vibe Check (Vista Previa)" que permita al usuario alternar rápidamente entre una visualización de escritorio (ancho completo) y una visualización de dispositivo móvil (teléfono). Esta vista móvil debe restringir el lienzo de visualización a 400 píxeles de ancho mediante un iframe, manteniendo en todo momento la reactividad con el editor subyacente para permitir ajustes en tiempo real.

2. Historia de Usuario (User Story)

Como usuario del Antigravity Vibe Cloner,
Quiero poder hacer clic en un icono para cambiar la vista previa de mi página a un formato de teléfono móvil (400px),
Para poder continuar editando y ajustando el diseño de mi landing page asegurándome de que se vea perfecta y sea responsive en dispositivos móviles.

3. Requerimientos de Interfaz de Usuario (UI Requirements)

Ubicación: Dentro del panel derecho, directamente debajo de las pestañas principales de "Vibe Check (Vista Previa)" y "</> Editor", alineado a la izquierda.

Componentes:

Una barra horizontal con fondo oscuro (coincidente con el tema actual del UI de la captura menu_preview.png).

Icono 1 (Izquierda): Icono representativo de un monitor de Escritorio (Desktop).

Icono 2 (yuxtapuesto al Icono 1): Icono representativo de un Teléfono móvil (Smartphone).

Estados Visuales: El icono de la vista activa debe tener un estado de "seleccionado" (por ejemplo, mayor opacidad, un borde sutil, o cambio de color del ícono a blanco/brillante, mientras el inactivo permanece atenuado).

Contenedor de Previsualización (Modo Teléfono): Cuando el modo teléfono está activo, el lienzo (iframe) debe centrarse horizontalmente en la pantalla y mostrar un fondo neutro (gris claro/oscuro) en los espacios vacíos laterales para resaltar los bordes del dispositivo simulado (Ver referencia: modo telefono.png).

4. Requerimientos Funcionales (Functional Requirements)

Estado por Defecto: Al cargar la aplicación o procesar un nuevo HTML, la vista por defecto debe ser "Desktop" (ancho completo).

Acción - Clic en Icono Desktop: * El contenedor de la vista previa (iframe o div renderizado) debe ocupar el 100% del ancho y alto disponible de su contenedor padre.

Acción - Clic en Icono Teléfono:

El contenedor de la vista previa debe cambiar su comportamiento para renderizar el contenido dentro de un iframe (si no lo está ya) con un ancho fijo de exactamente 400px.

El alto del iframe debe ocupar el 100% del contenedor vertical para permitir scroll natural simulando la pantalla del móvil.

Sincronización Continua con el Editor (Core Feature): * El editor (ya sea que funcione mediante un editor visual oculto, o código fuente inyectado) debe permanecer habilitado y vinculado.

Cualquier cambio realizado en el contenido (textos, estilos, estructura) mientras se está en la "Vista Teléfono" debe reflejarse en tiempo real dentro del iframe de 400px, disparando correctamente los Media Queries de CSS asociados a pantallas de <= 400px.

5. Especificaciones Técnicas Recomendadas (Technical Specs)

Gestión de Estado (State Management): Implementar una variable de estado (ej. previewViewMode: 'desktop' | 'mobile').

Implementación del Iframe: Se recomienda fuertemente el uso de un <iframe srcDoc={htmlContent}> para garantizar el aislamiento del CSS y asegurar que los @media (max-width) del HTML inyectado se evalúen correctamente respecto al ancho del iframe (400px) y no al ancho de la ventana del navegador.

Estilos Dinámicos del Contenedor:

/* Pseudo-código de estilos reactivos según estado */
.preview-wrapper.desktop iframe {
    width: 100%;
    height: 100%;
    border: none;
}
.preview-wrapper.mobile {
    display: flex;
    justify-content: center;
    background-color: #e2e8f0; /* Color de fondo del espacio vacío */
}
.preview-wrapper.mobile iframe {
    width: 400px;
    height: 100%;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border: 1px solid #ccc;
}


6. Criterios de Aceptación (Acceptance Criteria)

[ ] La sub-barra de menú con los íconos de Escritorio y Teléfono es visible en la pestaña "Vibe Check".

[ ] Al hacer clic en el ícono de Teléfono, el visualizador se reduce a exactamente 400px de ancho y se centra en la pantalla.

[ ] Al hacer clic en el ícono de Escritorio, el visualizador vuelve a ocupar el 100% del ancho.

[ ] Los estilos CSS para móviles (Media Queries) dentro del código fuente del usuario se aplican correctamente cuando se está en la vista de Teléfono.

[ ] Crucial: Mientras la vista de Teléfono está activa, el usuario puede seguir inyectando/modificando HTML desde el editor y la previsualización se actualiza en tiempo real sin salir del ancho de 400px.