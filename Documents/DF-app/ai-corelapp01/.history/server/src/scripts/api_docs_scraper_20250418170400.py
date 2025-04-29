#!/usr/bin/env python3
"""
API Documentation Scraper for CorelDRAW and Blender

This script collects API documentation from various sources and prepares 
it for loading into ChromaDB. It handles both CorelDRAW COM/VBA API and 
Blender Python API documentation.
"""

import os
import re
import json
import requests
import argparse
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Configuration
OUTPUT_DIR = Path("../../data/api-docs")
CORELDRAW_OUTPUT = OUTPUT_DIR / "coreldraw"
BLENDER_OUTPUT = OUTPUT_DIR / "blender"

# Ensure directories exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CORELDRAW_OUTPUT.mkdir(parents=True, exist_ok=True)
BLENDER_OUTPUT.mkdir(parents=True, exist_ok=True)

# Sources
CORELDRAW_SOURCES = [
    "https://community.coreldraw.com/sdk/api",
    "https://community.coreldraw.com/sdk/w/vba-macros",
    # Add more sources here
]

BLENDER_SOURCES = [
    "https://docs.blender.org/api/current/",
    "https://docs.blender.org/manual/en/latest/advanced/scripting/introduction.html",
    # Add more sources here
]

# GitHub repositories with examples
CORELDRAW_REPOS = [
    "https://github.com/search?q=coreldraw+vba",
    "https://github.com/search?q=coreldraw+automation",
]

BLENDER_REPOS = [
    "https://github.com/search?q=blender+python+script",
    "https://github.com/search?q=blender+python+addon",
]

