from typing import Dict, List, Any
import argparse
import datetime
import json
import os
import subprocess
import threading
import time
import webbrowser
from blender_chroma_db import BlenderModelDB
from blender_config import PROJECT_ROOT, BLENDER_EXECUTABLE
from flask import Flask, request, render_template, redirect, url_for, flash, jsonify, send_file

app = Flask(__name__, template_folder=os.path.join(PROJECT_ROOT, 'templates'), static_folder=os.path.join(PROJECT_ROOT, 'static'))
app.secret_key = 'blender_models_app_secret_key'
os.makedirs(os.path.join(PROJECT_ROOT, 'templates'), exist_ok=True)
os.makedirs(os.path.join(PROJECT_ROOT, 'static'), exist_ok=True)
db = BlenderModelDB()
@app.route('/')
def index():
    """Homepage met zoekformulier"""
    all_models = db.list_all_models()
    model_count = len(all_models)
    all_tags = set()
    for model in all_models:
        if model['metadata'] and 'tags' in model['metadata']:
            tags = model['metadata']['tags'].split(',') if model['metadata']['tags'] else []
            all_tags.update(tags)
    return render_template('index.html', model_count=model_count, tags=sorted(all_tags))
@app.route('/search')
def search():
    """Zoekresultaten pagina"""
    query = request.args.get('q', '')
    tag = request.args.get('tag', '')
    filter_metadata = None
    if tag:
        filter_metadata = {'tags': {'$contains': tag}}
    results = []
    if query or tag:
        results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
    for result in results:
        if result['metadata'] and 'tags' in result['metadata']:
            result['metadata']['tags_list'] = result['metadata']['tags'].split(',') if result['metadata']['tags'] else []
    return render_template('search_results.html', results=results, query=query, tag=tag, result_count=len(results))
@app.route('/models')
def list_models():
    """Lijst alle modellen"""
    all_models = db.list_all_models()
    all_models.sort(key=lambda x: x['metadata'].get('created', 0) if x['metadata'] else 0, reverse=True)
    return render_template('all_models.html', models=all_models, model_count=len(all_models))
@app.route('/model/<model_id>')
def view_model(model_id):
    """Toon details van een model"""
    all_models = db.list_all_models()
    model = next((m for m in all_models if m['id'] == model_id), None)
    if model is None:
        flash(f'Model met ID {model_id} niet gevonden')
        return redirect(url_for('list_models'))
    return render_template('model_details.html', model=model)
@app.route('/open_model/<model_id>')
def open_model(model_id):
    """Open een model in Blender"""
    all_models = db.list_all_models()
    model = next((m for m in all_models if m['id'] == model_id), None)
    if model is None:
        flash(f'Model met ID {model_id} niet gevonden')
        return redirect(url_for('list_models'))
    filepath = model['metadata'].get('file_path', '')
    if not os.path.exists(filepath):
        flash(f'Bestand niet gevonden: {filepath}')
        return redirect(url_for('view_model', model_id=model_id))
    try:
        import subprocess
        subprocess.Popen([BLENDER_EXECUTABLE, filepath])
        flash(f'Model geopend in Blender: {os.path.basename(filepath)}')
    except Exception as e:
        flash(f'Fout bij openen in Blender: {e}')
    return redirect(url_for('view_model', model_id=model_id))
@app.route('/api/models')
def api_models():
    """API endpoint voor alle modellen"""
    all_models = db.list_all_models()
    return jsonify(all_models)
@app.route('/api/search')
def api_search():
    """API endpoint voor zoeken"""
    query = request.args.get('q', '')
    tag = request.args.get('tag', '')
    filter_metadata = None
    if tag:
        filter_metadata = {'tags': {'$contains': tag}}
    results = []
    if query or tag:
        results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
    return jsonify(results)
