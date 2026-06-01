# Modèles de données et diagramme d'activité — CareerHub

> Diagrammes alignés sur le schéma MySQL Laravel (`backend/database/migrations`).  
> Visualisation Mermaid : [mermaid.live](https://mermaid.live)

---

## 1. Diagramme d'activité

Flux simplifié pour l’**administrateur CMH**. Trois vues : parcours global, évaluation candidat, rappels.

### 1.1 Parcours global

```mermaid
flowchart TD
    start([Début]) --> login[Se connecter]
    login --> ok{Identifiants OK ?}
    ok -->|Non| login
    ok -->|Oui| dash[Tableau de bord]

    dash --> choix{Que faire ?}
    choix -->|Promotions / candidats| crud[Gérer les données]
    choix -->|Évaluer| eval[Évaluer un candidat]
    choix -->|Rappels| notif[Consulter rappels]
    choix -->|Rapports / IA / Profil| autres[Autres écrans]
    crud --> dash
    eval --> dash
    notif --> dash
    autres --> dash

    choix -->|Quitter| out[Déconnexion]
    out --> fin([Fin])
```

| Étape | Description |
|-------|-------------|
| Connexion | API `POST /auth/login` → token Sanctum |
| Tableau de bord | KPIs, filtres de période, promotions actives |
| Gérer les données | CRUD promotions et candidats |
| Autres écrans | Exports, conseiller IA, paramètres profil |

### 1.2 Évaluer un candidat

```mermaid
flowchart LR
    A[Ouvrir fiche candidat] --> B[Saisir notes modules /20]
    B --> C[Saisir compétences /5]
    C --> D[Enregistrer via API]
    D --> E[Recalcul moyenne et catégorie]
    E --> F([Retour liste / fiche])
```

| Étape | API |
|-------|-----|
| Notes modules | `PUT …/module-grades` |
| Compétences | `PUT …/skills` |
| Recalcul auto | `ModuleGradeObserver` → `overall_avg`, `category` |

### 1.3 Rappels

```mermaid
flowchart LR
    A[Charger rappels] --> B[Générer alertes]
    B --> C[Retirer lus / ignorés / snoozés]
    C --> D[Afficher]
    D --> E{Action ?}
    E -->|Lu / Ignorer / Snooze 24h| F[(BDD utilisateur)]
    F --> D
    E -->|Fermer| G([Fin])
```

Alertes possibles : fin de promotion, effectif faible, profils incomplets, candidats critiques, baisse du taux de réussite.

---

## 2. MCD — Modèle conceptuel de données

Notation : entités en **MAJUSCULES**, associations en *italique*, cardinalités au format **(min, max)**.

### 2.1 Entités et attributs

| Entité | Attributs (identifiant souligné) |
|--------|----------------------------------|
| **UTILISATEUR** | <u>#id</u>, nom_complet, email, mot_de_passe, role, date_creation, date_suppression |
| **PROMOTION** | <u>#id</u>, code_promo, nom, date_debut, date_fin, statut, date_creation, date_suppression |
| **MODULE** | <u>#id</u>, nom, date_debut, date_fin, statut, ordre |
| **CANDIDAT** | <u>#id</u>, prenom, nom, email, telephone, date_recrutement, age, genre, photo, niveau_etude, specialite_diplome, moyenne_diplome, etat, moyenne_globale, categorie, date_creation, date_suppression |
| **COMPETENCE** | <u>#id</u>, categorie *(Discipline / Work Skills)*, nom_competence, note *(0 à 5)* |
| **PARAMETRE_SYSTEME** | <u>#id</u>, nom_entreprise, duree_defaut_jours, modules_par_promo, seuil_reussite |
| **JOURNAL** | <u>#id</u>, type_cible, id_cible, type_action, description, horodatage |
| **ETAT_RAPPEL** | <u>#id</u>, id_rappel, statut *(read / dismissed / snoozed)*, reporte_jusqua |
| **EXPORT** | <u>#id</u>, type_rapport, format, date_generation |

### 2.2 Associations

| Association | Entités liées | Cardinalités | Remarque |
|-------------|---------------|--------------|----------|
| *contient* | PROMOTION — MODULE | (1,1) — (1,n) | 5 modules par défaut à la création |
| *accueille* | PROMOTION — CANDIDAT | (0,1) — (0,n) | `promotion_id` nullable (candidats non affectés) |
| *noter* | CANDIDAT — MODULE | (0,n) — (0,n) | Attribut de l’association : **note** (0–20), une paire (candidat, module) unique |
| *possède* | CANDIDAT — COMPETENCE | (1,1) — (1,n) | Une compétence par nom et par candidat |
| *enregistre* | UTILISATEUR — JOURNAL | (1,1) — (0,n) | Traçabilité des actions admin |
| *gère* | UTILISATEUR — ETAT_RAPPEL | (1,1) — (0,n) | Un état par couple (utilisateur, id_rappel) |
| *génère* | UTILISATEUR — EXPORT | (1,1) — (0,n) | Historique des exports |

**PARAMETRE_SYSTEME** : entité singleton (configuration globale CMH), sans association obligatoire vers les autres entités métier.

### 2.3 Schéma MCD (vue graphique)

```mermaid
erDiagram
    UTILISATEUR {
        bigint id PK
        string nom_complet
        string email UK
        string mot_de_passe
        enum role
    }

    PROMOTION {
        bigint id PK
        string code_promo UK
        string nom
        date date_debut
        date date_fin
        enum statut
    }

    MODULE {
        bigint id PK
        string nom
        date date_debut
        date date_fin
        enum statut
        int ordre
    }

    CANDIDAT {
        bigint id PK
        string prenom
        string nom
        string email UK
        string telephone
        date date_recrutement
        enum etat
        decimal moyenne_globale
        enum categorie
    }

    NOTER {
        decimal note "0-20"
    }

    COMPETENCE {
        bigint id PK
        enum categorie
        string nom_competence
        decimal note "0-5"
    }

    PARAMETRE_SYSTEME {
        bigint id PK
        string nom_entreprise
        int duree_defaut_jours
        int modules_par_promo
        decimal seuil_reussite
    }

    JOURNAL {
        bigint id PK
        string type_cible
        bigint id_cible
        string type_action
        text description
    }

    ETAT_RAPPEL {
        bigint id PK
        string id_rappel
        enum statut
        datetime reporte_jusqua
    }

    EXPORT {
        bigint id PK
        enum type_rapport
        enum format
        datetime date_generation
    }

    PROMOTION ||--|{ MODULE : contient
    PROMOTION ||--o{ CANDIDAT : accueille
    CANDIDAT ||--o{ NOTER : note
    MODULE ||--o{ NOTER : note
    CANDIDAT ||--|{ COMPETENCE : possede
    UTILISATEUR ||--o{ JOURNAL : enregistre
    UTILISATEUR ||--o{ ETAT_RAPPEL : gere
    UTILISATEUR ||--o{ EXPORT : genere
```

### 2.4 Représentation textuelle (notation Chen)

```
┌─────────────┐         contient          ┌────────┐
│  PROMOTION  │──────────(1,1)─(1,n)───────│ MODULE │
└─────────────┘                           └────────┘
       │
       │ accueille (0,1) ─ (0,n)
       ▼
┌─────────────┐    noter (0,n)    ┌────────┐
│  CANDIDAT   │◄──────(0,n)──────►│ MODULE │  attribut : note
└─────────────┘                   └────────┘
       │
       │ possède (1,1) ─ (1,n)
       ▼
┌─────────────┐
│ COMPETENCE  │
└─────────────┘

┌─────────────┐  enregistre (1,1)-(0,n)  ┌─────────┐
│ UTILISATEUR │──────────────────────────│ JOURNAL │
└─────────────┘                          └─────────┘
       │ gere (1,1)-(0,n)
       ▼
┌──────────────┐     genere (1,1)-(0,n)   ┌────────┐
│ ETAT_RAPPEL  │                          │ EXPORT │
└──────────────┘                          └────────┘

┌───────────────────┐
│ PARAMETRE_SYSTEME │  (configuration globale)
└───────────────────┘
```

---

## 3. MLD — Modèle logique de données

Passage du MCD au schéma relationnel MySQL. Clés : **#** = clé primaire, **FK** = clé étrangère.

### 3.1 Tables métier

```
users (
  #id,
  full_name,
  email,
  password,
  role,
  created_at,
  updated_at,
  deleted_at
)

promotions (
  #id,
  promo_code,
  name,
  start_date,
  end_date,
  status,
  created_at,
  updated_at,
  deleted_at
)

modules (
  #id,
  promotion_id → promotions(#id),
  name,
  module_date_debut,
  module_date_fin,
  status,
  module_order
)

candidates (
  #id,
  promotion_id → promotions(#id)  [NULL],
  first_name,
  last_name,
  email,
  phone,
  recruitment_date,
  age,
  gender,
  photo,
  education_level,
  diploma_specialty,
  diploma_average,
  state,
  overall_avg,
  category,
  created_at,
  updated_at,
  deleted_at
)

module_grades (
  #id,
  candidate_id → candidates(#id),
  module_id → modules(#id),
  score,
  created_at,
  updated_at,
  UNIQUE (candidate_id, module_id),
  CHECK (score BETWEEN 0 AND 20)
)

candidate_skills (
  #id,
  candidate_id → candidates(#id),
  category,
  skill_name,
  score,
  created_at,
  updated_at,
  UNIQUE (candidate_id, skill_name),
  CHECK (score BETWEEN 0 AND 5)
)

system_settings (
  #id,
  company_name,
  default_duration_days,
  modules_per_promo,
  passing_threshold
)

activity_logs (
  #id,
  user_id → users(#id),
  target_type,
  target_id,
  action_type,
  description,
  created_at
)

user_reminder_states (
  #id,
  user_id → users(#id),
  reminder_id,
  status,
  snoozed_until,
  created_at,
  updated_at,
  UNIQUE (user_id, reminder_id)
)

report_exports (
  #id,
  user_id → users(#id),
  report_type,
  format,
  generated_at
)
```

### 3.2 Correspondance MCD → MLD

| Concept MCD | Table MLD |
|-------------|-----------|
| UTILISATEUR | `users` |
| PROMOTION | `promotions` |
| MODULE | `modules` |
| CANDIDAT | `candidates` |
| Association *noter* | `module_grades` |
| COMPETENCE | `candidate_skills` |
| PARAMETRE_SYSTEME | `system_settings` |
| JOURNAL | `activity_logs` |
| ETAT_RAPPEL | `user_reminder_states` |
| EXPORT | `report_exports` |

### 3.3 Schéma relationnel (vue graphique)

> Les entités doivent être déclarées avant les liaisons pour que Mermaid (GitHub, VS Code) rende le diagramme.  
> `promotion_id` sur `candidates` est **nullable** (candidats non affectés).

```mermaid
erDiagram
    users {
        bigint id PK
        string full_name
        string email UK
        string password
        enum role
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

    system_settings {
        bigint id PK
        string company_name
        int default_duration_days
        int modules_per_promo
        decimal passing_threshold
    }

    activity_logs {
        bigint id PK
        bigint user_id FK
        string target_type
        bigint target_id
        string action_type
        text description
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
        timestamp generated_at
    }

    promotions ||--o{ modules : promotion_id
    promotions ||--o{ candidates : promotion_id
    candidates ||--o{ module_grades : candidate_id
    modules ||--o{ module_grades : module_id
    candidates ||--o{ candidate_skills : candidate_id
    users ||--o{ activity_logs : user_id
    users ||--o{ user_reminder_states : user_id
    users ||--o{ report_exports : user_id
```

**Vue simplifiée (si le schéma complet est trop large)**

```mermaid
flowchart TB
    subgraph core["Coeur metier"]
        promotions[(promotions)]
        modules[(modules)]
        candidates[(candidates)]
        module_grades[(module_grades)]
        candidate_skills[(candidate_skills)]
    end

    subgraph admin["Administration"]
        users[(users)]
        activity_logs[(activity_logs)]
        user_reminder_states[(user_reminder_states)]
        report_exports[(report_exports)]
    end

    system_settings[(system_settings)]

    promotions -->|1,n| modules
    promotions -->|0,n| candidates
    candidates -->|1,n| module_grades
    modules -->|1,n| module_grades
    candidates -->|1,n| candidate_skills
    users -->|1,n| activity_logs
    users -->|1,n| user_reminder_states
    users -->|1,n| report_exports
```

### 3.4 Tables techniques (hors MCD métier)

| Table | Rôle |
|-------|------|
| `personal_access_tokens` | Tokens API Laravel Sanctum |
| `sessions` | Sessions web Laravel |
| `password_reset_tokens` | Réinitialisation mot de passe |
| `cache`, `cache_locks` | Cache applicatif |
| `jobs`, `job_batches`, `failed_jobs` | Files d’attente |

### 3.5 Index et contraintes notables

| Table | Contrainte / index |
|-------|-------------------|
| `candidates` | `email` UNIQUE ; index `promotion_id`, `state`, `category` |
| `promotions` | `promo_code` UNIQUE ; index `status` |
| `module_grades` | UNIQUE `(candidate_id, module_id)` |
| `candidate_skills` | UNIQUE `(candidate_id, skill_name)` |
| `user_reminder_states` | UNIQUE `(user_id, reminder_id)` |
| `modules` | FK `promotion_id` ON DELETE RESTRICT |
| `candidates` | FK `promotion_id` ON DELETE SET NULL (nullable) |

### 3.6 Énumérations (domaines)

| Colonne | Valeurs |
|---------|---------|
| `users.role` | Admin |
| `promotions.status` | Pending, Active, Completed, Archived |
| `modules.status` | Not Started, In Progress, Completed, Holiday |
| `candidates.state` | Active, Graduated, Dismissed, Terminated, Archived |
| `candidates.category` | Excellent, Bien, Passable, Critique |
| `candidates.education_level` | Bac, Bac+2, Bac+3, Bac+4, Bac+5, Bac+8 |
| `candidates.gender` | Homme, Femme |
| `candidate_skills.category` | Discipline, Work Skills |
| `user_reminder_states.status` | read, dismissed, snoozed |
| `report_exports.report_type` | Individual, Promotion |
| `report_exports.format` | PDF, Excel, CSV, HTML |

---

## 4. Liens avec les autres diagrammes

| Document | Contenu |
|----------|---------|
| [diagrammes-uml.md](./diagrammes-uml.md) | Cas d’utilisation, classes, séquences, ERD anglais |
| [documentation-officielle.md](../documentation-officielle.md) | Règles métier et guide utilisateur |
| [api-reference.md](../api-reference.md) | Endpoints REST |

---

*CMH Career Hub — MCD / MLD / activité — Mai 2026*
