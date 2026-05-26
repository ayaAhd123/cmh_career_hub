# Documentation officielle — CareerHub

## 1. Présentation

**CareerHub** est la plateforme interne de **Cloud Marketing Hub (CMH)** dédiée à la gestion des formations en **email marketing**. Elle permet aux équipes RH et formateurs de :

- Organiser des **promotions** (cohortes de formation)
- Suivre les **candidats** (stagiaires) du recrutement à la diplomation
- Évaluer les **compétences techniques** (5 modules) et **comportementales** (10 soft skills)
- Analyser les performances via un **tableau de bord**
- Recevoir des **rappels opérationnels** automatiques
- Générer des **rapports** exportables
- Obtenir des conseils via un **conseiller IA** (Google Gemini)

### Public cible

| Rôle | Accès |
|------|-------|
| **Administrateur** | Accès complet à toutes les fonctionnalités |

> À ce jour, un seul rôle existe (`Admin`). Tout utilisateur authentifié dispose des mêmes permissions.

---

## 2. Fonctionnalités principales

### 2.1 Gestion des promotions

Une **promotion** représente une cohorte de formation avec :

- Un code unique (`PROMO-YYYY-NNN`)
- Un nom, une date de début et une date de fin
- Un statut : `Pending`, `Active`, `Completed`, `Archived`
- **5 modules** créés automatiquement à la création :

| Ordre | Module |
|-------|--------|
| 1 | Notions en Email Marketing |
| 2 | Composants de l'Email |
| 3 | CPA (Cost Per Action) |
| 4 | Authentification de l'Email |
| 5 | Délivrabilité de l'Email |

**Actions disponibles :**
- Créer, modifier, supprimer (soft delete)
- Archiver (double confirmation requise)
- Restaurer depuis les archives
- Suppression définitive (force delete, double confirmation)
- Consulter statistiques et exporter les données

### 2.2 Gestion des candidats

Chaque **candidat** possède un profil complet :

| Champ | Description |
|-------|-------------|
| Identité | Prénom, nom, email, téléphone, photo |
| Recrutement | Date, âge, genre |
| Formation | Niveau d'études (`Bac+2` à `Bac+8`), spécialité, moyenne du diplôme |
| Évaluation | 5 notes de modules + 10 soft skills |
| Statut | `Active`, `Graduated`, `Dismissed`, `Terminated`, `Archived` |

**Actions disponibles :**
- Recruter (création avec skills et modules initialisés à 0)
- Modifier le profil
- Saisir/modifier les notes de modules (/20)
- Saisir/modifier les soft skills (/5)
- Changer le statut
- Archiver (suppression soft avec confirmation `DELETE`)
- Restaurer depuis l'archivage

### 2.3 Système d'évaluation

#### Modules techniques (échelle /20)

Chaque candidat est évalué sur 5 modules d'email marketing. Les notes sont stockées dans `module_grades` avec une contrainte unique `(candidate_id, module_id)`.

#### Soft skills (échelle /5)

**Discipline (4 compétences) :**
- Discipline et ponctualité
- Motivation
- Communication
- Sens de l'écoute

**Compétences professionnelles (6 compétences) :**
- Sens de l'initiative
- Capacité d'analyse
- Organisation
- Aptitudes intellectuelles
- Rythme d'avancement
- Rapidité d'exécution

#### Calcul du score global

Le score affiché dans l'interface utilise une **échelle composite 0–5** :

```
skillsAvg = (moyenne Discipline + moyenne Work Skills) / 2
testsAvg  = moyenne des notes modules (sur /20)
overall   = (skillsAvg + testsAvg / 4) / 2
```

#### Catégories de performance

| Catégorie | Seuil (score global) |
|-----------|----------------------|
| Excellent | ≥ 4.0 |
| Good (Bien) | ≥ 3.5 |
| Passable | ≥ 2.5 |
| Critical (Critique) | < 2.5 |

#### Taux de réussite

Un candidat est considéré comme **ayant réussi** si son score global ≥ **2.5**.

Le **taux de réussite** d'une promotion = pourcentage de candidats actifs (hors archivés) avec score ≥ 2.5.

#### Diplômé

Un candidat est considéré **diplômé** si :
- Son statut est `Graduated`, **ou**
- Son statut n'est ni `Active` ni `Archived` **et** son score global ≥ 2.5

### 2.4 Tableau de bord

Le dashboard affiche :

**KPIs globaux :**
- Nombre total de promotions
- Candidats actifs
- Taux de réussite global
- Moyenne globale
- Taux de turnover (licenciements + abandons)

**Filtres temporels :**
- Aujourd'hui, hier, semaine/mois/année en cours ou précédente
- Plage personnalisée

**Analyses démographiques :**
- Répartition par niveau d'études
- Répartition par genre
- Répartition par tranche d'âge

**Promotions actives :**
- Progression (% modules terminés)
- Effectif, taux de réussite, moyenne

### 2.5 Rappels opérationnels

Le système génère automatiquement des rappels basés sur des règles :

| Type | Déclencheur |
|------|-------------|
| Fin de promotion | Date de fin proche ou dépassée |
| Effectif faible | Nombre de candidats actifs insuffisant |
| Candidats critiques | Présence de candidats en catégorie Critical |
| Évaluations incomplètes | Modules ou skills non renseignés |
| Chute du taux de réussite | Comparaison avec baseline cache (30 jours) |
| Clôture promotion | Promotion terminée non archivée |

