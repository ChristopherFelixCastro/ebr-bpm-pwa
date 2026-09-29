# Registro y vinculación de cuentas empresariales

## Solicitud pública

La persona solicita el rol Administrador de empresa o Delegado de empresa con sus datos personales y una carta de autorización. El formulario público no consulta el directorio de empresas ni admite un identificador, nombre o RNC de empresa. La API exige `multipart/form-data` con `authorizationLetter` y rechaza campos adicionales como `companyId`; tampoco crea una sesión. La cuenta queda `PENDING_VALIDATION`, sin membresía empresarial, y la carta queda pendiente de revisión.

La carta debe permitir a la administración identificar la empresa y comprobar que la persona está autorizada para el rol solicitado. Si no lo permite, la cuenta permanece pendiente de validación; nunca se selecciona una empresa por parecido de nombre.

## Revisión administrativa

1. Un Administrador o Universal abre **Configuración → Usuarios → cuenta pendiente** y consulta la carta de autorización.
2. Comprueba la identidad de la empresa y el alcance de la autorización. Si necesita aclaración o la empresa aún no existe, mantiene la cuenta pendiente.
3. Busca y selecciona una empresa **activa** en **Datos de la cuenta**, guarda el vínculo y revisa que la ficha muestre la empresa correcta. La API vuelve a comprobar el estado activo al vincular y al aprobar.
4. Marca la carta como válida si corresponde. La aprobación solo está disponible cuando hay una carta válida y una empresa vinculada.
5. Confirma la aprobación con autenticación reciente. Solo entonces la cuenta puede iniciar sesión con el rol y el alcance empresarial asignados.

La creación directa de cuentas desde la administración es un flujo distinto; conserva el requisito de empresa para los roles empresariales. La persona solicitante no puede asignarse a otra empresa desde el registro público.

## Comprobación focalizada

- Registro con carta y sin empresa → cuenta pendiente, carta pendiente, sin membresía ni sesión.
- Registro JSON, sin carta o con `companyId` añadido al multipart → rechazo sin crear cuenta.
- Carta válida sin empresa, o empresa sin carta válida → aprobación deshabilitada o rechazada.
- Empresa inactiva → no puede vincularse ni aprobarse.
- Carta válida y empresa activa verificada → aprobación habilitada; acceso empresarial únicamente después de aprobar.
