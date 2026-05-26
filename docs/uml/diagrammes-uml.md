# Diagrammes UML — CareerHub

> Tous les diagrammes sont au format **Mermaid** (compatible GitHub, GitLab, VS Code, Notion).  
> Visualisation en ligne : [mermaid.live](https://mermaid.live)

---

## 1. Diagramme de cas d'utilisation

```mermaid
flowchart LR
    subgraph Acteurs
        Admin((Administrateur CMH))
    end

    subgraph CareerHub["Système CareerHub"]
        UC1[Gérer les promotions]
        UC2[Gérer les candidats]
        UC3[Évaluer modules et compétences]
        UC4[Consulter le tableau de bord]
        UC5[Générer des rapports]
        UC6[Recevoir des rappels]
        UC7[Consulter le conseiller IA]
        UC8[Gérer son profil]
        UC9[Archiver / restaurer]
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9

    UC2 -.-> UC3
    UC1 -.-> UC2
    UC4 -.-> UC6
```

### Description des cas d'utilisation

| ID | Cas d'utilisation | Description |
|----|-------------------|-------------|
| UC1 | Gérer les promotions | Créer, modifier, archiver des cohortes de formation |
| UC2 | Gérer les candidats | Recruter, modifier profil, changer statut, archiver |
| UC3 | Évaluer | Saisir notes modules (/20) et soft skills (/5) |
| UC4 | Tableau de bord | KPIs, démographie, promotions actives |
| UC5 | Rapports | Export PDF, Excel, CSV, HTML (individuel ou promotion) |
| UC6 | Rappels | Alertes opérationnelles (dates, effectifs, taux de réussite) |
| UC7 | Conseiller IA | Chat Gemini avec contexte analytics anonymisé |
| UC8 | Profil | Modifier nom, email, mot de passe, thème |
| UC9 | Archivage | Archiver/restaurer promotions et candidats |

---

## 2. Diagramme de classes — Modèle domaine

```mermaid
classDiagram
    direction TB

    class User {
        +bigint id
        +string full_name
        +string email
        +string password
        +enum role
        +login()
        +logout()
    }

    class Promotion {
        +bigint id
        +string promo_code
        +string name
        +date start_date
        +date end_date
        +enum status
        +archive()
        +restore()
    }

    class Module {
        +bigint id
        +bigint promotion_id
        +string name
        +date module_date_debut
        +date module_date_fin
        +enum status
        +tinyint module_order
    }

    class Candidate {
        +bigint id
        +bigint promotion_id
        +string first_name
        +string last_name
        +string email
        +string phone
        +date recruitment_date
        +enum state
        +decimal overall_avg
        +enum category
        +recalculateOverallAvg()
    }

    class ModuleGrade {
        +bigint id
        +bigint candidate_id
        +bigint module_id
        +decimal score
    }

    class CandidateSkill {
        +bigint id
        +bigint candidate_id
        +enum category
        +string skill_name
        +decimal score
    }

    class ActivityLog {
        +bigint id
        +bigint user_id
        +string target_type
        +bigint target_id
        +string action_type
        +string description
        +datetime created_at
    }

    class SystemSetting {
        +bigint id
        +string company_name
        +int default_duration_days
        +int modules_per_promo
        +decimal passing_threshold
    }

    class UserReminderState {
        +bigint id
        +bigint user_id
        +string reminder_id
        +enum status
        +datetime snoozed_until
    }

    class ReportExport {
        +bigint id
        +bigint user_id
        +enum report_type
        +enum format
    }

    Promotion "1" --> "*" Module : contient
    Promotion "1" --> "*" Candidate : inscrit
    Candidate "1" --> "*" ModuleGrade : possède
    Candidate "1" --> "*" CandidateSkill : possède
    Module "1" --> "*" ModuleGrade : noté dans
    User "1" --> "*" ActivityLog : crée
    User "1" --> "*" UserReminderState : gère
    User "1" --> "*" ReportExport : génère
```

---

## 3. Diagramme de classes — Couche services (Backend)

```mermaid
classDiagram
    direction LR

    class AuthController {
        +login()
        +logout()
        +me()
        +updateProfile()
        +changePassword()
    }

    class PromotionController {
        +index()
        +store()
        +show()
        +update()
        +destroy()
        +stats()
        +archive()
        +restore()
    }

    class CandidateController {
        +index()
        +store()
        +show()
        +update()
        +destroy()
        +updateSkills()
        +updateModuleGrades()
        +updateStatus()
        +export()
    }

    class DashboardController {
        +stats()
    }

    class RemindersController {
        +index()
        +markRead()
        +dismiss()
        +snooze()
    }

    class AiController {
        +chat()
    }

    class CandidateScoreService {
        +overallAverage(Candidate) float
        +passRate(candidates) int
        +turnoverRate(candidates) int
        +categoryFor(float) string
        +isGraduate(Candidate) bool
    }

    class CandidateWriteService {
        +create()
        +syncSkills()
        +syncModuleGrades()
        +updateStatus()
        +logActivity()
    }

    class CandidateQueryService {
        +filter()
        +sort()
        +paginate()
    }

    class CandidateFormatter {
        +toListItem()
        +toDetail()
        +toExportRow()
    }

    class PromotionModuleService {
        +createDefaultModules(Promotion)
    }

    class RemindersService {
        +generate()
    }

    class GeminiService {
        +generateContent(prompt) string
    }

    class AiContextService {
        +buildContext() array
    }

    CandidateController --> CandidateQueryService
    CandidateController --> CandidateWriteService
    CandidateController --> CandidateFormatter
    CandidateController --> CandidateScoreService
    PromotionController --> PromotionModuleService
    DashboardController --> CandidateScoreService
    RemindersController --> RemindersService
    AiController --> GeminiService
    AiController --> AiContextService
```

---

## 4. Diagramme de composants — Architecture système

```mermaid
flowchart TB
    subgraph Client["Navigateur / Client"]
        UI[Interface React]
        Store[Zustand Stores]
        Query[TanStack Query]
        Export[Export Client PDF/Excel]
    end

    subgraph Frontend["Frontend — TanStack Start"]
        Router[TanStack Router]
        AuthLib[lib/auth.ts]
        APILib[lib/*-api.ts]
        CalcLib[lib/calc.ts]
    end

    subgraph Backend["Backend — Laravel 11"]
        APIRoutes[routes/api.php v1]
        Middleware[Sanctum + Throttle + SecurityHeaders]
        Controllers[Controllers Api/V1]
        Services[Domain Services]
        Observers[ModuleGradeObserver]
        Eloquent[Eloquent ORM]
    end

    subgraph Data["Persistance"]
        MySQL[(MySQL career-hub)]
        Cache[(Cache fichier)]
    end

    subgraph External["Services externes"]
        Gemini[Google Gemini API]
    end

    UI --> Router
    Router --> Store
    Router --> Query
    Router --> APILib
    APILib --> AuthLib
    UI --> Export
    UI --> CalcLib

    APILib -->|HTTPS Bearer| Middleware
    Middleware --> APIRoutes
    APIRoutes --> Controllers
    Controllers --> Services
    Services --> Eloquent
    Eloquent --> MySQL
    Services --> Cache
    Services --> Gemini
    Observers --> Eloquent
```

---

## 5. Diagrammes de séquence

### 5.1 Authentification

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrateur
    participant FE as Frontend (React)
    participant Auth as AuthController
    participant Sanctum as Laravel Sanctum
    participant DB as MySQL

    Admin->>FE: Saisit email + mot de passe
    FE->>Auth: POST /api/v1/auth/login
    Auth->>DB: Vérifier User (Hash::check)
    DB-->>Auth: User trouvé
    Auth->>Sanctum: createToken('careerhub-api')
    Sanctum-->>Auth: Bearer token
    Auth-->>FE: { user, token }
    FE->>FE: Persister token (Zustand localStorage)

    Note over FE: Chargement application
    FE->>Auth: GET /api/v1/auth/me (Bearer)
    Auth->>Sanctum: Valider token
    Sanctum-->>Auth: User authentifié
    Auth-->>FE: { user }
    FE->>FE: isAuthenticated = true

    alt Token invalide ou expiré
        FE->>FE: Effacer token → redirect /login
    end
```

### 5.2 Création d'une promotion

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrateur
    participant FE as Frontend
    participant PC as PromotionController
    participant PMS as PromotionModuleService
    participant DB as MySQL

    Admin->>FE: Crée promotion (nom, dates)
    FE->>PC: POST /api/v1/promotions
    PC->>DB: INSERT promotion (promo_code auto)
    PC->>PMS: createDefaultModules(promotion)
    loop 5 modules email marketing
        PMS->>DB: INSERT module (ordre 1-5, dates espacées)
    end
    DB-->>PC: Promotion + modules
    PC-->>FE: Promotion JSON (camelCase)
    FE->>FE: Mettre à jour store Zustand
```

### 5.3 Évaluation d'un candidat

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrateur
    participant FE as Frontend
    participant CC as CandidateController
    participant CWS as CandidateWriteService
    participant MGO as ModuleGradeObserver
    participant CSS as CandidateScoreService
    participant DB as MySQL

    Admin->>FE: Saisit notes modules (/20)
    FE->>CC: PUT /candidates/{id}/module-grades
    CC->>CWS: syncModuleGrades()
    CWS->>DB: UPSERT module_grades

    DB->>MGO: Event saved/deleted
    MGO->>DB: Candidate.recalculateOverallAvg()
    Note over MGO,DB: overall_avg = moyenne modules /20<br/>category via passing_threshold

    CC-->>FE: Candidat mis à jour

    Admin->>FE: Saisit soft skills (/5)
    FE->>CC: PUT /candidates/{id}/skills
    CC->>CWS: syncSkills()
    CWS->>DB: UPSERT candidate_skills
    CC-->>FE: Skills mis à jour

    FE->>FE: calc.overallAverage() pour affichage
    Note over FE,CSS: Score composite 0-5 :<br/>(skillsAvg + testsAvg/4) / 2
```

### 5.4 Conseiller IA (Gemini)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrateur
    participant FE as Frontend
    participant AC as AiController
    participant ACS as AiContextService
    participant GS as GeminiService
    participant Gemini as Google Gemini API

    Admin->>FE: Pose une question RH
    FE->>AC: POST /api/v1/ai/chat { message }
    AC->>ACS: buildContext()
    Note over ACS: Agrège KPIs, promotions,<br/>stats anonymisées (sans PII)
    ACS-->>AC: Contexte structuré
    AC->>GS: generateContent(prompt + context)
    GS->>Gemini: REST generativelanguage.googleapis.com
    Gemini-->>GS: Réponse texte
    GS-->>AC: reply
    AC-->>FE: { success, data: { reply } }
    FE->>Admin: Affiche réponse chat
```

### 5.5 Génération de rappels

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant RC as RemindersController
    participant RS as RemindersService
    participant PRAS as PassRateAlertService
    participant RSS as ReminderStateService
    participant DB as MySQL

    FE->>RC: GET /api/v1/reminders
    RC->>RS: generate()
    RS->>DB: Charger promotions + candidats actifs
    RS->>RS: Règles : fin promo, effectif, incomplets, critique
    RS->>PRAS: Détecter chute taux de réussite
    PRAS->>DB: Comparer baseline cache
    RS-->>RC: Liste reminders (IDs string)
    RC->>RSS: Filtrer read/dismissed/snoozed
    RSS->>DB: user_reminder_states
    RC-->>FE: Reminders actifs
    FE->>FE: Afficher popover + bannière
```

---

## 6. Diagramme de déploiement

```mermaid
flowchart TB
    subgraph Dev["Environnement de développement"]
        Browser[Navigateur]
        Vite[Vite Dev Server :5173]
        LaravelDev[php artisan serve :8000]
        MySQLDev[(MySQL local)]
    end

    subgraph Prod["Environnement de production (cible)"]
        CDN[Cloudflare Workers / CDN]
        StaticAssets[Assets statiques React]
        APIServer[Serveur PHP-FPM / Laravel]
        MySQLProd[(MySQL production)]
        GeminiAPI[Google Gemini API]
    end

    Browser -->|HTTP| Vite
    Vite -->|Proxy /api| LaravelDev
    LaravelDev --> MySQLDev
    LaravelDev --> GeminiAPI

    Browser -->|HTTPS| CDN
    CDN --> StaticAssets
    Browser -->|HTTPS /api/v1| APIServer
    APIServer --> MySQLProd
    APIServer --> GeminiAPI
```

### Ports et URLs

| Environnement | Frontend | Backend API |
|---------------|----------|-------------|
| Développement | `http://127.0.0.1:5173` | `http://127.0.0.1:8000/api/v1` |
| Production | Domaine Cloudflare | `APP_URL` + `/api/v1` |

---

## 7. Diagramme entité-relation (ERD)

```mermaid
erDiagram
    users {
        bigint id PK
        string full_name
        string email UK
        string password
        enum role
        timestamp created_at
        timestamp deleted_at
    }

    promotions {
        bigint id PK
        string promo_code UK
        string name
        date start_date
        date end_date
        enum status
        timestamp deleted_at
    }

    modules {
        bigint id PK
        bigint promotion_id FK
        string name
        date module_date_debut
        date module_date_fin
        enum status
        tinyint module_order
    }

    candidates {
        bigint id PK
        bigint promotion_id FK
        string first_name
        string last_name
        string email UK
        string phone
        date recruitment_date
        tinyint age
        enum gender
        text photo
        enum education_level
        string diploma_specialty
        decimal diploma_average
        enum state
        decimal overall_avg
        enum category
        timestamp deleted_at
    }

    module_grades {
        bigint id PK
        bigint candidate_id FK
        bigint module_id FK
        decimal score
    }

    candidate_skills {
        bigint id PK
        bigint candidate_id FK
        enum category
        string skill_name
        decimal score
    }

    activity_logs {
        bigint id PK
        bigint user_id FK
        string target_type
        bigint target_id
        string action_type
        text description
        timestamp created_at
    }

    system_settings {
        bigint id PK
        string company_name
        int default_duration_days
        int modules_per_promo
        decimal passing_threshold
    }

    user_reminder_states {
        bigint id PK
        bigint user_id FK
        string reminder_id
        enum status
        datetime snoozed_until
    }

    report_exports {
        bigint id PK
        bigint user_id FK
        enum report_type
        enum format
    }

    promotions ||--o{ modules : "contient"
    promotions ||--o{ candidates : "inscrit"
    candidates ||--o{ module_grades : "a"
    modules ||--o{ module_grades : "noté"
    candidates ||--o{ candidate_skills : "possède"
    users ||--o{ activity_logs : "crée"
    users ||--o{ user_reminder_states : "gère"
    users ||--o{ report_exports : "génère"
```

---

## 8. Diagramme d'états — Candidat

```mermaid
stateDiagram-v2
    [*] --> Active : Recrutement

    Active --> Graduated : Diplômé (avg ≥ 2.5 ou manuel)
    Active --> Dismissed : Licencié
    Active --> Terminated : Abandon
    Active --> Archived : Archivage

    Graduated --> Archived : Archivage
    Dismissed --> Archived : Archivage
    Terminated --> Archived : Archivage

    Archived --> Active : Restauration

    note right of Active
        Évaluation en cours
        Modules + skills modifiables
    end note

    note right of Graduated
        Formation terminée avec succès
    end note
```

---

## 9. Diagramme d'états — Promotion

```mermaid
stateDiagram-v2
    [*] --> Pending : Création
    Pending --> Active : Date début atteinte
    Active --> Completed : Date fin dépassée
    Completed --> Archived : Archivage manuel

    Active --> Archived : Archivage anticipé
    Pending --> Archived : Archivage

    Archived --> Active : Restauration (withTrashed)

    note right of Active
        5 modules créés automatiquement
        Candidats actifs
    end note
```

---

## 10. Diagramme de packages — Frontend

```mermaid
flowchart TB
    subgraph routes["src/routes/"]
        R1[index.tsx — Dashboard]
        R2[promotions.*]
        R3[candidates.*]
        R4[graduates.tsx]
        R5[reports.tsx]
        R6[ai-advisor.tsx]
        R7[settings.tsx]
        R8[login.tsx]
    end

    subgraph lib["src/lib/"]
        L1[auth.ts]
        L2[candidate-api.ts]
        L3[promotion-api.ts]
        L4[dashboard-api.ts]
        L5[reminders-api.ts]
        L6[ai-api.ts]
        L7[store.ts]
        L8[calc.ts]
        L9[exports.ts]
        L10[types.ts]
    end

    subgraph components["src/components/"]
        C1[app-sidebar]
        C2[add-*-dialog]
        C3[kpi-card]
        C4[ai-chat-bubble]
        C5[reminders-popover]
        C6[ui/* — shadcn]
    end

    routes --> lib
    routes --> components
    components --> lib
```

---

*Diagrammes générés à partir du code source CareerHub — CMH — Mai 2026*
