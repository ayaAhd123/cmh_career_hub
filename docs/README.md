# CareerHub — Documentation CMH

Documentation officielle du système **CareerHub** (CMH Career Hub), plateforme interne de gestion des formations en email marketing pour **Cloud Marketing Hub**.

## Sommaire

| Document | Description |
|----------|-------------|
| [Documentation officielle](./documentation-officielle.md) | Présentation, fonctionnalités, règles métier, guide utilisateur |
| [Diagrammes UML](./uml/diagrammes-uml.md) | Cas d'utilisation, classes, composants, séquences, déploiement, ERD |
| [Référence API](./api-reference.md) | Endpoints REST, authentification, formats de réponse |
| [Ressources techniques](./ressources-techniques.md) | Stack, installation, configuration, déploiement, maintenance |

## Architecture en bref

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + TanStack Start)                       │
│  http://127.0.0.1:5173                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api/v1 (Bearer Sanctum)
┌──────────────────────────▼──────────────────────────────────┐
│  Backend (Laravel 11 + PHP 8.2)                             │
│  http://127.0.0.1:8000/api/v1                               │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
        ┌──────▼──────┐              ┌───────▼────────┐
        │   MySQL     │              │ Google Gemini  │
        │ career-hub  │              │ (Conseiller IA)│
        └─────────────┘              └────────────────┘
```

## Démarrage rapide

```bash
# Frontend
bun install
bun run dev:frontend

# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Compte administrateur par défaut (après seed) : `admin@cmh.ma` — mot de passe défini via `ADMIN_INITIAL_PASSWORD` dans `.env`.

## Structure du dépôt

```
cmh_career_hub/
├── docs/                  ← Cette documentation
├── frontend/              ← Application React (TanStack Start)
│   └── src/
│       ├── routes/        ← Pages (file-based routing)
│       ├── components/    ← Composants UI
│       └── lib/           ← API clients, auth, types, exports
└── backend/               ← API Laravel 11
    └── app/
        ├── Http/Controllers/Api/V1/
        ├── Models/
        └── Services/
```

## Versions

| Composant | Version |
|-----------|---------|
| PHP | ≥ 8.2 |
| Laravel | 11.31 |
| React | 19 |
| TypeScript | 5.8 |
| MySQL | 8.x recommandé |
| Bun | latest |

---

*Cloud Marketing Hub — Documentation interne — Mai 2026*
