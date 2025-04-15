#!/usr/bin/env python
"""
Script to analyze code quality metrics and generate reports.
"""

import os
import sys
import json
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
    
    def get_python_files(self) -> List[Path]:
        """Get all Python files in the repository"""
        python_files = []
        for root, _, files in os.walk(self.repo_path):
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
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
            
            # Run pylint
            try:
                result = subprocess.run(
                    ['pylint', '--output-format=json', str(file_path)],
                    capture_output=True,
                    text=True,
                    check=False
                )
                if result.stdout:
                    pylint_data = json.loads(result.stdout)
                    metrics['issues'] = [
                        {
                            'type': issue['type'],
                            'message': issue['message'],
                            'line': issue['line']
                        }
                        for issue in pylint_data
                    ]
            except subprocess.CalledProcessError:
                pass
            
            return metrics
        
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
            return metrics
    
    def generate_report(self, metrics: Dict[str, Dict[str, Any]]) -> str:
        """Generate HTML report of code quality metrics"""
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
            <li>Docstring coverage: {sum(m['docstrings'] for m in metrics.values()) / 
                                   sum(m['functions'] + m['classes'] for m in metrics.values()) * 100:.1f}%</li>
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
    
    def _generate_issues_html(self, metrics: Dict[str, Dict[str, Any]]) -> str:
        """Generate HTML for issues section"""
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
    
    def save_results(self, metrics: Dict[str, Dict[str, Any]], html: str) -> None:
        """Save analysis results"""
        # Save raw metrics
        with open(self.output_dir / "metrics.json", 'w') as f:
            json.dump(metrics, f, indent=2)
        
        # Save report
        with open(self.output_dir / "quality_report.html", 'w') as f:
            f.write(html)
        
        print(f"✅ Quality analysis results saved to {self.output_dir}/")

def main():
    """Main function"""
    try:
        analyzer = CodeQualityAnalyzer()
        
        # Get Python files
        python_files = analyzer.get_python_files()
        if not python_files:
            print("No Python files found")
            return 1
        
        # Analyze files
        metrics = {}
        for file_path in python_files:
            metrics[str(file_path)] = analyzer.analyze_file(file_path)
        
        # Generate report
        html = analyzer.generate_report(metrics)
        
        # Save results
        analyzer.save_results(metrics, html)
        
        return 0
    
    except Exception as e:
        print(f"Error analyzing code quality: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 