---
sidebar_position: 2
---

# Example

This is an example page in the Future Homelab category.

## Description

This page demonstrates how to document Kubernetes configurations and deployments for the future homelab.

## Kubernetes Deployment

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
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
  name: example-service
  namespace: production
spec:
  selector:
    app: example
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

## OpenTofu Configuration

Example infrastructure resource:

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

resource "kubernetes_deployment" "example" {
  metadata {
    name      = "example-app"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
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

## GitOps with ArgoCD

ArgoCD Application configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://forgejo.tellserv.fr/Tellsanguis/k8s-manifests.git
    targetRevision: HEAD
    path: apps/example
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

## Observability

Monitoring points for this service:

- Prometheus metrics exposed on `/metrics`
- Logs aggregated in Loki
- Distributed traces with Tempo
- Alerts configured in Prometheus AlertManager
