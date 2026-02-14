#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Start serve with the PORT from environment variable
echo "Starting serve on port $PORT..."
npx serve -s dist -l "$PORT"
