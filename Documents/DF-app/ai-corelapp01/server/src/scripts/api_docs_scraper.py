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
from urllib.parse import urljoin, urlparse
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Default paths
DEFAULT_OUTPUT_DIR = Path("../../data/api-docs")

# Sources
CORELDRAW_SOURCES = [
    "https://community.coreldraw.com/sdk/api",
    "https://community.coreldraw.com/sdk/w/vba-macros",
    "https://community.coreldraw.com/sdk/w/scripting",
    "https://community.coreldraw.com/talk/coreldraw_graphics_suite_x4/f/vba-and-automation/108597/vba-macro-documetation-reference-for-coreldraw-x7",
]

BLENDER_SOURCES = [
    "https://docs.blender.org/api/current/",
    "https://docs.blender.org/manual/en/latest/advanced/scripting/introduction.html",
    "https://docs.blender.org/api/current/bpy.html",
    "https://docs.blender.org/api/current/bpy.context.html",
    "https://docs.blender.org/api/current/bpy.data.html",
    "https://docs.blender.org/api/current/bpy.ops.html",
]

# GitHub repositories with examples (search URLs)
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
        self.visited_urls = set()
    
    def scrape_sources(self, sources: List[str], max_depth: int = 2):
        """Scrape documentation from multiple sources with limited depth"""
        for source in sources:
            try:
                print(f"Scraping: {source}")
                self._scrape_url(source, max_depth)
            except Exception as e:
                print(f"Error scraping {source}: {e}")
    
    def _scrape_url(self, url: str, depth: int):
        """Recursively scrape URLs up to a certain depth"""
        if depth <= 0 or url in self.visited_urls:
            return
        
        self.visited_urls.add(url)
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Process current page
            self.process_page(soup, url)
            
            # Find links to follow for further scraping
            if depth > 1:
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    full_url = urljoin(url, href)
                    
                    # Only follow links to the same domain
                    if self._is_same_domain(url, full_url) and full_url not in self.visited_urls:
                        print(f"Following link: {full_url}")
                        self._scrape_url(full_url, depth - 1)
        
        except Exception as e:
            print(f"Error scraping {url} at depth {depth}: {e}")
    
    def _is_same_domain(self, url1: str, url2: str) -> bool:
        """Check if two URLs belong to the same domain"""
        domain1 = urlparse(url1).netloc
        domain2 = urlparse(url2).netloc
        return domain1 == domain2
    
    def process_page(self, soup: BeautifulSoup, url: str):
        """Process a page to extract API documentation (to be implemented by subclasses)"""
        pass
    
    def save_documents(self):
        """Save the collected documents to files"""
        if not self.documents:
            print("No documents to save.")
            return
        
        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
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
    
    def process_page(self, soup: BeautifulSoup, url: str):
        """Process a page to extract CorelDRAW API documentation"""
        # Look for API documentation sections
        main_content = soup.find(['div', 'main', 'article'], class_=lambda c: c and ('content' in c.lower() or 'main' in c.lower()))
        if not main_content:
            main_content = soup
        
        # Extract title
        title_elem = soup.find(['h1', 'h2', 'title'])
        title = title_elem.get_text().strip() if title_elem else "Untitled Document"
        
        # Process API class documentation
        api_classes = main_content.find_all(['div', 'section'], id=lambda i: i and ('class' in i.lower() or 'object' in i.lower()))
        if api_classes:
            for api_class in api_classes:
                self._process_api_class(api_class, title, url)
        else:
            # Process the entire page as a general document if no specific classes found
            content = ""
            for elem in main_content.find_all(['p', 'pre', 'code', 'ul', 'ol']):
                if elem.name in ['pre', 'code']:
                    content += f"```\n{elem.get_text()}\n```\n\n"
                elif elem.name in ['ul', 'ol']:
                    for li in elem.find_all('li'):
                        content += f"- {li.get_text().strip()}\n"
                    content += "\n"
                else:
                    content += elem.get_text() + "\n\n"
            
            if content:
                self._add_document(title, content, url, doc_type="general")
    
    def _process_api_class(self, class_elem, page_title, url):
        """Process a CorelDRAW API class documentation section"""
        # Extract class name
        class_name_elem = class_elem.find(['h2', 'h3', 'h4'])
        class_name = class_name_elem.get_text().strip() if class_name_elem else "Unnamed Class"
        
        # Extract description
        description = ""
        desc_para = class_elem.find('p')
        if desc_para:
            description = desc_para.get_text().strip() + "\n\n"
        
        # Extract properties
        properties_section = class_elem.find(['div', 'section'], id=lambda i: i and 'prop' in str(i).lower())
        properties = ""
        if properties_section:
            properties += "## Properties\n\n"
            for prop in properties_section.find_all(['h3', 'h4', 'h5']):
                prop_name = prop.get_text().strip()
                properties += f"### {prop_name}\n"
                prop_desc = ""
                next_elem = prop.find_next(['p', 'div'])
                if next_elem:
                    prop_desc = next_elem.get_text().strip()
                properties += f"{prop_desc}\n\n"
        
        # Extract methods
        methods_section = class_elem.find(['div', 'section'], id=lambda i: i and 'method' in str(i).lower())
        methods = ""
        if methods_section:
            methods += "## Methods\n\n"
            for method in methods_section.find_all(['h3', 'h4', 'h5']):
                method_name = method.get_text().strip()
                methods += f"### {method_name}\n"
                method_desc = ""
                next_elem = method.find_next(['p', 'div'])
                if next_elem:
                    method_desc = next_elem.get_text().strip()
                methods += f"{method_desc}\n\n"
        
        # Combine content
        content = f"# {class_name}\n\n{description}{properties}{methods}"
        self._add_document(class_name, content, url, doc_type="class")
    
    def _process_table(self, table_elem) -> str:
        """Process an HTML table and convert to markdown format"""
        result = ""
        rows = table_elem.find_all('tr')
        
        # Process header row if exists
        header_row = rows[0] if rows else None
        if header_row and header_row.find('th'):
            headers = [th.get_text().strip() for th in header_row.find_all('th')]
            result += "| " + " | ".join(headers) + " |\n"
            result += "| " + " | ".join(['---'] * len(headers)) + " |\n"
            rows = rows[1:]  # Skip header row in data rows
        
        # Process data rows
        for row in rows:
            cells = [td.get_text().strip() for td in row.find_all(['td', 'th'])]
            result += "| " + " | ".join(cells) + " |\n"
        
        return result
    
    def _add_document(self, title, content, source_url, doc_type="unknown"):
        """Add a CorelDRAW document to the collection"""
        clean_content = self.clean_text(content)
        chunks = self.chunk_document(clean_content)
        
        for i, chunk in enumerate(chunks):
            self.documents.append({
                "text": chunk,
                "metadata": {
                    "title": title,
                    "source": source_url,
                    "platform": "coreldraw",
                    "type": doc_type,
                    "part": i + 1,
                    "total_parts": len(chunks)
                }
            })


