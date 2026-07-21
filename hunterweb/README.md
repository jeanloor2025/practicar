# HunterWeb - Sistema de Prospección Comercial

## Descripción

HunterWeb es una herramienta de prospección comercial diseñada para agencias de marketing y desarrollo web que quieren identificar negocios sin presencia digital o con presencia deficiente para ofrecerles sus servicios.

## Características Principales

- **Scraping multi-fuente**: Google Maps, LinkedIn (próximamente)
- **Detección inteligente**: Identifica negocios sin sitio web o con presencia digital básica
- **Lead Scoring**: Sistema de puntuación (0-100) para priorizar oportunidades
- **Dashboard interactivo**: Tabla con filtros, ordenación y paginación
- **Tema oscuro/claro**: Diseño moderno y responsive
- **API REST**: Autenticación JWT, roles y permisos

## Requisitos Previos

- Node.js 18+ 
- Docker y Docker Compose (recomendado)
- PostgreSQL 15+
- npm o yarn

## Instalación Rápida con Docker

```bash
# Clonar el repositorio
cd hunterweb

# Copiar variables de entorno
cp backend/.env.example backend/.env

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

Accede a:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Instalación Manual

### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Ejecutar migraciones de base de datos
npm run migrate

# Iniciar servidor de desarrollo
npm run dev
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Uso Básico

### 1. Registro e Inicio de Sesión

El usuario admin por defecto:
- Email: admin@hunterweb.com
- Password: admin123

**¡Cambia esta contraseña en producción!**

### 2. Ejecutar Scraping

```javascript
// Ejemplo de uso del scraper
import { scrapeAndSave } from './backend/src/services/googleMapsScraper.js';
import pool from './backend/src/config/database.js';

const db = pool;
const results = await scrapeAndSave(db, {
  niche: 'Restaurantes y gastronomía',
  location: 'Madrid, España',
  maxResults: 20,
});
```

### 3. Consultar Leads

```bash
# Obtener leads sin sitio web, ordenados por score
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/leads?has_website=false&sort_by=lead_score&order=desc"
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Leads
- `GET /api/leads` - Listar leads (con filtros y paginación)
- `GET /api/leads/:id` - Obtener lead por ID
- `POST /api/leads` - Crear nuevo lead
- `PUT /api/leads/:id` - Actualizar lead
- `DELETE /api/leads/:id` - Eliminar lead
- `POST /api/leads/recalculate-scores` - Recalcular scores (admin)

### Parámetros de Filtro
- `page` - Número de página (default: 1)
- `limit` - Items por página (default: 20, max: 100)
- `niche` - Filtrar por nicho
- `location` - Filtrar por ubicación
- `has_website` - true/false
- `status` - new/contacted/qualified/converted/rejected
- `min_score` - Score mínimo
- `max_score` - Score máximo
- `sort_by` - lead_score/name/created_at/updated_at
- `order` - asc/desc

## Lead Score Algorithm

El sistema de scoring prioriza oportunidades según:

| Criterio | Puntos Máximos | Descripción |
|----------|---------------|-------------|
| Sin sitio web | 40 | Mayor oportunidad |
| Tamaño empresa | 30 | Large=30, Medium=20, Small=10 |
| Sin redes sociales | 20 | Menos presencia = más puntos |
| Competencia nicho | 10 | Más competencia = más oportunidad |

**Total**: 100 puntos

## Estructura del Proyecto

```
hunterweb/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuración DB, app
│   │   ├── controllers/    # Controladores (opcional)
│   │   ├── routes/         # Rutas API
│   │   ├── services/       # Lógica de negocio
│   │   ├── middleware/     # Auth, validación
│   │   ├── models/         # Modelos de datos
│   │   ├── utils/          # Utilidades, logger
│   │   └── index.js        # Entry point
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── services/       # API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── styles/         # Estilos globales
│   │   └── main.jsx        # Entry point
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── ARCHITECTURE.md     # Documentación arquitectura
│   └── database_schema.sql # Schema DB
├── docker-compose.yml
└── README.md
```

## Tecnologías

### Backend
- Node.js + Express
- PostgreSQL
- Playwright (scraping)
- JWT (autenticación)
- Winston (logging)

### Frontend
- React 18
- Tailwind CSS
- Recharts (gráficos)
- Lucide React (iconos)
- Axios

### DevOps
- Docker & Docker Compose
- Node-Cron (tareas programadas)

## Nichos Objetivo

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

## Próximas Características

- [ ] Módulo de scraping para LinkedIn
- [ ] Validador de sitios web (detección de sitios "en sótano")
- [ ] Integración con CRM (HubSpot, Salesforce)
- [ ] Exportación avanzada a CSV/Excel
- [ ] Sistema de alertas por email
- [ ] Dashboard analítico con gráficos
- [ ] Programación de jobs de scraping

## Contribución

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

MIT License - ver LICENSE para detalles

## Soporte

Para issues y preguntas, usar GitHub Issues.

---

**HunterWeb** - Identificando oportunidades donde otros no las ven.
