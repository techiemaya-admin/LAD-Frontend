# LAD Frontend - Local Development Setup (Windows)

> 🚨 **Important**: This guide is specifically for Windows developers setting up the project for the first time

## Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher  
- **Git**: For cloning the repository
- **Windows**: This guide covers Windows-specific native binding setup

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LAD-Frontend
```

### 2. Initial Setup
```bash
# Install root dependencies
npm install --include=optional --foreground-scripts --no-audit --fund=false

# Navigate to web workspace
cd web

# Clean install web dependencies
npm install --include=optional --foreground-scripts --no-audit --fund=false
```

### 3. Install Windows Native Bindings
```bash
# Install platform-specific native modules for Windows
npm install --no-save --no-audit --fund=false lightningcss-win32-x64-msvc @tailwindcss/oxide-win32-x64-msvc
```

### 4. Fix Native Binding Locations
```powershell
# Copy lightningcss binding to expected location
$binding = Get-ChildItem -Recurse -Name "lightningcss.win32-x64-*.node" -Path "node_modules" -Depth 6 | Select-Object -First 1
if($binding) { 
    Copy-Item "node_modules\$binding" "node_modules\lightningcss\lightningcss.win32-x64-msvc.node"
    Write-Host "✅ LightningCSS binding fixed"
}
```

### 5. Generate Prisma Client
```bash
# Generate Prisma client (if schema exists)
npx prisma generate
```

### 6. Verify Setup
```bash
# Test all native modules load correctly
node -e "require('lightningcss'); console.log('✅ lightningcss ok')"
node -e "require('@tailwindcss/oxide'); console.log('✅ tailwind oxide ok')"
node -e "console.log('RQ:', require.resolve('@tanstack/react-query'))"
```

### 7. Start Development Server
```bash
# Go back to project root
cd ..

# Start the development server
npm run dev
```

## Understanding the Issue

**Why this setup is needed**: This project uses Tailwind CSS v4 with LightningCSS for CSS processing. These tools require platform-specific native bindings (compiled C++ modules).

- **Production (Docker)**: Uses Linux bindings (`lightningcss-linux-x64-gnu`)
- **Local Windows Dev**: Needs Windows bindings (`lightningcss-win32-x64-msvc`)

## Platform-Specific Dependencies

| Platform | LightningCSS Binding | Tailwind Oxide Binding |
|----------|---------------------|------------------------|
| Linux (Docker) | `lightningcss-linux-x64-gnu` | `@tailwindcss/oxide-linux-x64-gnu` |
| Windows | `lightningcss-win32-x64-msvc` | `@tailwindcss/oxide-win32-x64-msvc` |
| macOS | `lightningcss-darwin-x64` | `@tailwindcss/oxide-darwin-x64` |

## Troubleshooting

### Common Issues

**Error**: `Cannot find module '../lightningcss.win32-x64-msvc.node'`
- **Solution**: Follow step 3 and 4 above to install and fix Windows native bindings

**Error**: `EPERM: operation not permitted` during npm install
- **Solution**: Close VS Code and any terminals, run as Administrator, or restart your machine

**Error**: Prisma client not generated
- **Solution**: Run `npx prisma generate` from the `web/` directory

**Error**: `npm run dev` fails with module resolution errors
- **Solution**: Verify all validation checks in step 6 pass before starting dev server

### Fresh Setup (If You Need to Start Over)
```bash
# From project root
rm -rf node_modules
cd web
rm -rf node_modules
cd ..

# Then follow the setup steps above from step 2
```

## Project Structure

```
LAD-Frontend/                     # Project root
├── web/                         # Frontend Next.js application
│   ├── src/                    # Source code
│   ├── prisma/                 # Database schema
│   └── package.json            # Web workspace dependencies
├── sdk/                        # Shared SDK/utilities
├── Dockerfile                  # Production deployment (Linux bindings)
└── package.json               # Root monorepo configuration
```

## Development Workflow

1. **First-time setup**: Follow this complete guide
2. **Daily development**: Just run `npm run dev` from project root
3. **After git pull**: May need to run `npm install` in affected workspaces
4. **Adding new dependencies**: Install in appropriate workspace (`web/` or `sdk/`)

## VS Code Extensions (Recommended)

- **Tailwind CSS IntelliSense**: For CSS class autocomplete
- **Prisma**: For database schema support
- **TypeScript and JavaScript**: For better code intelligence
- **ESLint**: For code linting

## Environment Variables

The development server uses default backend URLs. For custom configuration, create a `.env.local` file in the `web/` directory:

```bash
# web/.env.local
NEXT_PUBLIC_API_URL=your-backend-url
NEXT_PUBLIC_SOCKET_URL=your-socket-url
# ... other environment variables
```

## Need Help?

1. **Check this guide first** - Most Windows setup issues are covered here
2. **Verify prerequisites** - Ensure Node.js and npm versions match requirements
3. **Clean setup** - Try the "Fresh Setup" section if issues persist
4. **Platform compatibility** - This guide is Windows-specific; Mac/Linux may differ

---

## Technical Details (For Reference)

### Why Platform-Specific Bindings?

LightningCSS and Tailwind CSS v4 use native C++ modules for performance. These must be compiled for each platform:

- **Native Extensions**: `.node` files containing compiled C++ code
- **Platform Naming**: `win32-x64-msvc` (Windows), `linux-x64-gnu` (Linux), etc.
- **Resolution**: Node.js looks for platform-specific versions automatically

### Dockerfile vs Local Development

The [`Dockerfile`](Dockerfile) handles this automatically for Linux deployment:
```dockerfile
RUN npm install --no-save --no-audit --fund=false \
    lightningcss-linux-x64-gnu \
    @tailwindcss/oxide-linux-x64-gnu
```

Local Windows development requires the equivalent Windows bindings, which this setup guide provides.

---
**Last Updated**: February 2, 2026  
**Target Platform**: Windows 10/11  
**Node.js Version**: 20.x+  
**Status**: ✅ Verified Working