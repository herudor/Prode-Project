# Seguridad - Prode Futbol

Este documento describe las practicas de seguridad implementadas, los hallazgos conocidos con sus riesgos y mitigaciones, y el proceso para reportar nuevas vulnerabilidades.

---

## Indice

1. [Practicas de seguridad implementadas](#practicas-de-seguridad-implementadas)
2. [Hallazgos conocidos](#hallazgos-conocidos)
3. [Hallazgos resueltos](#hallazgos-resueltos)
4. [Archivos que nunca deben commitearse](#archivos-que-nunca-deben-commitearse)
5. [Checklist de seguridad](#checklist-de-seguridad)
6. [Como reportar una vulnerabilidad](#como-reportar-una-vulnerabilidad)

---

## Practicas de seguridad implementadas

### Autenticacion y autorizacion

- **Passwords con bcrypt:** Las contrasenas se hashean con bcryptjs (factor de costo 10) antes de guardarse en MongoDB. Nunca se almacena el texto plano.
- **JWT en cookies HttpOnly:** Los tokens JWT se almacenan en cookies `HttpOnly`, `SameSite` y `Secure` (en produccion). Las cookies HttpOnly no son accesibles desde JavaScript, eliminando el vector de robo de tokens via XSS.
- **Middleware de autorizacion:** Todas las rutas protegidas verifican el token JWT antes de procesar el request (`backend/src/middleware/auth.js`). Lee el token de `req.cookies.token` y acepta `Authorization: Bearer <token>` como fallback para compatibilidad. Las rutas de admin verifican adicionalmente el rol (`backend/src/middleware/isAdmin.js`).
- **Respuestas genericas en login:** El endpoint `/api/auth/login` retorna siempre "Credenciales invalidas" tanto si el email no existe como si la contrasena es incorrecta, evitando que se pueda enumerar usuarios registrados.
- **Logout con limpieza de cookie:** El endpoint `POST /api/auth/logout` limpia la cookie del servidor, invalidando la sesion del lado del cliente.

### Control de origenes (CORS)

- **CORS con whitelist:** El middleware CORS esta configurado con una lista de origenes permitidos leida desde la variable de entorno `CORS_ORIGIN`. Solo el origen configurado puede hacer requests con credenciales.
- **Credenciales habilitadas en CORS:** `credentials: true` permite que las cookies de sesion se envien en requests cross-origin hacia el origen permitido.

### Headers de seguridad HTTP

Los siguientes headers estan configurados en `frontend/nginx.conf` y se envian en todas las respuestas:

| Header | Valor configurado | Funcion |
|--------|-------------------|---------|
| `X-Content-Type-Options` | `nosniff` | Previene que el navegador "adivine" el tipo de contenido |
| `X-Frame-Options` | `DENY` | Previene que la pagina sea embebida en iframes (clickjacking) |
| `X-XSS-Protection` | `1; mode=block` | Activa el filtro XSS del navegador (legacy, util para IE/Edge antiguos) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla que informacion se envia en el header Referer |
| `Content-Security-Policy` | `default-src 'self'; ...` | Controla desde donde se pueden cargar recursos (scripts, estilos, etc.) |

### Acceso al sistema

- **Sistema de invitacion:** El registro de nuevos usuarios requiere un codigo de invitacion de un solo uso generado por el admin. No es posible registrarse sin un codigo valido.
- **Codigos de invitacion de un solo uso:** Una vez usado, el codigo queda marcado como `used: true` y no puede reutilizarse.

### Separacion de entornos

- **Variables de entorno separadas:** Los archivos `.env.dev` y `.env.prod` son distintos. El secreto JWT de desarrollo es diferente al de produccion.
- **Seed bloqueado en produccion:** El script `seedTestData.js` verifica `NODE_ENV` y falla con error si se intenta correr en produccion.
- **MongoDB con autenticacion en prod:** El `docker-compose.prod.yml` configura MongoDB con usuario y password obligatorio. En desarrollo se usa sin autenticacion por conveniencia.
- **Contrasena de admin dinamica:** El script `createAdmin.js` lee la contrasena desde `process.env.ADMIN_PASSWORD`. Si la variable no esta definida, genera una aleatoria con `crypto.randomBytes(12).toString('hex')` e imprime el valor generado (solo una vez) con un aviso de guardarlo.

### Separacion de responsabilidades en el build

- **Backend sin devDependencies en prod:** El `Dockerfile` del backend usa `npm install --omit=dev`, excluyendo nodemon y otras herramientas de desarrollo.
- **Build multi-stage en frontend:** El `Dockerfile` del frontend usa una imagen de build (Node.js) y una imagen final (Nginx), sin incluir las herramientas de build en la imagen de produccion.

---

## Hallazgos conocidos

Esta seccion documenta las vulnerabilidades y debilidades de seguridad pendientes de resolucion.

---

### ALTA - JWT Secret debil o placeholder en archivos .env versionados

**Archivos afectados:**
- `backend/.env` (raiz): `JWT_SECRET=your_super_secret_jwt_key_change_in_production`
- `backend/.env.prod`: `JWT_SECRET=CAMBIAR_POR_SECRETO_SEGURO`

**Descripcion:** Existen archivos `.env` con valores placeholder para `JWT_SECRET` commiteados en el repositorio. Si alguien deploya el sistema sin reemplazar estos valores, los tokens JWT serian firmados con un secreto debil y conocido, permitiendo que un atacante forje tokens validos.

**Riesgo:** Compromiso total de autenticacion. Un atacante podria generar tokens JWT validos para cualquier usuario, incluyendo el admin.

**Mitigacion actual:** El README y PRODUCTION.md indican explicitamente que hay que generar el secreto con `make jwt-secret` antes del deploy.

**Accion requerida:**
1. Agregar `backend/.env` y `backend/.env.prod` a `.gitignore` si no estan ya.
2. Verificar que en produccion `JWT_SECRET` tiene el valor generado por `make jwt-secret` (96 caracteres hexadecimales aleatorios).
3. Nunca usar valores como `dev_secret_no_usar_en_produccion`, `CAMBIAR_POR_SECRETO_SEGURO` o `your_super_secret_jwt_key_change_in_production` en produccion.

---

### ALTA - Multiples archivos .env versionados con credenciales

**Archivos detectados en el repositorio:**
- `backend/.env` - contiene JWT_SECRET placeholder y MONGODB_URI apuntando a localhost
- `backend/.env.prod` - contiene JWT_SECRET placeholder y ADMIN_EMAIL placeholder
- `.env.prod` (raiz) - contiene MONGO_USER y MONGO_PASSWORD con valores placeholder
- `frontend/.env` - si existe, puede contener URLs o claves

**Descripcion:** Commitear archivos `.env` al repositorio es una mala practica incluso cuando los valores son placeholders, porque normaliza el patron y facilita el accidente de commitear valores reales en el futuro.

**Accion requerida:** Agregar al `.gitignore`:

```
.env
.env.prod
.env.local
backend/.env
backend/.env.dev
backend/.env.prod
frontend/.env
frontend/.env.production
```

Los archivos de ejemplo (`.env.example`, `.env.prod.example`) si pueden commitearse porque no contienen valores reales, solo la estructura.

---

### BAJA - MongoDB sin autenticacion en desarrollo

**Archivo:** `docker-compose.dev.yml`

**Descripcion:** El contenedor de MongoDB en desarrollo arranca sin usuario ni password (`MONGO_INITDB_ROOT_USERNAME` no esta definido). Cualquier proceso en la maquina del desarrollador puede conectarse a MongoDB en el puerto 27017 sin credenciales.

**Riesgo:** Bajo en un entorno de desarrollo local tipico. Podria ser un problema en entornos compartidos o si el puerto 27017 esta expuesto en la red.

**Mitigacion:** El puerto de MongoDB no esta mapeado al host en `docker-compose.dev.yml` (no hay seccion `ports` para el servicio `mongo`), por lo que no es accesible desde fuera de la red Docker. Solo los contenedores de la misma red `prode-dev-net` pueden conectarse.

**Accion recomendada:** Ninguna inmediata para desarrollo local. Si el entorno de desarrollo es un servidor compartido, agregar autenticacion tambien en dev.

---

## Hallazgos resueltos

Esta seccion registra las vulnerabilidades que fueron identificadas en auditoria y corregidas en el codigo.

---

### RESUELTO - ALTA - Contrasena de admin hardcodeada

**Resuelta en:** implementacion de `ADMIN_PASSWORD` dinamico

**Descripcion original:** El script `createAdmin.js` asignaba siempre la contrasena fija `admin123456`. Cualquiera con acceso al repositorio la conocia.

**Solucion aplicada:** `createAdmin.js` ahora lee la contrasena desde `process.env.ADMIN_PASSWORD`. Si la variable no esta definida, genera una contrasena aleatoria de 24 caracteres hexadecimales con `crypto.randomBytes(12)` y la imprime en consola una sola vez con instruccion de guardarla. La contrasena `admin123456` ya no existe en el codigo.

**Configuracion requerida:** Definir `ADMIN_PASSWORD` en `backend/.env.dev` (para desarrollo) y en `backend/.env.prod` (para produccion) con un valor seguro. Ver seccion de variables de entorno en DEVELOPMENT.md y PRODUCTION.md.

---

### RESUELTO - MEDIA - CORS sin restricciones en el backend

**Resuelta en:** configuracion de CORS con whitelist via `CORS_ORIGIN`

**Descripcion original:** `backend/src/app.js` usaba `app.use(cors())` sin opciones, permitiendo requests desde cualquier origen.

**Solucion aplicada:** CORS ahora usa una whitelist leida desde `process.env.CORS_ORIGIN`. Los requests desde origenes no listados son rechazados. `credentials: true` esta habilitado para permitir el envio de cookies de sesion. El middleware `cookie-parser` fue agregado para leer las cookies en el backend.

**Configuracion requerida:** Definir `CORS_ORIGIN` en los archivos `.env`:
- Desarrollo: `CORS_ORIGIN=http://localhost:3000`
- Produccion: `CORS_ORIGIN=https://tu-dominio.com`

---

### RESUELTO - MEDIA - Token JWT almacenado en localStorage

**Resuelta en:** migracion a cookies HttpOnly

**Descripcion original:** El token JWT se guardaba en `localStorage`, accesible desde JavaScript y vulnerable a robo via XSS.

**Solucion aplicada:**
- El backend (`backend/src/routes/auth.js`) ya no devuelve el token en el body del response. En cambio, setea una cookie `HttpOnly` llamada `token` con las flags `httpOnly: true`, `secure: true` en produccion y `sameSite: 'strict'`.
- Se agrego el endpoint `POST /api/auth/logout` que limpia la cookie del servidor.
- El frontend (`frontend/src/services/api.js`) usa `withCredentials: true` en Axios para enviar las cookies automaticamente. El interceptor que leia `localStorage.getItem('token')` fue removido.
- `frontend/src/context/AuthContext.jsx` ya no usa `localStorage` para el token ni para el usuario. Al cargar la app, verifica la sesion via `GET /api/auth/me`. El metodo `login()` recibe solo `userData` (no el token).

---

### RESUELTO - MEDIA - Sin headers de seguridad HTTP en Nginx

**Resuelta en:** actualizacion de `frontend/nginx.conf`

**Descripcion original:** La configuracion de Nginx no incluia headers de seguridad HTTP estandar (X-Frame-Options, CSP, etc.).

**Solucion aplicada:** Se agregaron los headers `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy` y `Content-Security-Policy` en `frontend/nginx.conf`. Adicionalmente se configuraron `X-Forwarded-For` y `X-Forwarded-Proto` en el bloque de proxy al backend.

---

## Archivos que nunca deben commitearse

Los siguientes archivos pueden contener credenciales reales y no deben estar en el repositorio:

```
.env.prod
backend/.env
backend/.env.prod
frontend/.env
frontend/.env.production
```

Verificar el `.gitignore` del proyecto e incluir estos patrones. Los archivos `.env.example` y `.env.prod.example` si se pueden commitear.

Para verificar que no hay archivos sensibles ya commiteados:

```bash
git ls-files | grep -E "\.env$|\.env\.prod$|\.env\.local$"
```

Si algun archivo aparece en la lista, hay que quitarlo del historial de git (esto es un proceso destructivo; consultar la documentacion de `git filter-branch` o `git filter-repo`).

---

## Checklist de seguridad

### Antes del primer deploy en produccion

- [ ] `JWT_SECRET` en `backend/.env.prod` generado con `make jwt-secret` (96 chars hex)
- [ ] `MONGO_PASSWORD` en `.env.prod` es unica y segura (no reutilizada de otros sistemas)
- [ ] `CORS_ORIGIN` en `backend/.env.prod` apunta al dominio real del frontend
- [ ] `ADMIN_PASSWORD` en `backend/.env.prod` es una contrasena segura (o se deja vacia para que se genere aleatoriamente al correr `make admin-prod`)
- [ ] Ambos archivos `.env.prod` estan en `.gitignore` y no commiteados
- [ ] `make admin-prod` ejecutado y contrasena del admin guardada de forma segura
- [ ] Puerto 5001 (backend directo) no expuesto publicamente si no es necesario

### Periodicamente

- [ ] Revisar logs en busca de errores o patrones anomalos
- [ ] Verificar que los contenedores estan corriendo correctamente
- [ ] Actualizar imagenes base de Docker para obtener parches de seguridad del OS
- [ ] Revisar si hay actualizaciones de dependencias npm con vulnerabilidades conocidas

### Para verificar dependencias con vulnerabilidades conocidas

```bash
# Backend
cd backend && npm audit

# Frontend
cd frontend && npm audit
```

---

## Como reportar una vulnerabilidad

Este proyecto es de uso privado/personal. Si encontras una vulnerabilidad:

1. No la reportes publicamente (issue tracker, redes sociales) hasta que sea resuelta.
2. Contactar directamente al administrador del proyecto.
3. Incluir en el reporte:
   - Descripcion de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial
   - Sugerencia de solucion si la tenes

El objetivo es resolver el problema antes de que sea explotado, no avergonzar ni penalizar.
