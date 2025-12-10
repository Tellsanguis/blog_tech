---
slug: obsidian-git-workflow
title: "Écrire ses articles de blog avec Obsidian et Git"
authors: [tellserv]
tags: [obsidian, git, workflow, documentation]
date: 2025-12-10
image: /img/blog/2025-12-10-obsidian-git/2023_Obsidian_logo.svg
---

Comment j'ai configuré Obsidian avec le plugin Git pour rédiger et synchroniser mes articles de blog et ma documentation technique, avec des templates personnalisés et un workflow Git propre.

<!--truncate-->

## Contexte et motivation

Mon blog technique fonctionne avec Docusaurus, un générateur de site statique qui utilise du Markdown pour le contenu. Bien que je puisse éditer les fichiers directement avec VS Code ou n'importe quel éditeur de texte, j'avais besoin d'un environnement d'édition plus adapté à la rédaction d'articles longs avec :

- **Une interface dédiée à l'écriture** : Obsidian offre un mode focus et une prévisualisation Markdown en temps réel
- **Des templates réutilisables** : Pour garantir la cohérence du frontmatter Docusaurus (métadonnées en YAML)
- **Une synchronisation Git automatique** : Pulls automatiques toutes les 10 minutes pour récupérer les changements distants
- **Une séparation claire** : Uniquement le contenu éditorial (blog, docs, images) sans les fichiers techniques de Docusaurus

## Architecture du setup

Le principe est simple : utiliser **Git sparse checkout** pour ne récupérer que les dossiers de contenu du dépôt, et configurer Obsidian avec le plugin Git pour synchroniser les modifications sur une branche dédiée.

```
Vault Obsidian (local)
├── blog/           ← Articles de blog (FR)
├── docs/           ← Documentation (FR)
├── i18n/           ← Traductions (EN)
├── static/         ← Images et assets
└── templates/      ← Templates locaux (non versionnés)

↓ Synchronisation Git (branche "contenu")

Forgejo → GitHub → Cloudflare Pages
```

**Workflow de publication** :
1. J'écris dans Obsidian et commite manuellement sur la branche `contenu`
2. Pull automatique toutes les 10 minutes pour récupérer les changements distants
3. Push manuel quand je veux synchroniser avec le serveur
4. Quand l'article est prêt : Pull Request sur Forgejo de `contenu` vers `main`
5. Après merge : déploiement automatique sur Cloudflare Pages

## Étape 1 : Mise en place du vault Obsidian avec sparse checkout

### Clone initial avec sparse checkout

Le sparse checkout permet de ne récupérer que les dossiers nécessaires sans télécharger tout le projet Docusaurus (node_modules, build, etc.).

```powershell
New-Item -ItemType Directory .\Obsidian
Set-Location .\Obsidian

git clone --no-checkout https://forgejo.tellserv.fr/Tellsanguis/blog_tech.git .

git sparse-checkout disable
git sparse-checkout init --cone
git sparse-checkout set blog docs i18n static
git read-tree -mu HEAD

git ls-files | Where-Object { $_ -notmatch '/' } | ForEach-Object { git update-index --assume-unchanged -- $_ }
git ls-files | Where-Object { $_ -notmatch '/' } | ForEach-Object { if (Test-Path $_) { Remove-Item -Force $_ -ErrorAction SilentlyContinue } }
git read-tree -mu HEAD

git checkout -b contenu
git push -u origin contenu
```

**Explication des commandes** :
- `git clone --no-checkout` : Clone le dépôt sans extraire les fichiers
- `git sparse-checkout set blog docs i18n static` : Définit les dossiers à récupérer
- Les commandes `git ls-files` : Marquent les fichiers racine comme "assume-unchanged" et les suppriment du working tree
- `git checkout -b contenu` : Crée et bascule sur la branche de travail

**Résultat attendu** : Seuls les dossiers `blog/`, `docs/`, `i18n/`, `static/` et `.git/` sont présents.

### Configuration du .gitignore

Pour éviter de versionner les fichiers spécifiques à Obsidian :

```gitignore
# Obsidian
.obsidian/
.trash/
templates/

# Fichiers système
.DS_Store
Thumbs.db
```

Les templates sont locaux et personnels, inutile de les versionner dans le dépôt principal.

## Étape 2 : Installation et configuration d'Obsidian

### Ouvrir le vault

1. Lancer **Obsidian**
2. **Open folder as vault** → Sélectionner `C:\Users\Tellsanguis\Documents\Obsidian`

### Installation du plugin Obsidian Git

