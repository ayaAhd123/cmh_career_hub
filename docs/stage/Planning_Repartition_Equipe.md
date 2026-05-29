# Planning de stage — Équipe CMH Career Hub

**Stagiaires :** AYA EL OUAHABI · AYA AOULAD AHMIDOU · ZAHIRA KTAIB · IHSSAN YAKOUBI  
**Période :** du .... au ....  
**Méthode :** Agile / Scrum (sprints de .... semaine)

---

## Planning global

| Semaine | Activités / Livrables | Responsables |
|---------|----------------------|--------------|
| 1 | Analyse besoins, maquettes, modélisation BDD, setup monorepo | Toute l'équipe |
| 2 | Back-end : migrations, modèles, API auth (Sanctum) | AYA EL OUAHABI + IHSSAN YAKOUBI |
| 3 | Front-end : routing, login, layout, sidebar, thème | AYA AOULAD AHMIDOU + ZAHIRA KTAIB |
| 4 | Module Promotions (CRUD, archivage, stats) | ZAHIRA KTAIB + AYA EL OUAHABI |
| 5 | Module Candidats (CRUD, notes, compétences) | AYA AOULAD AHMIDOU + IHSSAN YAKOUBI |
| 6 | Dashboard (KPIs, graphiques, rappels) | AYA AOULAD AHMIDOU + AYA EL OUAHABI |
| 7 | Exports PDF / Excel / HTML (FR/EN) | ZAHIRA KTAIB + AYA AOULAD AHMIDOU |
| 8 | AI Advisor, tests, documentation, rapport | IHSSAN YAKOUBI + toute l'équipe |

---

## Répartition par stagiaire

### AYA EL OUAHABI — Coordinatrice technique / Back-end
- Analyse des besoins et architecture monorepo
- API Laravel : AuthController, middlewares, StrongPassword
- Services : CandidateQueryService, sécurité Sanctum
- Dashboard API (DashboardController)
- Revues de code GitHub
- Rédaction du rapport de stage

### AYA AOULAD AHMIDOU — Front-end / Dashboard & Candidats
- Structure React + TanStack Router
- Page Login et auth front (Zustand)
- Dashboard : KPI, graphiques Recharts
- Pages candidats (liste, fiche, formulaires)
- Composants UI réutilisables
- Tests manuels parcours utilisateur

### ZAHIRA KTAIB — Promotions & Exports
- CRUD Promotions (API + pages React)
- Archivage / restauration
- Module Reports & Exports (PDF, Excel, HTML)
- Internationalisation FR/EN
- PromotionStatsService
- Captures d'écran pour annexes

### IHSSAN YAKOUBI — Back-end métier / IA & Qualité
- Migrations et modèles Eloquent
- ModuleGradeObserver, CandidateScoreService
- RemindersService
- AI Advisor (AiController, AiContextService)
- Tests Postman, db-smoke-test
- Documentation README et annexes UML

---

## Matrice RACI

| Module | AYA E.O. | AYA A.A. | ZAHIRA K. | IHSSAN Y. |
|--------|----------|----------|-----------|-----------|
| Architecture & setup | **R/A** | C | C | C |
| Authentification API | **R/A** | I | I | C |
| Front layout & routing | C | **R/A** | C | I |
| Module Promotions | C | I | **R/A** | C |
| Module Candidats | C | **R/A** | C | C |
| Dashboard & stats | R | **R/A** | C | C |
| Exports & rapports | C | C | **R/A** | I |
| AI Advisor | C | I | I | **R/A** |
| Tests & documentation | A | C | C | **R** |

*R = Responsable · A = Approbateur · C = Contributeur · I = Informé*