class BlenderScraper(APIDocScraper):
    """Scraper for Blender Python API documentation"""
    
    def process_page(self, soup: BeautifulSoup, url: str):
        """Process a page to extract Blender API documentation"""
        # Check if this is an API reference page
        if 'api/current' in url:
            self._process_blender_api_reference(soup, url)
        else:
            # Process a general documentation page
            main_content = soup.find(['div', 'section'], class_=lambda c: c and ('document' in str(c).lower() or 'content' in str(c).lower()))
            if not main_content:
                main_content = soup
            
            # Extract title
            title_elem = soup.find(['h1', 'h2', 'title'])
            title = title_elem.get_text().strip() if title_elem else "Untitled Document"
            
            # Extract content
            content = ""
            for elem in main_content.find_all(['p', 'pre', 'code', 'ul', 'ol']):
                if elem.name in ['pre', 'code']:
                    content += f"```python\n{elem.get_text()}\n```\n\n"
                elif elem.name in ['ul', 'ol']:
                    for li in elem.find_all('li'):
                        content += f"- {li.get_text().strip()}\n"
                    content += "\n"
                else:
                    content += elem.get_text() + "\n\n"
            
            if content:
                self._add_blender_document(title, content, url, "general")
    
    def _process_blender_api_reference(self, soup, url):
        """Process a Blender API reference page"""
        # Extract module/class name
        title_elem = soup.find(['h1', 'h2', 'title'])
        title = title_elem.get_text().strip() if title_elem else "Unnamed Module"
        
        # Extract description
        description = ""
        desc_elem = soup.find('p', class_=lambda c: c and 'module-description' in str(c).lower())
        if not desc_elem:
            desc_elem = soup.find('p')
        if desc_elem:
            description = desc_elem.get_text().strip() + "\n\n"
        
        # Extract class or module contents
        content_sections = soup.find_all(['dl', 'div'], class_=lambda c: c and ('class' in str(c).lower() or 'function' in str(c).lower() or 'attribute' in str(c).lower()))
        
        if content_sections:
            for section in content_sections:
                section_title = ""
                section_type = ""
                
                # Try to determine section type and title
                if 'class' in str(section.get('class', '')).lower():
                    section_type = "class"
                    title_elem = section.find(['dt', 'h3', 'h4'])
                    if title_elem:
                        section_title = title_elem.get_text().strip()
                elif 'function' in str(section.get('class', '')).lower():
                    section_type = "function"
                    title_elem = section.find(['dt', 'h3', 'h4'])
                    if title_elem:
                        section_title = title_elem.get_text().strip()
                elif 'attribute' in str(section.get('class', '')).lower():
                    section_type = "attribute"
                    title_elem = section.find(['dt', 'h3', 'h4'])
                    if title_elem:
                        section_title = title_elem.get_text().strip()
                
                # Extract description for this item
                item_desc = ""
                desc_elem = section.find(['dd', 'p'])
                if desc_elem:
                    item_desc = desc_elem.get_text().strip()
                
                # Format content
                item_content = f"# {section_title or title}\n\n"
                if description:
                    item_content += f"{description}\n"
                if section_type:
                    item_content += f"Type: {section_type}\n\n"
                if item_desc:
                    item_content += f"{item_desc}\n\n"
                
                # Add code examples if any
                code_examples = section.find_all(['pre', 'code'])
                for code in code_examples:
                    item_content += f"```python\n{code.get_text()}\n```\n\n"
                
                # Add this item as a document
                if section_title:
                    self._add_blender_document(section_title, item_content, url, section_type)
        else:
            # If no sections found, process the whole page
            content = f"# {title}\n\n{description}\n\n"
            
            # Extract any code examples
            code_examples = soup.find_all(['pre', 'code'])
            for code in code_examples:
                content += f"```python\n{code.get_text()}\n```\n\n"
            
            self._add_blender_document(title, content, url, "module")
    
    def _add_blender_document(self, title, content, source_url, doc_type="module"):
        """Add a Blender document to the collection"""
        clean_content = self.clean_text(content)
        chunks = self.chunk_document(clean_content)
        
        for i, chunk in enumerate(chunks):
            self.documents.append({
                "text": chunk,
                "metadata": {
                    "title": title,
                    "source": source_url,
                    "platform": "blender",
                    "type": doc_type,
                    "part": i + 1,
                    "total_parts": len(chunks)
                }
            })


