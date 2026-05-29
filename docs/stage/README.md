# Rapport de stage — CMH Career Hub

## Fichiers générés

| Fichier | Description |
|---------|-------------|
| `Rapport_Stage_AYA_EL_OUAHABI_CMH_CareerHub.docx` | Rapport complet prêt à remettre (Word) |
| `Annexe_UML_CareerHub.md` | Diagrammes UML (Mermaid, éditables) |
| `Planning_Repartition_Equipe.md` | Planning et répartition des 4 stagiaires |
| `generate_rapport_stage.py` | Script de régénération du .docx |

## Ouvrir le fichier .docx

**Ne pas ouvrir le .docx dans Cursor** (éditeur de code) : il affichera du contenu illisible.

Utilisez plutôt :
- **Microsoft Word** : clic droit sur le fichier → *Ouvrir avec* → Word
- **LibreOffice Writer** (gratuit) : https://www.libreoffice.org
- **Word Online** : téléverser le fichier sur https://office.com

## Régénérer le document Word

```bash
pip install python-docx
python docs/stage/generate_rapport_stage.py
```

Si Word affiche « fichier corrompu », fermez Cursor, relancez le script ci-dessus, puis rouvrez le fichier dans Word.

## À compléter avant remise

Remplacez les **....** dans le fichier Word :
- Dates du stage
- Adresse CMH, tuteur, encadrant pédagogique
- Logo OFPPT sur la page de garde
- Captures d'écran (Annexe F)
- Attestation de stage

## Mise en forme recommandée (Word)

- Police : Times New Roman, taille 12
- Interligne : 1,5
- Marges : 2,5 cm
- Insérer le logo OFPPT sur la page de garde
