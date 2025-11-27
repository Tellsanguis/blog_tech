#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Auteur: BENE Maël
# Version: 1.0
# Date de création: 27-11-2025
"""
Script de gestion des ressources DRBD Linstor pour les VMs K3s.
Exécuté avant le déploiement Terraform pour s'assurer que les ressources
de stockage DRBD sont créées et dimensionnées correctement.
"""

import subprocess
import sys
import json
import argparse
import os
from typing import Dict, Optional, Tuple


# Configuration SSH et Linstor (via variables d'environnement)
SSH_KEY_PATH = os.environ.get("SSH_KEY_PATH")
LINSTOR_CONTROLLER_IP = os.environ.get("LINSTOR_CONTROLLER_IP", "192.168.100.30")
LINSTOR_CONTROLLER_USER = os.environ.get("LINSTOR_CONTROLLER_USER", "root")

# Noms de ressources DRBD pour chaque VM
# Format attendu par Proxmox: vm-{VMID}-disk-0
RESOURCE_NAMES = {
    1000: "vm-1000-disk-0",  # acemagician - k3s-server-1
    1001: "vm-1001-disk-0",  # elitedesk - k3s-server-2
}

# Configuration des nœuds Proxmox
NODE_CONFIG = {
    1000: {"node": "acemagician", "vm_name": "k3s-server-1"},
    1001: {"node": "elitedesk", "vm_name": "k3s-server-2"},
}


