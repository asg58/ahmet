#!/usr/bin/env python
# Blender Models Web Interface
# Eenvoudige Flask interface voor het doorzoeken en bekijken van Blender modellen

import os
import json
import argparse
from typing import Dict, List, Any
from flask import Flask, request, render_template, redirect, url_for, flash, jsonify, send_file
import webbrowser
import threading
import time

from blender_config import PROJECT_ROOT, BLENDER_EXECUTABLE
from blender_chroma_db import BlenderModelDB

# Initialiseer Flask app
app = Flask(__name__, 
           template_folder=os.path.join(PROJECT_ROOT, "templates"),
           static_folder=os.path.join(PROJECT_ROOT, "static"))

app.secret_key = "blender_models_app_secret_key"

# Maak template en static directories als ze niet bestaan
os.makedirs(os.path.join(PROJECT_ROOT, "templates"), exist_ok=True)
os.makedirs(os.path.join(PROJECT_ROOT, "static"), exist_ok=True)

# Initialiseer database
db = BlenderModelDB()

@app.route("/")
def index():
    """Homepage met zoekformulier"""
    # Haal aantal modellen op
    all_models = db.list_all_models()
    model_count = len(all_models)
    
    # Haal unieke tags op
    all_tags = set()
    for model in all_models:
        if model["metadata"] and "tags" in model["metadata"]:
            # Split de tags string op komma's
            tags = model["metadata"]["tags"].split(",") if model["metadata"]["tags"] else []
            all_tags.update(tags)
    
    return render_template("index.html", model_count=model_count, tags=sorted(all_tags))

@app.route("/search")
def search():
    """Zoekresultaten pagina"""
    query = request.args.get("q", "")
    tag = request.args.get("tag", "")
    
    # Bepaal filter op basis van tag
    filter_metadata = None
    if tag:
        # Gebruik de $contains operator voor de string met komma's
        filter_metadata = {"tags": {"$contains": tag}}
    
    # Zoek modellen
    results = []
    if query or tag:
        results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
    
    # Verwerk de tags voor de weergave
    for result in results:
        if result["metadata"] and "tags" in result["metadata"]:
            # Split de tags string terug naar een lijst voor de UI
            result["metadata"]["tags_list"] = result["metadata"]["tags"].split(",") if result["metadata"]["tags"] else []
    
    return render_template("search_results.html", 
                           results=results, 
                           query=query, 
                           tag=tag, 
                           result_count=len(results))

@app.route("/models")
def list_models():
    """Lijst alle modellen"""
    all_models = db.list_all_models()
    
    # Sorteer op datum (nieuwste eerst)
    all_models.sort(key=lambda x: x["metadata"].get("created", 0) if x["metadata"] else 0, reverse=True)
    
    return render_template("all_models.html", models=all_models, model_count=len(all_models))

@app.route("/model/<model_id>")
def view_model(model_id):
    """Toon details van een model"""
    # Haal alle modellen op en zoek het juiste model
    all_models = db.list_all_models()
    model = next((m for m in all_models if m["id"] == model_id), None)
    
    if model is None:
        flash(f"Model met ID {model_id} niet gevonden")
        return redirect(url_for("list_models"))
    
    return render_template("model_details.html", model=model)

@app.route("/open_model/<model_id>")
def open_model(model_id):
    """Open een model in Blender"""
    # Haal alle modellen op en zoek het juiste model
    all_models = db.list_all_models()
    model = next((m for m in all_models if m["id"] == model_id), None)
    
    if model is None:
        flash(f"Model met ID {model_id} niet gevonden")
        return redirect(url_for("list_models"))
    
    # Controleer of het bestand bestaat
    filepath = model["metadata"].get("file_path", "")
    if not os.path.exists(filepath):
        flash(f"Bestand niet gevonden: {filepath}")
        return redirect(url_for("view_model", model_id=model_id))
    
    # Open het bestand in Blender
    try:
        import subprocess
        subprocess.Popen([BLENDER_EXECUTABLE, filepath])
        flash(f"Model geopend in Blender: {os.path.basename(filepath)}")
    except Exception as e:
        flash(f"Fout bij openen in Blender: {e}")
    
    return redirect(url_for("view_model", model_id=model_id))

@app.route("/api/models")
def api_models():
    """API endpoint voor alle modellen"""
    all_models = db.list_all_models()
    return jsonify(all_models)

@app.route("/api/search")
def api_search():
    """API endpoint voor zoeken"""
    query = request.args.get("q", "")
    tag = request.args.get("tag", "")
    
    # Bepaal filter op basis van tag
    filter_metadata = None
    if tag:
        filter_metadata = {"tags": {"$contains": tag}}
    
    # Zoek modellen
    results = []
    if query or tag:
        results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
    
    return jsonify(results)

