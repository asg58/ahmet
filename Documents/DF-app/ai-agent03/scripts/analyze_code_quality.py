#!/usr/bin/env python
"""
Script to analyze code quality metrics and generate reports.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import subprocess
from collections import defaultdict
import ast
import re

class CodeQualityAnalyzer:
    """Analyzes code quality metrics"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.output_dir = self.repo_path / "context_output" / "quality"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Directories to include (only our own code)
        self.included_dirs = {
            '.',  # Root directory
            'scripts',  # Script files
            'blender_agent',  # Blender agent code
            'tests'  # Test files
        }
        
        # Directories to always exclude
        self.excluded_dirs = {
            '.history', 
            '.venv', 
            '__pycache__', 
            'node_modules',
            'lib',
            'Lib',
            'libs',
            'site-packages',
            'dist',
            'build'
        }
    
    def get_python_files(self) -> List[Path]:
        """Get Python files from our own codebase, excluding external and generated code"""
        python_files = []
        
        for root, dirs, files in os.walk(self.repo_path):
            # Get relative path from repo root
            rel_path = Path(root).relative_to(self.repo_path)
            rel_path_str = str(rel_path)
            
            # Skip excluded directories
            if any(excluded in rel_path_str for excluded in self.excluded_dirs):
                continue
            
            # Only process included directories
            if rel_path_str == '.' or any(included in rel_path_str for included in self.included_dirs):
                for file in files:
                    if file.endswith('.py'):
                        file_path = Path(root) / file
                        python_files.append(file_path)
        
        return python_files
    
    def analyze_file(self, file_path: Path) -> Dict[str, Any]:
        """Analyze a single Python file"""
        metrics = {
            'lines': 0,
            'functions': 0,
            'classes': 0,
            'imports': 0,
            'comments': 0,
            'docstrings': 0,
            'complexity': 0,
            'issues': []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic metrics
            metrics['lines'] = len(content.splitlines())
            metrics['comments'] = len(re.findall(r'#.*', content))
            
            # Parse AST
            try:
                tree = ast.parse(content)
                
                # Count functions and classes
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        metrics['functions'] += 1
                        # Check for docstring
                        if ast.get_docstring(node):
                            metrics['docstrings'] += 1
                    elif isinstance(node, ast.ClassDef):
                        metrics['classes'] += 1
                        # Check for docstring
                        if ast.get_docstring(node):
                            metrics['docstrings'] += 1
                    elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                        metrics['imports'] += 1
            except Exception as e:
                print(f"Error parsing AST for {file_path}: {e}")
            
            # Run pylint
            try:
                result = subprocess.run(
                    ['pylint', '--output-format=json', str(file_path)],
                    capture_output=True,
                    text=True,
                    check=False,
                    timeout=30  # Add timeout
                )
                if result.stdout:
                    try:
                        pylint_data = json.loads(result.stdout)
                        metrics['issues'] = [
                            {
                                'type': issue['type'],
                                'message': issue['message'],
                                'line': issue['line']
                            }
                            for issue in pylint_data
                        ]
                    except json.JSONDecodeError as e:
                        print(f"Error parsing pylint output for {file_path}: {e}")
            except subprocess.TimeoutExpired:
                print(f"Pylint timed out for {file_path}")
            except subprocess.CalledProcessError as e:
                print(f"Error running pylint for {file_path}: {e}")
            except Exception as e:
                print(f"Unexpected error running pylint for {file_path}: {e}")
            
            return metrics
        
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
            return metrics
    
    def generate_report(self, metrics: Dict[str, Dict[str, Any]]) -> str:
        """Generate HTML report of code quality metrics"""
        try:
            total_functions_and_classes = sum(
                m['functions'] + m['classes'] 
                for m in metrics.values()
            )
            docstring_coverage = 0
            if total_functions_and_classes > 0:
                docstring_coverage = (
                    sum(m['docstrings'] for m in metrics.values()) / 
                    total_functions_and_classes * 100
                )
            
            html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Code Quality Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .chart-container {{
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .summary {{
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .issues {{
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .issue {{
            margin: 5px 0;
            padding: 5px;
            background-color: #fff3cd;
            border-radius: 3px;
        }}
        h1, h2 {{
            color: #333;
        }}
    </style>
</head>
<body>
    <h1>Code Quality Report</h1>
    <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <ul>
            <li>Total files analyzed: {len(metrics)}</li>
            <li>Total lines of code: {sum(m['lines'] for m in metrics.values())}</li>
            <li>Total functions: {sum(m['functions'] for m in metrics.values())}</li>
            <li>Total classes: {sum(m['classes'] for m in metrics.values())}</li>
            <li>Docstring coverage: {docstring_coverage:.1f}%</li>
        </ul>
    </div>
    
    <div class="chart-container">
        <h2>Code Distribution</h2>
        <canvas id="codeDistribution"></canvas>
    </div>
    
    <div class="issues">
        <h2>Issues by File</h2>
        {self._generate_issues_html(metrics)}
    </div>
    
    <script>
        // Code Distribution Chart
        new Chart(document.getElementById('codeDistribution'), {{
            type: 'pie',
            data: {{
                labels: ['Functions', 'Classes', 'Imports', 'Comments'],
                datasets: [{{
                    data: [
                        {sum(m['functions'] for m in metrics.values())},
                        {sum(m['classes'] for m in metrics.values())},
                        {sum(m['imports'] for m in metrics.values())},
                        {sum(m['comments'] for m in metrics.values())}
                    ],
                    backgroundColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)'
                    ]
                }}]
            }}
        }});
    </script>
</body>
</html>
"""
            return html
        except Exception as e:
            print(f"Error generating report: {e}")
            return "<html><body><h1>Error generating report</h1></body></html>"
    
    def _generate_issues_html(self, metrics: Dict[str, Dict[str, Any]]) -> str:
        """Generate HTML for issues section"""
        try:
            issues_html = []
            for file_path, file_metrics in metrics.items():
                if file_metrics['issues']:
                    issues_html.append(f'<h3>{file_path}</h3>')
                    for issue in file_metrics['issues']:
                        issues_html.append(f"""
                            <div class="issue">
                                <strong>Line {issue['line']}</strong>: {issue['message']}
                                <br><small>Type: {issue['type']}</small>
                            </div>
                        """)
            return '\n'.join(issues_html)
        except Exception as e:
            print(f"Error generating issues HTML: {e}")
            return "<p>Error generating issues section</p>"
    
    def save_results(self, metrics: Dict[str, Dict[str, Any]], html: str) -> None:
        """Save analysis results"""
        try:
            # Save raw metrics
            with open(self.output_dir / "metrics.json", 'w') as f:
                json.dump(metrics, f, indent=2)
            
            # Save report
            with open(self.output_dir / "quality_report.html", 'w') as f:
                f.write(html)
            
            print(f"✅ Analysis results saved to {self.output_dir}/")
        except Exception as e:
            print(f"Error saving results: {e}")

def main():
    """Main function"""
    try:
        analyzer = CodeQualityAnalyzer()
        
        # Get Python files
        print("Finding Python files...")
        python_files = analyzer.get_python_files()
        if not python_files:
            print("No Python files found")
            return 1
        
        print(f"Found {len(python_files)} Python files to analyze")
        
        # Analyze files
        metrics = {}
        for file_path in python_files:
            print(f"Analyzing {file_path}...")
            metrics[str(file_path)] = analyzer.analyze_file(file_path)
        
        # Generate report
        print("Generating report...")
        html = analyzer.generate_report(metrics)
        
        # Save results
        print("Saving results...")
        analyzer.save_results(metrics, html)
        
        return 0
    
    except Exception as e:
        print(f"Error analyzing code quality: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())





