#!/usr/bin/env python3
"""
Real Simple Task Agno Agent with Live MCP Integration

An intelligent agent that connects to the actual Simple Task MCP server to analyze 
real tasks from aitistra.com, reason about priorities, and provide actionable recommendations.
"""

import os
from datetime import datetime
from textwrap import dedent
from typing import Dict, List, Any, Optional
from pathlib import Path

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from real_mcp_tools import (
    get_simple_task_overview, 
    get_blocked_tasks, 
    get_high_priority_tasks, 
    analyze_team_workload,
    search_tasks,
    get_project_info,
    switch_project
)

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Look for .env file in the same directory as this script
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
except ImportError:
    print("⚠️  python-dotenv not installed, using system environment variables")
except Exception as e:
    print(f"⚠️  Could not load .env file: {e}")


class RealSimpleTaskAgent:
    """Real Agno agent with live MCP integration for Simple Task management."""
    
    def __init__(self, model_id: str = "gpt-4o", debug: bool = False, project_name: str = None):
        """Initialize the real Simple Task agent.
        
        Args:
            model_id: OpenAI model to use
            debug: Enable debug mode for detailed logging
            project_name: Specific project to analyze (None for default)
        """
        self.project_name = project_name
        
        # Create project-specific tool functions
        def get_simple_task_overview_for_project() -> str:
            return get_simple_task_overview(project_name)
            
        def get_blocked_tasks_for_project() -> str:
            return get_blocked_tasks(project_name)
            
        def get_high_priority_tasks_for_project() -> str:
            return get_high_priority_tasks(project_name)
            
        def analyze_team_workload_for_project() -> str:
            return analyze_team_workload(project_name)
            
        def search_tasks_for_project(query: str) -> str:
            return search_tasks(query, project_name)
            
        def get_project_info_for_project() -> str:
            return get_project_info(project_name)
        
        self.agent = Agent(
            model=OpenAIChat(id=model_id),
            tools=[
                get_simple_task_overview_for_project,
                get_blocked_tasks_for_project, 
                get_high_priority_tasks_for_project,
                analyze_team_workload_for_project,
                search_tasks_for_project,
                get_project_info_for_project
            ],
            description=dedent("""\
                You are TaskMaster AI Live, an advanced project management assistant with direct access 
                to live Simple Task data from aitistra.com. You analyze real-time project data to identify 
                patterns, bottlenecks, and provide strategic recommendations based on actual team workloads.
                
                Your live data capabilities include:
                - Real-time access to task statuses, priorities, and assignments
                - Live team workload analysis and capacity assessment  
                - Current blocker identification with actual impact analysis
                - Strategic prioritization based on real project constraints
                - Risk assessment using actual project data patterns
                - Resource optimization recommendations from live metrics
                
                Your analytical approach with live data:
                - Always start by gathering current live data using available tools
                - Identify actual patterns and trends from real task distributions
                - Focus on genuine blockers that are currently impacting project flow
                - Provide data-driven recommendations based on real team capacity
                - Account for actual deadlines and dependencies from live project data
                - Recommend specific actions that team members can take immediately\
            """),
            instructions=dedent("""\
                Follow this systematic approach for live task analysis:
                
                1. **Live Data Gathering**: Use available tools to collect real-time task information
                   - Get current task overview to understand actual project status
                   - Identify real blocked tasks that need immediate attention  
                   - Analyze actual high-priority tasks and their current progress
                   - Assess real team workload distribution and capacity constraints
                
                2. **Real Pattern Analysis**: Look for genuine insights in the live data
                   - Identify actual bottlenecks currently blocking project progress
                   - Analyze real workload distribution and team capacity issues
                   - Assess actual priority alignment with current business needs
                   - Examine real dependencies that create current risks or delays
                
                3. **Current Situation Assessment**: Evaluate immediate tactical needs
                   - Prioritize actual tasks that can be completed now
                   - Identify real resource allocation inefficiencies  
                   - Assess genuine risk factors from current project state
                   - Evaluate actual project health indicators and trends
                
                4. **Actionable Live Recommendations**: Provide specific, immediate actions
                   - Clear next steps based on current task states
                   - Real timeline expectations from actual project data
                   - Specific resource requirements based on current team capacity
                   - Immediate follow-up actions team members can take today
                
                Always ground your analysis in the actual live data from the tools, and provide specific 
                task IDs, team member names, and current statuses when making recommendations.\
            """),
            expected_output=dedent("""\
                # TaskMaster AI Live Analysis
                
                ## Current Project Status
                {Data-driven assessment of actual task states and team capacity}
                
                ## Live Insights
                ### 🚨 Immediate Blockers (Action Required Now)
                {Current blocked tasks with specific task IDs and team members}
                
                ### 📊 Real Performance Patterns  
                {Actual trends identified from live project data}
                
                ### ⚖️ Current Team Capacity
                {Live workload analysis showing actual team utilization}
                
                ## Priority Actions Based on Live Data
                
                ### 🔥 Critical Actions (Next 24 Hours)
                1. **[Task ID]**: {Specific action} - {Team member} should {specific step}
                2. **[Task ID]**: {Specific action} - {Team member} should {specific step}
                
                ### 🎯 This Week's Focus 
                1. **{Specific initiative}** - Based on {actual data point from analysis}
                2. **{Specific initiative}** - Based on {actual data point from analysis}
                
                ### 🚀 Strategic Priorities (Next Sprint)
                1. **{Initiative}** - {Reasoning from actual project patterns}
                2. **{Initiative}** - {Reasoning from actual project patterns}
                
                ## Live Risk Assessment
                ### ⚠️ Current Risk Factors
                - **{Specific risk from data}**: {Current impact and likelihood}
                
                ### 🛡️ Immediate Mitigation Actions
                - **{Action}**: {Who should do what by when}
                
                ## Success Tracking
                - {Specific measurable outcome from current data}
                - {Specific measurable outcome from current data}
                
                ## Next Review Checkpoint
                **Recommended follow-up**: {Specific timeline and focus areas}
                
                ---
                Analysis by TaskMaster AI Live • {current_datetime}
                Data Source: Live aitistra.com API via MCP Server\
            """),
            markdown=True,
            show_tool_calls=debug,
            add_datetime_to_instructions=True,
            debug_mode=debug,
        )
    
    def analyze_live_project_health(self, project_name: str = None) -> str:
        """Perform comprehensive analysis of live project health.
        
        Args:
            project_name: Specific project to analyze
            
        Returns:
            Detailed project health assessment based on live data
        """
        prompt = "Analyze the current live project health by examining real task distribution, actual blocked items, current high-priority work, and live team workloads. Provide specific recommendations with task IDs and team member names for improving project flow and addressing real bottlenecks."
        
        if project_name:
            prompt += f" Focus specifically on the '{project_name}' project."
        
        return self.agent.run(prompt).content
    
    def daily_standup_briefing_live(self, project_name: str = None) -> str:
        """Generate a daily standup briefing with actual current priorities.
        
        Args:
            project_name: Specific project to focus on
            
        Returns:
            Daily briefing with real priorities and blockers
        """
        prompt = "Create a daily standup briefing using live data that highlights the actual most important tasks to focus on today, current blockers that need resolution, and real priorities for the team. Include specific task IDs and current assignees."
        
        if project_name:
            prompt += f" Focus on the '{project_name}' project."
            
        return self.agent.run(prompt).content
    
    def identify_live_optimization_opportunities(self, project_name: str = None) -> str:
        """Identify opportunities for optimization based on live data.
        
        Args:
            project_name: Specific project to analyze
            
        Returns:
            Analysis of optimization opportunities from real data
        """
        prompt = "Analyze the current live task workflow and identify specific opportunities for optimization based on actual data patterns. Look for real bottlenecks, workload imbalances, and process improvements that can be implemented immediately."
        
        if project_name:
            prompt += f" Focus on the '{project_name}' project."
            
        return self.agent.run(prompt).content
    
    def live_risk_assessment(self, project_name: str = None) -> str:
        """Perform risk assessment based on actual current task status.
        
        Args:
            project_name: Specific project to assess
            
        Returns:
            Risk assessment with mitigation strategies based on live data
        """
        prompt = "Perform a comprehensive risk assessment based on actual current task statuses, real priorities, and live blockers. Identify specific project risks from the actual data and suggest concrete mitigation strategies with responsible team members."
        
        if project_name:
            prompt += f" Focus on risks specific to the '{project_name}' project."
            
        return self.agent.run(prompt).content
    
    def search_and_prioritize(self, search_terms: str, project_name: str = None) -> str:
        """Search for tasks and provide prioritization recommendations.
        
        Args:
            search_terms: Terms to search for
            project_name: Specific project to search in
            
        Returns:
            Search results with prioritization guidance
        """
        prompt = f"Search for tasks related to '{search_terms}' and analyze the results to provide prioritization recommendations based on current status, priorities, and team capacity."
        
        if project_name:
            prompt += f" Focus the search on the '{project_name}' project."
            
        return self.agent.run(prompt).content
    
    def print_analysis(self, prompt: str) -> None:
        """Print analysis results with streaming output."""
        self.agent.print_response(prompt, stream=True)