class APIDocScraper:
    """Base class for API documentation scrapers"""
    
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.documents = []
    
    def scrape_sources(self, sources: List[str]):
        """Scrape documentation from multiple sources"""
        for source in sources:
            try:
                print(f"Scraping: {source}")
                self.scrape_source(source)
            except Exception as e:
                print(f"Error scraping {source}: {e}")
    
    def scrape_source(self, url: str):
        """Scrape documentation from a single source"""
        # To be implemented by subclasses
        pass
    
    def save_documents(self):
        """Save the collected documents to files"""
        if not self.documents:
            print("No documents to save.")
            return
        
        # Save individual documents
        for i, doc in enumerate(self.documents):
            filename = self.output_dir / f"doc_{i:04d}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False, indent=2)
        
        # Save a manifest
        manifest = {
            "count": len(self.documents),
            "platform": self.output_dir.name,
            "sources": self.documents_sources(),
            "timestamp": self._get_timestamp()
        }
        
        with open(self.output_dir / "manifest.json", 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        
        print(f"Saved {len(self.documents)} documents to {self.output_dir}")
    
    def documents_sources(self) -> List[str]:
        """Extract unique sources from documents"""
        sources = set()
        for doc in self.documents:
            if "source" in doc["metadata"]:
                sources.add(doc["metadata"]["source"])
        return list(sources)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def clean_text(self, text: str) -> str:
        """Clean up text for better processing"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters
        text = re.sub(r'[^\w\s.,;:()[\]{}"\'-]', '', text)
        return text.strip()
    
    def chunk_document(self, text: str, max_size: int = 1500) -> List[str]:
        """Split a document into chunks of appropriate size"""
        if len(text) <= max_size:
            return [text]
        
        # Try to split on paragraphs first
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            if len(current_chunk) + len(paragraph) <= max_size:
                current_chunk += paragraph + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # If a single paragraph is too large, split on sentences
                if len(paragraph) > max_size:
                    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                    current_chunk = ""
                    for sentence in sentences:
                        if len(current_chunk) + len(sentence) <= max_size:
                            current_chunk += sentence + " "
                        else:
                            if current_chunk:
                                chunks.append(current_chunk.strip())
                            # If still too large, just truncate
                            if len(sentence) > max_size:
                                for i in range(0, len(sentence), max_size):
                                    chunks.append(sentence[i:i+max_size].strip())
                            else:
                                current_chunk = sentence + " "
                else:
                    current_chunk = paragraph + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return chunks


class CorelDrawScraper(APIDocScraper):
    """Scraper for CorelDRAW API documentation"""
    
    def scrape_source(self, url: str):
        """Scrape CorelDRAW API documentation from a source"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find API documentation sections (this would need to be customized for each site)
            api_sections = soup.find_all(['div', 'section'], class_=lambda c: c and ('api' in c.lower() or 'documentation' in c.lower()))
            
            for section in api_sections:
                # Extract title
                title_elem = section.find(['h1', 'h2', 'h3', 'h4'], recursive=False)
                title = title_elem.get_text().strip() if title_elem else "Untitled Section"
                
                # Extract content
                content = ""
                for elem in section.find_all(['p', 'pre', 'code', 'table']):
                    if elem.name == 'table':
                        # Process tables specially
                        table_content = self._process_table(elem)
                        content += table_content + "\n\n"
                    else:
                        content += elem.get_text() + "\n\n"
                
                content = self.clean_text(content)
                chunks = self.chunk_document(content)
                
                for i, chunk in enumerate(chunks):
                    self.documents.append({
                        "text": chunk,
                        "metadata": {
                            "title": title,
                            "source": url,
                            "platform": "coreldraw",
                            "part": i + 1,
                            "total_parts": len(chunks)
                        }
                    })
        except Exception as e:
            print(f"Error scraping {url}: {e}")
    
    def _process_table(self, table_elem) -> str:
        """Process a table element into text format"""
        result = ""
        rows = table_elem.find_all('tr')
        
        # Extract headers
        headers = []
        header_row = table_elem.find('thead')
        if header_row:
            headers = [th.get_text().strip() for th in header_row.find_all(['th', 'td'])]
        
        # If no headers found in thead, try the first row
        if not headers and rows:
            headers = [th.get_text().strip() for th in rows[0].find_all(['th', 'td'])]
            rows = rows[1:]  # Skip header row
        
        # Format as text
        for row in rows:
            cells = [td.get_text().strip() for td in row.find_all(['td', 'th'])]
            if headers and len(cells) == len(headers):
                # Format as key-value pairs if headers exist
                for header, cell in zip(headers, cells):
                    result += f"{header}: {cell}\n"
                result += "\n"
            else:
                # Otherwise just join cells
                result += " | ".join(cells) + "\n"
        
        return result.strip()
    
    def _add_simulated_api_docs(self):
        """Add simulated API documentation for testing purposes"""
        # This is useful during development when we don't want to hit external sites
        
        # Sample object model documentation
        object_model = [
            {
                "name": "Application",
                "description": "The CorelDRAW application object.",
                "methods": [
                    {"name": "Quit", "description": "Quits the application."},
                    {"name": "CreateDocument", "description": "Creates a new document."}
                ],
                "properties": [
                    {"name": "ActiveDocument", "description": "Returns the active document."},
                    {"name": "Documents", "description": "Returns the collection of open documents."}
                ]
            },
            {
                "name": "Document",
                "description": "Represents a CorelDRAW document.",
                "methods": [
                    {"name": "Save", "description": "Saves the document."},
                    {"name": "Export", "description": "Exports the document to a different format."}
                ],
                "properties": [
                    {"name": "ActivePage", "description": "Returns the active page."},
                    {"name": "Pages", "description": "Returns the collection of pages."}
                ]
            },
            {
                "name": "Shape",
                "description": "Represents a shape in a CorelDRAW document.",
                "methods": [
                    {"name": "Delete", "description": "Deletes the shape."},
                    {"name": "Duplicate", "description": "Creates a duplicate of the shape."}
                ],
                "properties": [
                    {"name": "Fill", "description": "Returns the fill properties of the shape."},
                    {"name": "Outline", "description": "Returns the outline properties of the shape."}
                ]
            }
        ]
        
        for obj in object_model:
            # Create a document for the object
            content = f"# {obj['name']}\n\n{obj['description']}\n\n"
            
            # Add properties section
            if obj.get('properties'):
                content += "## Properties\n\n"
                for prop in obj['properties']:
                    content += f"### {prop['name']}\n{prop['description']}\n\n"
            
            # Add methods section
            if obj.get('methods'):
                content += "## Methods\n\n"
                for method in obj['methods']:
                    content += f"### {method['name']}\n{method['description']}\n\n"
            
            self.documents.append({
                "text": content,
                "metadata": {
                    "title": obj['name'],
                    "source": "simulated",
                    "platform": "coreldraw",
                    "type": "class",
                    "part": 1,
                    "total_parts": 1
                }
            })


class BlenderScraper(APIDocScraper):
    """Scraper for Blender API documentation"""
    
    def scrape_source(self, url: str):
        """Scrape Blender API documentation from a source"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find API documentation sections (this would need to be customized for the Blender docs site)
            if "docs.blender.org/api" in url:
                # Process API reference specifically
                self._process_blender_api_reference(soup, url)
            else:
                # General documentation pages
                content_section = soup.find('div', class_='document')
                if not content_section:
                    content_section = soup.find('div', class_='content')
                
                if content_section:
                    # Process sections by headers
                    current_section = None
                    current_content = ""
                    current_title = "Main Content"
                    
                    for elem in content_section.children:
                        if elem.name in ['h1', 'h2', 'h3', 'h4']:
                            # Save previous section if it exists
                            if current_content:
                                self._add_blender_document(current_title, current_content, url)
                                current_content = ""
                            
                            current_title = elem.get_text().strip()
                        elif elem.name in ['p', 'pre', 'code', 'ul', 'ol', 'table']:
                            content = ""
                            if elem.name in ['ul', 'ol']:
                                # Process lists
                                for li in elem.find_all('li'):
                                    content += f"- {li.get_text().strip()}\n"
                            elif elem.name == 'table':
                                # Process tables
                                content = self._process_table(elem)
                            else:
                                content = elem.get_text().strip()
                            
                            current_content += content + "\n\n"
                    
                    # Add the last section
                    if current_content:
                        self._add_blender_document(current_title, current_content, url)
        except Exception as e:
            print(f"Error scraping {url}: {e}")
    
    def _process_blender_api_reference(self, soup, url):
        """Process Blender API reference documentation"""
        # Find module or class description
        desc_section = soup.find('div', class_='section', id=lambda x: x and ('module-' in x or 'class-' in x))
        
        if desc_section:
            # Get title 
            title_elem = desc_section.find(['h1', 'h2', 'h3'])
            title = title_elem.get_text().strip() if title_elem else "Untitled API"
            
            # Get description
            desc_elem = desc_section.find('p')
            description = desc_elem.get_text().strip() if desc_elem else ""
            
            content = f"{title}\n\n{description}\n\n"
            
            # Find class or function sections
            for section in soup.find_all('dl', class_=['function', 'class', 'method', 'attribute']):
                section_title = section.find('dt')
                if section_title:
                    section_name = section_title.get_text().strip()
                    section_desc = section.find('dd')
                    section_content = section_desc.get_text().strip() if section_desc else ""
                    
                    content += f"## {section_name}\n\n{section_content}\n\n"
            
            self._add_blender_document(title, content, url)
    
    def _add_blender_document(self, title, content, source_url):
        """Add a Blender document to the collection"""
        content = self.clean_text(content)
        chunks = self.chunk_document(content)
        
        for i, chunk in enumerate(chunks):
            self.documents.append({
                "text": chunk,
                "metadata": {
                    "title": title,
                    "source": source_url,
                    "platform": "blender",
                    "part": i + 1,
                    "total_parts": len(chunks)
                }
            })
    
    def _add_simulated_api_docs(self):
        """Add simulated Blender API documentation for testing purposes"""
        # Blender modules
        modules = [
            {
                "name": "bpy",
                "description": "The main Blender Python API module.",
                "submodules": [
                    {"name": "context", "description": "Context access (current scene, view3d, etc)."},
                    {"name": "data", "description": "Access to Blender's internal data."},
                    {"name": "ops", "description": "Python access to operators."}
                ]
            },
            {
                "name": "bpy.context",
                "description": "The context object provides access to the current scene's data.",
                "properties": [
                    {"name": "active_object", "description": "The currently active object."},
                    {"name": "selected_objects", "description": "A collection of all the selected objects."}
                ]
            },
            {
                "name": "bpy.ops.mesh",
                "description": "Mesh operators for creating and modifying meshes.",
                "functions": [
                    {"name": "primitive_cube_add", "description": "Add a cube mesh object."},
                    {"name": "primitive_cylinder_add", "description": "Add a cylinder mesh object."}
                ]
            }
        ]
        
        for module in modules:
            # Create a document for the module
            content = f"# {module['name']}\n\n{module['description']}\n\n"
            
            # Add submodules section if any
            if module.get('submodules'):
                content += "## Submodules\n\n"
                for submodule in module['submodules']:
                    content += f"### {submodule['name']}\n{submodule['description']}\n\n"
            
            # Add properties section if any
            if module.get('properties'):
                content += "## Properties\n\n"
                for prop in module['properties']:
                    content += f"### {prop['name']}\n{prop['description']}\n\n"
            
            # Add functions section if any
            if module.get('functions'):
                content += "## Functions\n\n"
                for func in module['functions']:
                    content += f"### {func['name']}\n{func['description']}\n\n"
            
            self.documents.append({
                "text": content,
                "metadata": {
                    "title": module['name'],
                    "source": "simulated",
                    "platform": "blender",
                    "type": "module",
                    "part": 1,
                    "total_parts": 1
                }
            })


def main():
    parser = argparse.ArgumentParser(description='Scrape API documentation for CorelDRAW and Blender')
    parser.add_argument('--platform', choices=['coreldraw', 'blender', 'all'], default='all',
                      help='Which platform to scrape documentation for')
    parser.add_argument('--simulate', action='store_true',
                      help='Generate simulated documentation instead of scraping')
    parser.add_argument('--output', type=str, default=None,
                      help='Output directory (default: data/api-docs)')
    
    args = parser.parse_args()
    
    if args.output:
        global OUTPUT_DIR, CORELDRAW_OUTPUT, BLENDER_OUTPUT
        OUTPUT_DIR = Path(args.output)
        CORELDRAW_OUTPUT = OUTPUT_DIR / "coreldraw"
        BLENDER_OUTPUT = OUTPUT_DIR / "blender"
        
        # Ensure directories exist
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        CORELDRAW_OUTPUT.mkdir(parents=True, exist_ok=True)
        BLENDER_OUTPUT.mkdir(parents=True, exist_ok=True)
    
    if args.platform in ['coreldraw', 'all']:
        print("Processing CorelDRAW API documentation...")
        coreldraw_scraper = CorelDrawScraper(CORELDRAW_OUTPUT)
        
        if args.simulate:
            coreldraw_scraper._add_simulated_api_docs()
        else:
            coreldraw_scraper.scrape_sources(CORELDRAW_SOURCES)
        
        coreldraw_scraper.save_documents()
    
    if args.platform in ['blender', 'all']:
        print("Processing Blender API documentation...")
        blender_scraper = BlenderScraper(BLENDER_OUTPUT)
        
        if args.simulate:
            blender_scraper._add_simulated_api_docs()
        else:
            blender_scraper.scrape_sources(BLENDER_SOURCES)
        
        blender_scraper.save_documents()
    
    print("Done!")


if __name__ == "__main__":
    main() 