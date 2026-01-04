import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
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
      label: 'OpenWRT',
      link: {
        type: 'doc',
        id: 'openwrt/index',
      },
      items: [
        'openwrt/backhaul-wifi-mesh',
        'openwrt/gretap-vlan',
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
        'homelab-actuel/playbooks-ansible',
        'homelab-actuel/docker-compose',
        'homelab-actuel/traefik',
        'homelab-actuel/proxmox-backup-server',
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
        'homelab-futur/premiere-version-ha-monomachine',
        'homelab-futur/cluster-3-noeuds-proxmox',
      ],
    },
    'zfs-replication-nfs',
  ],
};

export default sidebars;
