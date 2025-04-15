from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
import json
import os
import subprocess
import sys

class TrendAnalyzer:
    """Analyzes development trends from git history."""

    def __init__(self, repo_path: str = '.'):
        """Initialize the trend analyzer.
        
        Args:
            repo_path: Path to the git repository to analyze
        """
        self.repo_path = Path(repo_path)
        self.output_dir = self.repo_path / 'context_output' / 'trends'
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.included_dirs = {'.', 'scripts', 'blender_agent', 'tests'}
        self.excluded_dirs = {
            '.history', '.venv', '__pycache__', 'node_modules',
            'lib', 'Lib', 'libs', 'site-packages', 'dist', 'build'
        }

    def get_commit_history(self) -> List[Dict[str, Any]]:
        """Get commit history for the last 30 days.
        
        Returns:
            List of commit dictionaries containing hash, author, date and message
        """
        try:
            result = subprocess.run(
                ['git', 'log', '--since="30 days ago"', '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}'],
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
        """Analyze activity patterns from commit history.
        
        Args:
            commits: List of commit dictionaries
            
        Returns:
            Dictionary containing activity patterns
        """
        patterns = {
            'daily_activity': defaultdict(int),
            'author_activity': defaultdict(int),
            'file_changes': defaultdict(int),
            'commit_times': defaultdict(int)
        }
        
        for commit in commits:
            date = commit['date'].strftime('%Y-%m-%d')
            patterns['daily_activity'][date] += 1
            patterns['author_activity'][commit['author']] += 1
            
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
                        file_path = Path(file)
                        rel_path = str(file_path)
                        if any(included in rel_path for included in self.included_dirs):
                            patterns['file_changes'][file] += 1
            except subprocess.CalledProcessError:
                continue
                
            hour = commit['date'].hour
            patterns['commit_times'][hour] += 1
            
        return patterns

    def generate_insights(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Generate insights from activity patterns.
        
        Args:
            patterns: Dictionary of activity patterns
            
        Returns:
            Dictionary containing insights
        """
        insights = {}
        
        if patterns['daily_activity']:
            most_active_day = max(patterns['daily_activity'].items(), key=lambda x: x[1])
            insights['most_active_day'] = {
                'date': most_active_day[0],
                'commits': most_active_day[1]
            }
            
        if patterns['author_activity']:
            most_active_author = max(patterns['author_activity'].items(), key=lambda x: x[1])
            insights['most_active_author'] = {
                'author': most_active_author[0],
                'commits': most_active_author[1]
            }
            
        if patterns['commit_times']:
            peak_hour = max(patterns['commit_times'].items(), key=lambda x: x[1])
            insights['peak_commit_hour'] = {
                'hour': peak_hour[0],
                'commits': peak_hour[1]
            }
            
        if patterns['file_changes']:
            most_changed = sorted(patterns['file_changes'].items(), key=lambda x: x[1], reverse=True)[:5]
            insights['most_changed_files'] = [
                {'file': file, 'changes': count} for file, count in most_changed
            ]
            
        return insights

    def generate_visualization(self, patterns: Dict[str, Any], insights: Dict[str, Any]) -> str:
        """Generate HTML visualization of trends.
        
        Args:
            patterns: Dictionary of activity patterns
            insights: Dictionary of insights
            
        Returns:
            HTML string containing visualization
        """
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
</html>"""
        return html

    def save_results(self, patterns: Dict[str, Any], insights: Dict[str, Any], html: str) -> None:
        """Save analysis results to files.
        
        Args:
            patterns: Dictionary of activity patterns
            insights: Dictionary of insights
            html: HTML visualization string
        """
        try:
            with open(self.output_dir / 'patterns.json', 'w') as f:
                json.dump(patterns, f, indent=2, default=str)
            with open(self.output_dir / 'insights.json', 'w') as f:
                json.dump(insights, f, indent=2, default=str)
            with open(self.output_dir / 'trends_report.html', 'w') as f:
                f.write(html)
            print(f'✅ Trend analysis results saved to {self.output_dir}/')
        except Exception as e:
            print(f'Error saving results: {e}')

def main() -> int:
    """Main function to run the trend analysis.
    
    Returns:
        Exit code (0 for success, 1 for failure)
    """
    try:
        analyzer = TrendAnalyzer()
        print('Getting commit history...')
        commits = analyzer.get_commit_history()
        if not commits:
            print('No commits found in the last 30 days')
            return 1
            
        print('Analyzing activity patterns...')
        patterns = analyzer.analyze_activity_patterns(commits)
        
        print('Generating insights...')
        insights = analyzer.generate_insights(patterns)
        
        print('Generating visualization...')
        html = analyzer.generate_visualization(patterns, insights)
        
        print('Saving results...')
        analyzer.save_results(patterns, insights, html)
        
        return 0
    except Exception as e:
        print(f'Error analyzing trends: {e}')
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
    if any((included in rel_path for included in self.included_dirs)):
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

datetime.now().strftime
'%Y-%m-%d %H:%M:%S'
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
f
'file'

f
insights.get('most_changed_files', [])
f
'changes'

f
insights.get('most_changed_files', [])





self.output_dir

'patterns.json'
json



2
str

self.output_dir

'insights.json'
json



2
str

self.output_dir

'trends_report.html'
f


self.output_dir

'Error saving results: '
{e}
e

result


json



datetime

commit
'date'

commits



print
f'Error parsing commit: {e}'
e
e




commit
'hash'

self

result

file


Path
file

str
file_path
any
(included in rel_path for included in self.included_dirs)
patterns['file_changes'][file]

1
patterns
'daily_activity'

x
x
1

patterns
'author_activity'

x
x
1

patterns
'commit_times'

x
x
1

patterns['file_changes']

x
x[1]


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