def create_template_files():
    """Maak de templates aan als ze nog niet bestaan"""
    base_template = '<!DOCTYPE html>\n<html lang="nl">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>{% block title %}Blender Models Database{% endblock %}</title>\n    <link href=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">\n    <style>\n        .model-card {\n            height: 100%;\n            transition: transform 0.2s;\n        }\n        .model-card:hover {\n            transform: translateY(-5px);\n            box-shadow: 0 4px 8px rgba(0,0,0,0.1);\n        }\n        .tag-badge {\n            margin-right: 5px;\n            margin-bottom: 5px;\n        }\n    </style>\n</head>\n<body>\n    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">\n        <div class="container">\n            <a class="navbar-brand" href="/">Blender Models DB</a>\n            <button class=     "navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">\n                <span class="navbar-toggler-icon"></span>\n            </button>\n            <div class="collapse navbar-collapse" id="navbarNav">\n                <ul class="navbar-nav">\n                    <li class="nav-item">\n                        <a class="nav-link" href="/">Home</a>\n                    </li>\n                    <li class="nav-item">\n                        <a class="nav-link" href="/models">Alle Modellen</a>\n                    </li>\n                </ul>\n                <form class="d-flex ms-auto" action="/search" method="get">\n                    <input class=     "form-control me-2" type="search" name="q" placeholder="Zoeken...">\n                    <button class="btn btn-outline-light" type="submit">Zoek</button>\n                </form>\n            </div>\n        </div>\n    </nav>\n\n    <div class="container mt-4">\n        {% with messages = get_flashed_messages() %}\n            {% if messages %}\n                {% for message in messages %}\n                    <div class="alert alert-info">{{ message }}</div>\n                {% endfor %}\n            {% endif %}\n        {% endwith %}\n        \n        {% block content %}{% endblock %}\n    </div>\n\n    <footer class="bg-dark text-white mt-5 py-3">\n        <div class="container text-center">\n            <p>Blender Models Database &copy; 2025</p>\n        </div>\n    </footer>\n\n    <script src=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>\n</body>\n</html>\n'
    index_template = '{% extends "base.html" %}\n{% block title %}Blender Models Database{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2 text-center">\n            <h1 class="mb-4">Blender 3D Models Database</h1>\n            <p class="lead">Doorzoek en beheer je Blender 3D modellen</p>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Zoek een 3D model</h5>\n                    <form action="/search" method="get" class="mt-3">\n                        <div class="input-group mb-3">\n                            <input type=     "text" class="form-control form-control-lg" name="q" placeholder="Zoekterm...">\n                            <button class=     "btn btn-primary" type="submit">Zoeken</button>\n                        </div>\n                    </form>\n                </div>\n            </div>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Modellen op tag zoeken</h5>\n                    <div class="mt-3">\n                        {% for tag in tags %}\n                            <a href=     "/search?tag={{ tag }}" class="btn btn-outline-secondary m-1">{{ tag }}</a>\n                        {% endfor %}\n                    </div>\n                </div>\n            </div>\n            \n            <div class="mt-4">\n                <p>Er zijn <strong>{{ model_count }}</strong> modellen in de database</p>\n                <a href=     "/models" class="btn btn-outline-primary">Bekijk alle modellen</a>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
    search_results_template = '{% extends "base.html" %}\n{% block title %}Zoekresultaten{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Zoekresultaten</h1>\n    \n    <div class="mb-4">\n        <p>\n            {% if query %}Zoekterm: <strong>{{ query }}</strong>{% endif %}\n            {% if tag %}Tag: <strong>{{ tag }}</strong>{% endif %}\n        </p>\n        <p>{{ result_count }} resultaten gevonden</p>\n    </div>\n    \n    {% if results %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for result in results %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ result.metadata.filename }}</h5>\n                            <p class="card-text">{{ result.description }}</p>\n                            \n                            {% if result.metadata.tags_list %}\n                                <div class="mb-2">\n                                    {% for tag in result.metadata.tags_list %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                            \n                            <p class="card-text text-muted">Score: {{ "%.2f"|format(\n    result.score) }}</p>\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ result.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ result.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen resultaten gevonden. Probeer een andere zoekterm.\n        </div>\n    {% endif %}\n    \n    <div class="mt-4">\n        <a href="/" class="btn btn-outline-primary">Terug naar home</a>\n    </div>\n{% endblock %}\n'
    all_models_template = '{% extends "base.html" %}\n{% block title %}Alle Modellen{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Alle Modellen</h1>\n    <p>Totaal aantal modellen: {{ model_count }}</p>\n    \n    {% if models %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for model in models %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ model.metadata.filename }}</h5>\n                            <p class="card-text">{{ model.description }}</p>\n                            \n                            {% if model.metadata.tags %}\n                                <div class="mb-2">\n                                    {% for tag in model.metadata.tags.split(\',\') %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ model.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ model.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen modellen gevonden in de database.\n        </div>\n    {% endif %}\n{% endblock %}\n'
    model_details_template = '{% extends "base.html" %}\n{% block title %}Model Details{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2">\n            <div class="card">\n                <div class="card-header">\n                    <h1 class="mb-0">{{ model.metadata.filename }}</h1>\n                </div>\n                <div class="card-body">\n                    <h5>Beschrijving</h5>\n                    <p>{{ model.description }}</p>\n                    \n                    <h5>Bestandslocatie</h5>\n                    <p><code>{{ model.metadata.file_path }}</code></p>\n                    \n                    {% if model.metadata.tags %}\n                        <h5>Tags</h5>\n                        <div class="mb-3">\n                            {% for tag in model.metadata.tags.split(\',\') %}\n                                <a href=     "/search?tag={{ tag }}" class="badge bg-primary tag-badge">{{ tag }}</a>\n                            {% endfor %}\n                        </div>\n                    {% endif %}\n                    \n                    <h5>Metagegevens</h5>\n                    <table class="table table-striped">\n                        <tbody>\n                            <tr>\n                                <td>Aangemaakt</td>\n                                <td>{{ model.metadata.created|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Gewijzigd</td>\n                                <td>{{ model.metadata.modified|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Bestandsgrootte</td>\n                                <td>{{ model.metadata.size|filesizeformat }}</td>\n                            </tr>\n                            <tr>\n                                <td>Database ID</td>\n                                <td><code>{{ model.id }}</code></td>\n                            </tr>\n                        </tbody>\n                    </table>\n                    \n                    <div class="mt-4">\n                        <a href=     "/open_model/{{ model.id }}" class="btn btn-primary">Open in Blender</a>\n                        <a href=     "/models" class="btn btn-outline-secondary">Terug naar alle modellen</a>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
    templates_path = os.path.join(PROJECT_ROOT, 'templates')
    template_files = {'base.html': base_template, 'index.html': index_template, 'search_results.html': search_results_template, 'all_models.html': all_models_template, 'model_details.html': model_details_template}
    for filename, content in template_files.items():
        file_path = os.path.join(templates_path, filename)
        if not os.path.exists(file_path):
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Template aangemaakt: {filename}')
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
    return f'{size:.1f} {units[unit_index]}'
def open_browser(url):
    """Open browser na een korte vertraging"""
    time.sleep(1.5)
    webbrowser.open(url)
