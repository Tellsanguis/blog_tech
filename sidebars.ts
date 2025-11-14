import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'presentation',
    {
      type: 'category',
      label: 'Notions',
      link: {
        type: 'doc',
        id: 'notions/index',
      },
      items: [],
    },
    {
      type: 'category',
      label: 'Homelab actuel - Docker Compose & Ansible',
      link: {
        type: 'doc',
        id: 'homelab-actuel/index',
      },
      items: [],
    },
    {
      type: 'category',
      label: 'Futur Homelab - OpenTofu, K3S, Ansible & DevOps',
      link: {
        type: 'doc',
        id: 'homelab-futur/index',
      },
      items: [],
    },
  ],
};

export default sidebars;
