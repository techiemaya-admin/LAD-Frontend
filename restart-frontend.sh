#!/bin/bash

# Frontend Restart Script
# This script cleanly restarts the frontend to pick up latest changes

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🔄 RESTARTING FRONTEND                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/naveenreddy/Desktop/AI-Maya/LAD/lad_ui

# Step 1: Kill existing frontend process
echo "📍 Step 1: Stopping existing frontend..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

if lsof -ti:3000 >/dev/null 2>&1; then
  echo "⚠️  Frontend still running, trying again..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  sleep 2
fi

echo "✅ Frontend stopped"
echo ""

# Step 2: Clear Next.js cache
echo "📍 Step 2: Clearing Next.js cache..."
rm -rf .next
echo "✅ Cache cleared"
echo ""

# Step 3: Start frontend
echo "📍 Step 3: Starting frontend..."
echo ""
echo "Frontend will start at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
