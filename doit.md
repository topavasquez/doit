# DoIt — Resumen de la Aplicación

## ¿Qué es DoIt?

DoIt es una app social de hábitos y accountability. La idea es simple: tú y tus amigos forman un grupo, crean un reto (por ejemplo, "ir al gimnasio 30 días"), y cada día deben demostrar que lo hicieron subiendo una foto. Al final hay un ranking, y el que pierde paga las consecuencias que el grupo haya acordado (ej: invitar el almuerzo). Todo en español, diseño oscuro, enfocado en grupos pequeños de amigos.

---

## Módulos y Pantallas

### 1. Introducción (Onboarding)
La primera vez que alguien abre la app, ve una secuencia de 5 diapositivas animadas que explican qué es DoIt. Al terminar, lleva directo al registro.

**Qué se puede hacer:**
- Ver las 5 diapositivas de presentación
- Pasar al registro desde la última diapositiva

**Qué NO se puede hacer:**
- Saltarse el onboarding la primera vez (aunque en versiones futuras puede habilitarse)

---

### 2. Autenticación

Pantalla para entrar o crear cuenta. Tiene varios pasos:

#### 2.1 Método de acceso
Elige si vas a registrarte, iniciar sesión, o entrar con Google.

#### 2.2 Registro
Ingresa correo electrónico, contraseña y confirmación. Si el correo aún no está verificado, pasa a verificación por código.

#### 2.3 Inicio de sesión
Correo y contraseña. Si los datos son correctos, entra directo a la app.

#### 2.4 Olvidé mi contraseña
Ingresa tu correo y recibes un link para restablecer la contraseña.

#### 2.5 Verificación por código (OTP)
Campo de 6 dígitos para confirmar el correo después del registro.

#### 2.6 Restablecimiento de contraseña
Aparece cuando el usuario llega desde el link del correo. Pide la nueva contraseña dos veces.

#### 2.7 Onboarding de usuario
Solo aparece la primera vez después de crear la cuenta. Pide elegir un nombre de usuario, nombre para mostrar, y opcionalmente una foto de perfil.

**Qué se puede hacer:**
- Registrarse con email y contraseña
- Iniciar sesión con email/contraseña o Google
- Recuperar contraseña por correo
- Verificar cuenta con código de 6 dígitos
- Configurar nombre de usuario y foto de perfil al inicio

**Qué NO se puede hacer:**
- Registrarse sin correo electrónico
- Cambiar el correo electrónico desde la app
- Iniciar sesión con redes sociales distintas a Google

---

### 3. Inicio (Tab principal)

La pantalla principal de la app. Es el resumen del día a día del usuario.

**Secciones:**
- **Saludo**: Saluda al usuario por su nombre con un mensaje dinámico según la hora del día o su progreso.
- **Progreso diario**: Una tarjeta grande que muestra cuántos retos completó hoy vs cuántos tiene activos, con barra de progreso y porcentaje.
- **Estadísticas rápidas**: Tres tarjetas pequeñas en fila mostrando:
  - Número de retos activos
  - Puntos acumulados
  - Racha actual (días consecutivos)
- **Mis Grupos**: Lista de los grupos en los que está el usuario, con acceso rápido a cada uno.
- **Mis Retos**: Lista de tareas del día dividida en tres pestañas:
  - *Hoy* — retos que debe completar hoy
  - *Próximos* — retos que empiezan pronto
  - *Hechos* — retos ya completados

**Qué se puede hacer:**
- Ver el resumen del día de un vistazo
- Navegar a un grupo directamente desde la lista
- Ver los retos pendientes, próximos y completados
- Ver la racha activa

**Qué NO se puede hacer:**
- Hacer check-in desde esta pantalla (hay que entrar al reto)
- Crear grupos o retos desde aquí

---

### 4. Grupos (Tab)

Lista de todos los grupos del usuario y la opción de descubrir o unirse a nuevos.

**Secciones:**
- **Invitaciones pendientes**: Si alguien te invitó a un grupo, aparece aquí con botones para aceptar o rechazar.
- **Mis Grupos**: Tarjetas visuales de cada grupo, con imagen o color de fondo, nombre, cantidad de miembros, y reto activo si hay uno.
- **Descubrir**: (Tab secundario) Para unirse a grupos mediante código de invitación, o crear uno nuevo.

**Qué se puede hacer:**
- Ver todos los grupos a los que pertenece el usuario
- Aceptar o rechazar invitaciones de grupos
- Crear un nuevo grupo (limitado a 1 en plan gratuito)
- Unirse a un grupo con código de invitación

**Qué NO se puede hacer:**
- Buscar grupos públicos (no existen, todos son privados)
- Tener más de 1 grupo en el plan gratuito
- Unirse a un grupo sin código

---

### 4.1 Detalle de Grupo

Al entrar a un grupo, se ven dos pestañas: Retos y Chat.

#### Pestaña Retos
- Tarjeta hero con el nombre del grupo, miembros (fotos en burbujas), código de invitación visible, y botón de editar portada (solo para administradores).
- Lista de retos activos y pasados del grupo.
- Botón para crear un nuevo reto (limitado a 1 en plan gratuito).

