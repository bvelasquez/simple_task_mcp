# Task Completion Workflow

## After Code Changes
1. **Build the project**: `npm run build`
2. **Test functionality** using MCP client or debug mode
3. **Verify TypeScript compilation** completes without errors
4. **Update documentation** if new tools or features added

## Code Quality Checks
- TypeScript compiler catches type errors
- Review error handling in service methods
- Ensure proper async/await usage
- Validate MCP tool response formats

## Configuration Updates
- Update `projects.json` with new project configurations as needed
- Ensure API keys and project IDs are correct
- Test multi-project functionality if modified

## Documentation Maintenance
- Update README.md for new tools or features
- Add example usage for new functionality
- Document any breaking changes

## Deployment Preparation
- Ensure `build/` directory is up to date
- Test with production configuration
- Verify all dependencies are properly declared in `package.json`