def main():
    """Hoofdfunctie"""
    parser = argparse.ArgumentParser(description='Blender Models Web Interface')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host om de server op te draaien (standaard: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=5000, help='Poort om de server op te draaien (standaard: 5000)')
    parser.add_argument('--no-browser', action='store_true', help='Open de browser niet automatisch')
    args = parser.parse_args()
    create_template_files()
    if not args.no_browser:
        url = f'http://{args.host}:{args.port}'
        threading.Thread(target=open_browser, args=(url,)).start()
    app.run(host=args.host, port=args.port, debug=True)
if __name__ == '__main__':
    main()
os
json
argparse
Dict
List
Any
Flask
request
render_template
redirect
url_for
flash
jsonify
send_file
webbrowser
threading
time
PROJECT_ROOT
BLENDER_EXECUTABLE
BlenderModelDB
app
Flask(__name__, template_folder=os.path.join(PROJECT_ROOT, 'templates'), static_folder=os.path.join(PROJECT_ROOT, 'static'))
app.secret_key
'blender_models_app_secret_key'
os.makedirs(os.path.join(PROJECT_ROOT, 'templates'), exist_ok=True)
os.makedirs(os.path.join(PROJECT_ROOT, 'static'), exist_ok=True)
db
BlenderModelDB()

'Homepage met zoekformulier'
all_models = db.list_all_models()
model_count = len(all_models)
all_tags = set()
for model in all_models:
    if model['metadata'] and 'tags' in model['metadata']:
        tags = model['metadata']['tags'].split(',') if model['metadata']['tags'] else []
        all_tags.update(tags)
return render_template('index.html', model_count=model_count, tags=sorted(all_tags))
app.route('/')

'Zoekresultaten pagina'
query = request.args.get('q', '')
tag = request.args.get('tag', '')
filter_metadata = None
if tag:
    filter_metadata = {'tags': {'$contains': tag}}
results = []
if query or tag:
    results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
for result in results:
    if result['metadata'] and 'tags' in result['metadata']:
        result['metadata']['tags_list'] = result['metadata']['tags'].split(',') if result['metadata']['tags'] else []
return render_template('search_results.html', results=results, query=query, tag=tag, result_count=len(results))
app.route('/search')

'Lijst alle modellen'
all_models = db.list_all_models()
all_models.sort(key=lambda x: x['metadata'].get('created', 0) if x['metadata'] else 0, reverse=True)
return render_template('all_models.html', models=all_models, model_count=len(all_models))
app.route('/models')
model_id
'Toon details van een model'
all_models = db.list_all_models()
model = next((m for m in all_models if m['id'] == model_id), None)
if model is None:
    flash(f'Model met ID {model_id} niet gevonden')
    return redirect(url_for('list_models'))
return render_template('model_details.html', model=model)
app.route('/model/<model_id>')
model_id
'Open een model in Blender'
all_models = db.list_all_models()
model = next((m for m in all_models if m['id'] == model_id), None)
if model is None:
    flash(f'Model met ID {model_id} niet gevonden')
    return redirect(url_for('list_models'))
filepath = model['metadata'].get('file_path', '')
if not os.path.exists(filepath):
    flash(f'Bestand niet gevonden: {filepath}')
    return redirect(url_for('view_model', model_id=model_id))
try:
    import subprocess
    subprocess.Popen([BLENDER_EXECUTABLE, filepath])
    flash(f'Model geopend in Blender: {os.path.basename(filepath)}')
except Exception as e:
    flash(f'Fout bij openen in Blender: {e}')
return redirect(url_for('view_model', model_id=model_id))
app.route('/open_model/<model_id>')

'API endpoint voor alle modellen'
all_models = db.list_all_models()
return jsonify(all_models)
app.route('/api/models')

'API endpoint voor zoeken'
query = request.args.get('q', '')
tag = request.args.get('tag', '')
filter_metadata = None
if tag:
    filter_metadata = {'tags': {'$contains': tag}}
results = []
if query or tag:
    results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
return jsonify(results)
app.route('/api/search')

