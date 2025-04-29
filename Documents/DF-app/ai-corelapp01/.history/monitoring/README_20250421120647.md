# Monitoring en Logging Setup

Deze map bevat configuratiebestanden voor een complete monitoring en logging oplossing voor het AI Design Agent project. Het maakt gebruik van de volgende tools:

- **Prometheus**: Tijdreeks database voor metriek opslag en visualisatie
- **Grafana**: Dashboards en visualisaties voor metriek en logs
- **Loki**: Logging aggregatie systeem
- **Promtail**: Log collector voor Loki
- **Node Exporter**: Metriek verzameling voor de host machine
- **cAdvisor**: Container metriek verzameling

## Gebruik

### Opstarten

Om het volledige monitoring stack op te starten:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

Dit start alle services inclusief de monitoring stack.

### Zonder monitoring opstarten

Als je alleen de basis services wilt opstarten zonder monitoring:

```bash
docker-compose up -d
```

### Toegang tot interfaces

- **Grafana**: http://localhost:3030 (login: admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100 (direct toegang, normaal gebruikt via Grafana)
- **cAdvisor**: http://localhost:8085

## Configuratie

### Prometheus

Prometheus is geconfigureerd om metriek te verzamelen van:
- Prometheus zelf
- Node Exporter (host metrics)
- cAdvisor (container metrics)
- API Server
- Blender Service
- CorelDRAW Service

### Loki & Promtail

Loki en Promtail zijn geconfigureerd om logs te verzamelen van:
- Systeem logs (/var/log)
- Applicatie logs (/logs)
- Service-specifieke logs (server, client, blender, coreldraw)

### Grafana

Grafana is vooraf geconfigureerd met:
- Prometheus data source
- Loki data source
- Basis dashboards (nog toe te voegen)

## Dashboards toevoegen

Om extra dashboards aan Grafana toe te voegen, plaats dashboard JSON bestanden in:
`./monitoring/grafana/provisioning/dashboards/`

## Configuratie aanpassen

- **Prometheus**: Wijzig `./monitoring/prometheus/prometheus.yml`
- **Loki**: Wijzig `./monitoring/loki/loki-config.yml`
- **Promtail**: Wijzig `./monitoring/promtail/promtail-config.yml`
- **Grafana**: Voeg datasources toe in `./monitoring/grafana/provisioning/datasources/`

## Health Checks

Alle services zijn geconfigureerd met health checks, waardoor Docker automatisch services herstart als ze niet meer reageren. De health checks kunnen aangepast worden in de `docker-compose.yml` en `docker-compose.override.yml` bestanden. 