def main():
    parser = argparse.ArgumentParser(description='Scrape API documentation for CorelDRAW and Blender')
    parser.add_argument('--platform', choices=['coreldraw', 'blender', 'all'], default='all',
                        help='Which platform to scrape documentation for')
    parser.add_argument('--depth', type=int, default=2,
                        help='Maximum depth to crawl for documentation')
    parser.add_argument('--output', type=str, default=str(DEFAULT_OUTPUT_DIR),
                        help='Output directory (default: data/api-docs)')
    
    args = parser.parse_args()
    
    # Create output directory paths
    output_dir = Path(args.output)
    coreldraw_output = output_dir / "coreldraw"
    blender_output = output_dir / "blender"
    
    # Ensure output directories exist
    output_dir.mkdir(parents=True, exist_ok=True)
    coreldraw_output.mkdir(parents=True, exist_ok=True)
    blender_output.mkdir(parents=True, exist_ok=True)
    
    # Process CorelDRAW documentation
    if args.platform in ['coreldraw', 'all']:
        print("Processing CorelDRAW API documentation...")
        coreldraw_scraper = CorelDrawScraper(coreldraw_output)
        coreldraw_scraper.scrape_sources(CORELDRAW_SOURCES, args.depth)
        coreldraw_scraper.save_documents()
    
    # Process Blender documentation
    if args.platform in ['blender', 'all']:
        print("Processing Blender API documentation...")
        blender_scraper = BlenderScraper(blender_output)
        blender_scraper.scrape_sources(BLENDER_SOURCES, args.depth)
        blender_scraper.save_documents()
    
    print("Done!")


if __name__ == "__main__":
    main() 