'Maak de templates aan als ze nog niet bestaan'
base_template = '<!DOCTYPE html>\n<html lang="nl">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>{% block title %}Blender Models Database{% endblock %}</title>\n    <link href=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">\n    <style>\n        .model-card {\n            height: 100%;\n            transition: transform 0.2s;\n        }\n        .model-card:hover {\n            transform: translateY(-5px);\n            box-shadow: 0 4px 8px rgba(0,0,0,0.1);\n        }\n        .tag-badge {\n            margin-right: 5px;\n            margin-bottom: 5px;\n        }\n    </style>\n</head>\n<body>\n    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">\n        <div class="container">\n            <a class="navbar-brand" href="/">Blender Models DB</a>\n            <button class=     "navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">\n                <span class="navbar-toggler-icon"></span>\n            </button>\n            <div class="collapse navbar-collapse" id="navbarNav">\n                <ul class="navbar-nav">\n                    <li class="nav-item">\n                        <a class="nav-link" href="/">Home</a>\n                    </li>\n                    <li class="nav-item">\n                        <a class="nav-link" href="/models">Alle Modellen</a>\n                    </li>\n                </ul>\n                <form class="d-flex ms-auto" action="/search" method="get">\n                    <input class=     "form-control me-2" type="search" name="q" placeholder="Zoeken...">\n                    <button class="btn btn-outline-light" type="submit">Zoek</button>\n                </form>\n            </div>\n        </div>\n    </nav>\n\n    <div class="container mt-4">\n        {% with messages = get_flashed_messages() %}\n            {% if messages %}\n                {% for message in messages %}\n                    <div class="alert alert-info">{{ message }}</div>\n                {% endfor %}\n            {% endif %}\n        {% endwith %}\n        \n        {% block content %}{% endblock %}\n    </div>\n\n    <footer class="bg-dark text-white mt-5 py-3">\n        <div class="container text-center">\n            <p>Blender Models Database &copy; 2025</p>\n        </div>\n    </footer>\n\n    <script src=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>\n</body>\n</html>\n'
index_template = '{% extends "base.html" %}\n{% block title %}Blender Models Database{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2 text-center">\n            <h1 class="mb-4">Blender 3D Models Database</h1>\n            <p class="lead">Doorzoek en beheer je Blender 3D modellen</p>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Zoek een 3D model</h5>\n                    <form action="/search" method="get" class="mt-3">\n                        <div class="input-group mb-3">\n                            <input type=     "text" class="form-control form-control-lg" name="q" placeholder="Zoekterm...">\n                            <button class=     "btn btn-primary" type="submit">Zoeken</button>\n                        </div>\n                    </form>\n                </div>\n            </div>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Modellen op tag zoeken</h5>\n                    <div class="mt-3">\n                        {% for tag in tags %}\n                            <a href=     "/search?tag={{ tag }}" class="btn btn-outline-secondary m-1">{{ tag }}</a>\n                        {% endfor %}\n                    </div>\n                </div>\n            </div>\n            \n            <div class="mt-4">\n                <p>Er zijn <strong>{{ model_count }}</strong> modellen in de database</p>\n                <a href=     "/models" class="btn btn-outline-primary">Bekijk alle modellen</a>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
search_results_template = '{% extends "base.html" %}\n{% block title %}Zoekresultaten{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Zoekresultaten</h1>\n    \n    <div class="mb-4">\n        <p>\n            {% if query %}Zoekterm: <strong>{{ query }}</strong>{% endif %}\n            {% if tag %}Tag: <strong>{{ tag }}</strong>{% endif %}\n        </p>\n        <p>{{ result_count }} resultaten gevonden</p>\n    </div>\n    \n    {% if results %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for result in results %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ result.metadata.filename }}</h5>\n                            <p class="card-text">{{ result.description }}</p>\n                            \n                            {% if result.metadata.tags_list %}\n                                <div class="mb-2">\n                                    {% for tag in result.metadata.tags_list %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                            \n                            <p class="card-text text-muted">Score: {{ "%.2f"|format(\n    result.score) }}</p>\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ result.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ result.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen resultaten gevonden. Probeer een andere zoekterm.\n        </div>\n    {% endif %}\n    \n    <div class="mt-4">\n        <a href="/" class="btn btn-outline-primary">Terug naar home</a>\n    </div>\n{% endblock %}\n'
all_models_template = '{% extends "base.html" %}\n{% block title %}Alle Modellen{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Alle Modellen</h1>\n    <p>Totaal aantal modellen: {{ model_count }}</p>\n    \n    {% if models %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for model in models %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ model.metadata.filename }}</h5>\n                            <p class="card-text">{{ model.description }}</p>\n                            \n                            {% if model.metadata.tags %}\n                                <div class="mb-2">\n                                    {% for tag in model.metadata.tags.split(\',\') %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ model.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ model.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen modellen gevonden in de database.\n        </div>\n    {% endif %}\n{% endblock %}\n'
model_details_template = '{% extends "base.html" %}\n{% block title %}Model Details{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2">\n            <div class="card">\n                <div class="card-header">\n                    <h1 class="mb-0">{{ model.metadata.filename }}</h1>\n                </div>\n                <div class="card-body">\n                    <h5>Beschrijving</h5>\n                    <p>{{ model.description }}</p>\n                    \n                    <h5>Bestandslocatie</h5>\n                    <p><code>{{ model.metadata.file_path }}</code></p>\n                    \n                    {% if model.metadata.tags %}\n                        <h5>Tags</h5>\n                        <div class="mb-3">\n                            {% for tag in model.metadata.tags.split(\',\') %}\n                                <a href=     "/search?tag={{ tag }}" class="badge bg-primary tag-badge">{{ tag }}</a>\n                            {% endfor %}\n                        </div>\n                    {% endif %}\n                    \n                    <h5>Metagegevens</h5>\n                    <table class="table table-striped">\n                        <tbody>\n                            <tr>\n                                <td>Aangemaakt</td>\n                                <td>{{ model.metadata.created|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Gewijzigd</td>\n                                <td>{{ model.metadata.modified|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Bestandsgrootte</td>\n                                <td>{{ model.metadata.size|filesizeformat }}</td>\n                            </tr>\n                            <tr>\n                                <td>Database ID</td>\n                                <td><code>{{ model.id }}</code></td>\n                            </tr>\n                        </tbody>\n                    </table>\n                    \n                    <div class="mt-4">\n                        <a href=     "/open_model/{{ model.id }}" class="btn btn-primary">Open in Blender</a>\n                        <a href=     "/models" class="btn btn-outline-secondary">Terug naar alle modellen</a>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
templates_path = os.path.join(PROJECT_ROOT, 'templates')
template_files = {'base.html': base_template, 'index.html': index_template, 'search_results.html': search_results_template, 'all_models.html': all_models_template, 'model_details.html': model_details_template}
for filename, content in template_files.items():
    file_path = os.path.join(templates_path, filename)
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Template aangemaakt: {filename}')
timestamp
'Converteer een timestamp naar een leesbare datum'
return datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
app.template_filter('timestamp_to_date')
bytes
'Formatteer bestandsgrootte'
units = ['bytes', 'KB', 'MB', 'GB', 'TB']
size = float(bytes)
unit_index = 0
while size >= 1024 and unit_index < len(units) - 1:
    size /= 1024
    unit_index += 1
