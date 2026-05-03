- [x] Modificar EditorPanel.jsx con el botón "💾 Guardar Traducción" y la lógica de limpieza ultra-conservadora.
- [x] Verificar que el guardado manual refresca el editor y elimina la barra de Google Translate.
- [x] Confirmar que la vista previa se actualiza correctamente tras el guardado.
- [x] Validar que los estilos originales (inline styles) permanecen intactos.

### Revisión Final
El flujo de guardado manual implementado en el Plan v2 permite liberar el editor del "secuestro" de Google Translate sin corromper el HTML original. La limpieza ultra-conservadora respeta los estilos inline y las rutas de assets, garantizando que la landing page traducida sea 100% funcional y editable.