def run_ssh_command(command: str, ssh_key: Optional[str] = None) -> Tuple[int, str, str]:
    """
    Exécute une commande SSH sur le contrôleur Linstor.

    Args:
        command: Commande à exécuter
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        Tuple (code_retour, stdout, stderr)
    """
    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no"]

    # Ajouter la clé SSH si spécifiée
    if ssh_key:
        ssh_cmd.extend(["-i", ssh_key])

    ssh_cmd.extend([f"{LINSTOR_CONTROLLER_USER}@{LINSTOR_CONTROLLER_IP}", command])

    try:
        result = subprocess.run(
            ssh_cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 1, "", "Timeout lors de l'exécution de la commande SSH"
    except Exception as e:
        return 1, "", f"Erreur lors de l'exécution SSH: {str(e)}"


def check_resource_exists(resource_name: str, ssh_key: Optional[str] = None) -> bool:
    """
    Vérifie si une ressource DRBD existe.

    Args:
        resource_name: Nom de la ressource à vérifier
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        True si la ressource existe, False sinon
    """
    # Méthode 1: Vérifier avec resource-definition list
    returncode, stdout, stderr = run_ssh_command(
        f"linstor resource-definition list",
        ssh_key=ssh_key
    )

    if returncode == 0:
        # Cherche le nom exact de la ressource dans la sortie
        lines = stdout.strip().split('\n')
        for line in lines:
            # Ignore les lignes d'en-tête et de séparation
            if line.startswith('+-') or line.startswith('| ResourceName'):
                continue
            # Cherche la ressource dans les lignes de données
            if f"| {resource_name} " in line or f"|{resource_name}|" in line:
                print(f"  → Ressource trouvée dans la liste des définitions")
                return True

    # Méthode 2: Vérifier avec volume-definition (si resource-definition existe, volume existe aussi)
    returncode, stdout, stderr = run_ssh_command(
        f"linstor volume-definition list --resource {resource_name}",
        ssh_key=ssh_key
    )

    if returncode == 0 and stdout.strip() and "VolumeNr" in stdout:
        print(f"  → Volume trouvé pour la ressource")
        return True

    print(f"  → Ressource non trouvée")
    return False


def get_resource_size(resource_name: str, ssh_key: Optional[str] = None) -> Optional[int]:
    """
    Récupère la taille actuelle d'une ressource DRBD en GiB.

    Args:
        resource_name: Nom de la ressource
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        Taille en GiB ou None si erreur
    """
    # Essayer d'abord avec machine-readable (JSON)
    returncode, stdout, stderr = run_ssh_command(
        f"linstor volume-definition list --resource {resource_name} --machine-readable",
        ssh_key=ssh_key
    )

    if returncode == 0 and stdout.strip():
        try:
            # Parse la sortie JSON de Linstor
            data = json.loads(stdout)
            if data and len(data) > 0:
                volume_defs = data[0].get("volume_definitions", [])
                if volume_defs and len(volume_defs) > 0:
                    # Taille en KiB, conversion en GiB
                    size_kib = volume_defs[0].get("size_kib", 0)
                    size_gib = size_kib // (1024 * 1024)
                    print(f"  → Taille récupérée via JSON: {size_gib}GiB")
                    return size_gib
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            print(f"  ⚠ Erreur parsing JSON, essai avec format texte: {e}")

    # Fallback: parser la sortie texte normale
    returncode, stdout, stderr = run_ssh_command(
        f"linstor volume-definition list --resource {resource_name}",
        ssh_key=ssh_key
    )

    if returncode == 0 and stdout.strip():
        lines = stdout.strip().split('\n')
        for line in lines:
            if '|' in line and 'GiB' in line and not line.startswith('| VolumeNr'):
                # Extrait la taille en GiB
                parts = [p.strip() for p in line.split('|')]
                for part in parts:
                    if 'GiB' in part:
                        try:
                            size_str = part.replace('GiB', '').strip()
                            size_gib = int(float(size_str))
                            print(f"  → Taille récupérée via texte: {size_gib}GiB")
                            return size_gib
                        except ValueError:
                            continue

    print(f"  ⚠ Impossible de récupérer la taille, sortie: {stdout[:200]}")
    return None


def create_resource(resource_name: str, size_gib: int, nodes: list, ssh_key: Optional[str] = None) -> bool:
    """
    Crée une nouvelle ressource DRBD avec réplication.

    Args:
        resource_name: Nom de la ressource à créer
        size_gib: Taille en GiB
        nodes: Liste des nœuds pour la réplication
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        True si succès, False sinon
    """
    print(f"Création de la ressource {resource_name} avec {size_gib}GiB...")

    # 1. Créer la définition de ressource
    print(f"  [1/3] Création de la définition de ressource...")
    returncode, stdout, stderr = run_ssh_command(
        f"linstor resource-definition create {resource_name}",
        ssh_key=ssh_key
    )

    if returncode != 0:
        # Si la ressource existe déjà, ce n'est pas une erreur fatale
        if "already exists" in stdout or "already exists" in stderr:
            print(f"  ⚠ La définition de ressource existe déjà, passage à l'étape suivante")
        else:
            print(f"Erreur lors de la création de la définition: {stderr}", file=sys.stderr)
            if stdout:
                print(f"Sortie standard: {stdout}", file=sys.stderr)
            return False
    else:
        print(f"  ✓ Définition de ressource créée")

    # 2. Créer la définition de volume
    print(f"  [2/3] Création de la définition de volume...")
    returncode, stdout, stderr = run_ssh_command(
        f"linstor volume-definition create {resource_name} {size_gib}GiB",
        ssh_key=ssh_key
    )

    if returncode != 0:
        # Si le volume existe déjà, ce n'est pas une erreur fatale
        if "already exists" in stdout or "already exists" in stderr:
            print(f"  ⚠ La définition de volume existe déjà, passage à l'étape suivante")
        else:
            print(f"Erreur lors de la création du volume: {stderr}", file=sys.stderr)
            if stdout:
                print(f"Sortie standard: {stdout}", file=sys.stderr)
            return False
    else:
        print(f"  ✓ Définition de volume créée")

    # 3. Déployer la ressource sur les nœuds avec réplication
    print(f"  [3/3] Déploiement de la ressource sur les nœuds...")
    deployed_count = 0
    for node in nodes:
        print(f"    → Déploiement sur {node}...")
        returncode, stdout, stderr = run_ssh_command(
            f"linstor resource create {node} {resource_name} --storage-pool linstor_storage --resource-group pve-rg",
            ssh_key=ssh_key
        )

        if returncode != 0:
            # Si la ressource existe déjà sur ce nœud, ce n'est pas une erreur
            if "already exists" in stdout or "already exists" in stderr or "already deployed" in stdout:
                print(f"    ⚠ Ressource déjà déployée sur {node}")
                deployed_count += 1
            else:
                print(f"Erreur lors du déploiement sur {node}: {stderr}", file=sys.stderr)
                if stdout:
                    print(f"Sortie standard: {stdout}", file=sys.stderr)
                # Continue avec les autres nœuds même en cas d'erreur
                continue
        else:
            print(f"    ✓ Ressource déployée sur {node}")
            deployed_count += 1

    print(f"✓ Ressource {resource_name} déployée sur {deployed_count}/{len(nodes)} nœuds")
    return True


def resize_resource(resource_name: str, new_size_gib: int, ssh_key: Optional[str] = None) -> bool:
    """
    Augmente la taille d'une ressource DRBD existante.

    Args:
        resource_name: Nom de la ressource à redimensionner
        new_size_gib: Nouvelle taille en GiB
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        True si succès, False sinon
    """
    print(f"Redimensionnement de la ressource {resource_name} à {new_size_gib}GiB...")

    returncode, stdout, stderr = run_ssh_command(
        f"linstor volume-definition set-size {resource_name} 0 {new_size_gib}GiB",
        ssh_key=ssh_key
    )

    if returncode != 0:
        print(f"Erreur lors du redimensionnement: {stderr}", file=sys.stderr)
        return False

    print(f"✓ Ressource {resource_name} redimensionnée avec succès")
    return True


def manage_vm_resource(vmid: int, size_gib: int, dry_run: bool = False, ssh_key: Optional[str] = None) -> bool:
    """
    Gère la ressource DRBD pour une VM spécifique.

    Args:
        vmid: ID de la VM
        size_gib: Taille souhaitée en GiB
        dry_run: Si True, affiche les actions sans les exécuter
        ssh_key: Chemin vers la clé SSH privée (optionnel)

    Returns:
        True si succès, False sinon
    """
    if vmid not in RESOURCE_NAMES:
        print(f"VMID {vmid} non configuré", file=sys.stderr)
        return False

    resource_name = RESOURCE_NAMES[vmid]
    node_info = NODE_CONFIG[vmid]

    print(f"\n{'='*60}")
    print(f"Gestion de la ressource pour VM {vmid} ({node_info['vm_name']})")
    print(f"Ressource DRBD: {resource_name}")
    print(f"Nœud Proxmox: {node_info['node']}")
    print(f"Taille souhaitée: {size_gib}GiB")
    print(f"{'='*60}\n")

    resource_exists = check_resource_exists(resource_name, ssh_key=ssh_key)

    if not resource_exists:
        print(f"La ressource {resource_name} n'existe pas.")

        if dry_run:
            print(f"[DRY-RUN] Créerait la ressource {resource_name} avec {size_gib}GiB")
            return True

        # Créer la ressource sur les 2 nœuds avec stockage (thinkpad = contrôleur uniquement)
        nodes = ["acemagician", "elitedesk"]
        return create_resource(resource_name, size_gib, nodes, ssh_key=ssh_key)

    else:
        print(f"La ressource {resource_name} existe déjà.")

        current_size = get_resource_size(resource_name, ssh_key=ssh_key)

        if current_size is None:
            print("⚠ Impossible de récupérer la taille actuelle")
            print("La ressource existe mais le volume peut ne pas être complètement configuré")
            print("Tentative de création/configuration du volume...")

            if dry_run:
                print(f"[DRY-RUN] Tenterait de créer/configurer le volume avec {size_gib}GiB")
                return True

            # Tente de créer le volume (sera ignoré s'il existe déjà)
            nodes = ["acemagician", "elitedesk"]
            return create_resource(resource_name, size_gib, nodes, ssh_key=ssh_key)

        print(f"Taille actuelle: {current_size}GiB")

        if current_size == size_gib:
            print(f"✓ La taille correspond déjà ({size_gib}GiB), aucune action nécessaire")
            return True

        elif current_size < size_gib:
            print(f"La taille doit être augmentée de {current_size}GiB à {size_gib}GiB")

            if dry_run:
                print(f"[DRY-RUN] Redimensionnerait {resource_name} à {size_gib}GiB")
                return True

            return resize_resource(resource_name, size_gib, ssh_key=ssh_key)

        else:
            print(f"⚠ La taille actuelle ({current_size}GiB) est supérieure à la taille souhaitée ({size_gib}GiB)")
            print("La réduction de taille n'est pas supportée, conservation de la taille actuelle")
            return True


def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(
        description="Gestion des ressources DRBD Linstor pour les VMs K3s"
    )
    parser.add_argument(
        "--vmid",
        type=int,
        required=True,
        choices=[1000, 1001],
        help="ID de la VM (1000=acemagician, 1001=elitedesk)"
    )
    parser.add_argument(
        "--size",
        type=int,
        required=True,
        help="Taille du disque en GiB"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Affiche les actions sans les exécuter"
    )
    parser.add_argument(
        "--ssh-key",
        type=str,
        default=SSH_KEY_PATH,
        help="Chemin vers la clé SSH privée (défaut: variable d'environnement SSH_KEY_PATH)"
    )

    args = parser.parse_args()

    success = manage_vm_resource(args.vmid, args.size, args.dry_run, ssh_key=args.ssh_key)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