return f'{size:.1f} {units[unit_index]}'
app.template_filter('filesizeformat')
url
'Open browser na een korte vertraging'
time.sleep(1.5)
webbrowser.open(url)

'Hoofdfunctie'
parser = argparse.ArgumentParser(description='Blender Models Web Interface')
parser.add_argument('--host', type=str, default='127.0.0.1', help='Host om de server op te draaien (standaard: 127.0.0.1)')
parser.add_argument('--port', type=int, default=5000, help='Poort om de server op te draaien (standaard: 5000)')
parser.add_argument('--no-browser', action='store_true', help='Open de browser niet automatisch')
args = parser.parse_args()
create_template_files()
if not args.no_browser:
    url = f'http://{args.host}:{args.port}'
    threading.Thread(target=open_browser, args=(url,)).start()
app.run(host=args.host, port=args.port, debug=True)
__name__ == '__main__'
main()

Flask
__name__
template_folder=os.path.join(PROJECT_ROOT, 'templates')
static_folder=os.path.join(PROJECT_ROOT, 'static')
app

os.makedirs
os.path.join(PROJECT_ROOT, 'templates')
exist_ok=True
os.makedirs
os.path.join(PROJECT_ROOT, 'static')
exist_ok=True

BlenderModelDB
'Homepage met zoekformulier'
all_models
db.list_all_models()
model_count
len(all_models)
all_tags
set()
model
all_models
if model['metadata'] and 'tags' in model['metadata']:
    tags = model['metadata']['tags'].split(',') if model['metadata']['tags'] else []
    all_tags.update(tags)
render_template('index.html', model_count=model_count, tags=sorted(all_tags))
app.route
'/'
'Zoekresultaten pagina'
query
request.args.get('q', '')
tag
request.args.get('tag', '')
filter_metadata
None
tag
filter_metadata = {'tags': {'$contains': tag}}
results
[]
query or tag
results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
result
results
if result['metadata'] and 'tags' in result['metadata']:
    result['metadata']['tags_list'] = result['metadata']['tags'].split(',') if result['metadata']['tags'] else []
render_template('search_results.html', results=results, query=query, tag=tag, result_count=len(results))
app.route
'/search'
'Lijst alle modellen'
all_models
db.list_all_models()
all_models.sort(key=lambda x: x['metadata'].get('created', 0) if x['metadata'] else 0, reverse=True)
render_template('all_models.html', models=all_models, model_count=len(all_models))
app.route
'/models'
model_id
'Toon details van een model'
all_models
db.list_all_models()
model
next((m for m in all_models if m['id'] == model_id), None)
model is None
flash(f'Model met ID {model_id} niet gevonden')
return redirect(url_for('list_models'))
render_template('model_details.html', model=model)
app.route
'/model/<model_id>'
model_id
'Open een model in Blender'
all_models
db.list_all_models()
model
next((m for m in all_models if m['id'] == model_id), None)
model is None
flash(f'Model met ID {model_id} niet gevonden')
return redirect(url_for('list_models'))
filepath
model['metadata'].get('file_path', '')
not os.path.exists(filepath)
flash(f'Bestand niet gevonden: {filepath}')
return redirect(url_for('view_model', model_id=model_id))
subprocess.Popen([BLENDER_EXECUTABLE, filepath])
flash(f'Model geopend in Blender: {os.path.basename(filepath)}')
except Exception as e:
    flash(f'Fout bij openen in Blender: {e}')
