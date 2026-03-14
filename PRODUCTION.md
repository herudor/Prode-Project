# Guia de Produccion - Prode Futbol

Esta guia cubre el proceso completo de deploy en produccion: configuracion de variables de entorno, checklist de seguridad, instrucciones de deploy con Docker y monitoreo.

> **Antes de continuar:** Leer [SECURITY.md](./SECURITY.md) para entender los riesgos de seguridad conocidos del proyecto y las mitigaciones necesarias antes de exponer el sistema a usuarios reales.

---

## Indice

1. [Diferencias entre dev y prod](#diferencias-entre-dev-y-prod)
2. [Checklist de seguridad pre-deploy](#checklist-de-seguridad-pre-deploy)
3. [Configuracion de variables de entorno](#configuracion-de-variables-de-entorno)
4. [Generar JWT Secret seguro](#generar-jwt-secret-seguro)
5. [Deploy con Docker](#deploy-con-docker)
6. [Crear el usuario admin](#crear-el-usuario-admin)
7. [Verificar que todo funciona](#verificar-que-todo-funciona)
8. [Monitoreo y logs](#monitoreo-y-logs)
9. [Mantenimiento](#mantenimiento)
10. [Backup de MongoDB](#backup-de-mongodb)
11. [Actualizar el sistema](#actualizar-el-sistema)

---

## Diferencias entre dev y prod

| Aspecto | Desarrollo | Produccion |
|---------|-----------|-----------|
| Frontend | Servidor Vite con HMR | Build estatico servido por Nginx |
| Backend | nodemon con hot reload | `node src/app.js` (sin nodemon) |
| MongoDB | Sin autenticacion | Con usuario y password obligatorio |
| MONGODB_URI | `mongodb://mongo:27017/...` | `mongodb://user:pass@mongo:27017/...?authSource=admin` |
| Puerto backend expuesto | 5000 | 5001 (el 5000 es interno) |
| CORS | Restringido a `CORS_ORIGIN` | Restringido al dominio real del frontend |
| JWT Secret | Valor de ejemplo | Secreto generado aleatoriamente |
| Almacenamiento de sesion | Cookie HttpOnly | Cookie HttpOnly con `secure: true` |
| Headers de seguridad Nginx | Configurados | Configurados (X-Frame-Options, CSP, etc.) |
| Codigo fuente montado | Si (volumenes) | No (copiado en la imagen) |
| Script seed | Permitido | Bloqueado (error si se intenta) |

---

## Checklist de seguridad pre-deploy

Completar estos items antes de exponer el sistema a internet. Ver [SECURITY.md](./SECURITY.md) para el detalle de cada punto.

### Obligatorios (el sistema no debe deployarse sin estos)

- [ ] `JWT_SECRET` generado con `make jwt-secret` y guardado en `backend/.env.prod`. No usar el valor de ejemplo ni el de desarrollo.
- [ ] `MONGO_PASSWORD` es una contrasena unica y segura (minimo 20 caracteres, sin palabras del diccionario). Guardada en `.env.prod`.
- [ ] `CORS_ORIGIN` definido en `backend/.env.prod` con el dominio real del frontend (ej: `https://midominio.com`).
- [ ] `ADMIN_PASSWORD` definido en `backend/.env.prod` con una contrasena segura, o dejarlo vacio para que se genere aleatoriamente (en ese caso, anotar el valor que imprime `make admin-prod`).
- [ ] Los archivos `.env.prod` y `backend/.env.prod` NO estan en el repositorio git. Verificar con `git status`.
- [ ] `ADMIN_EMAIL` apunta a un email real al que tienes acceso.

### Fuertemente recomendados

- [ ] HTTPS: configurar SSL/TLS si el sistema es accesible desde internet. El `nginx.conf` actual solo sirve HTTP.

> **Nota:** Los headers de seguridad HTTP (X-Frame-Options, CSP, etc.) ya estan configurados en `frontend/nginx.conf`. No requieren accion manual adicional.

> **Nota:** CORS ya esta configurado con whitelist. Solo es necesario definir el valor correcto de `CORS_ORIGIN` en `backend/.env.prod`.

### Deseables para un entorno maduro

- [ ] Configurar alertas de logs (errores del backend, fallos de sincronizacion del cron)
- [ ] Programar backups periodicos de MongoDB
- [ ] Revisar que el servidor host tiene actualizaciones de seguridad aplicadas
- [ ] Limitar el acceso al puerto 5001 (backend directo) a solo la IP del administrador

---

## Configuracion de variables de entorno

### Paso 1: Variables de MongoDB (raiz del proyecto)

```bash
cp .env.prod.example .env.prod
```

Editar `.env.prod`:

```
MONGO_USER=prode_admin
MONGO_PASSWORD=<contrasena-muy-segura-aqui>
```

Reglas para la contrasena de Mongo:
- Minimo 20 caracteres
- Combinar letras mayusculas, minusculas, numeros y simbolos
- No usar palabras del diccionario
- No reutilizar contrasenas de otros sistemas

Ejemplo de generacion con openssl (requiere openssl instalado):

```bash
openssl rand -base64 32
```

### Paso 2: Variables del backend de produccion

```bash
cp backend/.env.example backend/.env.prod
```

Editar `backend/.env.prod`:

```
JWT_SECRET=<secreto-generado-con-make-jwt-secret>
SPORTSDB_API_KEY=2
PORT=5000
ADMIN_EMAIL=<tu-email-real>
NODE_ENV=production
CORS_ORIGIN=https://<tu-dominio-real>
ADMIN_PASSWORD=<contrasena-segura-para-el-admin>
```

**Notas sobre las variables nuevas:**

- `CORS_ORIGIN`: debe ser la URL exacta del frontend tal como la ven los navegadores de los usuarios, incluyendo el protocolo. Ejemplos: `https://prode.midominio.com`, `http://192.168.1.100:3000`. Sin barra final.
- `ADMIN_PASSWORD`: la contrasena que se asignara al usuario admin al correr `make admin-prod`. Si se deja vacia o no se define, el script genera una aleatoria de 24 caracteres y la imprime en consola. En ese caso, anotar el valor antes de cerrar la terminal porque no se puede recuperar.

> **Importante:** No agregar `MONGODB_URI` a este archivo. En produccion, `docker-compose.prod.yml` construye la URI automaticamente usando `MONGO_USER` y `MONGO_PASSWORD` del archivo `.env.prod` de la raiz.

### Verificar los archivos creados

```bash
# Verificar que existen y tienen contenido (sin mostrar valores reales)
cat .env.prod | grep -c "="
cat backend/.env.prod | grep -c "="
```

El primer comando debe mostrar 2 (MONGO_USER y MONGO_PASSWORD). El segundo debe mostrar 7 (JWT_SECRET, SPORTSDB_API_KEY, PORT, ADMIN_EMAIL, NODE_ENV, CORS_ORIGIN, ADMIN_PASSWORD).

---

## Generar JWT Secret seguro

El proyecto incluye un comando dedicado:

```bash
make jwt-secret
```

Salida de ejemplo:

```
a3f8c2e1d94b7f0e5a2c8d1b6e3f9a0c4d7e2b5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c0e3b6f9
```

Esta cadena tiene 96 caracteres hexadecimales, equivalente a 48 bytes aleatorios. Es suficientemente larga para ser practicamente imposible de adivinar o forzar con ataques de fuerza bruta.

Copiar el valor completo y pegarlo como valor de `JWT_SECRET` en `backend/.env.prod`.

> **Advertencia:** Cada vez que se regenera el JWT Secret y se redeploya el backend, todas las cookies de sesion existentes quedan invalidadas porque el servidor ya no puede verificar los tokens firmados con el secreto anterior. Los usuarios deberan loguearse nuevamente.

---

## Deploy con Docker

### Primera vez

```bash
make prod-build
```

Este comando ejecuta `docker compose -f docker-compose.prod.yml up -d --build`. Construye las imagenes de backend y frontend, inicia MongoDB con autenticacion y levanta todo en segundo plano.

La primera vez puede tardar varios minutos mientras construye las imagenes.

### Veces siguientes (sin reconstruir imagenes)

```bash
make prod
```

Usar este comando cuando se quiere iniciar el sistema sin reconstruir las imagenes (por ejemplo, despues de un reinicio del servidor).

### Verificar que los contenedores estan corriendo

```bash
docker ps --filter "name=prode"
```

Deben aparecer tres contenedores con estado `Up`:

```
prode-backend-prod    Up
prode-frontend-prod   Up
prode-mongo-prod      Up
```

### Verificar la salud del backend

```bash
curl http://localhost:5001/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

---

## Crear el usuario admin

**Ejecutar una sola vez despues del primer deploy:**

```bash
make admin-prod
```

El script crea el usuario admin con:
- Email: el valor de `ADMIN_EMAIL` en `backend/.env.prod`
- Contrasena: el valor de `ADMIN_PASSWORD` en `backend/.env.prod`

Si `ADMIN_PASSWORD` no esta definida, el script genera una contrasena aleatoria de 24 caracteres e imprime algo como:

```
=== Admin creado exitosamente ===
Email: tu@email.com
Contrasena: 8f3a2c1d9e4b7f0e5a2c
IMPORTANTE! Guarda esta contrasena en un lugar seguro. No se mostrara nuevamente.
```

> **Accion inmediata requerida:** Guardar la contrasena del admin en un gestor de contrasenas antes de cerrar la terminal. Si `ADMIN_PASSWORD` estaba definida en `.env.prod`, la contrasena es la que configuraste.

Si el admin ya fue creado en un deploy anterior:

```
Admin ya existe: tu@email.com
```

En ese caso no hacer nada.

---

## Verificar que todo funciona

### Secuencia de verificacion post-deploy

1. Verificar el health check del backend:

```bash
curl http://localhost:5001/health
```

2. Abrir http://localhost:3000 en el navegador. Debe cargar la interfaz.

3. Ir a http://localhost:3000/login y hacer login con el admin.

4. Verificar en las herramientas del navegador (DevTools > Application > Cookies) que existe la cookie `token` con la flag `HttpOnly` marcada y sin valor visible.

5. Desde el panel admin, generar un codigo de invitacion.

6. Registrar un usuario de prueba en http://localhost:3000/register con ese codigo.

7. Verificar que el usuario de prueba aparece en el ranking.

8. Verificar que el cron corre correctamente revisando los logs:

```bash
make prod-logs
```

Buscar lineas con `[SyncJob]` que indiquen que el cron se inicio.

---

## Monitoreo y logs

### Ver logs en tiempo real

```bash
make prod-logs
```

`Ctrl+C` para salir. Los contenedores siguen corriendo.

### Ver logs de un servicio especifico

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f mongo
```

### Ver las ultimas N lineas sin seguir en tiempo real

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Patrones de log importantes a monitorear

| Patron | Significado | Accion |
|--------|------------|--------|
| `[SyncJob] Error durante sincronizacion:` | Fallo en sincronizacion con TheSportsDB | Revisar conectividad a internet del servidor |
| `Error conectando a MongoDB:` | Backend no puede conectar a la BD | Verificar que el contenedor de Mongo esta corriendo |
| `[SyncJob] No se obtuvieron partidos de la API` | TheSportsDB no retorno datos | Normal antes de junio 2026 |
| `Error en el servidor` | Error 500 en algun endpoint | Revisar los logs completos para el stack trace |

### Ver el estado de los contenedores

```bash
docker ps -a --filter "name=prode"
```

Si algun contenedor tiene estado `Exited`, revisar sus logs:

```bash
docker logs prode-backend-prod --tail=50
```

---

## Mantenimiento

### Detener el sistema sin borrar datos

```bash
make prod-down
```

Los datos de MongoDB quedan guardados en el volumen `mongo_prod_data`.

### Reiniciar un servicio especifico

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
```

### Forzar sincronizacion con TheSportsDB

La sincronizacion requiere una sesion activa de admin. Desde el navegador, hacer login como admin y usar el panel de administracion. Para hacerlo con curl, primero obtener la cookie de sesion:

```bash
# Login y guardar cookie
curl -s -c cookies.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tu-password"}'

# Forzar sincronizacion
curl -s -b cookies.txt -X POST http://localhost:5001/api/admin/sync
```

---

## Backup de MongoDB

### Backup manual

```bash
# Crear directorio para backups
mkdir -p backups

# Ejecutar mongodump dentro del contenedor
docker exec prode-mongo-prod mongodump \
  --username ${MONGO_USER} \
  --password ${MONGO_PASSWORD} \
  --authenticationDatabase admin \
  --db prode-futbol \
  --out /data/backup

# Copiar el backup al host
docker cp prode-mongo-prod:/data/backup ./backups/backup-$(date +%Y%m%d-%H%M%S)
```

> **Nota:** Reemplazar `${MONGO_USER}` y `${MONGO_PASSWORD}` con los valores reales del archivo `.env.prod`.

### Restaurar un backup

```bash
# Copiar el backup al contenedor
docker cp ./backups/<directorio-backup> prode-mongo-prod:/data/restore

# Restaurar
docker exec prode-mongo-prod mongorestore \
  --username ${MONGO_USER} \
  --password ${MONGO_PASSWORD} \
  --authenticationDatabase admin \
  --db prode-futbol \
  /data/restore/prode-futbol
```

---

## Actualizar el sistema

### Actualizar el codigo (nueva version)

```bash
# 1. Detener el sistema actual
make prod-down

# 2. Obtener la nueva version del codigo (git pull, descomprimir, etc.)
# git pull origin main

# 3. Reconstruir las imagenes y levantar
make prod-build
```

> **Advertencia:** Si la nueva version cambia el esquema de la base de datos, revisar si hay migraciones necesarias antes de actualizar.

### Actualizar las imagenes base de Docker

```bash
# Descargar versiones actualizadas de las imagenes base
docker compose -f docker-compose.prod.yml pull

# Reconstruir con las nuevas bases
make prod-build
```

### Rotar el JWT Secret

Si es necesario invalidar todas las sesiones activas (por ejemplo, si se sospecha de una filtracion):

```bash
# 1. Generar nuevo secreto
make jwt-secret

# 2. Actualizar backend/.env.prod con el nuevo valor

# 3. Reiniciar el backend
docker compose -f docker-compose.prod.yml restart backend
```

Todos los usuarios deberan loguearse nuevamente despues de este cambio, porque las cookies existentes contienen tokens firmados con el secreto anterior.
