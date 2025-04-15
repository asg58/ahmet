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
    
    def get_commit_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get commit history for the specified number of days"""
        try:
            result = subprocess.run(
                ['git', 'log', f'--since="{days} days ago"', 
                 '--pretty=format:{"hash":"%h","author":"%an","date":"%ad","message":"%s"}'],
                capture_output=True,
                text=True,
                check=True,
                cwd=self.repo_path
            )
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    commits.append(json.loads(line))
            return commits
        except subprocess.CalledProcessError as e:
            print(f"Error getting commit history: {e}")
            return []
    
    def analyze_activity_patterns(self, commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in development activity"""
        patterns = {
            'daily_activity': defaultdict(int),
            'author_activity': defaultdict(int),
            'file_changes': defaultdict(int),
            'commit_times': defaultdict(int)
        }
        
        for commit in commits:
            date = datetime.strptime(commit['date'], '%a %b %d %H:%M:%S %Y %z')
            patterns['daily_activity'][date.strftime('%Y-%m-%d')] += 1
            patterns['author_activity'][commit['author']] += 1
            patterns['commit_times'][date.hour] += 1
            
            # Get files changed in this commit
            try:
                result = subprocess.run(
                    ['git', 'show', '--name-only', '--pretty=format:', commit['hash']],
                    capture_output=True,
                    text=True,
                    check=True,
                    cwd=self.repo_path
                )
                for file in result.stdout.strip().split('\n'):
                    if file:
                        patterns['file_changes'][file] += 1
            except subprocess.CalledProcessError:
                continue
        
        return patterns
    
    def generate_insights(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from activity patterns"""
        insights = {
            'most_active_day': max(patterns['daily_activity'].items(), key=lambda x: x[1]),
            'most_active_author': max(patterns['author_activity'].items(), key=lambda x: x[1]),
            'peak_commit_hour': max(patterns['commit_times'].items(), key=lambda x: x[1]),
            'most_changed_files': sorted(patterns['file_changes'].items(), 
                                       key=lambda x: x[1], reverse=True)[:5],
            'activity_summary': {
                'total_commits': sum(patterns['daily_activity'].values()),
                'unique_authors': len(patterns['author_activity']),
                'unique_files': len(patterns['file_changes'])
            }
        }
        
        return insights
    
    def generate_visualization(self, patterns: Dict[str, Any], insights: Dict[str, Any]) -> str:
        """Generate HTML visualization of trends"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Development Trends Analysis</title>
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
    <h1>Development Trends Analysis</h1>
    <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <div class="insights">
        <h2>Key Insights</h2>
        <ul>
            <li>Most active day: {insights['most_active_day'][0]} ({insights['most_active_day'][1]} commits)</li>
            <li>Most active author: {insights['most_active_author'][0]} ({insights['most_active_author'][1]} commits)</li>
            <li>Peak commit hour: {insights['peak_commit_hour'][0]}:00 ({insights['peak_commit_hour'][1]} commits)</li>
            <li>Total commits: {insights['activity_summary']['total_commits']}</li>
            <li>Unique authors: {insights['activity_summary']['unique_authors']}</li>
            <li>Unique files changed: {insights['activity_summary']['unique_files']}</li>
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
                    label: 'Commits by author',
                    data: {list(patterns['author_activity'].values())},
                    backgroundColor: 'rgb(54, 162, 235)'
                }}]
            }}
        }});
        
        // File Changes Chart
        new Chart(document.getElementById('fileChanges'), {{
            type: 'bar',
            data: {{
                labels: {[f[0] for f in insights['most_changed_files']]},
                datasets: [{{
                    label: 'Number of changes',
                    data: {[f[1] for f in insights['most_changed_files']]},
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
        # Save raw data
        with open(self.output_dir / "patterns.json", 'w') as f:
            json.dump(patterns, f, indent=2)
        
        with open(self.output_dir / "insights.json", 'w') as f:
            json.dump(insights, f, indent=2)
        
        # Save visualization
        with open(self.output_dir / "trends.html", 'w') as f:
            f.write(html)
        
        print(f"✅ Analysis results saved to {self.output_dir}/")

def main():
    """Main function"""
    try:
        analyzer = TrendAnalyzer()
        
        # Get commit history
        commits = analyzer.get_commit_history()
        if not commits:
            print("No commit history found")
            return 1
        
        # Analyze patterns
        patterns = analyzer.analyze_activity_patterns(commits)
        
        # Generate insights
        insights = analyzer.generate_insights(patterns)
        
        # Generate visualization
        html = analyzer.generate_visualization(patterns, insights)
        
        # Save results
        analyzer.save_results(patterns, insights, html)
        
        return 0
    
    except Exception as e:
        print(f"Error analyzing trends: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 