import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'presentation',
    {
      type: 'category',
      label: 'Projets OpenClassrooms',
      link: {
        type: 'doc',
        id: 'projets-openclassrooms/index',
      },
      items: [
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
        type: 'doc',
        id: 'notions/index',
      },
      items: [
        'notions/exemple',
      ],
    },
    {
      type: 'category',
      label: 'Homelab actuel - Docker Compose & Ansible',
      link: {
        type: 'doc',
        id: 'homelab-actuel/index',
      },
      items: [
        'homelab-actuel/exemple',
      ],
    },
    {
      type: 'category',
      label: 'Futur Homelab - OpenTofu, K3S, Ansible & DevOps',
      link: {
        type: 'doc',
        id: 'homelab-futur/index',
      },
      items: [
        'homelab-futur/exemple',
      ],
    },
  ],
};

export default sidebars;
