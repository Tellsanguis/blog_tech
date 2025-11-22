import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'presentation',
    {
      type: 'category',
      label: 'Projets OpenClassrooms',
      link: {
        type: 'generated-index',
        title: 'Projets OpenClassrooms',
        description: 'Les 12 projets techniques réalisés dans le cadre de ma formation Administrateur Systèmes, Réseaux et Sécurité.',
        slug: '/category/projets-openclassrooms',
      },
      items: [
        'projets-openclassrooms/index',
        'projets-openclassrooms/p02-gestion-itsm',
        'projets-openclassrooms/p03-architecture-reseau',
        'projets-openclassrooms/p04-architecture-ntiers',
        'projets-openclassrooms/p05-securisation-web',
        'projets-openclassrooms/p06-site-distant',
        'projets-openclassrooms/p07-reseau-cisco',
        'projets-openclassrooms/p08-supervision-nagios',
        'projets-openclassrooms/p09-gestion-parc-ansible',
        'projets-openclassrooms/p10-sauvegardes-rsync',
        'projets-openclassrooms/p11-conformite-anssi',
        'projets-openclassrooms/p12-audit-securite-ad',
        'projets-openclassrooms/p13-migration-cloud-aws',
      ],
    },
    {
      type: 'category',
      label: 'Notions',
      link: {
        type: 'generated-index',
        title: 'Notions',
        description: 'Concepts et notions techniques fondamentales utilisées dans mes projets.',
        slug: '/category/notions',
      },
      items: [
        'notions/index',
        'notions/exemple',
      ],
    },
    {
      type: 'category',
      label: 'Homelab actuel - Docker Compose & Ansible',
      link: {
        type: 'generated-index',
        title: 'Homelab actuel - Docker Compose & Ansible',
        description: 'Documentation de mon infrastructure homelab actuelle, basée sur Docker Compose et Ansible.',
        slug: '/category/homelab-actuel',
      },
      items: [
        'homelab-actuel/index',
        'homelab-actuel/exemple',
      ],
    },
    {
      type: 'category',
      label: 'Futur Homelab - OpenTofu, K3S, Ansible & DevOps',
      link: {
        type: 'generated-index',
        title: 'Futur Homelab - OpenTofu, K3S, Ansible & DevOps',
        description: 'Documentation de la migration vers une infrastructure moderne basée sur Kubernetes et les pratiques DevOps.',
        slug: '/category/homelab-futur',
      },
      items: [
        'homelab-futur/index',
        'homelab-futur/exemple',
      ],
    },
  ],
};

export default sidebars;
