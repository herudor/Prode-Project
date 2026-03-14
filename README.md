# Prode Futbol - Mundial 2026

Aplicacion web de predicciones de futbol para el Mundial 2026. Los usuarios predicen resultados partido a partido, eligen campeon y goleador del torneo, y compiten en un ranking global. El acceso es por invitacion: el admin genera codigos que distribuye a los participantes.

Para instrucciones detalladas de desarrollo, produccion y seguridad, ver:

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup del entorno local, tests, troubleshooting
- [PRODUCTION.md](./PRODUCTION.md) - Deploy, checklist de seguridad, configuracion de produccion
- [SECURITY.md](./SECURITY.md) - Advertencias de seguridad, hallazgos conocidos, como reportar vulnerabilidades

---

## Indice

1. [Stack tecnologico](#stack-tecnologico)
2. [Requisitos previos](#requisitos-previos)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Configuracion inicial](#configuracion-inicial)
5. [Entorno de desarrollo](#entorno-de-desarrollo)
6. [Entorno de produccion](#entorno-de-produccion)
7. [Comandos disponibles](#comandos-disponibles)
8. [Variables de entorno](#variables-de-entorno)
9. [Sistema de puntuacion](#sistema-de-puntuacion)
10. [API Endpoints](#api-endpoints)
11. [Flujo de uso](#flujo-de-uso)
12. [Solucion de problemas](#solucion-de-problemas)

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| Backend | Node.js 20 + Express 4 |
| Base de datos | MongoDB 7 (via Mongoose 8) |
| Autenticacion | JWT (jsonwebtoken) + bcryptjs + cookies HttpOnly |
| API externa | TheSportsDB (League ID 4429, temporada 2026) |
| Cron job | node-cron (sincronizacion cada 5 minutos) |
| Contenedores | Docker + Docker Compose |
| Proxy (prod) | Nginx (sirve frontend y hace proxy a la API) |

---

## Requisitos previos

- **Docker Desktop** instalado y corriendo
  - macOS/Windows: https://www.docker.com/products/docker-desktop
  - Linux: Docker Engine + Docker Compose plugin
- **make** (incluido en macOS y Linux; en Windows usar WSL o Git Bash)
- **Node.js 20+** solo si se quiere usar `make jwt-secret` localmente

Verificar que Docker esta corriendo:

```bash
docker info
```

---

## Estructura del proyecto

```
prode-futbol/
├── Makefile                    # Comandos para dev y produccion
├── docker-compose.yml          # Compose base (no se usa directamente)
├── docker-compose.dev.yml      # Compose para desarrollo (hot reload)
├── docker-compose.prod.yml     # Compose para produccion (builds optimizados)
├── .env.prod.example           # Plantilla de variables de produccion (raiz)
├── .env.prod                   # Variables reales de produccion - NO commitear
│
├── backend/
│   ├── Dockerfile              # Build de produccion (Node 20 Alpine)
│   ├── package.json
│   ├── .env.example            # Plantilla de variables del backend
│   ├── .env.dev                # Variables para entorno de desarrollo
│   ├── .env.prod               # Variables del backend en produccion - NO commitear
│   └── src/
│       ├── app.js              # Entry point: Express, MongoDB, cron
│       ├── models/
│       │   ├── User.js         # Usuario (name, email, password, role)
│       │   ├── Match.js        # Partido (equipos, fecha, fase, resultado)
│       │   ├── Prediction.js   # Prediccion de partido por usuario
│       │   ├── TournamentPrediction.js  # Prediccion de campeon y goleador
│       │   └── InvitationCode.js        # Codigos de invitacion de un solo uso
│       ├── routes/
│       │   ├── auth.js         # /api/auth - registro, login, me
│       │   ├── matches.js      # /api/matches - listar y obtener partidos
│       │   ├── predictions.js  # /api/predictions - CRUD de predicciones
│       │   ├── leaderboard.js  # /api/leaderboard - ranking global
│       │   └── admin.js        # /api/admin - gestion (requiere rol admin)
│       ├── middleware/
│       │   ├── auth.js         # Verifica JWT en cada request
│       │   └── isAdmin.js      # Verifica rol admin
│       ├── jobs/
│       │   └── syncResults.js  # Cron: sincroniza resultados y calcula puntos
│       ├── services/
│       │   └── sportsdbService.js  # Cliente HTTP para TheSportsDB API
│       ├── utils/
│       │   └── scoring.js      # Logica de puntuacion
│       └── scripts/
│           ├── createAdmin.js  # Crea el usuario admin inicial
│           └── seedTestData.js # Carga partidos de prueba (solo dev)
│
└── frontend/
    ├── Dockerfile              # Build multi-stage: Vite + Nginx
    ├── nginx.conf              # Proxy /api/ al backend, React Router fallback
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Rutas y layout principal
        ├── context/
        │   └── AuthContext.jsx # Estado global de autenticacion (sesion via cookie HttpOnly)
        ├── components/
        │   ├── Navbar.jsx
        │   ├── MatchCard.jsx
        │   ├── PredictionForm.jsx
        │   ├── LeaderboardTable.jsx
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Home.jsx
        │   ├── Matches.jsx
        │   ├── Leaderboard.jsx
        │   ├── TournamentPredictions.jsx
        │   └── Admin.jsx
        └── services/
            └── api.js          # Axios configurado con base URL y withCredentials
```

---

## Configuracion inicial

El proyecto usa archivos `.env` separados para desarrollo y produccion.

> **Advertencia de seguridad:** Los archivos `.env.prod` contienen credenciales reales. Nunca deben commitearse al repositorio. Ver [SECURITY.md](./SECURITY.md) para la lista completa de archivos que deben estar en `.gitignore`.

### Desarrollo

El archivo `backend/.env.dev` ya existe con valores predeterminados para desarrollo local:

```
JWT_SECRET=dev_secret_no_usar_en_produccion
SPORTSDB_API_KEY=2
PORT=5000
ADMIN_EMAIL=admin@example.com
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
ADMIN_PASSWORD=admin_dev_password
```

La URI de MongoDB en dev esta definida directamente en `docker-compose.dev.yml`:

```
MONGODB_URI=mongodb://mongo:27017/prode-futbol-dev
```

No se necesita crear ningun archivo adicional para levantar el entorno de desarrollo.

### Produccion

Copiar los archivos de ejemplo y completarlos con valores reales:

```bash
# Variables de Mongo (usuario/password del contenedor)
cp .env.prod.example .env.prod

# Variables del backend en produccion
cp backend/.env.example backend/.env.prod
```

Editar `.env.prod` en la raiz del proyecto:

```
MONGO_USER=prode_admin
MONGO_PASSWORD=una_contrasena_muy_segura_aqui
```

Editar `backend/.env.prod`:

```
JWT_SECRET=pegar_aqui_el_secreto_generado_con_make_jwt-secret
SPORTSDB_API_KEY=2
PORT=5000
ADMIN_EMAIL=tu@email.com
NODE_ENV=production
CORS_ORIGIN=https://tu-dominio.com
ADMIN_PASSWORD=contrasena_segura_para_el_admin
```

> **Nota sobre SPORTSDB_API_KEY:** La clave `2` es la clave publica gratuita de TheSportsDB para acceso de lectura. Es suficiente para sincronizar resultados del Mundial 2026.

---

## Entorno de desarrollo

El entorno de desarrollo usa hot reload tanto en backend (nodemon) como en frontend (Vite HMR). Los archivos locales se montan como volumenes, por lo que los cambios se reflejan sin reconstruir imagenes.

### Levantar el entorno

```bash
# Primera vez (descarga imagenes y corre npm install)
make dev-build

# Veces siguientes (levanta sin reconstruir)
make dev
```

### Crear el usuario admin

```bash
make admin-dev
```

El script lee la contrasena desde `ADMIN_PASSWORD` en `backend/.env.dev`. Con el valor por defecto `admin_dev_password`, la salida esperada es:

```
=== Admin creado exitosamente ===
Email: admin@example.com
Contrasena: admin_dev_password
IMPORTANTE! Guarda esta contrasena en un lugar seguro
```

Si `ADMIN_PASSWORD` no esta definida, el script genera una contrasena aleatoria e imprime el valor. Anotarlo antes de cerrar la terminal.

El email del admin se configura en `backend/.env.dev` con la variable `ADMIN_EMAIL`.

### Cargar datos de prueba

El script de seed carga ~27 partidos ficticios del Mundial (algunos finalizados, otros proximos) para poder probar predicciones sin esperar al torneo real. Borra los partidos existentes antes de insertar.

```bash
make seed
```

> **Advertencia:** El script de seed solo corre si `NODE_ENV != production`. En produccion falla con error.

### Ver logs

```bash
# Todos los servicios (ctrl+c para salir)
make dev-logs

# Solo un servicio especifico
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f mongo
```

### Dar de baja el entorno

```bash
# Detener contenedores (conserva volumenes y datos)
make dev-down

# Detener y eliminar volumenes (borra todos los datos de MongoDB)
make clean
```

### URLs disponibles en desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/health |

---

## Entorno de produccion

En produccion el frontend se compila con `vite build` y se sirve via Nginx, que actua como proxy inverso hacia el backend. MongoDB usa autenticacion con usuario y password.

### Checklist pre-deploy

Antes de hacer el primer deploy, verificar:

- [ ] Archivo `.env.prod` creado en la raiz con `MONGO_USER` y `MONGO_PASSWORD` seguros
- [ ] Archivo `backend/.env.prod` creado con todos los valores
- [ ] `JWT_SECRET` generado con `make jwt-secret` (no usar el valor de ejemplo)
- [ ] `ADMIN_EMAIL` apunta a un email real
- [ ] Docker Desktop esta corriendo
- [ ] Los puertos 3000 y 5001 no estan en uso

Ver el checklist completo en [PRODUCTION.md](./PRODUCTION.md).

### Generar un JWT_SECRET seguro

```bash
make jwt-secret
```

Copiar la cadena hexadecimal que imprime (96 caracteres) y pegarla en `backend/.env.prod` como valor de `JWT_SECRET`.

### Levantar el entorno de produccion

```bash
# Construye imagenes y levanta en background
make prod-build

# Si las imagenes ya estan construidas
make prod
```

### Crear el usuario admin en produccion

```bash
make admin-prod
```

El script usa el valor de `ADMIN_PASSWORD` en `backend/.env.prod`. Si la variable no esta definida, genera una contrasena aleatoria e imprime el valor en consola. Guardarlo en un gestor de contrasenas antes de cerrar la terminal.

### Ver logs en produccion

```bash
# Todos los servicios
make prod-logs

# Solo un servicio
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Dar de baja el entorno de produccion

```bash
# Detener contenedores (conserva datos en volumen)
make prod-down

# Detener y eliminar TODOS los volumenes (borra base de datos)
make clean
```

> **Advertencia:** `make clean` elimina los volumenes de dev Y prod. Usar solo si se quiere resetear todo.

### URLs disponibles en produccion

| Servicio | URL | Notas |
|----------|-----|-------|
| Frontend | http://localhost:3000 | Nginx sirviendo el build de Vite |
| Backend API | http://localhost:5001/api | Acceso directo (para debugging) |
| API via Nginx | http://localhost:3000/api | Proxy interno, sin CORS |
| Health check | http://localhost:5001/health | Verificar que el backend responde |

En produccion la comunicacion frontend-backend pasa por Nginx (`/api/` se proxea internamente a `backend:5000`). CORS esta configurado con whitelist via `CORS_ORIGIN`; asegurarse de que el valor en `backend/.env.prod` coincide con la URL real del frontend.

---

## Comandos disponibles

Todos los comandos se ejecutan desde la raiz del proyecto con `make <comando>`.

| Comando | Descripcion |
|---------|-------------|
| `make dev` | Levanta el entorno de desarrollo (sin rebuild) |
| `make dev-build` | Levanta desarrollo forzando rebuild de imagenes |
| `make dev-down` | Detiene los contenedores de desarrollo |
| `make dev-logs` | Muestra logs en tiempo real de desarrollo |
| `make seed` | Carga partidos de prueba en la BD de desarrollo |
| `make admin-dev` | Crea el usuario admin en desarrollo |
| `make prod` | Levanta produccion en background (sin rebuild) |
| `make prod-build` | Levanta produccion forzando rebuild de imagenes |
| `make prod-down` | Detiene los contenedores de produccion |
| `make prod-logs` | Muestra logs en tiempo real de produccion |
| `make admin-prod` | Crea el usuario admin en produccion |
| `make jwt-secret` | Genera una clave JWT aleatoria segura (96 chars hex) |
| `make clean` | Detiene todo y elimina volumenes de dev y prod |

---

## Variables de entorno

### `backend/.env.dev` (desarrollo, ya incluido en el repo)

| Variable | Valor por defecto | Descripcion |
|----------|-------------------|-------------|
| `JWT_SECRET` | `dev_secret_no_usar_en_produccion` | Secreto para firmar tokens JWT. Solo para dev. |
| `SPORTSDB_API_KEY` | `2` | Clave publica de TheSportsDB. No cambiar. |
| `PORT` | `5000` | Puerto interno del servidor Express |
| `ADMIN_EMAIL` | `admin@example.com` | Email del usuario admin que crea `make admin-dev` |
| `NODE_ENV` | `development` | Modo de ejecucion. Controla el acceso a seed. |
| `CORS_ORIGIN` | `http://localhost:3000` | Origen permitido para requests con cookies. Requerido para que el frontend pueda autenticarse en dev. |
| `ADMIN_PASSWORD` | `admin_dev_password` | Contrasena del admin en desarrollo. La lee `createAdmin.js`. Si no esta definida, genera una aleatoria. |

La variable `MONGODB_URI` se inyecta directamente desde `docker-compose.dev.yml` y apunta a `mongodb://mongo:27017/prode-futbol-dev`.

### `backend/.env.prod` (produccion, NO commitear)

| Variable | Descripcion |
|----------|-------------|
| `JWT_SECRET` | Secreto generado con `make jwt-secret`. Minimo 48 bytes aleatorios. |
| `SPORTSDB_API_KEY` | `2` (clave publica de lectura, no cambiar) |
| `PORT` | `5000` |
| `ADMIN_EMAIL` | Email real del administrador |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | URL exacta del frontend (ej: `https://prode.midominio.com`). Sin barra final. Requerida para CORS con cookies. |
| `ADMIN_PASSWORD` | Contrasena del admin en produccion. Si se omite, `make admin-prod` genera una aleatoria (anotar el valor). |

La variable `MONGODB_URI` en produccion se construye automaticamente desde `docker-compose.prod.yml` usando `MONGO_USER` y `MONGO_PASSWORD`.

### `.env.prod` en la raiz (produccion, NO commitear)

| Variable | Descripcion |
|----------|-------------|
| `MONGO_USER` | Usuario raiz de MongoDB en el contenedor |
| `MONGO_PASSWORD` | Contrasena del usuario raiz de MongoDB |

---

## Sistema de puntuacion

### Predicciones de partido

| Tipo de acierto | Puntos |
|-----------------|--------|
| Resultado exacto (ej: pred 2-1, real 2-1) | 3 pts |
| Diferencia de goles igual (ej: pred 3-1, real 4-2, ambos +2) | 2 pts |
| Ganador o empate correcto (ej: pred 2-0, real 1-0) | 1 pt |
| Prediccion incorrecta | 0 pts |

**Nota sobre la diferencia de goles:** aplica cuando la diferencia `local - visitante` es identica y distinta de cero. Por ejemplo, predecir 3-1 y que el resultado sea 2-0 no otorga 2 puntos (diferencia +2 vs +2 aplica solo si no es empate, pero aqui +2 != +2 con 2-0 siendo +2... aplica). Sin embargo, si la diferencia predicha es 0 (empate), ese caso cae en la categoria "ganador/empate correcto".

### Predicciones del torneo

| Tipo de acierto | Puntos |
|-----------------|--------|
| Campeon del torneo correcto | 5 pts |
| Goleador del torneo correcto | 3 pts |

El ranking final combina puntos de partidos + puntos del torneo.

---

## API Endpoints

Las rutas protegidas verifican la sesion a traves de la cookie `HttpOnly` que el servidor setea al hacer login. El middleware acepta tambien el header `Authorization: Bearer <token>` como fallback para uso desde herramientas externas (curl, scripts).

### Autenticacion

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/register` | Registro con codigo de invitacion. Setea cookie de sesion. | No |
| `POST` | `/api/auth/login` | Login. Setea cookie de sesion. No devuelve el token en el body. | No |
| `GET` | `/api/auth/me` | Datos del usuario autenticado | Si |
| `POST` | `/api/auth/logout` | Limpia la cookie de sesion en el servidor | Si |

**Body de registro:**
```json
{
  "name": "Juan Perez",
  "email": "juan@example.com",
  "password": "mipassword123",
  "invitationCode": "AB12CD34"
}
```

**Body de login:**
```json
{
  "email": "juan@example.com",
  "password": "mipassword123"
}
```

### Partidos

| Metodo | Ruta | Descripcion | Params opcionales |
|--------|------|-------------|-------------------|
| `GET` | `/api/matches` | Lista partidos | `?phase=group`, `?status=finished`, `?upcoming=true` |
| `GET` | `/api/matches/:id` | Detalle de un partido | - |

Fases disponibles: `group`, `round_of_16`, `quarter`, `semi`, `third`, `final`

Estados disponibles: `upcoming`, `live`, `finished`

### Predicciones

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/predictions` | Mis predicciones (con datos del partido) |
| `POST` | `/api/predictions/:matchId` | Crear o actualizar prediccion de un partido |
| `GET` | `/api/predictions/tournament/me` | Mi prediccion de campeon y goleador |
| `POST` | `/api/predictions/tournament/save` | Guardar prediccion de torneo |

**Body de prediccion de partido:**
```json
{
  "homeScore": 2,
  "awayScore": 1
}
```

**Body de prediccion de torneo:**
```json
{
  "champion": "Argentina",
  "topScorer": "Lionel Messi"
}
```

> Las predicciones de partido se bloquean automaticamente cuando la fecha del partido ya paso o cuando el estado es distinto de `upcoming`.

### Leaderboard

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/api/leaderboard` | Ranking global ordenado por puntos |

Cada entrada del ranking incluye: `position`, `name`, `email`, `totalPoints`, `totalPredictions`, `exactResults`, `correctResults`.

### Administracion

Todas las rutas de admin requieren rol `admin`. Retornan `403 Forbidden` para usuarios normales.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/admin/invitation-codes` | Generar codigos de invitacion |
| `GET` | `/api/admin/invitation-codes` | Listar todos los codigos (con estado de uso) |
| `GET` | `/api/admin/matches` | Listar todos los partidos |
| `POST` | `/api/admin/matches` | Crear partido manualmente |
| `PUT` | `/api/admin/matches/:id` | Actualizar resultado de un partido |
| `POST` | `/api/admin/sync` | Forzar sincronizacion con TheSportsDB |
| `GET` | `/api/admin/users` | Listar usuarios registrados |
| `PUT` | `/api/admin/tournament-result` | Definir campeon y goleador real del torneo |

**Body para generar codigos:**
```json
{
  "count": 10
}
```

**Body para actualizar resultado de partido:**
```json
{
  "homeScore": 2,
  "awayScore": 1,
  "status": "finished"
}
```

**Body para resultado del torneo:**
```json
{
  "champion": "Argentina",
  "topScorer": "Lionel Messi"
}
```

---

## Flujo de uso

### 1. Setup inicial (admin)

```
Levantar entorno --> make admin-dev (o admin-prod) --> Login en /login
```

### 2. Invitar participantes (admin)

1. Ir a `/admin`
2. Generar codigos de invitacion indicando la cantidad
3. Distribuir los codigos a los participantes (por WhatsApp, email, etc.)

### 3. Registro de usuarios

1. Ir a `/register`
2. Completar nombre, email, password y el codigo de invitacion recibido
3. Cada codigo es de un solo uso

### 4. Predecir partidos

1. Ir a `/matches`
2. Ver los partidos proximos disponibles
3. Ingresar el marcador predicho para cada partido
4. Solo se pueden predecir partidos con estado `upcoming` cuya fecha no haya pasado

### 5. Prediccion de torneo

1. Ir a `/tournament`
2. Ingresar el pais que sera campeon
3. Ingresar el nombre del jugador que sera el goleador
4. Se puede modificar hasta que el admin defina el resultado oficial

### 6. Seguimiento

- `/leaderboard`: ver el ranking en tiempo real
- Los puntos se calculan automaticamente cuando:
  - El cron job sincroniza un partido finalizado desde TheSportsDB (cada 5 minutos)
  - El admin actualiza manualmente un resultado desde `/admin`

### 7. Cierre del torneo (admin)

1. Ir a `/admin`
2. Definir campeon y goleador oficial
3. Los puntos de predicciones de torneo se calculan automaticamente para todos los usuarios

---

## Solucion de problemas

### El puerto 3000 o 5000 ya esta en uso

```bash
lsof -i :3000
lsof -i :5000
kill -9 <PID>
```

O cambiar el puerto en el docker-compose correspondiente (columna izquierda del mapeo de puertos).

### Docker no esta corriendo

```
Error: Cannot connect to the Docker daemon
```

Iniciar Docker Desktop desde el menu de aplicaciones y esperar a que el icono de la ballena aparezca en la barra de estado.

### El backend no puede conectar a MongoDB

```
Error conectando a MongoDB: ...
```

- En desarrollo: verificar que el contenedor `prode-mongo-dev` este corriendo con `docker ps`
- En produccion: verificar que los valores de `MONGO_USER` y `MONGO_PASSWORD` en `.env.prod` coincidan exactamente (sin espacios extra)
- Si se cambio la password de Mongo, eliminar el volumen y recrearlo: `make clean && make prod-build`

### El admin ya existe al correr `make admin-dev`

```
Admin ya existe: admin@example.com
```

El usuario ya fue creado. Ir directo a `/login` con las credenciales del admin.

### Los partidos no se sincronizan desde TheSportsDB

El cron corre cada 5 minutos. Para forzar una sincronizacion inmediata desde curl:

```bash
# Login y guardar cookie de sesion
curl -s -c cookies.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tu-password"}'

# Forzar sincronizacion usando la cookie
curl -s -b cookies.txt -X POST http://localhost:5001/api/admin/sync
```

O desde la interfaz de admin en `/admin` si existe el boton de sincronizacion.

La API de TheSportsDB solo tiene datos reales del torneo a partir de junio 2026. Hasta entonces, usar `make seed` para trabajar con datos de prueba.

### Los cambios en el codigo no se reflejan en desarrollo

```bash
make dev-down
make dev-build
```

### Error de permisos en node_modules en Linux

```bash
docker compose -f docker-compose.dev.yml down -v
make dev-build
```

### Ver el estado de todos los contenedores

```bash
docker ps -a --filter "name=prode"
```
