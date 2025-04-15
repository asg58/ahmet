#!/usr/bin/env python
"""
Script to analyze trends in git commit history and generate insights.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import json
import os
import subprocess
import sys
from pathlib import Path

class TrendAnalyzer:
    """Analyzes git commit history to identify patterns and generate insights."""
    
    def __init__(self, repo_path: str = '.'):
        """
        Initialize the TrendAnalyzer.
        
        Args:
            repo_path: Path to the git repository
        """
        self.repo_path = Path(repo_path).resolve()
        self.output_dir = self.repo_path / 'context_output'
        self.output_dir.mkdir(exist_ok=True)
        
    def get_commit_history(self) -> List[Dict[str, Any]]:
        """
        Get commit history from the last 30 days.
        
        Returns:
            List of commit dictionaries with hash, author, date, and message
        """
        try:
            result = subprocess.run(
                ['git', 'log', '--since="30 days ago"', 
                 '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}'],
                capture_output=True,
                text=True,
                check=True,
                cwd=self.repo_path
            )
            
            if not result.stdout.strip():
                print('No commit history found')
                return []
                
            commits = []
            for line in result.stdout.splitlines():
                try:
                    commit = json.loads(line)
                    commit['date'] = datetime.strptime(commit['date'], '%a %b %d %H:%M:%S %Y %z')
                    commits.append(commit)
                except json.JSONDecodeError as e:
                    print(f'Error parsing commit: {e}')
                    continue
                    
            return commits
            
        except subprocess.CalledProcessError as e:
            print(f'Error getting commit history: {e}')
            return []
        except Exception as e:
            print(f'Unexpected error getting commit history: {e}')
            return []
            
    def analyze_activity_patterns(self, commits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze commit patterns to identify trends.
        
        Args:
            commits: List of commit dictionaries
            
        Returns:
            Dictionary containing analysis results
        """
        if not commits:
            return {}
            
        patterns = {
            'total_commits': len(commits),
            'authors': {},
            'daily_activity': {},
            'hourly_activity': {},
            'message_lengths': []
        }
        
        for commit in commits:
            # Track author activity
            author = commit['author']
            patterns['authors'][author] = patterns['authors'].get(author, 0) + 1
            
            # Track daily activity
            date = commit['date'].strftime('%Y-%m-%d')
            patterns['daily_activity'][date] = patterns['daily_activity'].get(date, 0) + 1
            
            # Track hourly activity
            hour = commit['date'].strftime('%H:00')
            patterns['hourly_activity'][hour] = patterns['hourly_activity'].get(hour, 0) + 1
            
            # Track message lengths
            patterns['message_lengths'].append(len(commit['message']))
            
        return patterns
        
    def generate_insights(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate insights from activity patterns.
        
        Args:
            patterns: Dictionary of activity patterns
            
        Returns:
            Dictionary containing insights
        """
        if not patterns:
            return {}
            
        insights = {
            'top_contributors': [],
            'busiest_days': [],
            'busiest_hours': [],
            'avg_message_length': 0,
            'commit_frequency': ''
        }
        
        # Analyze top contributors
        authors = patterns['authors']
        if authors:
            sorted_authors = sorted(authors.items(), key=lambda x: x[1], reverse=True)
            insights['top_contributors'] = [{'author': a, 'commits': c} for a, c in sorted_authors[:3]]
            
        # Analyze busiest days
        daily = patterns['daily_activity']
        if daily:
            sorted_days = sorted(daily.items(), key=lambda x: x[1], reverse=True)
            insights['busiest_days'] = [{'date': d, 'commits': c} for d, c in sorted_days[:3]]
            
        # Analyze busiest hours
        hourly = patterns['hourly_activity']
        if hourly:
            sorted_hours = sorted(hourly.items(), key=lambda x: x[1], reverse=True)
            insights['busiest_hours'] = [{'hour': h, 'commits': c} for h, c in sorted_hours[:3]]
            
        # Calculate average message length
        lengths = patterns['message_lengths']
        if lengths:
            insights['avg_message_length'] = sum(lengths) / len(lengths)
            
        # Determine commit frequency
        total_days = len(daily)
        if total_days > 0:
            avg_commits_per_day = patterns['total_commits'] / total_days
            if avg_commits_per_day > 5:
                insights['commit_frequency'] = 'Very Active'
            elif avg_commits_per_day > 2:
                insights['commit_frequency'] = 'Active'
            else:
                insights['commit_frequency'] = 'Moderate'
                
        return insights
        
    def generate_visualization(self, patterns: Dict[str, Any], insights: Dict[str, Any]) -> str:
        """
        Generate HTML visualization of trends.
        
        Args:
            patterns: Dictionary of activity patterns
            insights: Dictionary of insights
            
        Returns:
            HTML string containing visualization
        """
        if not patterns or not insights:
            return ''
            
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Commit Activity Analysis</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .container {{ max-width: 1200px; margin: 0 auto; }}
                .card {{ background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 5px; }}
                .insights {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }}
                h1, h2 {{ color: #333; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Commit Activity Analysis</h1>
                
                <div class="card">
                    <h2>Summary</h2>
                    <p>Total Commits: {patterns['total_commits']}</p>
                    <p>Commit Frequency: {insights['commit_frequency']}</p>
                    <p>Average Message Length: {insights['avg_message_length']:.1f} characters</p>
                </div>
                
                <div class="insights">
                    <div class="card">
                        <h2>Top Contributors</h2>
                        <ul>
                            {''.join(f"<li>{c['author']}: {c['commits']} commits</li>" for c in insights['top_contributors'])}
                        </ul>
                    </div>
                    
                    <div class="card">
                        <h2>Busiest Days</h2>
                        <ul>
                            {''.join(f"<li>{d['date']}: {d['commits']} commits</li>" for d in insights['busiest_days'])}
                        </ul>
                    </div>
                    
                    <div class="card">
                        <h2>Busiest Hours</h2>
                        <ul>
                            {''.join(f"<li>{h['hour']}: {h['commits']} commits</li>" for h in insights['busiest_hours'])}
                        </ul>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Daily Activity</h2>
                    <canvas id="dailyChart"></canvas>
                </div>
                
                <div class="card">
                    <h2>Hourly Activity</h2>
                    <canvas id="hourlyChart"></canvas>
                </div>
            </div>
            
            <script>
                // Daily Activity Chart
                new Chart(document.getElementById('dailyChart'), {{
                    type: 'line',
                    data: {{
                        labels: {list(patterns['daily_activity'].keys())},
                        datasets: [{{
                            label: 'Commits per Day',
                            data: {list(patterns['daily_activity'].values())},
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }}]
                    }}
                }});
                
                // Hourly Activity Chart
                new Chart(document.getElementById('hourlyChart'), {{
                    type: 'bar',
                    data: {{
                        labels: {list(patterns['hourly_activity'].keys())},
                        datasets: [{{
                            label: 'Commits per Hour',
                            data: {list(patterns['hourly_activity'].values())},
                            backgroundColor: 'rgba(75, 192, 192, 0.5)'
                        }}]
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        return html
        
    def save_results(self, patterns: Dict[str, Any], insights: Dict[str, Any], html: str) -> None:
        """
        Save analysis results to files.
        
        Args:
            patterns: Dictionary of activity patterns
            insights: Dictionary of insights
            html: HTML visualization string
        """
        # Save patterns as JSON
        with open(self.output_dir / 'patterns.json', 'w') as f:
            json.dump(patterns, f, indent=2, default=str)
            
        # Save insights as JSON
        with open(self.output_dir / 'insights.json', 'w') as f:
            json.dump(insights, f, indent=2, default=str)
            
        # Save HTML visualization
        with open(self.output_dir / 'visualization.html', 'w') as f:
            f.write(html)
            
def main() -> int:
    """Main function to run the trend analysis."""
    try:
        analyzer = TrendAnalyzer()
        commits = analyzer.get_commit_history()
        patterns = analyzer.analyze_activity_patterns(commits)
        insights = analyzer.generate_insights(patterns)
        html = analyzer.generate_visualization(patterns, insights)
        analyzer.save_results(patterns, insights, html)
        print('Analysis complete. Results saved to context_output directory.')
        return 0
    except Exception as e:
        print(f'Error running analysis: {e}')
        return 1
        
if __name__ == '__main__':
    sys.exit(main())





self.repo_path

'context_output'
self.output_dir

True
True



subprocess.run
['git', 'log', '--since="30 days ago"', '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}']
capture_output=True
text=True
check=True
cwd=self.repo_path

result.stdout.strip
print
'No commit history found'

result.stdout

commit
json.loads(line)
commit['date']
datetime.strptime(commit['date'], '%a %b %d %H:%M:%S %Y %z')
commits.append(commit)
except json.JSONDecodeError as e:
    print(f'Error parsing commit: {e}')
    continue

subprocess

print(f'Error getting commit history: {e}')
[]

print(f'Unexpected error getting commit history: {e}')
[]

str
Any

List
Dict[str, Any]

defaultdict
int
defaultdict
int
defaultdict
int
defaultdict
int
defaultdict
int

commit['date'].strftime
'%Y-%m-%d'
patterns['daily_activity']
date

patterns['author_activity']
commit['author']

result
subprocess.run(['git', 'show', '--name-only', '--pretty=format:', commit['hash']], capture_output=True, text=True, check=True, cwd=self.repo_path)
file
result.stdout.splitlines()
if file.strip():
    file_path = Path(file)
    rel_path = str(file_path)
    if any(included in rel_path for included in self.included_dirs):
        patterns['file_changes'][file] += 1
subprocess.CalledProcessError
continue

commit['date']

patterns['commit_times']
hour



Dict
(str, Any)



max
patterns['daily_activity'].items()
key=lambda x: x[1]
insights
'most_active_day'

'date'
'commits'
most_active_day[0]
most_active_day[1]


max
patterns['author_activity'].items()
key=lambda x: x[1]
insights
'most_active_author'

'author'
'commits'
most_active_author[0]
most_active_author[1]


max
patterns['commit_times'].items()
key=lambda x: x[1]
insights
'peak_commit_hour'

'hour'
'commits'
peak_hour[0]
peak_hour[1]


sorted(patterns['file_changes'].items(), key=lambda x: x[1], reverse=True)
:5

insights
'most_changed_files'

{'file': file, 'changes': count}
 for file, count in most_changed


Dict
(str, Any)

Dict
(str, Any)

datetime.now().strftime('%Y-%m-%d %H:%M:%S')
insights.get('most_active_day', {}).get
'date'
'N/A'
insights.get('most_active_day', {}).get
'commits'
0
insights.get('most_active_author', {}).get
'author'
'N/A'
insights.get('most_active_author', {}).get
'commits'
0
insights.get('peak_commit_hour', {}).get
'hour'
'N/A'
insights.get('peak_commit_hour', {}).get
'commits'
0
list
patterns['daily_activity'].keys()
list
patterns['daily_activity'].values()
list
patterns['author_activity'].keys()
list
patterns['author_activity'].values()
f['file']
 for f in insights.get('most_changed_files', [])
f['changes']
 for f in insights.get('most_changed_files', [])

str
Any


str
Any

open(self.output_dir / 'patterns.json', 'w')
f
json.dump(patterns, f, indent=2, default=str)
open(self.output_dir / 'insights.json', 'w')
f
json.dump(insights, f, indent=2, default=str)
open(self.output_dir / 'trends_report.html', 'w')
f
f.write(html)
print
f'✅ Trend analysis results saved to {self.output_dir}/'

print(f'Error saving results: {e}')


analyzer


print
'No commits found in the last 30 days'

analyzer



analyzer




analyzer




print
f'Error analyzing trends: {e}'


self

self

subprocess

'git'
'log'
'--since="30 days ago"'
'--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}'

True
True
True
self.repo_path
result.stdout.strip
print
'No commit history found'

result.stdout

commit
json.loads(line)
commit['date']
datetime.strptime(commit['date'], '%a %b %d %H:%M:%S %Y %z')
commits.append(commit)
json.JSONDecodeError
print(f'Error parsing commit: {e}')
continue

print
f'Error getting commit history: {e}'

print
f'Unexpected error getting commit history: {e}'




Dict
(str, Any)









commit['date']

patterns
'daily_activity'


patterns
'author_activity'

commit
'author'


subprocess.run
['git', 'show', '--name-only', '--pretty=format:', commit['hash']]
capture_output=True
text=True
check=True
cwd=self.repo_path

result.stdout.splitlines
file.strip()
file_path = Path(file)
rel_path = str(file_path)
if any((included in rel_path for included in self.included_dirs)):
    patterns['file_changes'][file] += 1
subprocess

commit
'date'

patterns
'commit_times'



str
Any


patterns['daily_activity'].items
lambda x: x[1]

most_active_day
0

most_active_day
1


patterns['author_activity'].items
lambda x: x[1]

most_active_author
0

most_active_author
1


patterns['commit_times'].items
lambda x: x[1]

peak_hour
0

peak_hour
1

sorted
patterns['file_changes'].items()
key=lambda x: x[1]
reverse=True
5

'file'
'changes'
file
count
(file, count)
most_changed

str
Any


str
Any

datetime.now
insights.get
'most_active_day'
{}
insights.get
'most_active_day'
{}
insights.get
'most_active_author'
{}
insights.get
'most_active_author'
{}
insights.get
'peak_commit_hour'
{}
insights.get
'peak_commit_hour'
{}
patterns['daily_activity']

patterns['daily_activity']

patterns['author_activity']

patterns['author_activity']



insights.get
'most_changed_files'
[]


insights.get
'most_changed_files'
[]
self



self



self


self


self

e







'Error parsing commit: '
{e}











included in rel_path
 for included in self.included_dirs
patterns['file_changes']
file







patterns
'file_changes'

x
x
1

datetime

insights

insights

insights

insights

insights

insights

patterns
'daily_activity'

patterns
'daily_activity'

patterns
'author_activity'

patterns
'author_activity'

insights


insights







e
included

rel_path
included
self.included_dirs
patterns
'file_changes'





















self