def create_template_files():
    """Maak de templates aan als ze nog niet bestaan"""
    # Base template
    base_template = """<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Blender Models Database{% endblock %}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .model-card {
            height: 100%;
            transition: transform 0.2s;
        }
        .model-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .tag-badge {
            margin-right: 5px;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">Blender Models DB</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="/">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/models">Alle Modellen</a>
                    </li>
                </ul>
                <form class="d-flex ms-auto" action="/search" method="get">
                    <input class="form-control me-2" type="search" name="q" placeholder="Zoeken...">
                    <button class="btn btn-outline-light" type="submit">Zoek</button>
                </form>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        {% with messages = get_flashed_messages() %}
            {% if messages %}
                {% for message in messages %}
                    <div class="alert alert-info">{{ message }}</div>
                {% endfor %}
            {% endif %}
        {% endwith %}
        
        {% block content %}{% endblock %}
    </div>

    <footer class="bg-dark text-white mt-5 py-3">
        <div class="container text-center">
            <p>Blender Models Database &copy; 2025</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
"""

    # Index template
    index_template = """{% extends "base.html" %}
{% block title %}Blender Models Database{% endblock %}

{% block content %}
    <div class="row">
        <div class="col-md-8 offset-md-2 text-center">
            <h1 class="mb-4">Blender 3D Models Database</h1>
            <p class="lead">Doorzoek en beheer je Blender 3D modellen</p>
            
            <div class="card mt-4">
                <div class="card-body">
                    <h5 class="card-title">Zoek een 3D model</h5>
                    <form action="/search" method="get" class="mt-3">
                        <div class="input-group mb-3">
                            <input type="text" class="form-control form-control-lg" name="q" placeholder="Zoekterm...">
                            <button class="btn btn-primary" type="submit">Zoeken</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="card mt-4">
                <div class="card-body">
                    <h5 class="card-title">Modellen op tag zoeken</h5>
                    <div class="mt-3">
                        {% for tag in tags %}
                            <a href="/search?tag={{ tag }}" class="btn btn-outline-secondary m-1">{{ tag }}</a>
                        {% endfor %}
                    </div>
                </div>
            </div>
            
            <div class="mt-4">
                <p>Er zijn <strong>{{ model_count }}</strong> modellen in de database</p>
                <a href="/models" class="btn btn-outline-primary">Bekijk alle modellen</a>
            </div>
        </div>
    </div>
{% endblock %}
"""

    # Search results template
    search_results_template = """{% extends "base.html" %}
{% block title %}Zoekresultaten{% endblock %}

{% block content %}
    <h1 class="mb-4">Zoekresultaten</h1>
    
    <div class="mb-4">
        <p>
            {% if query %}Zoekterm: <strong>{{ query }}</strong>{% endif %}
            {% if tag %}Tag: <strong>{{ tag }}</strong>{% endif %}
        </p>
        <p>{{ result_count }} resultaten gevonden</p>
    </div>
    
    {% if results %}
        <div class="row row-cols-1 row-cols-md-3 g-4">
            {% for result in results %}
                <div class="col">
                    <div class="card model-card h-100">
                        <div class="card-body">
                            <h5 class="card-title">{{ result.metadata.filename }}</h5>
                            <p class="card-text">{{ result.description }}</p>
                            
                            {% if result.metadata.tags_list %}
                                <div class="mb-2">
                                    {% for tag in result.metadata.tags_list %}
                                        <span class="badge bg-secondary tag-badge">{{ tag }}</span>
                                    {% endfor %}
                                </div>
                            {% endif %}
                            
                            <p class="card-text text-muted">Score: {{ "%.2f"|format(result.score) }}</p>
                        </div>
                        <div class="card-footer">
                            <a href="/model/{{ result.id }}" class="btn btn-sm btn-primary">Details</a>
                            <a href="/open_model/{{ result.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>
                        </div>
                    </div>
                </div>
            {% endfor %}
        </div>
    {% else %}
        <div class="alert alert-info">
            Geen resultaten gevonden. Probeer een andere zoekterm.
        </div>
    {% endif %}
    
    <div class="mt-4">
        <a href="/" class="btn btn-outline-primary">Terug naar home</a>
    </div>
{% endblock %}
"""

    # All models template
    all_models_template = """{% extends "base.html" %}
{% block title %}Alle Modellen{% endblock %}

{% block content %}
    <h1 class="mb-4">Alle Modellen</h1>
    <p>Totaal aantal modellen: {{ model_count }}</p>
    
    {% if models %}
        <div class="row row-cols-1 row-cols-md-3 g-4">
            {% for model in models %}
                <div class="col">
                    <div class="card model-card h-100">
                        <div class="card-body">
                            <h5 class="card-title">{{ model.metadata.filename }}</h5>
                            <p class="card-text">{{ model.description }}</p>
                            
                            {% if model.metadata.tags %}
                                <div class="mb-2">
                                    {% for tag in model.metadata.tags.split(',') %}
                                        <span class="badge bg-secondary tag-badge">{{ tag }}</span>
                                    {% endfor %}
                                </div>
                            {% endif %}
                        </div>
                        <div class="card-footer">
                            <a href="/model/{{ model.id }}" class="btn btn-sm btn-primary">Details</a>
                            <a href="/open_model/{{ model.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>
                        </div>
                    </div>
                </div>
            {% endfor %}
        </div>
    {% else %}
        <div class="alert alert-info">
            Geen modellen gevonden in de database.
        </div>
    {% endif %}
{% endblock %}
"""

    # Model details template
    model_details_template = """{% extends "base.html" %}
{% block title %}Model Details{% endblock %}

{% block content %}
    <div class="row">
        <div class="col-md-8 offset-md-2">
            <div class="card">
                <div class="card-header">
                    <h1 class="mb-0">{{ model.metadata.filename }}</h1>
                </div>
                <div class="card-body">
                    <h5>Beschrijving</h5>
                    <p>{{ model.description }}</p>
                    
                    <h5>Bestandslocatie</h5>
                    <p><code>{{ model.metadata.file_path }}</code></p>
                    
                    {% if model.metadata.tags %}
                        <h5>Tags</h5>
                        <div class="mb-3">
                            {% for tag in model.metadata.tags.split(',') %}
                                <a href="/search?tag={{ tag }}" class="badge bg-primary tag-badge">{{ tag }}</a>
                            {% endfor %}
                        </div>
                    {% endif %}
                    
                    <h5>Metagegevens</h5>
                    <table class="table table-striped">
                        <tbody>
                            <tr>
                                <td>Aangemaakt</td>
                                <td>{{ model.metadata.created|timestamp_to_date }}</td>
                            </tr>
                            <tr>
                                <td>Gewijzigd</td>
                                <td>{{ model.metadata.modified|timestamp_to_date }}</td>
                            </tr>
                            <tr>
                                <td>Bestandsgrootte</td>
                                <td>{{ model.metadata.size|filesizeformat }}</td>
                            </tr>
                            <tr>
                                <td>Database ID</td>
                                <td><code>{{ model.id }}</code></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="mt-4">
                        <a href="/open_model/{{ model.id }}" class="btn btn-primary">Open in Blender</a>
                        <a href="/models" class="btn btn-outline-secondary">Terug naar alle modellen</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
{% endblock %}
"""

    # Write templates to files
    templates_path = os.path.join(PROJECT_ROOT, "templates")
    template_files = {
        "base.html": base_template,
        "index.html": index_template,
        "search_results.html": search_results_template,
        "all_models.html": all_models_template,
        "model_details.html": model_details_template
    }
    
    for filename, content in template_files.items():
        file_path = os.path.join(templates_path, filename)
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Template aangemaakt: {filename}")

