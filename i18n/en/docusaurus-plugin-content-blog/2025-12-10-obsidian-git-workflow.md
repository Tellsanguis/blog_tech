---
slug: obsidian-git-workflow
title: "Writing Blog Posts with Obsidian and Git"
authors: [tellserv]
tags: [obsidian, git, workflow, documentation]
date: 2025-12-10
image: /img/blog/2025-12-10-obsidian-git/2023_Obsidian_logo.svg
---

How I configured Obsidian with the Git plugin to write and synchronize my blog posts and technical documentation, with custom templates and a clean Git workflow.

<!--truncate-->

## Context and motivation

My technical blog runs on Docusaurus, a static site generator that uses Markdown for content. While I could edit files directly with VS Code or any text editor, I needed a writing environment better suited for writing long articles with:

- **A dedicated writing interface**: Obsidian offers focus mode and real-time Markdown preview
- **Reusable templates**: To ensure consistency of Docusaurus frontmatter (YAML metadata)
- **Automatic Git synchronization**: Automatic pulls every 10 minutes to fetch remote changes
- **Clear separation**: Only editorial content (blog, docs, images) without Docusaurus technical files

## Setup architecture

The principle is simple: use **Git sparse checkout** to retrieve only content folders from the repository, and configure Obsidian with the Git plugin to synchronize changes on a dedicated branch.

```
Obsidian Vault (local)
├── blog/           ← Blog posts (FR)
├── docs/           ← Documentation (FR)
├── i18n/           ← Translations (EN)
├── static/         ← Images and assets
└── templates/      ← Local templates (not versioned)

↓ Git sync (branch "contenu")

Forgejo → GitHub → Cloudflare Pages
```

**Publishing workflow**:
1. I write in Obsidian and commit manually on the `contenu` branch
2. Automatic pull every 10 minutes to fetch remote changes
3. Manual push when I want to sync with the server
4. When the article is ready: Pull Request on Forgejo from `contenu` to `main`
5. After merge: automatic deployment on Cloudflare Pages

## Step 1: Setting up the Obsidian vault with sparse checkout

### Initial clone with sparse checkout

Sparse checkout allows retrieving only the necessary folders without downloading the entire Docusaurus project (node_modules, build, etc.).

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

**Command explanation**:
- `git clone --no-checkout`: Clones the repository without extracting files
- `git sparse-checkout set blog docs i18n static`: Defines folders to retrieve
- `git ls-files` commands: Mark root files as "assume-unchanged" and remove them from the working tree
- `git checkout -b contenu`: Creates and switches to the working branch

**Expected result**: Only `blog/`, `docs/`, `i18n/`, `static/` and `.git/` folders are present.

### Configuring .gitignore

To avoid versioning Obsidian-specific files:

```gitignore
# Obsidian
.obsidian/
.trash/
templates/

# System files
.DS_Store
Thumbs.db
```

Templates are local and personal, no need to version them in the main repository.

## Step 2: Installing and configuring Obsidian

### Opening the vault

1. Launch **Obsidian**
2. **Open folder as vault** → Select `C:\Users\Tellsanguis\Documents\Obsidian`

### Installing the Obsidian Git plugin

The Obsidian Git plugin allows managing Git directly from Obsidian without using the command line.

1. **Settings** (gear icon at the bottom left) → **Community plugins**
2. **Turn on community plugins**
3. **Browse** → Search for "**Obsidian Git**" (by Vinzent03)
4. **Install** → **Enable**

![Installing the Obsidian Git plugin](/img/blog/2025-12-10-obsidian-git/obsidian_module_complementaire.png)

### Configuring the Obsidian Git plugin

**Settings → Obsidian Git**:

#### "Automatic" section

![Auto pull configuration](/img/blog/2025-12-10-obsidian-git/auto_pull.png)

- `Auto pull interval (minutes)`: **10** → Fetches remote changes every 10 minutes

This configuration keeps you synchronized with changes made from other machines or by other contributors.

#### "Pull" section

