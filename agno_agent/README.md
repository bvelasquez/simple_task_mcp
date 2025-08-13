# Simple Task Agno Agent

An intelligent Agno agent that integrates with the Simple Task MCP server to provide AI-powered task analysis, prioritization, and project management insights.

## Features

### 🤖 Intelligent Task Analysis

- Real-time access to Simple Task data via MCP integration
- Automated task prioritization and bottleneck identification
- Data-driven recommendations for project optimization

### 📊 Advanced Analytics

- Task distribution and status analysis
- Team workload and capacity assessment
- Risk identification and mitigation strategies
- Performance trend analysis

### 🎯 Strategic Planning

- Daily standup briefings with key priorities
- Long-term project health assessments
- Resource allocation optimization
- Process improvement recommendations

## Architecture

```
agno_agent/
├── real_agent.py           # 🤖 Main Agno agent with live aitistra.com API integration
├── real_mcp_tools.py       # 🔧 Real MCP server integration tools
├── requirements.txt        # 📦 Python dependencies
├── run_agent.sh           # 🚀 Easy runner script
├── setup_env.sh           # ⚙️  Environment setup script
├── .env.example           # 📝 Configuration template
└── README.md              # 📚 This documentation
```

**Core Files:**

- **`real_agent.py`** - Your intelligent task analysis agent
- **`real_mcp_tools.py`** - Live data integration with aitistra.com
- **`run_agent.sh`** - One-command execution

## Installation

### Prerequisites

- Python 3.8 or higher
- OpenAI API key
- Simple Task MCP server running

### Setup

1. **Clone and navigate to the agent directory:**

```bash
cd agno_agent
```

2. **Run the setup script:**

```bash
chmod +x setup.sh
./setup.sh
```

3. **Set up environment variables:**

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key-here"

# Optional: Set custom MCP server path
export MCP_SERVER_PATH="/path/to/your/mcp/server/build"
```

### Manual Installation

1. **Create virtual environment:**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Ensure MCP server is built:**

```bash
cd ../mcp_server
npm run build
cd ../agno_agent
```

## Usage

### Quick Start (Recommended)

```bash
# Navigate to agent directory
cd agno_agent

# Run the agent (handles environment automatically)
./run_agent.sh
```

### Manual Setup

If you prefer manual control:

```bash
cd agno_agent
source venv/bin/activate
export OPENAI_API_KEY="your-openai-api-key"
python real_agent.py
```

### First Time Setup

```bash
# Set up your API key configuration
./setup_env.sh

# Run the agent
./run_agent.sh
```

### Interactive Usage

```python
from real_agent import RealSimpleTaskAgent

# Initialize the agent for a specific project
agent = RealSimpleTaskAgent(debug=True, project_name="mighty45")

# Analyze project health
health_report = agent.analyze_live_project_health()
print(health_report)

# Get daily priorities
daily_brief = agent.daily_standup_briefing_live()
print(daily_brief)

# Identify optimization opportunities
optimization = agent.identify_live_optimization_opportunities()
print(optimization)

# Perform risk assessment
risks = agent.live_risk_assessment()
print(risks)
```

## Agent Capabilities

### 🔍 Analysis Functions

**Project Health Analysis**

- Comprehensive overview of task statuses and priorities
- Bottleneck identification and flow analysis
- Team workload distribution assessment

**Daily Briefing**

- Key priorities for immediate focus
- Blocker identification and resolution strategies
- Team coordination recommendations

**Risk Assessment**

- Project risk identification based on task patterns
- Dependency analysis and critical path assessment
- Mitigation strategy recommendations

**Optimization Opportunities**

- Process improvement suggestions
- Resource reallocation recommendations
- Workflow enhancement strategies

### 🛠 MCP Tools Integration

**get_simple_task_overview()**

- Provides comprehensive task distribution analysis
- Status and priority breakdowns
- Recent high-priority task highlighting

**get_blocked_tasks()**

- Identifies all blocked tasks with details
- Dependency analysis and unblocking suggestions
- Priority-based blocking impact assessment

**get_high_priority_tasks()**

- Groups high-priority tasks by status
- Assignment and workload analysis
- Urgency-based action recommendations

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `MCP_SERVER_PATH`: Path to MCP server build directory (optional)

### MCP Server Requirements

- Simple Task MCP server must be built and accessible
- Projects.json configuration file must be properly set up
- API keys and project IDs must be valid

## Example Output

```markdown
# TaskMaster AI Pro Analysis

## Current Situation Assessment

Based on analysis of 47 total tasks across the project:

- 23% tasks are in progress (11 tasks)
- 19% tasks are blocked (9 tasks) - NEEDS ATTENTION
- 34% tasks are in todo status (16 tasks)
- High priority tasks: 8 (17% of total)

## Key Findings

### 🚨 Critical Issues

- 9 blocked tasks creating significant bottlenecks
- 3 high-priority tasks blocked by dependencies
- Uneven workload distribution affecting team velocity

### 📊 Performance Insights

- 68% of blocked tasks are high or medium priority
- Average task completion rate appears below optimal
- Dependency chains creating cascade delays

## Priority Recommendations

### 🔥 Immediate Actions (Next 24-48 Hours)

1. **Unblock authentication system task** - Blocking 3 other high-priority features
2. **Resolve API integration dependencies** - Critical path item affecting 40% of remaining work

### 🎯 Short-term Focus (This Week)

1. **Redistribute workload from overloaded team members** - Balance capacity utilization
2. **Implement dependency management process** - Prevent future blocking cascades
```

## Troubleshooting

### Common Issues

**"MCP call failed" or "MCP call timed out"**

- Ensure Simple Task MCP server is running: `cd ../mcp_server && npm start`
- Check that projects.json is properly configured
- Verify API keys are valid

**"OPENAI_API_KEY not set"**

- Set your OpenAI API key: `export OPENAI_API_KEY="your-key-here"`
- Ensure the key has sufficient credits and permissions

**"No module named 'agno'"**

- Install dependencies: `pip install -r requirements.txt`
- Ensure you're in the activated virtual environment

**"Permission denied" on setup.sh**

- Make the script executable: `chmod +x setup.sh`

### Debug Mode

Enable detailed logging by setting debug=True:

```python
agent = EnhancedSimpleTaskAgent(debug=True)
```

## Development

### Adding New Analysis Features

1. Create new tool functions in `real_mcp_tools.py`
2. Add tools to the agent's tool list in `real_agent.py`
3. Create corresponding analysis methods in the agent class

### Customizing Agent Behavior

- Modify the `description` and `instructions` in the Agent initialization
- Adjust the `expected_output` format template
- Add new reasoning patterns to the instructions

### Testing

```bash
# Test agent initialization
python -c "from real_agent import RealSimpleTaskAgent; agent = RealSimpleTaskAgent(); print('Agent initialized successfully')"

# Test MCP integration
python -c "from real_mcp_tools import get_simple_task_overview; print(get_simple_task_overview('mighty45'))"
```

## Integration with Other Tools

The agent can be easily integrated into:

- CI/CD pipelines for automated project health checks
- Slack/Discord bots for team notifications
- Dashboard applications for real-time insights
- Project management workflows

## Contributing

To contribute to this agent:

1. Follow the existing code patterns and structure
2. Add appropriate error handling for MCP interactions
3. Include docstrings for all new functions
4. Test with various Simple Task project configurations

## License

This project follows the same license as the Simple Task MCP server.