Chaque administrateur peut :
- Marquer comme lu
- Ignorer (dismiss)
- Reporter (snooze, 24h par défaut)

### 2.6 Rapports et exports

**Formats supportés :** PDF, Excel, CSV, HTML

**Types de rapports :**
- **Individuel** : fiche complète d'un candidat
- **Promotion** : ensemble des candidats d'une cohorte

**Modes d'export :**
- **Serveur** : CSV, JSON, HTML via `GET /candidates/export`
- **Client** : PDF et Excel générés dans le navigateur (jsPDF, xlsx-js-style)

**Langues d'export :** Français et Anglais (i18next)

### 2.7 Conseiller IA

Un assistant conversationnel alimenté par **Google Gemini** :

- Accessible via la page dédiée `/ai-advisor` ou la bulle flottante
- Reçoit un contexte analytics **anonymisé** (pas d'email, téléphone, noms)
- Peut répondre aux questions RH : performance, tendances, recommandations
- Limité à **20 requêtes/minute** par utilisateur

### 2.8 Paramètres

Page `/settings` :
- Modification du profil (nom, email)
- Changement de mot de passe (révoque tous les tokens)
- Thème clair/sombre
- Gestion des candidats archivés

---

## 3. Parcours utilisateur

### 3.1 Connexion

1. Accéder à `/login`
2. Saisir email et mot de passe administrateur
3. Le token Bearer est stocké localement (7 jours par défaut)
4. Redirection automatique vers le dashboard

### 3.2 Cycle de vie d'une promotion

```
Création → Pending/Active → Candidats recrutés → Évaluations
    → Completed → Archivage
```

### 3.3 Cycle de vie d'un candidat

```
Recrutement (Active) → Évaluation modules + skills
    → Graduated (succès) | Dismissed | Terminated
    → Archived (optionnel) → Restauration possible
```

---

## 4. Règles métier

| Règle | Détail |
|-------|--------|
| RB-01 | Une promotion génère automatiquement 5 modules |
| RB-02 | Le code promotion est auto-généré (`PROMO-YYYY-NNN`) |
| RB-03 | Les notes modules sont bornées entre 0 et 20 |
| RB-04 | Les notes skills sont bornées entre 0 et 5 |
| RB-05 | La modification d'une note module recalcule `overall_avg` en base |
| RB-06 | L'archivage promotion requiert deux confirmations textuelles |
| RB-07 | La suppression candidat requiert la saisie `DELETE` |
| RB-08 | Le changement de mot de passe invalide tous les tokens actifs |
| RB-09 | Les rappels sont filtrés par état utilisateur (lu/ignoré/reporté) |
| RB-10 | Le conseiller IA n'a pas accès aux données personnelles (PII) |

---

## 5. Paramètres système

Configurés via seed (`SystemSettingSeeder`), non modifiables via API :

| Paramètre | Valeur par défaut |
|-----------|-------------------|
| Nom entreprise | Cloud Marketing Hub |
| Durée formation | 25 jours |
| Modules par promotion | 5 |
| Seuil de passage | 10.00 (/20) |

---

## 6. Journal d'activité

Chaque action significative est tracée dans `activity_logs` :

| Action | Exemple |
|--------|---------|
| `RECRUITED` | Candidat recruté |
| `STATUS_CHANGED` | Changement de statut |
| `SKILLS_UPDATED` | Modification des compétences |
| `MODULE_GRADES_UPDATED` | Modification des notes |

Les logs sont **immuables** (pas de `updated_at`).

---

## 7. Sécurité

| Mesure | Implémentation |
|--------|----------------|
| Authentification | Laravel Sanctum (Bearer token) |
| Expiration token | 7 jours (configurable) |
| Rate limiting | Login: 10/min IP, API: 180/min, IA: 20/min |
| CORS | Origines frontend configurées (`FRONTEND_URLS`) |
| Headers sécurité | X-Frame-Options, HSTS (production) |
| Mot de passe | ≥ 8 caractères, lettre + chiffre |
| Clé Gemini | Côté serveur uniquement, jamais exposée au frontend |

---

## 8. Glossaire

| Terme | Définition |
|-------|------------|
| **Promotion** | Cohorte de formation (ex: Promo Email Marketing Q1 2026) |
| **Candidat** | Stagiaire inscrit dans une promotion |
| **Module** | Unité d'enseignement technique (1 des 5) |
| **Soft skill** | Compétence comportementale évaluée /5 |
| **Score global** | Moyenne composite skills + modules (échelle 0–5) |
| **Taux de réussite** | % candidats avec score ≥ 2.5 |
| **Turnover** | % candidats licenciés ou ayant abandonné |
| **Rappel** | Notification opérationnelle générée par règles métier |
| **Baseline** | Snapshot du taux de réussite pour détecter les chutes |

---

## 9. Pages de l'application

| Route | Page |
|-------|------|
| `/login` | Connexion |
| `/` | Tableau de bord |
| `/promotions` | Liste des promotions |
| `/promotions/:id` | Détail promotion + candidats |
| `/promotions/archived` | Promotions archivées |
| `/candidates` | Liste de tous les candidats |
| `/candidates/:id` | Profil candidat |
| `/graduates` | Diplômés |
| `/reports` | Génération de rapports |
| `/ai-advisor` | Conseiller IA |
| `/settings` | Paramètres utilisateur |

---

*Cloud Marketing Hub — CareerHub v1 — Documentation officielle — Mai 2026*
