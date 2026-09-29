# Landing y denuncias públicas

## Acceso

- Inicio público: `/`.
- Formulario público: `/denunciar`.
- Los dos botones de la cabecera llevan a `/login` y `/registro`.
- «Presentar una denuncia» abre `/denunciar` sin pedir sesión. Las páginas internas conservan sus permisos habituales.

## Información solicitada

La persona indica un tipo breve de denuncia y describe lo que observó. La pantalla le sugiere precisar dónde ocurrió, cuándo y qué sucedió. Puede enviar de forma anónima o proporcionar voluntariamente nombre y un medio de contacto (correo o teléfono). Los archivos quedan fuera de esta primera versión.

Al enviar, Core fija la fecha de recepción, crea un caso de origen `COMPLAINT` en estado `PENDING_REVIEW`, guarda la denuncia y muestra únicamente una referencia. Un usuario con permiso para la operación institucional puede revisar el caso en «Operación sanitaria → Denuncias» y decidir el siguiente paso. La referencia todavía no permite consultar el estado públicamente.

## Alcance y protección

`POST /v1/public/complaints` es la única operación pública nueva. El esquema de entrada rechaza identificadores de empresas, fecha proporcionada por el navegador y campos adicionales. Una denuncia anónima omite los datos de contacto. La ruta tiene límite local de cinco solicitudes por hora y dirección IP. Las rutas de consulta, edición y decisión existentes permanecen autenticadas. La respuesta pública solo contiene la referencia; la auditoría no guarda la descripción ni los datos de contacto.

El limitador está en memoria del proceso: para un despliegue con varias instancias se necesitará un limitador compartido y protección adicional contra envíos automatizados. No se afirma que la denuncia sea secreta o que exista seguimiento público.