**Qué se puede hacer:**
- Ver los retos del grupo
- Crear un nuevo reto
- Entrar al detalle de cada reto
- Invitar amigos al grupo
- Compartir el código de invitación
- (Admin) Editar la foto o color de portada del grupo
- (Admin) Eliminar miembros del grupo

**Qué NO se puede hacer:**
- Cambiar el nombre del grupo desde esta pantalla (funcionalidad pendiente)
- Tener más de 1 reto activo en plan gratuito
- Salir del grupo (funcionalidad pendiente)

#### Pestaña Chat
Chat en tiempo real del grupo. Los mensajes de uno mismo aparecen a la derecha (naranja), los de otros a la izquierda.

**Qué se puede hacer:**
- Enviar y recibir mensajes de texto
- Ver el historial de mensajes
- Cargar mensajes más antiguos haciendo scroll hacia arriba

**Qué NO se puede hacer:**
- Enviar fotos o archivos directamente en el chat
- Reaccionar a mensajes del chat
- Editar o eliminar mensajes enviados

---

### 5. Competir (Tab)

Pantalla global de competencia. (En desarrollo — estructura base disponible.)

---

### 6. Perfil (Tab)

Perfil del usuario. Muestra su información, estadísticas y actividad.

**Secciones:**
- Foto de perfil, nombre, nombre de usuario, nivel
- Cantidad de amigos (tappable → lleva a pantalla de amigos)
- Estadísticas: retos completados, check-ins totales, racha máxima
- Pestañas: *Activos* (retos en curso) e *Historial* (retos terminados)
- Botón de editar perfil

**Qué se puede hacer:**
- Ver y editar nombre, nombre de usuario y foto de perfil
- Ver las estadísticas personales
- Ir a la pantalla de amigos
- Ver retos activos e historial

**Qué NO se puede hacer:**
- Cambiar el correo electrónico
- Ver la actividad de otros usuarios desde aquí (hay que ir a su perfil público)

---

### 6.1 Editar Perfil (Modal)
Panel que se abre sobre el perfil. Permite cambiar foto de perfil, nombre para mostrar y nombre de usuario (con verificación de disponibilidad en tiempo real).

---

### 7. Detalle de Reto

Al entrar a un reto, se ve toda la información y actividad.

**Secciones:**
- Header: nombre del reto, categoría, fechas, estado
- Botón **"Do It"**: para hacer el check-in del día (foto)
- Dos pestañas:
  - *Leaderboard*: ranking de participantes, podio para los 3 primeros
  - *Actividad*: feed de fotos de check-ins de todos los participantes

**Qué se puede hacer:**
- Ver el ranking del reto
- Hacer check-in diario (foto + nota opcional)
- Ver la actividad fotográfica del grupo
- Reaccionar a las fotos de otros (con emojis)
- Ver fotos en pantalla completa
- Compartir/descargar fotos del feed
- (Creador) Iniciar o cancelar el reto

**Qué NO se puede hacer:**
- Hacer más de un check-in por día
- Hacer check-in sin foto
- Editar o eliminar un check-in ya enviado

---

### 7.1 Check-in con Foto

Pantalla modal que se abre al tocar "Do It". Flujo completo de registro diario.

**Qué se puede hacer:**
- Tomar una foto con la cámara (abre automáticamente)
- Elegir una foto de la galería como alternativa
- Agregar una nota opcional al check-in
- Enviar el check-in

**Qué NO se puede hacer:**
- Enviar check-in sin foto
- Subir video
- Editar la foto dentro de la app (recorte, filtros, etc.)

---

### 7.2 Crear Reto (Modal)

Formulario para crear un nuevo reto dentro de un grupo.

**Campos:**
- Título del reto
- Categoría (Gym, Lectura, Sueño, Dieta, Estudio, Personalizado)
- Duración (7, 30 o 90 días)
- Descripción de la apuesta/consecuencia (texto libre)

**Qué se puede hacer:**
- Crear un reto con título, categoría y duración
- Definir la "apuesta" en texto libre (ej: "el que pierde paga el almuerzo")

**Qué NO se puede hacer:**
- Elegir duración personalizada (solo 7, 30 o 90 días)
- Definir apuestas monetarias reales (es solo texto)
- Iniciar el reto inmediatamente (necesita al menos 2 participantes)

---

### 8. Amigos

Pantalla de gestión de amigos. Tiene tres pestañas:

- **Amigos**: lista de amigos aceptados
- **Recibidas**: solicitudes de amistad pendientes (con botones Aceptar/Rechazar)
- **Enviadas**: solicitudes que el usuario envió y están pendientes

**Qué se puede hacer:**
- Ver la lista completa de amigos
- Aceptar o rechazar solicitudes recibidas
- Ver solicitudes enviadas pendientes
- Ir al perfil de cualquier amigo

**Qué NO se puede hacer:**
- Eliminar amigos (funcionalidad pendiente)
- Bloquear usuarios

---

### 8.1 Buscar Usuarios

