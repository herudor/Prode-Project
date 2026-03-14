# Guia de Desarrollo - Prode Futbol

Esta guia cubre el setup completo del entorno local, el flujo de trabajo de desarrollo y la solucion de problemas comunes.

---

## Indice

1. [Requisitos](#requisitos)
2. [Setup inicial](#setup-inicial)
3. [Levantar el entorno](#levantar-el-entorno)
4. [Estructura de contenedores en dev](#estructura-de-contenedores-en-dev)
5. [Hot reload y flujo de trabajo](#hot-reload-y-flujo-de-trabajo)
6. [Datos de prueba](#datos-de-prueba)
7. [Crear el usuario admin](#crear-el-usuario-admin)
8. [Autenticacion y sesion](#autenticacion-y-sesion)
9. [Acceder a MongoDB en desarrollo](#acceder-a-mongodb-en-desarrollo)
10. [Variables de entorno en desarrollo](#variables-de-entorno-en-desarrollo)
11. [Logs](#logs)
12. [Apagar y limpiar](#apagar-y-limpiar)
13. [Agregar dependencias](#agregar-dependencias)
14. [Troubleshooting](#troubleshooting)

---

## Requisitos

- **Docker Desktop** instalado y corriendo (version 24+ recomendada)
- **make** (incluido en macOS y Linux)
- **Node.js 20+** solo si vas a correr `make jwt-secret` o instalar dependencias localmente

Verificar que Docker esta listo:

```bash
docker info
```

Si el comando falla, iniciar Docker Desktop antes de continuar.

---

## Setup inicial

### Primera vez en el proyecto

1. Clonar el repositorio (o descomprimir el ZIP si no hay acceso a git)
2. Verificar que `backend/.env.dev` existe con los valores de desarrollo

```bash
cat backend/.env.dev
```

Contenido esperado:

```
JWT_SECRET=dev_secret_no_usar_en_produccion
SPORTSDB_API_KEY=2
PORT=5000
ADMIN_EMAIL=admin@example.com
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
ADMIN_PASSWORD=admin_dev_password
```

Si el archivo no existe, crearlo con ese contenido. Estos valores son seguros para desarrollo local y no deben usarse en produccion.

3. No se necesita ninguna otra configuracion para iniciar el entorno de desarrollo.

---

## Levantar el entorno

### Primera vez (descarga imagenes de Docker y corre npm install)

```bash
make dev-build
```

Este comando ejecuta `docker compose -f docker-compose.dev.yml up --build`. Las primeras veces puede tardar varios minutos mientras descarga las imagenes de Node.js y MongoDB y corre `npm install` en backend y frontend.

### Veces siguientes (sin reconstruir imagenes)

```bash
make dev
```

### Verificar que todo esta corriendo

```bash
docker ps --filter "name=prode"
```

Deben aparecer tres contenedores:

```
prode-backend-dev    Up
prode-frontend-dev   Up
prode-mongo-dev      Up
```

### URLs disponibles

| Servicio | URL |
|----------|-----|
| Frontend (React/Vite) | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check del backend | http://localhost:5000/health |

---

## Estructura de contenedores en dev

El archivo `docker-compose.dev.yml` define tres servicios:

**mongo:** imagen oficial `mongo:7`, sin autenticacion, datos en volumen `mongo_dev_data`. Se accede internamente como `mongo:27017`.

**backend:** imagen `node:20-alpine`, monta `./backend` como volumen en `/app`. Al iniciar corre `npm install && npm run dev` (nodemon). Lee variables de `backend/.env.dev` y recibe `MONGODB_URI=mongodb://mongo:27017/prode-futbol-dev` directamente del compose.

**frontend:** imagen `node:20-alpine`, monta `./frontend` como volumen en `/app`. Al iniciar corre `npm install && npm run dev -- --host 0.0.0.0`. Recibe `VITE_API_URL=http://localhost:5000/api` del compose.

> **Nota:** En desarrollo el frontend llama al backend directamente via `localhost:5000`. El proxy de Nginx solo existe en produccion.

---

## Hot reload y flujo de trabajo

El entorno de desarrollo tiene hot reload automatico:

- **Backend:** nodemon reinicia el proceso cuando detecta cambios en `backend/src/`. No es necesario hacer nada.
- **Frontend:** Vite HMR (Hot Module Replacement) actualiza el navegador sin recargar la pagina.

### Flujo tipico

1. `make dev` (o `make dev-build` si hay cambios en package.json)
2. Editar archivos en `backend/src/` o `frontend/src/`
3. Los cambios se reflejan automaticamente en http://localhost:3000

### Cuando hacer rebuild

Es necesario hacer `make dev-build` cuando:
- Se agrega o elimina una dependencia npm (ver seccion [Agregar dependencias](#agregar-dependencias))
- Se modifica `docker-compose.dev.yml`
- El contenedor esta en un estado inconsistente

---

## Datos de prueba

El script de seed carga ~27 partidos ficticios del Mundial (mezcla de finalizados y proximos) para poder probar el flujo completo sin esperar al torneo real. Borra todos los partidos existentes antes de insertar.

```bash
make seed
```

El seed incluye:
- 9 partidos de fase de grupos finalizados con marcadores reales
- 9 partidos de fase de grupos proximos (para predecir)
- 4 partidos de octavos de final
- 2 cuartos de final
- 2 semifinales
- 1 partido por el tercer puesto
- 1 final

> **Importante:** El seed solo funciona en desarrollo. Si `NODE_ENV=production`, el script termina con error.

Para ver los datos cargados:

```bash
# Via API (requiere sesion activa — ver seccion de autenticacion)
curl -b cookies.txt http://localhost:5000/api/matches

# O conectandose directamente a MongoDB (ver seccion siguiente)
```

---

## Crear el usuario admin

```bash
make admin-dev
```

El script lee la contrasena desde `ADMIN_PASSWORD` en `backend/.env.dev`. Si el valor es `admin_dev_password` (el valor por defecto para desarrollo), la salida esperada es:

```
=== Admin creado exitosamente ===
Email: admin@example.com
Contrasena: admin_dev_password
IMPORTANTE! Guarda esta contrasena en un lugar seguro
```

Si `ADMIN_PASSWORD` no esta definida en el archivo `.env.dev`, el script genera una contrasena aleatoria e imprime el valor. Anotarlo antes de cerrar la terminal.

El email se configura con `ADMIN_EMAIL` en `backend/.env.dev`.

Si el admin ya fue creado en una sesion anterior, el script lo indica sin fallar:

```
Admin ya existe: admin@example.com
```

En ese caso, ir directo a http://localhost:3000/login.

---

## Autenticacion y sesion

### Como funciona la sesion

La autenticacion usa JWT almacenado en una **cookie HttpOnly** en lugar de `localStorage`. Esto significa:

- Al hacer login exitoso, el servidor setea una cookie `token` en el navegador con flags `HttpOnly` y `SameSite`.
- El navegador envia la cookie automaticamente en cada request subsiguiente.
- El frontend usa `withCredentials: true` en Axios para que las cookies se incluyan en requests cross-origin (necesario en desarrollo donde el frontend esta en el puerto 3000 y el backend en el 5000).
- No hay token visible en el codigo del frontend ni en `localStorage`. La presencia de sesion se verifica via `GET /api/auth/me` al cargar la app.

### Endpoints de autenticacion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro. Setea cookie de sesion si el registro es exitoso. |
| `POST` | `/api/auth/login` | Login. Setea cookie de sesion. No devuelve el token en el body. |
| `GET` | `/api/auth/me` | Devuelve los datos del usuario autenticado. |
| `POST` | `/api/auth/logout` | Limpia la cookie de sesion en el servidor. |

### Respuesta de login y register

Login y register devuelven los datos del usuario en el body, pero **no el token**:

```json
{
  "user": {
    "_id": "...",
    "name": "Juan Perez",
    "email": "juan@example.com",
    "role": "user"
  }
}
```

El token va exclusivamente en la cookie `HttpOnly` del response.

### AuthContext

El `AuthContext` del frontend (`frontend/src/context/AuthContext.jsx`):
- Al montar, llama a `GET /api/auth/me` para verificar si hay sesion activa.
- `login(userData)` recibe solo los datos del usuario (no el token).
- `logout()` es `async` y llama a `POST /api/auth/logout` antes de limpiar el estado local.

### Probar endpoints con curl en desarrollo

Para probar endpoints que requieren autenticacion con curl, usar el flag `-c` para guardar cookies y `-b` para enviarlas:

```bash
# Login y guardar cookie
curl -s -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_dev_password"}'

# Usar la cookie en requests subsiguientes
curl -b cookies.txt http://localhost:5000/api/auth/me

# Logout
curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/logout
```

---

## Acceder a MongoDB en desarrollo

MongoDB corre sin autenticacion en desarrollo. Se puede acceder directamente:

### Via mongosh desde el contenedor

```bash
docker exec -it prode-mongo-dev mongosh prode-futbol-dev
```

Comandos utiles dentro de mongosh:

```javascript
// Ver colecciones
show collections

// Ver todos los usuarios
db.users.find().pretty()

// Ver partidos proximos
db.matches.find({ status: "upcoming" }).pretty()

// Ver predicciones
db.predictions.find().pretty()

// Limpiar predicciones (para resetear el estado de pruebas)
db.predictions.deleteMany({})
```

### Usando MongoDB Compass (GUI)

Conectar a: `mongodb://localhost:27017/prode-futbol-dev`

No se necesita usuario ni password en desarrollo.

---

## Variables de entorno en desarrollo

### `backend/.env.dev`

Este archivo ya esta incluido en el repositorio porque contiene solo valores de desarrollo, sin credenciales reales.

| Variable | Valor | Notas |
|----------|-------|-------|
| `JWT_SECRET` | `dev_secret_no_usar_en_produccion` | Solo para desarrollo local |
| `SPORTSDB_API_KEY` | `2` | Clave publica, no cambiar |
| `PORT` | `5000` | Puerto del servidor Express |
| `ADMIN_EMAIL` | `admin@example.com` | Email del admin de prueba |
| `NODE_ENV` | `development` | Habilita seed, deshabilita algunas restricciones |
| `CORS_ORIGIN` | `http://localhost:3000` | Origen permitido para requests cross-origin con cookies |
| `ADMIN_PASSWORD` | `admin_dev_password` | Contrasena del admin en desarrollo. El script `createAdmin.js` la lee desde esta variable. |

### Variables inyectadas por docker-compose.dev.yml

Estas variables no estan en el `.env.dev` sino que el compose las inyecta directamente:

| Variable | Valor |
|----------|-------|
| `MONGODB_URI` | `mongodb://mongo:27017/prode-futbol-dev` |
| `NODE_ENV` | `development` (redundante, refuerza el valor) |

### `frontend` en desarrollo

El frontend recibe una sola variable de entorno del compose:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `http://localhost:5000/api` |

---

## Logs

### Ver todos los logs en tiempo real

```bash
make dev-logs
```

`Ctrl+C` para salir (los contenedores siguen corriendo).

### Ver logs de un servicio especifico

```bash
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f mongo
```

### Ver las ultimas N lineas

```bash
docker compose -f docker-compose.dev.yml logs --tail=50 backend
```

### Identificar los logs del cron

El cron de sincronizacion escribe logs con el prefijo `[SyncJob]`:

```
[SyncJob] Cron job iniciado (cada 5 minutos)
[SyncJob] Iniciando sincronizacion de partidos...
[SyncJob] Sincronizacion completada
```

---

## Apagar y limpiar

### Solo detener los contenedores (conserva los datos)

```bash
make dev-down
```

Los datos de MongoDB quedan guardados en el volumen `mongo_dev_data`. Al volver a correr `make dev`, la base de datos tiene el mismo estado.

### Detener y borrar todos los datos de desarrollo

```bash
# ADVERTENCIA: borra los volumenes de dev Y prod
make clean
```

Despues de `make clean`, la proxima vez hay que correr `make dev-build`, crear el admin con `make admin-dev` y volver a correr `make seed` si se necesitan datos de prueba.

---

## Agregar dependencias

### Dependencia de backend

```bash
# 1. Agregar localmente (actualiza package.json)
cd backend
npm install <nombre-paquete>

# 2. Reconstruir la imagen del contenedor
cd ..
make dev-build
```

> **Nota sobre cookie-parser:** `cookie-parser` ya es una dependencia del backend (agregada en la implementacion de cookies HttpOnly). Se instala automaticamente con `npm install` al hacer `make dev-build`. No es necesario instalarlo manualmente.

### Dependencia de frontend

```bash
# 1. Agregar localmente
cd frontend
npm install <nombre-paquete>

# 2. Reconstruir
cd ..
make dev-build
```

> **Nota:** Como los `node_modules` estan en volumenes separados dentro del contenedor, modificar el `package.json` localmente no es suficiente. Siempre hacer `make dev-build` despues de agregar una dependencia.

---

## Troubleshooting

### El frontend muestra pagina en blanco

1. Verificar que el contenedor esta corriendo: `docker ps --filter "name=prode-frontend"`
2. Ver los logs: `docker compose -f docker-compose.dev.yml logs frontend`
3. Verificar si Vite termino de iniciar (buscar `ready in Xms`)

### El backend da error de conexion a MongoDB

```
Error conectando a MongoDB: connect ECONNREFUSED
```

El backend inicia antes de que MongoDB este listo. Docker espera a que el contenedor de Mongo este "up" pero no espera a que el proceso interno termine de inicializar. En desarrollo, el backend reintenta automaticamente si usa el patron de reconexion de Mongoose. Si el error persiste:

```bash
make dev-down
make dev
```

### Las cookies no se envian en desarrollo

Si los requests al backend no incluyen la cookie de sesion, verificar:

1. Que `CORS_ORIGIN=http://localhost:3000` esta definido en `backend/.env.dev`
2. Que Axios en el frontend tiene `withCredentials: true` (configurado en `frontend/src/services/api.js`)
3. Que el navegador no esta bloqueando cookies de terceros (en desarrollo, frontend en 3000 y backend en 5000 son origenes distintos)

### Los cambios en el codigo no se aplican

Si nodemon no reinicia o el HMR no actualiza:

```bash
make dev-down
make dev-build
```

### Error `EACCES` o permisos en node_modules (Linux)

En Linux, los volumenes de Docker pueden tener conflictos de permisos con el usuario del host.

```bash
docker compose -f docker-compose.dev.yml down -v
make dev-build
```

El flag `-v` elimina el volumen anonimo de `node_modules`, forzando una reinstalacion limpia dentro del contenedor.

### Puerto 3000 o 5000 ocupado

```bash
# Ver que proceso usa el puerto
lsof -i :3000
lsof -i :5000

# Terminar el proceso
kill -9 <PID>
```

### El cron no sincroniza partidos en desarrollo

El cron llama a TheSportsDB, que solo tiene datos reales del torneo a partir de junio 2026. Para desarrollo, usar `make seed` en lugar de depender del cron. El cron seguira corriendo pero no encontrara datos para actualizar hasta que el torneo este activo.

### No puedo logearme como admin

Verificar que el admin fue creado:

```bash
docker exec -it prode-mongo-dev mongosh prode-futbol-dev --eval "db.users.findOne({role:'admin'})"
```

Si no aparece ningun resultado, correr `make admin-dev`.

Si aparece pero no puedes loguearte, verificar que el email en la UI coincide exactamente con el valor de `ADMIN_EMAIL` en `backend/.env.dev` y que la contrasena coincide con `ADMIN_PASSWORD`.