redirect(url_for('view_model', model_id=model_id))
app.route
'/open_model/<model_id>'
'API endpoint voor alle modellen'
all_models
db.list_all_models()
jsonify(all_models)
app.route
'/api/models'
'API endpoint voor zoeken'
query
request.args.get('q', '')
tag
request.args.get('tag', '')
filter_metadata
None
tag
filter_metadata = {'tags': {'$contains': tag}}
results
[]
query or tag
results = db.search_models(query, n_results=20, filter_metadata=filter_metadata)
jsonify(results)
app.route
'/api/search'
'Maak de templates aan als ze nog niet bestaan'
base_template
'<!DOCTYPE html>\n<html lang="nl">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>{% block title %}Blender Models Database{% endblock %}</title>\n    <link href=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">\n    <style>\n        .model-card {\n            height: 100%;\n            transition: transform 0.2s;\n        }\n        .model-card:hover {\n            transform: translateY(-5px);\n            box-shadow: 0 4px 8px rgba(0,0,0,0.1);\n        }\n        .tag-badge {\n            margin-right: 5px;\n            margin-bottom: 5px;\n        }\n    </style>\n</head>\n<body>\n    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">\n        <div class="container">\n            <a class="navbar-brand" href="/">Blender Models DB</a>\n            <button class=     "navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">\n                <span class="navbar-toggler-icon"></span>\n            </button>\n            <div class="collapse navbar-collapse" id="navbarNav">\n                <ul class="navbar-nav">\n                    <li class="nav-item">\n                        <a class="nav-link" href="/">Home</a>\n                    </li>\n                    <li class="nav-item">\n                        <a class="nav-link" href="/models">Alle Modellen</a>\n                    </li>\n                </ul>\n                <form class="d-flex ms-auto" action="/search" method="get">\n                    <input class=     "form-control me-2" type="search" name="q" placeholder="Zoeken...">\n                    <button class="btn btn-outline-light" type="submit">Zoek</button>\n                </form>\n            </div>\n        </div>\n    </nav>\n\n    <div class="container mt-4">\n        {% with messages = get_flashed_messages() %}\n            {% if messages %}\n                {% for message in messages %}\n                    <div class="alert alert-info">{{ message }}</div>\n                {% endfor %}\n            {% endif %}\n        {% endwith %}\n        \n        {% block content %}{% endblock %}\n    </div>\n\n    <footer class="bg-dark text-white mt-5 py-3">\n        <div class="container text-center">\n            <p>Blender Models Database &copy; 2025</p>\n        </div>\n    </footer>\n\n    <script src=     "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>\n</body>\n</html>\n'
index_template
'{% extends "base.html" %}\n{% block title %}Blender Models Database{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2 text-center">\n            <h1 class="mb-4">Blender 3D Models Database</h1>\n            <p class="lead">Doorzoek en beheer je Blender 3D modellen</p>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Zoek een 3D model</h5>\n                    <form action="/search" method="get" class="mt-3">\n                        <div class="input-group mb-3">\n                            <input type=     "text" class="form-control form-control-lg" name="q" placeholder="Zoekterm...">\n                            <button class=     "btn btn-primary" type="submit">Zoeken</button>\n                        </div>\n                    </form>\n                </div>\n            </div>\n            \n            <div class="card mt-4">\n                <div class="card-body">\n                    <h5 class="card-title">Modellen op tag zoeken</h5>\n                    <div class="mt-3">\n                        {% for tag in tags %}\n                            <a href=     "/search?tag={{ tag }}" class="btn btn-outline-secondary m-1">{{ tag }}</a>\n                        {% endfor %}\n                    </div>\n                </div>\n            </div>\n            \n            <div class="mt-4">\n                <p>Er zijn <strong>{{ model_count }}</strong> modellen in de database</p>\n                <a href=     "/models" class="btn btn-outline-primary">Bekijk alle modellen</a>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
search_results_template
'{% extends "base.html" %}\n{% block title %}Zoekresultaten{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Zoekresultaten</h1>\n    \n    <div class="mb-4">\n        <p>\n            {% if query %}Zoekterm: <strong>{{ query }}</strong>{% endif %}\n            {% if tag %}Tag: <strong>{{ tag }}</strong>{% endif %}\n        </p>\n        <p>{{ result_count }} resultaten gevonden</p>\n    </div>\n    \n    {% if results %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for result in results %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ result.metadata.filename }}</h5>\n                            <p class="card-text">{{ result.description }}</p>\n                            \n                            {% if result.metadata.tags_list %}\n                                <div class="mb-2">\n                                    {% for tag in result.metadata.tags_list %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                            \n                            <p class="card-text text-muted">Score: {{ "%.2f"|format(\n    result.score) }}</p>\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ result.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ result.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen resultaten gevonden. Probeer een andere zoekterm.\n        </div>\n    {% endif %}\n    \n    <div class="mt-4">\n        <a href="/" class="btn btn-outline-primary">Terug naar home</a>\n    </div>\n{% endblock %}\n'
all_models_template
'{% extends "base.html" %}\n{% block title %}Alle Modellen{% endblock %}\n\n{% block content %}\n    <h1 class="mb-4">Alle Modellen</h1>\n    <p>Totaal aantal modellen: {{ model_count }}</p>\n    \n    {% if models %}\n        <div class="row row-cols-1 row-cols-md-3 g-4">\n            {% for model in models %}\n                <div class="col">\n                    <div class="card model-card h-100">\n                        <div class="card-body">\n                            <h5 class="card-title">{{ model.metadata.filename }}</h5>\n                            <p class="card-text">{{ model.description }}</p>\n                            \n                            {% if model.metadata.tags %}\n                                <div class="mb-2">\n                                    {% for tag in model.metadata.tags.split(\',\') %}\n                                        <span class=     "badge bg-secondary tag-badge">{{ tag }}</span>\n                                    {% endfor %}\n                                </div>\n                            {% endif %}\n                        </div>\n                        <div class="card-footer">\n                            <a href=     "/model/{{ model.id }}" class="btn btn-sm btn-primary">Details</a>\n                            <a href=     "/open_model/{{ model.id }}" class="btn btn-sm btn-outline-secondary">Open in Blender</a>\n                        </div>\n                    </div>\n                </div>\n            {% endfor %}\n        </div>\n    {% else %}\n        <div class="alert alert-info">\n            Geen modellen gevonden in de database.\n        </div>\n    {% endif %}\n{% endblock %}\n'
model_details_template
'{% extends "base.html" %}\n{% block title %}Model Details{% endblock %}\n\n{% block content %}\n    <div class="row">\n        <div class="col-md-8 offset-md-2">\n            <div class="card">\n                <div class="card-header">\n                    <h1 class="mb-0">{{ model.metadata.filename }}</h1>\n                </div>\n                <div class="card-body">\n                    <h5>Beschrijving</h5>\n                    <p>{{ model.description }}</p>\n                    \n                    <h5>Bestandslocatie</h5>\n                    <p><code>{{ model.metadata.file_path }}</code></p>\n                    \n                    {% if model.metadata.tags %}\n                        <h5>Tags</h5>\n                        <div class="mb-3">\n                            {% for tag in model.metadata.tags.split(\',\') %}\n                                <a href=     "/search?tag={{ tag }}" class="badge bg-primary tag-badge">{{ tag }}</a>\n                            {% endfor %}\n                        </div>\n                    {% endif %}\n                    \n                    <h5>Metagegevens</h5>\n                    <table class="table table-striped">\n                        <tbody>\n                            <tr>\n                                <td>Aangemaakt</td>\n                                <td>{{ model.metadata.created|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Gewijzigd</td>\n                                <td>{{ model.metadata.modified|timestamp_to_date }}</td>\n                            </tr>\n                            <tr>\n                                <td>Bestandsgrootte</td>\n                                <td>{{ model.metadata.size|filesizeformat }}</td>\n                            </tr>\n                            <tr>\n                                <td>Database ID</td>\n                                <td><code>{{ model.id }}</code></td>\n                            </tr>\n                        </tbody>\n                    </table>\n                    \n                    <div class="mt-4">\n                        <a href=     "/open_model/{{ model.id }}" class="btn btn-primary">Open in Blender</a>\n                        <a href=     "/models" class="btn btn-outline-secondary">Terug naar alle modellen</a>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n{% endblock %}\n'
templates_path
os.path.join(PROJECT_ROOT, 'templates')
template_files
{'base.html': base_template, 'index.html': index_template, 'search_results.html': search_results_template, 'all_models.html': all_models_template, 'model_details.html': model_details_template}
(filename, content)
template_files.items()
file_path = os.path.join(templates_path, filename)
if not os.path.exists(file_path):
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Template aangemaakt: {filename}')
timestamp
'Converteer een timestamp naar een leesbare datum'
datetime
datetime.datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
app.template_filter
'timestamp_to_date'
bytes
'Formatteer bestandsgrootte'
units
['bytes', 'KB', 'MB', 'GB', 'TB']
size
float(bytes)
unit_index
0
size >= 1024 and unit_index < len(units) - 1
size /= 1024
unit_index += 1
f'{size:.1f} {units[unit_index]}'
app.template_filter
'filesizeformat'
url
'Open browser na een korte vertraging'
time.sleep(1.5)
webbrowser.open(url)
'Hoofdfunctie'
parser
argparse.ArgumentParser(description='Blender Models Web Interface')
parser.add_argument('--host', type=str, default='127.0.0.1', help='Host om de server op te draaien (standaard: 127.0.0.1)')
parser.add_argument('--port', type=int, default=5000, help='Poort om de server op te draaien (standaard: 5000)')
parser.add_argument('--no-browser', action='store_true', help='Open de browser niet automatisch')
args
parser.parse_args()
create_template_files()
not args.no_browser
url = f'http://{args.host}:{args.port}'
threading.Thread(target=open_browser, args=(url,)).start()
app.run(host=args.host, port=args.port, debug=True)
__name__

