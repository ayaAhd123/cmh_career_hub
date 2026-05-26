# Ressources techniques — CareerHub

Guide technique pour développeurs, DevOps et administrateurs système.

---

## 1. Stack technologique

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 19.2 | UI library |
| TypeScript | 5.8 | Typage statique |
| TanStack Start | 1.167 | Framework SSR/full-stack |
| TanStack Router | 1.168 | Routing file-based |
| TanStack Query | 5.83 | Cache et fetching |
| Zustand | 5.0 | State management (auth, promotions) |
| Vite | 7.3 | Build tool |
| Tailwind CSS | 4.2 | Styling |
| Radix UI / shadcn | — | Composants accessibles |
| Recharts | 3.8 | Graphiques dashboard |
| react-hook-form + Zod | — | Formulaires et validation |
| jsPDF + xlsx-js-style | — | Exports client |
| i18next | 26.2 | Internationalisation exports |
| Bun | latest | Package manager |

### Backend

| Technologie | Version | Rôle |
|-------------|---------|------|
| PHP | ≥ 8.2 | Runtime |
| Laravel | 11.31 | Framework API |
| Laravel Sanctum | 4.3 | Authentification API |
| MySQL | 8.x | Base de données |
| Composer | 2.x | Gestion dépendances PHP |

### Services externes

| Service | Usage | Configuration |
|---------|-------|---------------|
| Google Gemini | Conseiller IA | `GOOGLE_API_KEY`, `GEMINI_MODEL` |
| Cloudflare Workers | Déploiement frontend (optionnel) | `wrangler.jsonc` |

---

## 2. Prérequis système

### Développement