Le plugin Obsidian Git permet de gérer Git directement depuis Obsidian sans passer par la ligne de commande.

1. **Settings** (roue dentée en bas à gauche) → **Community plugins**
2. **Turn on community plugins**
3. **Browse** → Rechercher "**Obsidian Git**" (par Vinzent03)
4. **Install** → **Enable**

![Installation du plugin Obsidian Git](/img/blog/2025-12-10-obsidian-git/obsidian_module_complementaire.png)

### Configuration du plugin Obsidian Git

**Settings → Obsidian Git** :

#### Section "Automatic"

![Configuration auto pull](/img/blog/2025-12-10-obsidian-git/auto_pull.png)

- `Auto pull interval (minutes)` : **10** → Récupère les changements distants toutes les 10 minutes

Cette configuration permet de rester synchronisé avec les changements faits depuis d'autres machines ou par d'autres contributeurs.

#### Section "Pull"

![Pull on startup et autres paramètres](/img/blog/2025-12-10-obsidian-git/pull_on_startup.png)

- `Pull on startup` : **Activé** → Pull automatique au démarrage d'Obsidian
- `Merge strategy` : **Merge** → Stratégie de fusion par défaut

#### Section "Commit author"

![Configuration de l'auteur des commits](/img/blog/2025-12-10-obsidian-git/commit_author.png)

- `Author name for commit` : **Tellsanguis**
- `Author email for commit` : **mael.bene@tellserv.fr**

Cela permet d'identifier correctement l'auteur des commits dans l'historique Git.

#### Section "Commit message"

- `Commit message` : **"vault backup: {{date}}"**

Cette syntaxe permet d'avoir des messages de commit automatiques avec la date, par exemple : `vault backup: 2025-12-10 14:30`

## Étape 3 : Création des templates

Les templates facilitent la création d'articles et de documentation avec le bon format frontmatter attendu par Docusaurus.

### Configuration du plugin Templates

1. **Settings → Core plugins → Templates** : **Activer**
2. **Settings → Templates** :
   - `Template folder location` : **templates**
   - `Date format` : **YYYY-MM-DD**

### Affichage des propriétés frontmatter

![Propriétés dans les documents source](/img/blog/2025-12-10-obsidian-git/proprietes_dans_les_documents_source.png)

Pour voir les propriétés YAML (frontmatter) directement dans l'éditeur, sélectionner "source" dans les paramètres d'affichage des propriétés.

### Template pour article de blog

<details>
<summary><strong>Voir le template blog-cheatsheet.md</strong></summary>

```markdown
---
slug: titre-slug
title: "Titre de l'article"
authors: [tellserv]
tags: [tag1, tag2, tag3]
date: {{date:YYYY-MM-DD}}
image: /img/blog/{{date:YYYY-MM-DD}}-slug/banniere.png
---

Résumé court avant la coupure...

<!--truncate-->

## Fonctionnalités disponibles

### Images

<!-- Image simple -->
![Texte alternatif](/img/blog/dossier/image.png)

<!-- Image avec légende -->
![Description](/img/blog/dossier/image.png)
*Légende en italique sous l'image*

<!-- Image centrée avec taille personnalisée -->
<p align="center">
  <img src="/img/blog/dossier/banniere.png" alt="Description" width="600" />
</p>

### PDF et téléchargements

<!-- Lien de téléchargement PDF -->
[📥 Télécharger le PDF](/img/diagrams/schema.pdf)

### Tableaux

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Valeur A  | Valeur B  | Valeur C  |
| Valeur D  | Valeur E  | Valeur F  |

### Blocs de code

```bash
# Commande shell
commande --option valeur
```

```yaml
# Configuration YAML
key: value
```

```python
# Code Python
def fonction():
    return True
```

### Listes

- Point simple
- **Point en gras** : avec explication
  - Sous-point indenté

1. Étape 1
2. Étape 2
3. Étape 3

### Liens

- Lien interne doc : [Texte](/docs/categorie/page)
- Lien interne blog : [Texte](/blog/slug-article)
- Lien externe : [Texte](https://example.com)

### Mise en forme

- `code inline` pour paramètres/commandes
- **gras** pour emphase forte
- _italique_ pour légendes

### Structure de dossier

```
arborescence/
├── fichier1.yml
├── dossier/
│   └── fichier2.yml
└── README.md
```
```

</details>

### Template pour documentation

<details>
<summary><strong>Voir le template doc-cheatsheet.md</strong></summary>

```markdown
---
sidebar_position: 1
tags: [tag1, tag2, tag3]
last_update:
  date: {{date:YYYY-MM-DD}}
---

# Titre de la page

## Fonctionnalités disponibles

### Schémas avec PDF

![Nom du schéma](/img/diagrams/nom-schema.png)

[📥 Télécharger le PDF](/img/diagrams/nom-schema.pdf)

### Images simples

![Description](/img/path/image.png)

*Légende optionnelle en italique*

### Tableaux

| Paramètre | Description | Valeur |
|-----------|-------------|--------|
| `param1`  | Explication | val1   |
| `param2`  | Explication | val2   |

### Blocs de code avec langage

```bash
# Commande shell
commande exemple
```

```yaml
# Configuration YAML
config: valeur
```

```python
# Code Python
def fonction():
    return True
```

### Listes et sous-listes

- **Titre point** : Explication
  - Sous-point
  - Autre sous-point
- Autre point

1. Première étape
2. Deuxième étape
3. Troisième étape

### Structure arborescente

```
projet/
├── dossier1/
│   └── fichier.yml
└── dossier2/
    └── autre.yml
```

### Liens

- [Autre doc](/docs/autre-page)
- [Article blog](/blog/slug)
- [Externe](https://url.com)

### Mise en forme

- `code inline` pour paramètres/commandes
- **gras** pour emphase
- _italique_ pour légendes
```

</details>

**Note importante** : `{{date:YYYY-MM-DD}}` est automatiquement remplacé par Obsidian lors de l'insertion du template avec la date du jour.

## Workflow d'utilisation au quotidien

### Créer un nouvel article de blog

1. **Clic droit** dans le dossier `blog/` → **New note**
2. **Nommer** : `YYYY-MM-DD-titre-slug.md` (ex: `2025-12-10-mon-article.md`)
3. **Insérer le template** :
   - `Ctrl+P` (Command Palette)
   - Taper "template"
   - Sélectionner "Templates: Insert template"
   - Choisir `blog-cheatsheet`
4. **Modifier le frontmatter** :
   - `slug` : titre-slug (sans la date)
   - `title` : Titre complet de l'article
   - `tags` : Remplacer par les vrais tags
   - `date` : Automatiquement rempli par Obsidian
   - `image` : Chemin vers la bannière (si utilisée)
5. **Écrire le contenu** avec prévisualisation en temps réel
6. **Ajouter les images** dans `static/img/blog/YYYY-MM-DD-slug/`

### Synchronisation avec Git

Le plugin Obsidian Git affiche un panel à droite de la fenêtre pour gérer la synchronisation :

![Panel Git dans Obsidian](/img/blog/2025-12-10-obsidian-git/git_panel_obsidian.png)

**Pull automatique** :
- Pull automatique toutes les 10 minutes pour récupérer les changements distants
- Pull automatique au démarrage d'Obsidian

**Commit et push manuels** :
1. **Vérifier les changements** : Le panel Git affiche les fichiers modifiés dans la section "Changes"
2. **Commit** : Cliquer sur le bouton de commit en bas du panel ou utiliser `Ctrl+P` → "Git: Commit all changes"
3. **Push** : Cliquer sur le bouton de push en bas du panel ou utiliser `Ctrl+P` → "Git: Push"

### Publier sur le blog

1. **Sur Forgejo** : https://forgejo.tellserv.fr/Tellsanguis/blog_tech
2. **Pull Requests** → **New Pull Request**
3. **Base branch** : `main` / **Compare branch** : `contenu`
4. **Create Pull Request** → Revue du contenu → **Merge**
5. **Pipeline automatique** : Forgejo → GitHub mirror → Cloudflare Pages → Publication en ligne

Ce workflow permet de relire et valider le contenu avant publication, avec un historique Git complet de toutes les modifications.

## Conclusion

Ce setup me permet de bénéficier d'un environnement d'édition optimisé pour la rédaction tout en gardant un workflow Git avec review et historique complet.

Le panel Git intégré directement dans Obsidian facilite grandement la gestion des commits et des pushs, avec une visualisation claire des fichiers modifiés. Les pulls automatiques garantissent que je reste toujours synchronisé avec le dépôt distant, tout en gardant le contrôle total sur ce que je commite et quand je le fais (dans les faits, je suis seul à travailler sur ce blog : c'est surtout utile pour le travail en équipe afin d'avoir les mises à jour en temps réel).

Si vous utilisez Docusaurus ou un autre générateur de site statique basé sur Markdown, je recommande vivement ce type de setup pour faciliter la rédaction de contenu technique !