Pantalla de búsqueda de usuarios por nombre de usuario.

**Qué se puede hacer:**
- Buscar usuarios por nombre de usuario (mínimo 2 caracteres)
- Enviar solicitud de amistad
- Ver el estado de la amistad (pendiente, aceptada, etc.)

**Qué NO se puede hacer:**
- Buscar por nombre real o correo
- Enviar mensaje directo sin ser amigos

---

### 9. Perfil Público de Usuario

Perfil de solo lectura de otro usuario. Se accede tocando a cualquier amigo o participante.

**Muestra:**
- Foto, nombre, nombre de usuario, nivel
- Estadísticas: retos completados, check-ins, racha
- Cantidad de amigos

**Qué se puede hacer:**
- Ver la información pública del usuario
- Enviarle solicitud de amistad (si aún no son amigos)

**Qué NO se puede hacer:**
- Ver los grupos del otro usuario
- Ver el historial de check-ins del otro usuario

---

### 10. Premium (Paywall)

Pantalla que aparece cuando el usuario intenta superar los límites del plan gratuito.

**Muestra:**
- Comparativa Gratis vs Premium
- Límites del plan gratuito (1 grupo, 1 reto)
- Beneficios del plan Premium (grupos ilimitados, retos ilimitados)
- Botón "Suscribirse" (próximamente — sin funcionalidad real aún)

**Qué se puede hacer:**
- Ver la comparativa de planes
- Volver atrás ("Ahora no")

**Qué NO se puede hacer:**
- Suscribirse aún (funcionalidad en desarrollo)

---

## Lo que se puede hacer en DoIt

- Crear una cuenta y configurar tu perfil con foto y nombre de usuario
- Formar un grupo de hasta 10 personas
- Crear retos de hábitos con duración de 7, 30 o 90 días
- Hacer check-in diario con foto como prueba
- Agregar una nota al check-in
- Ver el ranking del grupo en tiempo real
- Reaccionar a las fotos de check-in de otros
- Ver fotos en pantalla completa y compartirlas
- Chatear con el grupo en tiempo real
- Agregar y gestionar amigos
- Invitar amigos a grupos directamente desde la app
- Unirse a grupos con código de invitación
- Personalizar la portada de un grupo (foto o color)
- Ver estadísticas personales (retos, check-ins, racha)
- Recuperar contraseña por correo
- Iniciar sesión con Google

---

## Lo que NO se puede hacer (aún)

- Tener más de 1 grupo sin plan Premium
- Crear más de 1 reto sin plan Premium
- Suscribirse a Premium (funcionalidad en desarrollo)
- Buscar grupos públicos (todos son privados)
- Hacer check-in sin foto
- Editar o eliminar un check-in enviado
- Salir de un grupo
- Eliminar amigos
- Hacer apuestas reales con dinero
- Elegir duración de reto personalizada
- Recibir notificaciones push (pendiente de implementar)
- Enviar fotos en el chat del grupo
- Modo web (solo app móvil: iOS y Android)

---

## Estructura de Pantallas

```
DoIt
│
├── Onboarding (5 diapositivas)
│   └── → Registro
│
├── Autenticación
│   ├── Método (registro / login / Google)
│   ├── Registro
│   │   └── Verificación por código (OTP)
│   ├── Inicio de sesión
│   ├── Olvidé mi contraseña
│   │   └── Verificación de recuperación (OTP)
│   ├── Restablecer contraseña
│   └── Configuración inicial de perfil (solo 1ª vez)
│
└── App principal
    │
    ├── [Tab] Inicio
    │   ├── Progreso del día
    │   ├── Estadísticas rápidas (Retos / Puntos / Racha)
    │   ├── Mis Grupos (acceso rápido)
    │   └── Mis Retos
    │       ├── Hoy
    │       ├── Próximos
    │       └── Hechos
    │
    ├── [Tab] Grupos
    │   ├── Invitaciones pendientes
    │   ├── Mis Grupos
    │   │   └── Detalle de Grupo
    │   │       ├── [Pestaña] Retos
    │   │       │   ├── Lista de retos
    │   │       │   │   └── Detalle de Reto
    │   │       │   │       ├── [Pestaña] Leaderboard
    │   │       │   │       ├── [Pestaña] Actividad (fotos)
    │   │       │   │       │   └── Foto en pantalla completa
    │   │       │   │       └── Check-in con foto (modal)
    │   │       │   └── Crear reto (modal)
    │   │       └── [Pestaña] Chat
    │   └── Descubrir / Unirse con código
    │
    ├── [Tab] Competir
    │   └── (En desarrollo)
    │
    └── [Tab] Perfil
        ├── Editar perfil (modal)
        │   └── Selector de foto de perfil
        ├── Retos activos
        ├── Historial de retos
        └── Amigos
            ├── [Pestaña] Amigos
            │   └── Perfil público de usuario
            ├── [Pestaña] Recibidas
            └── [Pestaña] Enviadas

Otras pantallas (accesibles desde varios lugares)
├── Buscar usuarios
├── Perfil público de usuario
└── Premium (paywall)
```
