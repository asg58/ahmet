#!/usr/bin/env python
"""
Script to analyze development trends and generate insights from git history.
"""

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
import subprocess
from collections import defaultdict

class TrendAnalyzer:
    """Analyzes development trends from git history"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.output_dir = self.repo_path / "context_output" / "trends"
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
    
    def get_commit_history(self) -> List[Dict[str, Any]]:
        """Get commit history for the last 30 days"""
        try:
            # Get commits from the last 30 days
            result = subprocess.run(
                ['git', 'log', '--since="30 days ago"', 
                 '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}'],
                capture_output=True,
                text=True,
                check=True,
                cwd=self.repo_path
            )
            
            if not result.stdout.strip():
                print("No commit history found")
                return []
            
            # Parse the output
            commits = []
            for line in result.stdout.splitlines():
                try:
                    commit = json.loads(line)
                    # Convert date string to datetime
                    commit['date'] = datetime.strptime(
                        commit['date'], 
                        '%a %b %d %H:%M:%S %Y %z'
                    )
                    commits.append(commit)
                except json.JSONDecodeError as e:
                    print(f"Error parsing commit: {e}")
                    continue
            
            return commits
        
        except subprocess.CalledProcessError as e:
            print(f"Error getting commit history: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error getting commit history: {e}")
            return []
    
    def analyze_activity_patterns(self, commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze activity patterns from commit history"""
        patterns = {
            'daily_activity': defaultdict(int),
            'author_activity': defaultdict(int),
            'file_changes': defaultdict(int),
            'commit_times': defaultdict(int)
        }
        
        for commit in commits:
            # Daily activity
            date = commit['date'].strftime('%Y-%m-%d')
            patterns['daily_activity'][date] += 1
            
            # Author activity
            patterns['author_activity'][commit['author']] += 1
            
            # Get files changed in this commit
            try:
                result = subprocess.run(
                    ['git', 'show', '--name-only', '--pretty=format:', commit['hash']],
                    capture_output=True,
                    text=True,
                    check=True,
                    cwd=self.repo_path
                )
                
                for file in result.stdout.splitlines():
                    if file.strip():
                        # Check if file is in our included directories
                        file_path = Path(file)
                        rel_path = str(file_path)
                        if any(included in rel_path for included in self.included_dirs):
                            patterns['file_changes'][file] += 1
                
            except subprocess.CalledProcessError:
                continue
            
            # Commit times
            hour = commit['date'].hour
            patterns['commit_times'][hour] += 1
        
        return patterns
    
    def generate_insights(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from activity patterns"""
        insights = {}
        
        # Most active day
        if patterns['daily_activity']:
            most_active_day = max(
                patterns['daily_activity'].items(), 
                key=lambda x: x[1]
            )
            insights['most_active_day'] = {
                'date': most_active_day[0],
                'commits': most_active_day[1]
            }
        
        # Most active author
        if patterns['author_activity']:
            most_active_author = max(
                patterns['author_activity'].items(), 
                key=lambda x: x[1]
            )
            insights['most_active_author'] = {
                'author': most_active_author[0],
                'commits': most_active_author[1]
            }
        
        # Peak commit hour
        if patterns['commit_times']:
            peak_hour = max(
                patterns['commit_times'].items(), 
                key=lambda x: x[1]
            )
            insights['peak_commit_hour'] = {
                'hour': peak_hour[0],
                'commits': peak_hour[1]
            }
        
        # Most changed files
        if patterns['file_changes']:
            most_changed = sorted(
                patterns['file_changes'].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            insights['most_changed_files'] = [
                {'file': file, 'changes': count}
                for file, count in most_changed
            ]
        
        return insights
    
    def generate_visualization(self, patterns: Dict[str, Any], insights: Dict[str, Any]) -> str:
        """Generate HTML visualization of trends"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Development Trends Report</title>
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
        .insights {{
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1, h2 {{
            color: #333;
        }}
    </style>
</head>
<body>
    <h1>Development Trends Report</h1>
    <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <div class="insights">
        <h2>Key Insights</h2>
        <ul>
            <li>Most active day: {insights.get('most_active_day', {}).get('date', 'N/A')} 
                ({insights.get('most_active_day', {}).get('commits', 0)} commits)</li>
            <li>Most active author: {insights.get('most_active_author', {}).get('author', 'N/A')} 
                ({insights.get('most_active_author', {}).get('commits', 0)} commits)</li>
            <li>Peak commit hour: {insights.get('peak_commit_hour', {}).get('hour', 'N/A')}:00 
                ({insights.get('peak_commit_hour', {}).get('commits', 0)} commits)</li>
        </ul>
    </div>
    
    <div class="chart-container">
        <h2>Daily Activity</h2>
        <canvas id="dailyActivity"></canvas>
    </div>
    
    <div class="chart-container">
        <h2>Author Activity</h2>
        <canvas id="authorActivity"></canvas>
    </div>
    
    <div class="chart-container">
        <h2>Most Changed Files</h2>
        <canvas id="fileChanges"></canvas>
    </div>
    
    <script>
        // Daily Activity Chart
        new Chart(document.getElementById('dailyActivity'), {{
            type: 'line',
            data: {{
                labels: {list(patterns['daily_activity'].keys())},
                datasets: [{{
                    label: 'Commits per day',
                    data: {list(patterns['daily_activity'].values())},
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }}]
            }}
        }});
        
        // Author Activity Chart
        new Chart(document.getElementById('authorActivity'), {{
            type: 'bar',
            data: {{
                labels: {list(patterns['author_activity'].keys())},
                datasets: [{{
                    label: 'Commits per author',
                    data: {list(patterns['author_activity'].values())},
                    backgroundColor: 'rgb(54, 162, 235)'
                }}]
            }}
        }});
        
        // File Changes Chart
        new Chart(document.getElementById('fileChanges'), {{
            type: 'bar',
            data: {{
                labels: {[f['file'] for f in insights.get('most_changed_files', [])]},
                datasets: [{{
                    label: 'Number of changes',
                    data: {[f['changes'] for f in insights.get('most_changed_files', [])]},
                    backgroundColor: 'rgb(255, 99, 132)'
                }}]
            }}
        }});
    </script>
</body>
</html>
"""
        return html
    
    def save_results(self, patterns: Dict[str, Any], insights: Dict[str, Any], html: str) -> None:
        """Save analysis results"""
        try:
            # Save raw data
            with open(self.output_dir / "patterns.json", 'w') as f:
                json.dump(patterns, f, indent=2, default=str)
            
            with open(self.output_dir / "insights.json", 'w') as f:
                json.dump(insights, f, indent=2, default=str)
            
            # Save report
            with open(self.output_dir / "trends_report.html", 'w') as f:
                f.write(html)
            
            print(f"✅ Trend analysis results saved to {self.output_dir}/")
        except Exception as e:
            print(f"Error saving results: {e}")

def main():
    """Main function"""
    try:
        analyzer = TrendAnalyzer()
        
        # Get commit history
        print("Getting commit history...")
        commits = analyzer.get_commit_history()
        if not commits:
            print("No commits found in the last 30 days")
            return 1
        
        # Analyze patterns
        print("Analyzing activity patterns...")
        patterns = analyzer.analyze_activity_patterns(commits)
        
        # Generate insights
        print("Generating insights...")
        insights = analyzer.generate_insights(patterns)
        
        # Generate visualization
        print("Generating visualization...")
        html = analyzer.generate_visualization(patterns, insights)
        
        # Save results
        print("Saving results...")
        analyzer.save_results(patterns, insights, html)
        
        return 0
    
    except Exception as e:
        print(f"Error analyzing trends: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 