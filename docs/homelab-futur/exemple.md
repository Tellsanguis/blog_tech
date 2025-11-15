---
sidebar_position: 2
---

# Exemple

Ceci est une page d'exemple dans la catégorie Futur Homelab.

## Description

Cette page démontre comment documenter les configurations et déploiements Kubernetes du futur homelab.

## Déploiement Kubernetes

Exemple de manifeste pour un déploiement :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exemple-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: exemple
  template:
    metadata:
      labels:
        app: exemple
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
          requests:
            cpu: 50m
            memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: exemple-service
  namespace: production
spec:
  selector:
    app: exemple
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

## Configuration OpenTofu

Exemple de ressource infrastructure :

```hcl
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
    labels = {
      environment = "production"
      managed-by  = "opentofu"
    }
  }
}

resource "kubernetes_deployment" "exemple" {
  metadata {
    name      = "exemple-app"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "exemple"
      }
    }

    template {
      metadata {
        labels = {
          app = "exemple"
        }
      }

      spec {
        container {
          image = "nginx:latest"
          name  = "app"

          resources {
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
          }
        }
      }
    }
  }
}
```

## GitOps avec ArgoCD

Configuration ArgoCD Application :

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: exemple-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://forgejo.tellserv.fr/Tellsanguis/k8s-manifests.git
    targetRevision: HEAD
    path: apps/exemple
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## Observabilité

Points de surveillance pour ce service :

- Métriques Prometheus exposées sur `/metrics`
- Logs agrégés dans Loki
- Traces distribuées avec Tempo
- Alertes configurées dans Prometheus AlertManager