![Pull on startup and other settings](/img/blog/2025-12-10-obsidian-git/pull_on_startup.png)

- `Pull on startup`: **Enabled** → Automatic pull when Obsidian starts
- `Merge strategy`: **Merge** → Default merge strategy

#### "Commit author" section

![Commit author configuration](/img/blog/2025-12-10-obsidian-git/commit_author.png)

- `Author name for commit`: **Tellsanguis**
- `Author email for commit`: **mael.bene@tellserv.fr**

This correctly identifies the commit author in Git history.

#### "Commit message" section

- `Commit message`: **"vault backup: {{date}}"**

This syntax provides automatic commit messages with the date, for example: `vault backup: 2025-12-10 14:30`

## Step 3: Creating templates

Templates facilitate creating articles and documentation with the correct frontmatter format expected by Docusaurus.

### Configuring the Templates plugin

1. **Settings → Core plugins → Templates**: **Enable**
2. **Settings → Templates**:
   - `Template folder location`: **templates**
   - `Date format`: **YYYY-MM-DD**

### Displaying frontmatter properties

![Properties in source documents](/img/blog/2025-12-10-obsidian-git/proprietes_dans_les_documents_source.png)

To see YAML properties (frontmatter) directly in the editor, select "source" in the property display settings.

### Blog post template

<details>
<summary><strong>View blog-cheatsheet.md template</strong></summary>

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

### Documentation template

<details>
<summary><strong>View doc-cheatsheet.md template</strong></summary>

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

**Important note**: `{{date:YYYY-MM-DD}}` is automatically replaced by Obsidian when inserting the template with the current date.

## Daily workflow

### Creating a new blog post

1. **Right-click** in the `blog/` folder → **New note**
2. **Name**: `YYYY-MM-DD-title-slug.md` (e.g., `2025-12-10-my-article.md`)
3. **Insert template**:
   - `Ctrl+P` (Command Palette)
   - Type "template"
   - Select "Templates: Insert template"
   - Choose `blog-cheatsheet`
4. **Edit frontmatter**:
   - `slug`: title-slug (without date)
   - `title`: Full article title
   - `tags`: Replace with actual tags
   - `date`: Automatically filled by Obsidian
   - `image`: Path to banner (if used)
5. **Write content** with real-time preview
6. **Add images** in `static/img/blog/YYYY-MM-DD-slug/`

### Git synchronization

The Obsidian Git plugin displays a panel on the right side of the window to manage synchronization:

![Git panel in Obsidian](/img/blog/2025-12-10-obsidian-git/git_panel_obsidian.png)

**Automatic pull**:
- Automatic pull every 10 minutes to fetch remote changes
- Automatic pull when Obsidian starts

**Manual commit and push**:
1. **Check changes**: The Git panel displays modified files in the "Changes" section
2. **Commit**: Click the commit button at the bottom of the panel or use `Ctrl+P` → "Git: Commit all changes"
3. **Push**: Click the push button at the bottom of the panel or use `Ctrl+P` → "Git: Push"

### Publishing to the blog

1. **On Forgejo**: https://forgejo.tellserv.fr/Tellsanguis/blog_tech
2. **Pull Requests** → **New Pull Request**
3. **Base branch**: `main` / **Compare branch**: `contenu`
4. **Create Pull Request** → Review content → **Merge**
5. **Automatic pipeline**: Forgejo → GitHub mirror → Cloudflare Pages → Online publication

This workflow allows reviewing and validating content before publication, with a complete Git history of all modifications.

## Conclusion

This setup allows me to benefit from a writing environment optimized for editing while maintaining a professional Git workflow with review and complete history.

The Git panel integrated directly into Obsidian greatly facilitates commit and push management, with a clear visualization of modified files. Automatic pulls ensure I always stay synchronized with the remote repository, while maintaining total control over what I commit and when I do it (in practice, I work alone on this blog: it's mainly useful for team work to have real-time updates).

If you use Docusaurus or another Markdown-based static site generator, I highly recommend this type of setup to facilitate technical content writing!