def get_available_projects():
    """Get list of available projects from projects.json"""
    import json
    
    projects_file = "/Users/barryvelasquez/projects/simple_task_mcp/mcp_server/projects.json"
    try:
        with open(projects_file, 'r') as f:
            projects = json.load(f)
        return projects
    except Exception as e:
        print(f"❌ Error reading projects.json: {e}")
        return []


def select_project():
    """Interactive project selection"""
    projects = get_available_projects()
    
    if not projects:
        print("❌ No projects found in projects.json")
        return None
    
    print("🎯 Available Projects:")
    print("=" * 50)
    
    for i, project in enumerate(projects, 1):
        name = project.get("name", "Unknown")
        project_name = project.get("projectName", "unknown")
        description = project.get("description", "No description")
        print(f"{i}. {name}")
        print(f"   Key: {project_name}")
        print(f"   Description: {description}")
        print()
    
    while True:
        try:
            choice = input(f"Select project (1-{len(projects)}) or 'all' for default: ").strip().lower()
            
            if choice == 'all' or choice == '':
                return None  # Use default project
            
            choice_num = int(choice)
            if 1 <= choice_num <= len(projects):
                selected_project = projects[choice_num - 1]
                project_name = selected_project.get("projectName")
                print(f"✅ Selected: {selected_project.get('name')} ({project_name})")
                return project_name
            else:
                print(f"Please enter a number between 1 and {len(projects)}")
        except ValueError:
            print("Please enter a valid number or 'all'")
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            return None


