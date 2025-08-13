#!/bin/bash
# Simple runner script for the Agno agent

echo "🤖 Starting Simple Task Agno Agent..."

# Change to the script directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: ./setup.sh"
    exit 1
fi

# Activate virtual environment and run agent
source venv/bin/activate
python real_agent.py
