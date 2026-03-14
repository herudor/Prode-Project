# ============================================================
#  Prode Fútbol - Mundial 2026
#  Uso: make <comando>
# ============================================================

# ----- DESARROLLO -----

dev:
	docker compose -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

seed:
	docker compose -f docker-compose.dev.yml run --rm backend node src/scripts/seedTestData.js

admin-dev:
	docker compose -f docker-compose.dev.yml run --rm backend node src/scripts/createAdmin.js

# ----- PRODUCCIÓN -----

prod:
	docker compose -f docker-compose.prod.yml up -d

prod-build:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

admin-prod:
	docker compose -f docker-compose.prod.yml run --rm backend node src/scripts/createAdmin.js

# ----- UTILIDADES -----

clean:
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.prod.yml down -v

jwt-secret:
	@node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

.PHONY: dev dev-build dev-down dev-logs seed admin-dev prod prod-build prod-down prod-logs admin-prod clean jwt-secret
