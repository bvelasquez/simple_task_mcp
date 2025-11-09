#!/bin/bash
# Setup script for Simple Task Agno Agent

echo "🤖 Simple Task Agno Agent Setup"
echo "================================"
echo

# Check if we're in the right directory
if [ ! -f "real_agent.py" ]; then
    echo "❌ Please run this script from the agno_agent directory"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        echo "✅ Virtual environment created successfully"
    else
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo
else
    echo "✅ Virtual environment already exists"
    echo
fi

# Activate virtual environment and install dependencies
echo "📥 Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo

# Check MCP server is built
if [ ! -d "../mcp_server/build" ]; then
    echo "⚠️  MCP server build directory not found"
    echo "💡 You may need to build the MCP server first:"
    echo "   cd ../mcp_server && npm install && npm run build"
    echo
fi

echo "🚀 Setup complete!"
echo
echo "Next steps:"
echo "1. Set your OpenAI API key:"
echo "   export OPENAI_API_KEY=\"your-openai-api-key-here\""
echo
echo "2. Run the agent:"
echo "   ./run_agent.sh"
echo
echo "Or activate the virtual environment manually:"
echo "   source venv/bin/activate"
echo "   python real_agent.py"
