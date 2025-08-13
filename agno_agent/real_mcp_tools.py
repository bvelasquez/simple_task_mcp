"""
Real Simple Task Tools for Agno Integration

Tools that enable the Agno agent to interact with actual Simple Task data via the MCP server.
This integrates with the actual aitistra.com API using the SimpleTaskService.
"""

import json
import subprocess
import tempfile
import os
from datetime import datetime
from typing import Dict, List, Any, Optional


def call_mcp_tool(tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Call an MCP tool and return the result.
    
    Args:
        tool_name: Name of the MCP tool to call
        params: Parameters to pass to the tool
        
    Returns:
        Tool result as dictionary
    """
    mcp_server_path = os.getenv("MCP_SERVER_PATH", "/Users/barryvelasquez/projects/simple_task_mcp/mcp_server/build")
    
    # Create a temporary script to call the MCP server
    script_content = f"""
const {{ spawn }} = require('child_process');

const serverProcess = spawn('node', ['{mcp_server_path}/index.js'], {{
    stdio: ['pipe', 'pipe', 'pipe']
}});

const request = {{
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {{
        name: '{tool_name}',
        arguments: {json.dumps(params)}
    }}
}};

serverProcess.stdin.write(JSON.stringify(request) + '\\n');
serverProcess.stdin.end();

let output = '';
serverProcess.stdout.on('data', (data) => {{
    output += data.toString();
}});

serverProcess.stderr.on('data', (data) => {{
    console.error('MCP Error:', data.toString());
}});

serverProcess.on('close', (code) => {{
    try {{
        const lines = output.split('\\n').filter(line => line.trim());
        for (const line of lines) {{
            try {{
                const parsed = JSON.parse(line);
                if (parsed.result) {{
                    console.log(JSON.stringify(parsed.result, null, 2));
                    return;
                }}
            }} catch (e) {{
                // Not JSON, continue
            }}
        }}
        console.log(JSON.stringify({{ error: 'No valid response found', raw_output: output }}, null, 2));
    }} catch (error) {{
        console.log(JSON.stringify({{ error: error.message, raw_output: output }}, null, 2));
    }}
}});
"""
    
    try:
        # Write the script to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(script_content)
            script_path = f.name
        
        # Execute the script
        result = subprocess.run(
            ['node', script_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Clean up
        os.unlink(script_path)
        
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"error": "Failed to parse MCP response", "raw_output": result.stdout}
        else:
            return {"error": f"MCP call failed: {result.stderr}", "return_code": result.returncode}
            
    except subprocess.TimeoutExpired:
        return {"error": "MCP call timed out"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


def switch_project(project_name: str) -> str:
    """Switch to a specific project in the MCP server session.
    
    Args:
        project_name: Project to switch to
        
    Returns:
        Status of project switch
    """
    try:
        result = call_mcp_tool("simpletask_switch_project", {"project_identifier": project_name})
        
        if "error" in result:
            return f"Error switching to project: {result['error']}"
        
        return f"✅ Switched to project: {project_name}"
        
    except Exception as e:
        return f"Error switching to project: {str(e)}"


def get_simple_task_overview(project_name: str = None) -> str:
    """Get an overview of tasks in the Simple Task project.
    
    Args:
        project_name: Project to analyze (optional)
        
    Returns:
        Formatted overview of tasks
    """
    try:
        # Get task summaries using the MCP server with project_name parameter
        params = {
            "limit": 100,
            "offset": 0,
            "include_full_data": False
        }
        
        if project_name:
            params["project_name"] = project_name
            
        summary_data = call_mcp_tool("simpletask_get_tasks_summary", params)
        
        if "error" in summary_data:
            return f"Error getting tasks: {summary_data['error']}"
        
        # Parse the MCP response format
        if "content" in summary_data and len(summary_data["content"]) > 0:
            content = summary_data["content"][0].get("text", "")
            try:
                # The content is JSON string, parse it
                task_data = json.loads(content)
                items = task_data.get("items", [])
                total = task_data.get("total_count", len(items))
            except json.JSONDecodeError:
                return f"Error parsing task data: {content[:200]}..."
        else:
            return "No task data received from MCP server"
        
        # Analyze status distribution
        status_counts = {}
        priority_counts = {}
        
        for task in items:
            status = task.get("status", "unknown")
            priority = task.get("priority", "unknown")
            
            status_counts[status] = status_counts.get(status, 0) + 1
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        # Format overview
        overview = [
            f"# Simple Task Overview",
            f"**Total Tasks**: {total}",
            f"**Project**: {project_name or 'Default Project'}",
            f"**Data Source**: aitistra.com API",
            "",
            "## Status Distribution:",
        ]
        
        for status, count in sorted(status_counts.items()):
            percentage = (count / len(items)) * 100 if items else 0
            overview.append(f"- **{status.replace('_', ' ').title()}**: {count} ({percentage:.1f}%)")
        
        overview.extend([
            "",
            "## Priority Distribution:",
        ])
        
        for priority, count in sorted(priority_counts.items()):
            percentage = (count / len(items)) * 100 if items else 0
            overview.append(f"- **{priority.title()}**: {count} ({percentage:.1f}%)")
        
        # Add recent high-priority tasks
        high_priority_tasks = [t for t in items if t.get("priority") == "high"][:5]
        if high_priority_tasks:
            overview.extend([
                "",
                "## Recent High Priority Tasks:",
            ])
            for task in high_priority_tasks:
                status_badge = f"[{task.get('status', 'unknown').replace('_', ' ').title()}]"
                overview.append(f"- {status_badge} **{task.get('title', 'Untitled')}**")
        
        return "\\n".join(overview)
        
    except Exception as e:
        return f"Error analyzing tasks: {str(e)}"


def get_blocked_tasks(project_name: str = None) -> str:
    """Get tasks that are currently blocked.
    
    Args:
        project_name: Project to analyze (optional)
        
    Returns:
        Formatted list of blocked tasks
    """
    try:
        # Get blocked tasks using the MCP server with project_name parameter
        params = {
            "status": "blocked",
            "limit": 50,
            "offset": 0,
            "include_full_data": True
        }
        
        if project_name:
            params["project_name"] = project_name
            
        blocked_data = call_mcp_tool("simpletask_get_tasks_by_status", params)
        
        if "error" in blocked_data:
            return f"Error getting blocked tasks: {blocked_data['error']}"
        
        # Parse the MCP response format
        if "content" in blocked_data and len(blocked_data["content"]) > 0:
            content = blocked_data["content"][0].get("text", "")
            try:
                # The content is JSON string, parse it
                task_data = json.loads(content)
                items = task_data.get("items", [])
            except json.JSONDecodeError:
                return f"Error parsing blocked tasks data: {content[:200]}..."
        else:
            return "No blocked tasks data received from MCP server"
        
        if not items:
            return "✅ No blocked tasks found!"
        
        result = [
            f"# Blocked Tasks ({len(items)} found)",
            f"**Data Source**: aitistra.com API",
            ""
        ]
        
        for i, task in enumerate(items, 1):
            title = task.get("title", "Untitled")
            priority = task.get("priority", "unknown").title()
            assigned = task.get("assigned_to") or "Unassigned"
            dependencies = task.get("depends_on", [])
            created_at = task.get("created_at", "")
            
            result.extend([
                f"## {i}. {title}",
                f"- **Priority**: {priority}",
                f"- **Assigned to**: {assigned}",
                f"- **Created**: {created_at[:10] if created_at else 'Unknown'}",
            ])
            
            if dependencies:
                result.append(f"- **Depends on**: {len(dependencies)} task(s)")
            
            description = task.get("description", "").strip()
            if description:
                # Truncate long descriptions
                if len(description) > 200:
                    description = description[:200] + "..."
                result.append(f"- **Description**: {description}")
            
            result.append("")
        
        return "\\n".join(result)
        
    except Exception as e:
        return f"Error analyzing blocked tasks: {str(e)}"


def get_high_priority_tasks(project_name: str = None) -> str:
    """Get high priority tasks that need attention.
    
    Args:
        project_name: Project to analyze (optional)
        
    Returns:
        Formatted list of high priority tasks
    """
    try:
        # Get high priority tasks using the MCP server with project_name parameter
        params = {
            "priority": "high",
            "limit": 25,
            "offset": 0,
            "include_full_data": True
        }
        
        if project_name:
            params["project_name"] = project_name
            
        high_priority_data = call_mcp_tool("simpletask_get_tasks_by_priority", params)
        
        if "error" in high_priority_data:
            return f"Error getting high priority tasks: {high_priority_data['error']}"
        
        # Parse the MCP response format
        if "content" in high_priority_data and len(high_priority_data["content"]) > 0:
            content = high_priority_data["content"][0].get("text", "")
            try:
                # The content is JSON string, parse it
                task_data = json.loads(content)
                items = task_data.get("items", [])
            except json.JSONDecodeError:
                return f"Error parsing high priority tasks data: {content[:200]}..."
        else:
            return "No high priority tasks data received from MCP server"
        
        if not items:
            return "No high priority tasks found."
        
        # Group by status
        by_status = {}
        for task in items:
            status = task.get("status", "unknown")
            if status not in by_status:
                by_status[status] = []
            by_status[status].append(task)
        
        result = [
            f"# High Priority Tasks ({len(items)} found)",
            f"**Data Source**: aitistra.com API",
            ""
        ]
        
        # Order statuses by urgency
        status_order = ["blocked", "todo", "in_progress", "review", "completed"]
        
        for status in status_order:
            if status not in by_status:
                continue
                
            tasks = by_status[status]
            result.extend([
                f"## {status.replace('_', ' ').title()} ({len(tasks)})",
                ""
            ])
            
            for task in tasks:
                title = task.get("title", "Untitled")
                assigned = task.get("assigned_to") or "Unassigned"
                created_at = task.get("created_at", "")
                task_id = task.get("id", "unknown")
                
                result.append(f"- **{title}** (ID: {task_id}, Assigned: {assigned})")
                if created_at:
                    result.append(f"  Created: {created_at[:10]}")
            
            result.append("")
        
        return "\\n".join(result)
        
    except Exception as e:
        return f"Error analyzing high priority tasks: {str(e)}"


def analyze_team_workload(project_name: str = None) -> str:
    """Analyze team workload distribution from real data.
    
    Args:
        project_name: Project to analyze (optional)
        
    Returns:
        Workload analysis report
    """
    try:
        # Switch to the project first if specified
        if project_name:
            switch_result = switch_project(project_name)
            if "Error" in switch_result:
                return f"Project switch failed: {switch_result}"
        
        # Get all tasks using the MCP server
        params = {
            "limit": 200,
            "offset": 0,
            "include_full_data": True
        }
            
        tasks_data = call_mcp_tool("simpletask_get_tasks", params)
        
        if "error" in tasks_data:
            return f"Error getting tasks: {tasks_data['error']}"
        
        items = tasks_data.get("items", [])
        
        if not items:
            return "No tasks found for workload analysis."
        
        # Analyze task assignments
        workload = {}
        unassigned_count = 0
        total_tasks = len(items)
        
        for task in items:
            assigned = task.get("assigned_to")
            if not assigned:
                unassigned_count += 1
                continue
                
            if assigned not in workload:
                workload[assigned] = {
                    "total": 0, 
                    "high": 0, 
                    "blocked": 0, 
                    "in_progress": 0,
                    "completed": 0,
                    "todo": 0
                }
            
            workload[assigned]["total"] += 1
            
            # Count by priority
            if task.get("priority") == "high":
                workload[assigned]["high"] += 1
                
            # Count by status
            status = task.get("status", "unknown")
            if status in workload[assigned]:
                workload[assigned][status] += 1
        
        result = [
            "# Team Workload Analysis",
            f"**Total Active Tasks**: {total_tasks}",
            f"**Unassigned Tasks**: {unassigned_count} ({(unassigned_count/total_tasks)*100:.1f}%)",
            f"**Data Source**: aitistra.com API",
            "",
            "## Individual Workloads:",
            ""
        ]
        
        # Sort team members by total workload (descending)
        sorted_workload = sorted(workload.items(), key=lambda x: x[1]["total"], reverse=True)
        
        for member, load in sorted_workload:
            # Extract name from email if it's an email
            display_name = member.split('@')[0].title() if '@' in member else member
            
            result.extend([
                f"### {display_name}",
                f"- **Email**: {member}",
                f"- **Total Tasks**: {load['total']}",
                f"- **High Priority**: {load['high']}",
                f"- **Blocked**: {load['blocked']}",
                f"- **In Progress**: {load['in_progress']}",
                f"- **Completed**: {load['completed']}",
                f"- **Todo**: {load['todo']}",
                ""
            ])
            
            # Add workload assessment
            if load['total'] > 10:
                result.append(f"  ⚠️  **High workload** - Consider redistributing tasks")
            elif load['blocked'] > 2:
                result.append(f"  🚧 **Multiple blockers** - Needs support unblocking tasks")
            elif load['high'] > 3:
                result.append(f"  🔥 **Many high-priority tasks** - May need prioritization help")
                
            result.append("")
        
        return "\\n".join(result)
        
    except Exception as e:
        return f"Error analyzing workload: {str(e)}"


def search_tasks(query: str, project_name: str = None) -> str:
    """Search for tasks matching a query.
    
    Args:
        query: Search terms
        project_name: Project to search in (optional)
        
    Returns:
        Formatted search results
    """
    try:
        # Switch to the project first if specified
        if project_name:
            switch_result = switch_project(project_name)
            if "Error" in switch_result:
                return f"Project switch failed: {switch_result}"
        
        # Search tasks using the MCP server
        params = {
            "query": query,
            "limit": 25,
            "offset": 0,
            "include_full_data": False
        }
            
        search_data = call_mcp_tool("simpletask_search_tasks", params)
        
        if "error" in search_data:
            return f"Error searching tasks: {search_data['error']}"
        
        items = search_data.get("items", [])
        total = search_data.get("total_count", 0)
        
        if not items:
            return f"No tasks found matching '{query}'"
        
        result = [
            f"# Search Results for '{query}'",
            f"**Found**: {total} tasks",
            f"**Showing**: {len(items)} results",
            f"**Data Source**: aitistra.com API",
            ""
        ]
        
        for i, task in enumerate(items, 1):
            title = task.get("title", "Untitled")
            status = task.get("status", "unknown").title()
            priority = task.get("priority", "unknown").title()
            assigned = task.get("assigned_to") or "Unassigned"
            task_id = task.get("id", "unknown")
            
            result.extend([
                f"## {i}. {title}",
                f"- **Status**: {status}",
                f"- **Priority**: {priority}",
                f"- **Assigned**: {assigned}",
                f"- **ID**: {task_id}",
                ""
            ])
        
        return "\\n".join(result)
        
    except Exception as e:
        return f"Error searching tasks: {str(e)}"


def get_project_info(project_name: str = None) -> str:
    """Get information about the current project.
    
    Args:
        project_name: Project to get info for (optional)
        
    Returns:
        Formatted project information
    """
    try:
        # Switch to the project first if specified
        if project_name:
            switch_result = switch_project(project_name)
            if "Error" in switch_result:
                return f"Project switch failed: {switch_result}"
        
        # Get project info using the MCP server
        project_data = call_mcp_tool("simpletask_get_project_info", {})
        
        if "error" in project_data:
            return f"Error getting project info: {project_data['error']}"
        
        # Also get list of all projects
        projects_data = call_mcp_tool("simpletask_list_projects", {})
        
        result = [
            f"# Project Information",
            f"**Data Source**: aitistra.com API",
            ""
        ]
        
        if not "error" in projects_data:
            projects = projects_data
            result.extend([
                f"## Available Projects ({len(projects)} total):",
                ""
            ])
            
            for project in projects:
                name = project.get("name", "Unknown")
                project_name_key = project.get("projectName", "unknown")
                description = project.get("description", "No description")
                is_current = project_name == project_name_key if project_name else False
                
                result.extend([
                    f"### {name} {'**[CURRENT]**' if is_current else ''}",
                    f"- **Project Key**: {project_name_key}",
                    f"- **Description**: {description}",
                    ""
                ])
        
        return "\\n".join(result)
        
    except Exception as e:
        return f"Error getting project info: {str(e)}"
