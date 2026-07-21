# HunterWeb - Sistema de Prospección Comercial

## 1. Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUNTERWEB SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Frontend   │    │   Backend    │    │   Scraper    │                  │
│  │   (React)    │◄──►│   (Node.js)  │◄──►│   Service    │                  │
│  │              │    │   Express    │    │              │                  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘                  │
│         │                   │                      │                        │
│         │                   │                      ▼                        │
│         │                   │            ┌──────────────────┐               │
│         │                   │            │  Google Maps     │               │
│         │                   │            │  LinkedIn        │               │
│         │                   │            │  Web Validator   │               │
│         │                   │            └──────────────────┘               │
│         │                   │                                               │
│         │                   ▼                                               │
│         │            ┌──────────────┐                                      │
│         │            │   PostgreSQL │                                      │
│         │            │   Database   │                                      │
│         │            └──────────────┘                                      │
│         │                   │                                               │
│         │                   ▼                                               │
│         │            ┌──────────────┐                                      │
│         │            │    Redis     │                                      │
│         │            │   (Cache)    │                                      │
│         │            └──────────────┘                                      │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                          │
│  │   Email      │                                                          │
│  │   Service    │                                                          │
│  │   (Alerts)   │                                                          │
│  └──────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. USER REQUEST → Frontend (React)
2. FRONTEND → API REST (JWT Auth)
3. API → Controller → Service Layer
4. SERVICE → 
   ├─ Database (CRUD operations)
   ├─ Scraper Service (External data)
   └─ Lead Score Algorithm
5. SCRAPER → External APIs (Google Maps, LinkedIn)
6. RESULTS → Database → Response to Frontend
7. ALERTS → Email Service (if lead_score > 80)
```

## 2. Esquema de Base de Datos

### Tablas Principales

#### users
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- role (ENUM: 'admin', 'user')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

#### leads
- id (UUID, PK)
- name (VARCHAR)
- address (TEXT)
- phone (VARCHAR)
- email (VARCHAR)
- niche (VARCHAR)
- location (VARCHAR)
- company_size (ENUM: 'small', 'medium', 'large')
- website_url (VARCHAR)
- has_website (BOOLEAN)
- social_media (JSONB)
- linkedin_url (VARCHAR)
- google_maps_url (VARCHAR)
- lead_score (INTEGER, 0-100)
- status (ENUM: 'new', 'contacted', 'qualified', 'converted', 'rejected')
- source (ENUM: 'google_maps', 'linkedin', 'manual')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_scraped_at (TIMESTAMP)

#### lead_scores_history
- id (UUID, PK)
- lead_id (UUID, FK → leads.id)
- previous_score (INTEGER)
- new_score (INTEGER)
- score_factors (JSONB)
- calculated_at (TIMESTAMP)

#### scrap_jobs
- id (UUID, PK)
- job_type (ENUM: 'google_maps', 'linkedin', 'web_validation')
- parameters (JSONB)
- status (ENUM: 'pending', 'running', 'completed', 'failed')
- progress (INTEGER, 0-100)
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- error_message (TEXT)

#### activity_logs
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- action (VARCHAR)
- resource_type (VARCHAR)
- resource_id (UUID)
- details (JSONB)
- ip_address (VARCHAR)
- created_at (TIMESTAMP)

#### alerts
- id (UUID, PK)
- lead_id (UUID, FK → leads.id)
- alert_type (VARCHAR)
- message (TEXT)
- is_read (BOOLEAN)
- sent_at (TIMESTAMP)
- created_at (TIMESTAMP)

### Relaciones

```
users (1) ──► (N) activity_logs
users (1) ──► (N) alerts (via lead association)
leads (1) ──► (N) lead_scores_history
leads (1) ──► (N) alerts
scrap_jobs (1) ──► (N) leads (via metadata)
```

## 3. Plan de Desarrollo por Sprints

### Sprint 1 (Semana 1-2): Infrastructure & Core Backend
- [x] Configuración Docker Compose
- [x] Setup de PostgreSQL y Redis
- [x] Estructura del proyecto backend
- [x] Modelo de datos y migraciones
- [x] Autenticación JWT
- [x] Roles y permisos básicos

### Sprint 2 (Semana 3-4): Scraping Modules
- [x] Módulo Google Maps scraping
- [ ] Módulo LinkedIn scraping
- [x] Validador de sitios web
- [x] Sistema de deduplicación
- [x] Algoritmo Lead Score

### Sprint 3 (Semana 5-6): Frontend Foundation
- [x] Setup React + Tailwind CSS
- [x] Componentes base (Tabla, Filtros, Cards)
- [x] Dashboard principal
- [x] Vista detallada de leads
- [x] Tema oscuro/claro

### Sprint 4 (Semana 7-8): Advanced Features
- [x] API endpoints completos
- [x] Exportación CSV/Excel
- [x] Sistema de alertas por email
- [x] Logs de actividad
- [x] Programación de jobs (cron)

### Sprint 5 (Semana 9-10): Polish & Testing
- [ ] Tests automatizados
- [ ] Optimización de rendimiento
- [ ] Documentación completa
- [ ] Deploy en producción

## 4. Nichos Objetivo

1. Restaurantes y gastronomía
2. Talleres mecánicos y autopartes
3. Clínicas y consultorios médicos
4. Estudios jurídicos y notarías
5. Gimnasios y centros deportivos
6. Tiendas de ropa y calzado
7. Ferreterías y materiales de construcción
8. Peluquerías y centros de estética
9. Inmobiliarias y constructoras
10. Escuelas y centros educativos

## 5. Decisiones Técnicas

### Backend: Node.js + Express
- **Razón**: JavaScript en todo el stack, gran ecosistema de librerías de scraping, asíncrono por defecto.
- **Alternativa considerada**: Python + FastAPI (descartado por menor madurez en scraping).

### Base de Datos: PostgreSQL
- **Razón**: Robusto, soporte JSONB para datos flexibles de scraping, excelente para consultas complejas.
- **Alternativa considerada**: MongoDB (descartado por necesidad de relaciones fuertes y transacciones).

### Scraping: Playwright
- **Razón**: Más moderno que Puppeteer, soporta múltiples navegadores, mejor manejo de sitios dinámicos.
- **Alternativa considerada**: Puppeteer (limitado a Chrome), Apify (servicio de pago).

### Frontend: React + Tailwind CSS
- **Razón**: Componentes reutilizables, gran comunidad, Tailwind permite diseño rápido y responsive.
- **Alternativa considerada**: Vue.js (menor adopción empresarial), Angular (más complejo).

### Orquestación: Docker Compose
- **Razón**: Fácil desarrollo local, reproducible, prepara para Kubernetes en producción.