'__main__'
main()


os.path.join(PROJECT_ROOT, 'templates')
os.path.join(PROJECT_ROOT, 'static')

os

os.path.join
PROJECT_ROOT
'templates'
True
os

os.path.join
PROJECT_ROOT
'static'
True


db.list_all_models

len
all_models

set


model['metadata'] and 'tags' in model['metadata']
tags = model['metadata']['tags'].split(',') if model['metadata']['tags'] else []
all_tags.update(tags)
render_template
'index.html'
model_count=model_count
tags=sorted(all_tags)
app


request.args.get
'q'
''

request.args.get
'tag'
''


filter_metadata
{'tags': {'$contains': tag}}



query
tag
results
db.search_models(query, n_results=20, filter_metadata=filter_metadata)


result['metadata'] and 'tags' in result['metadata']
result['metadata']['tags_list'] = result['metadata']['tags'].split(',') if result['metadata']['tags'] else []
render_template
'search_results.html'
results=results
query=query
tag=tag
result_count=len(results)
app


db.list_all_models
all_models.sort
key=lambda x: x['metadata'].get('created', 0) if x['metadata'] else 0
reverse=True
render_template
'all_models.html'
models=all_models
model_count=len(all_models)
app


db.list_all_models

next
(m for m in all_models if m['id'] == model_id)
None
model

None
flash(f'Model met ID {model_id} niet gevonden')
redirect(url_for('list_models'))
render_template
'model_details.html'
model=model
app


db.list_all_models

next
(m for m in all_models if m['id'] == model_id)
None
model

None
flash(f'Model met ID {model_id} niet gevonden')
redirect(url_for('list_models'))

model['metadata'].get
'file_path'
''

os.path.exists(filepath)
flash(f'Bestand niet gevonden: {filepath}')
redirect(url_for('view_model', model_id=model_id))
subprocess
subprocess.Popen([BLENDER_EXECUTABLE, filepath])
flash(f'Model geopend in Blender: {os.path.basename(filepath)}')
Exception
flash(f'Fout bij openen in Blender: {e}')
redirect
url_for('view_model', model_id=model_id)
app


db.list_all_models
jsonify
all_models
app


request.args.get
'q'
''

request.args.get
'tag'
''


filter_metadata
{'tags': {'$contains': tag}}



query
tag
results
db.search_models(query, n_results=20, filter_metadata=filter_metadata)
jsonify
results
app







os.path.join
PROJECT_ROOT
'templates'

'base.html'
'index.html'
'search_results.html'
'all_models.html'
'model_details.html'
base_template
index_template
search_results_template
all_models_template
model_details_template
filename
content

template_files.items
file_path
os.path.join(templates_path, filename)
not os.path.exists(file_path)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Template aangemaakt: {filename}')
datetime.datetime.fromtimestamp(timestamp).strftime
'%Y-%m-%d %H:%M:%S'
app


'bytes'
'KB'
'MB'
'GB'
'TB'


float
bytes


size >= 1024
unit_index < len(units) - 1
size

1024
unit_index

1
{size:.1f}
' '
{units[unit_index]}
app

time.sleep
1.5
webbrowser.open
url

