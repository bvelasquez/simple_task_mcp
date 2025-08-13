# Development Commands and Workflow

## Build and Run Commands
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in production mode
npm start

# Development mode with auto-restart
npm run dev

# Watch mode for development
npm run watch
```

## Development Scripts
- `start:local` - Local development with environment setup
- `start:production` - Production startup script

## Project Structure Commands
```bash
# List project files
find . -name "*.ts" -not -path "./node_modules/*" -not -path "./build/*"

# Check TypeScript compilation
npm run build

# View project configuration
cat projects.json
```

## Configuration Management
- Copy `projects.example.json` to `projects.json` for initial setup
- Update API keys and project IDs in `projects.json`
- Configuration is git-ignored for security

## Testing and Validation
- Use MCP client (like Claude Desktop) to test tools
- Enable debug mode with `DEBUG=* npm run dev`
- Check build outputs in `build/` directory