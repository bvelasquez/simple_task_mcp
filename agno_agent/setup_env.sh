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

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo
else
    echo "✅ .env file already exists"
fi

# Check if API key is set in .env
if grep -q "OPENAI_API_KEY=your-openai-api-key-here" .env; then
    echo "⚠️  Please edit .env file and add your OpenAI API key"
    echo
    read -p "Do you want to edit .env now? (y/n): " edit_env
    if [ "$edit_env" = "y" ] || [ "$edit_env" = "Y" ]; then
        if command -v code &> /dev/null; then
            code .env
        elif command -v nano &> /dev/null; then
            nano .env
        elif command -v vim &> /dev/null; then
            vim .env
        else
            echo "Please edit .env manually and replace 'your-openai-api-key-here' with your actual API key"
        fi
    fi
else
    echo "✅ API key appears to be configured in .env"
fi

echo
echo "🚀 Setup complete! You can now run:"
echo "   source venv/bin/activate"
echo "   python real_agent.py"
echo
echo "💡 The agent will automatically load your API key from .env"