# Template filters
@app.template_filter('timestamp_to_date')
def timestamp_to_date(timestamp):
    """Converteer een timestamp naar een leesbare datum"""
    import datetime
    return datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')

@app.template_filter('filesizeformat')
def filesizeformat(bytes):
    """Formatteer bestandsgrootte"""
    units = ['bytes', 'KB', 'MB', 'GB', 'TB']
    size = float(bytes)
    unit_index = 0
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    return f"{size:.1f} {units[unit_index]}"

def open_browser(url):
    """Open browser na een korte vertraging"""
    time.sleep(1.5)
    webbrowser.open(url)

def main():
    """Hoofdfunctie"""
    parser = argparse.ArgumentParser(description="Blender Models Web Interface")
    parser.add_argument("--host", type=str, default="127.0.0.1",
                      help="Host om de server op te draaien (standaard: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5000,
                      help="Poort om de server op te draaien (standaard: 5000)")
    parser.add_argument("--no-browser", action="store_true",
                      help="Open de browser niet automatisch")
    
    args = parser.parse_args()
    
    # Maak template bestanden aan
    create_template_files()
    
    # Open browser automatisch
    if not args.no_browser:
        url = f"http://{args.host}:{args.port}"
        threading.Thread(target=open_browser, args=(url,)).start()
    
    # Start de Flask app
    app.run(host=args.host, port=args.port, debug=True)

if __name__ == "__main__":
    main() 