import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'presentation',
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
