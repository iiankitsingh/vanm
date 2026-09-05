#!/bin/bash

# dev.sh - Local development helper script for Skyscanner Clone

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Print banner
echo "===================================================="
echo "      AeroSearch — Starting Development Servers     "
echo "===================================================="

# Check if tmux is installed
if command -v tmux &> /dev/null; then
  echo "tmux detected! Starting services in a split session..."
  
  # Create a new session named "flight-dev" and run Worker in pane 1
  tmux new-session -d -s flight-dev -n "Worker"
  tmux send-keys -t flight-dev:0 "cd '$DIR/worker' && npx wrangler dev --port 8787" C-m
  
  # Split the window and run Frontend in pane 2
  tmux split-window -h -t flight-dev:0
  tmux send-keys -t flight-dev:0.1 "cd '$DIR/frontend' && npm run dev" C-m
  
  # Select the first pane and attach to the session
  tmux select-pane -t flight-dev:0.0
  tmux attach-session -t flight-dev
else
  echo "tmux not found. Running processes sequentially in background..."
  
  # Start worker
  echo "--> Launching Cloudflare Worker on port 8787..."
  cd "$DIR/worker"
  npx wrangler dev --port 8787 &
  WORKER_PID=$!
  
  # Wait a second for worker to boot
  sleep 1.5
  
  # Start frontend
  echo "--> Launching Vite Frontend on http://localhost:5173..."
  cd "$DIR/frontend"
  npm run dev &
  FRONTEND_PID=$!
  
  echo "===================================================="
  echo "Both servers are running."
  echo "  Worker PID: $WORKER_PID"
  echo "  Frontend PID: $FRONTEND_PID"
  echo "===================================================="
  echo "Press Ctrl+C to terminate both servers..."
  
  # Trap Ctrl+C (SIGINT) and exit signals to kill child processes
  trap "echo -e '\nStopping dev servers...'; kill $WORKER_PID $FRONTEND_PID; exit" SIGINT SIGTERM EXIT
  
  # Wait for background jobs to finish
  wait
fi