def main():
    """Example usage of the Real Simple Task Agent with live data."""
    print("🤖 TaskMaster AI Live - Real Simple Task Analysis Agent")
    print("=" * 70)
    
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  OpenAI API Key Not Found!")
        print("=" * 50)
        print("To avoid setting the API key every time, you can:")
        print()
        print("1. Create a .env file (RECOMMENDED):")
        print("   cp .env.example .env")
        print("   # Then edit .env and add your API key")
        print()
        print("2. Add to your shell profile (.zshrc or .bash_profile):")
        print("   echo 'export OPENAI_API_KEY=\"your-key-here\"' >> ~/.zshrc")
        print("   source ~/.zshrc")
        print()
        print("3. Set for this session only:")
        print("   export OPENAI_API_KEY=\"your-key-here\"")
        print()
        api_key = input("Or enter your API key now: ").strip()
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
            print("✅ API key set for this session!")
        else:
            print("❌ No API key provided. Exiting.")
            return
    
    # Check if MCP server path is accessible
    mcp_path = os.getenv("MCP_SERVER_PATH", "/Users/barryvelasquez/projects/simple_task_mcp/mcp_server/build")
    if not os.path.exists(mcp_path):
        print(f"⚠️  Warning: MCP server not found at {mcp_path}")
        print("Please ensure the Simple Task MCP server is built and accessible.")
        print("Run: cd ../mcp_server && npm run build")
        return
    
    # Let user select project
    selected_project = select_project()
    if selected_project is False:  # User cancelled
        return
    
    # Initialize the agent
    agent = RealSimpleTaskAgent(debug=False, project_name=selected_project)
    
    project_display = selected_project if selected_project else "All Projects (Default)"
    print(f"\\n🔍 Starting live analysis for: {project_display}")
    print(f"📡 Data source: aitistra.com API via MCP server\\n")
    
    try:
        # Comprehensive live project health analysis
        print("📊 LIVE PROJECT HEALTH ANALYSIS")
        print("-" * 50)
        prompt = "Perform a comprehensive live project health analysis using real data"
        if selected_project:
            prompt += f" focusing specifically on the '{selected_project}' project"
        agent.print_analysis(prompt)
        
        print("\\n" + "=" * 70 + "\\n")
        
        # Daily standup briefing with real data
        print("☀️ DAILY STANDUP BRIEFING (LIVE DATA)") 
        print("-" * 50)
        prompt = "Generate a daily standup briefing with current priorities using live task data"
        if selected_project:
            prompt += f" for the '{selected_project}' project"
        agent.print_analysis(prompt)
        
        print("\\n" + "=" * 70 + "\\n")
        
        # Risk assessment based on actual data
        print("⚠️ LIVE RISK ASSESSMENT")
        print("-" * 50)
        prompt = "Perform a risk assessment using actual current project data and suggest specific mitigation strategies"
        if selected_project:
            prompt += f" focusing on the '{selected_project}' project"
        agent.print_analysis(prompt)
        
    except Exception as e:
        print(f"❌ Error during live analysis: {str(e)}")
        print("Please ensure:")
        print("1. Simple Task MCP server is running")
        print("2. projects.json is properly configured") 
        print("3. API keys are valid and accessible")


if __name__ == "__main__":
    main()