- **Bun** (latest) — [bun.sh](https://bun.sh)
- **PHP** ≥ 8.2 avec extensions : `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`
- **Composer** ≥ 2.x
- **MySQL** ≥ 8.0
- **Node.js** ≥ 20 (optionnel, Bun suffit)

### Production

- Serveur web (Nginx/Apache) + PHP-FPM 8.2+
- MySQL 8.x avec backups automatiques
- HTTPS obligatoire
- Clé API Google Gemini valide

---

## 3. Installation

### 3.1 Cloner et installer

```bash
git clone <repo-url> cmh_career_hub
cd cmh_career_hub

# Frontend
bun install

# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

### 3.2 Base de données

```bash
# Créer la base MySQL
mysql -u root -p -e "CREATE DATABASE \`career-hub\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Configurer backend/.env
# DB_DATABASE=career-hub
# DB_USERNAME=root
# DB_PASSWORD=votre_mot_de_passe

# Migrer et seed
php artisan migrate --seed
```

### 3.3 Variables d'environnement

#### Backend (`backend/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `APP_NAME` | Nom application | `CareerHub` |
| `APP_ENV` | Environnement | `local` / `production` |
| `APP_DEBUG` | Mode debug | `true` / `false` |
| `APP_URL` | URL API | `http://127.0.0.1:8000` |
| `DB_*` | Connexion MySQL | voir `.env.example` |
| `FRONTEND_URLS` | Origines CORS | `http://localhost:5173` |
| `ADMIN_INITIAL_PASSWORD` | Mot de passe admin initial | Min. 12 car. complexe |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES` | Durée token | `10080` (7 jours) |
| `GOOGLE_API_KEY` | Clé Gemini | `AIza...` |
| `GEMINI_MODEL` | Modèle IA | `gemini-2.5-flash` |
| `GEMINI_TIMEOUT` | Timeout API (sec) | `60` |

#### Frontend

Le frontend utilise un proxy Vite en dev (`vite.config.ts`) :
- Requêtes `/api/*` → `http://127.0.0.1:8000`

Pas de `.env` frontend requis en développement.

---

## 4. Commandes de développement

### Racine du monorepo

```bash
bun run dev:frontend      # Lance Vite sur :5173
bun run dev:backend       # Lance Laravel sur :8000
bun run build             # Build production frontend
bun run lint:frontend     # ESLint
bun run format:frontend   # Prettier
bun run composer:install  # Composer install backend
```

### Backend (dans `backend/`)

```bash
php artisan serve --host=127.0.0.1 --port=8000
php artisan migrate              # Migrations
php artisan migrate:fresh --seed # Reset + seed
php artisan db:seed              # Seed uniquement
php artisan promotions:dedupe    # Fusionner promotions dupliquées
php artisan route:list           # Lister routes API
php artisan tinker               # Console interactive
php artisan pail                 # Logs temps réel
./vendor/bin/pint                # Formater code PHP
```

### Frontend (dans `frontend/`)

```bash
bun dev           # Dev server
bun build         # Build production
bun preview       # Preview build
bun lint          # ESLint
bun format        # Prettier
```

---

## 5. Structure du code

### Backend — Organisation

```
backend/app/
├── Console/Commands/
│   └── DedupePromotionsCommand.php
├── Http/
│   ├── Controllers/Api/V1/     # 7 controllers REST
│   └── Middleware/
│       └── SecurityHeaders.php
├── Models/                      # 11 modèles Eloquent
├── Observers/
│   ├── ModuleGradeObserver.php  # Recalcule overall_avg
│   └── ModuleObserver.php
├── Providers/
│   └── AppServiceProvider.php   # Rate limiters, route binding
├── Rules/
│   └── StrongPassword.php
├── Services/                    # 16 services domaine
└── Support/
    └── ExportLocale.php
```

### Frontend — Organisation

```
frontend/src/
├── routes/              # Pages (TanStack file routing)
│   ├── __root.tsx       # Layout + auth guard
│   ├── index.tsx        # Dashboard
│   ├── login.tsx
│   ├── promotions.*
│   ├── candidates.*
│   ├── graduates.tsx
│   ├── reports.tsx
│   ├── ai-advisor.tsx
│   └── settings.tsx
├── components/
│   ├── app-sidebar.tsx
│   ├── add-*-dialog.tsx
│   ├── kpi-card.tsx
│   ├── ai-chat-bubble.tsx
│   └── ui/              # ~30 composants shadcn
├── lib/
│   ├── auth.ts          # Zustand auth store
│   ├── store.ts         # Zustand promotions
│   ├── *-api.ts         # Clients REST
│   ├── calc.ts          # Logique scoring (miroir backend)
│   ├── exports.ts       # PDF/Excel client
│   └── types.ts         # Types TypeScript domaine
└── hooks/
    ├── use-ai-advisor.ts
    └── use-debounced-value.ts
```

---

## 6. Base de données

### Migrations

```bash
backend/database/migrations/
```

Ordre d'exécution chronologique — tables principales :
1. `users`, `password_reset_tokens`, `sessions`
2. `personal_access_tokens` (Sanctum)
3. `promotions`, `modules`
4. `candidates`, `module_grades`, `candidate_skills`
5. `activity_logs`, `system_settings`
6. `report_exports`, `user_reminder_states`

### Seeders

| Seeder | Contenu |
|--------|---------|
| `SystemSettingSeeder` | Paramètres CMH par défaut |
| `AdminUserSeeder` | `admin@cmh.ma` |
| `PromotionSeeder` | Promotions exemple |
| `CandidateSeeder` | Candidats exemple |

### Script de test

```bash
php backend/scripts/db-smoke-test.php
```

---

## 7. Authentification technique

### Flux Sanctum

1. Login → `AuthController@login` crée un Personal Access Token
2. Token nommé `careerhub-api`, stocké côté client dans `localStorage` (clé `careerhub-auth`)
3. Chaque requête API inclut `Authorization: Bearer {token}`
4. Middleware `auth:sanctum` valide le token
5. Expiration configurable via `SANCTUM_TOKEN_EXPIRATION_MINUTES`

### Guard frontend

`frontend/src/routes/__root.tsx` :
- Au chargement : `GET /auth/me` pour valider la session
- Si non authentifié et route ≠ `/login` → redirect `/login`
- `sessionReady` flag pour éviter flash de contenu

---

## 8. Scoring — Double calcul

> **Important** pour les développeurs

| Contexte | Méthode | Échelle | Usage |
|----------|---------|---------|-------|
| Affichage UI / listes / dashboard | `CandidateScoreService::overallAverage()` | 0–5 composite | KPIs, catégories affichées |
| Persistance DB | `Candidate::recalculateOverallAvg()` | /20 (moyenne modules) | Colonnes `overall_avg`, `category` |

Le frontend duplique la logique composite dans `lib/calc.ts`.

---

## 9. Déploiement

### Frontend — Cloudflare Workers

```bash
cd frontend
bun build
# Déployer via wrangler (config: wrangler.jsonc)
```

Fichiers clés :
- `frontend/wrangler.jsonc` — Config Cloudflare
- `frontend/src/server.ts` — Handler SSR Workers

### Backend — Production Laravel

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

**Checklist production :**

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL=https://api.votre-domaine.com`
- [ ] `FRONTEND_URLS=https://app.votre-domaine.com`
- [ ] Credentials MySQL forts (pas root/vide)
- [ ] `GOOGLE_API_KEY` configurée
- [ ] HTTPS activé (HSTS via SecurityHeaders middleware)
- [ ] Backups MySQL planifiés
- [ ] Logs centralisés

### Nginx (exemple)

```nginx
server {
    listen 443 ssl;
    server_name api.cmh.ma;
    root /var/www/careerhub/backend/public;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

## 10. Sécurité

### Rate limiting (AppServiceProvider)

```php
RateLimiter::for('login', ...)  // 10/min IP, 20/min email
RateLimiter::for('api', ...)    // 180/min
RateLimiter::for('ai', ...)     // 20/min
```

### Headers (SecurityHeaders middleware)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production uniquement)

### Bonnes pratiques

- Ne jamais exposer `GOOGLE_API_KEY` côté frontend
- Utiliser des mots de passe forts pour `ADMIN_INITIAL_PASSWORD`
- Révoquer les tokens lors du changement de mot de passe
- CORS restrictif en production (`FRONTEND_URLS`)

---

## 11. Maintenance

### Commandes utiles

```bash
# Fusionner promotions dupliquées par nom
php artisan promotions:dedupe

# Vider le cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Logs
tail -f backend/storage/logs/laravel.log
php artisan pail
```

### Monitoring

- Health check : `GET /api/v1/health`
- Laravel built-in : `GET /up`

### Sauvegarde MySQL

```bash
mysqldump -u root -p career-hub > backup_$(date +%Y%m%d).sql
```

---

## 12. Tests

### Backend (PHPUnit)

```bash
cd backend
./vendor/bin/phpunit
```

### Frontend (ESLint)

```bash
bun run lint:frontend
```

---

## 13. Dépannage

| Problème | Solution |
|----------|----------|
| CORS error | Vérifier `FRONTEND_URLS` dans `.env` |
| 401 Unauthorized | Token expiré → re-login ; vérifier header Bearer |
| 429 Too Many Requests | Rate limit atteint, attendre 1 minute |
| Gemini timeout | Augmenter `GEMINI_TIMEOUT` ; vérifier clé API |
| Migration error | `php artisan migrate:fresh --seed` (dev only) |
| Proxy API ne fonctionne pas | Vérifier backend sur :8000, Vite sur :5173 |
| Catégorie incohérente | DB migration utilise labels FR, code runtime EN |

---

## 14. Ressources externes

| Ressource | URL |
|-----------|-----|
| Laravel 11 Docs | https://laravel.com/docs/11.x |
| Laravel Sanctum | https://laravel.com/docs/11.x/sanctum |
| TanStack Start | https://tanstack.com/start |
| TanStack Router | https://tanstack.com/router |
| React 19 | https://react.dev |
| Tailwind CSS 4 | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com |
| Google Gemini API | https://ai.google.dev/gemini-api/docs |
| Mermaid (diagrammes) | https://mermaid.js.org |
| Bun | https://bun.sh/docs |

---

## 15. Conventions de code

### Backend (PHP/Laravel)

- PSR-4 autoloading, PSR-12 style (Pint)
- Controllers minces → logique dans Services
- Réponses JSON en camelCase via `CandidateFormatter`
- Validation via `$request->validate()`
- Soft deletes sur `User`, `Promotion`, `Candidate`

### Frontend (TypeScript/React)

- File-based routing (TanStack Router)
- Types domaine centralisés dans `lib/types.ts`
- API clients séparés par ressource (`*-api.ts`)
- Composants UI dans `components/ui/` (shadcn pattern)
- ESLint + Prettier configurés

### Nommage API

| Backend (DB/PHP) | API JSON (Frontend) |
|------------------|---------------------|
| `first_name` | `firstName` |
| `promo_code` | `id` (identifiant public) |
| `promotion_id` | `promotionId` |
| `diploma_specialty` | `diplomaName` |
| `overall_avg` | calculé côté client via `calc.ts` |

---

*Ressources techniques CareerHub — CMH — Mai 2026*