argparse.ArgumentParser
description='Blender Models Web Interface'
parser.add_argument
'--host'
type=str
default='127.0.0.1'
help='Host om de server op te draaien (standaard: 127.0.0.1)'
parser.add_argument
'--port'
type=int
default=5000
help='Poort om de server op te draaien (standaard: 5000)'
parser.add_argument
'--no-browser'
action='store_true'
help='Open de browser niet automatisch'

parser.parse_args
create_template_files

args.no_browser
url
f'http://{args.host}:{args.port}'
threading.Thread(target=open_browser, args=(url,)).start()
app.run
host=args.host
port=args.port
debug=True

main
os.path.join
PROJECT_ROOT
'templates'
os.path.join
PROJECT_ROOT
'static'

os.path



os.path


db





model['metadata']
'tags' in model['metadata']
tags
model['metadata']['tags'].split(',') if model['metadata']['tags'] else []
all_tags.update(tags)

model_count
sorted(all_tags)

request.args

request.args


'tags'
{'$contains': tag}



db.search_models
query
n_results=20
filter_metadata=filter_metadata

result['metadata']
'tags' in result['metadata']
result['metadata']['tags_list']
result['metadata']['tags'].split(',') if result['metadata']['tags'] else []

results
query
tag
len(results)

db

all_models

lambda x: x['metadata'].get('created', 0) if x['metadata'] else 0
True

all_models
len(all_models)

db


m
 for m in all_models if m['id'] == model_id

flash
f'Model met ID {model_id} niet gevonden'
redirect
url_for('list_models')

model

db


m
 for m in all_models if m['id'] == model_id

flash
f'Model met ID {model_id} niet gevonden'
redirect
url_for('list_models')
model['metadata']

os.path.exists
filepath
flash
f'Bestand niet gevonden: {filepath}'
redirect
url_for('view_model', model_id=model_id)
subprocess.Popen
[BLENDER_EXECUTABLE, filepath]
flash
f'Model geopend in Blender: {os.path.basename(filepath)}'

flash(f'Fout bij openen in Blender: {e}')

url_for
'view_model'
model_id=model_id

db




request.args

request.args


'tags'
{'$contains': tag}



db.search_models
query
n_results=20
filter_metadata=filter_metadata



os.path









template_files


os.path.join
templates_path
filename

os.path.exists(file_path)
open(file_path, 'w', encoding='utf-8') as f
f.write(content)
print(f'Template aangemaakt: {filename}')
datetime.datetime.fromtimestamp(timestamp)




size

1024
unit_index

len(units) - 1


size
f'.1f'
units[unit_index]

time

webbrowser


argparse

'Blender Models Web Interface'
parser

str
'127.0.0.1'
'Host om de server op te draaien (standaard: 127.0.0.1)'
parser

int
5000
'Poort om de server op te draaien (standaard: 5000)'
parser

'store_true'
'Open de browser niet automatisch'
parser


args


'http://'
{args.host}
':'
{args.port}
threading.Thread(target=open_browser, args=(url,)).start
app

args.host
args.port
True

os.path


os.path


os

os


model
'metadata'

'tags'

model['metadata']

model['metadata']['tags']
model['metadata']['tags'].split(',')
[]
all_tags.update
tags

sorted
all_tags
request

request

'$contains'
tag
db


20
filter_metadata
result
'metadata'

'tags'

result['metadata']
result['metadata']
'tags_list'

result['metadata']['tags']
result['metadata']['tags'].split(',')
[]



len
results


x
x['metadata'].get('created', 0) if x['metadata'] else 0

len
all_models


m
all_models
m['id'] == model_id

'Model met ID '
{model_id}
' niet gevonden'

url_for
'list_models'



m
all_models
m['id'] == model_id

'Model met ID '
{model_id}
' niet gevonden'

url_for
'list_models'
model
'metadata'

os.path



'Bestand niet gevonden: '
{filepath}

url_for
'view_model'
model_id=model_id
subprocess

BLENDER_EXECUTABLE
filepath


'Model geopend in Blender: '
{os.path.basename(filepath)}
flash
f'Fout bij openen in Blender: {e}'

model_id

request

request

'$contains'
tag
db


20
filter_metadata
os


os.path



os.path.exists
file_path
open(file_path, 'w', encoding='utf-8')
f
f.write(content)
print
f'Template aangemaakt: {filename}'
datetime.datetime.fromtimestamp
timestamp


len(units)

1

'.1f'
units
unit_index











args.host
args.port
threading.Thread(target=open_browser, args=(url,))


args

args

os

os




model
'metadata'

model['metadata']
'tags'

model['metadata']['tags'].split
','

all_tags










result
'metadata'

result
'metadata'

result['metadata']
'tags'

result['metadata']['tags'].split
','



x
x['metadata']
x['metadata'].get('created', 0)
0




m['id']

model_id
model_id



m['id']

model_id
model_id


os

filepath

model_id



os.path.basename(filepath)

'Fout bij openen in Blender: '
{e}







os

os.path


open
file_path
'w'
encoding='utf-8'

f.write
content

'Template aangemaakt: '
{filename}
datetime.datetime


len
units


args

args

threading.Thread
target=open_browser
args=(url,)





model
'metadata'

model['metadata']['tags']




result
'metadata'

result['metadata']['tags']

x
'metadata'

x['metadata'].get
'created'
0
m
'id'



m
'id'






os.path.basename
filepath
e

os



'utf-8'
f


filename
datetime





threading

open_browser
(url,)

model['metadata']
'tags'


result['metadata']
'tags'


x['metadata']



os.path









url

model
'metadata'

result
'metadata'

x
'metadata'

os





