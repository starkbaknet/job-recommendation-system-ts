#!/bin/bash

# Performance testing script for recommendations API
# Usage: ./test_performance.sh

API_URL="http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100"
PID=$(lsof -ti:8000)  # Get process ID of the server

if [ -z "$PID" ]; then
    echo "Error: Server not running on port 8000"
    exit 1
fi

echo "========================================="
echo "Performance Test - Recommendations API"
echo "========================================="
echo "Server PID: $PID"
echo "API URL: $API_URL"
echo ""

# Get initial memory and CPU usage
echo "--- Initial State ---"
INITIAL_MEM=$(ps -o rss= -p $PID | awk '{print $1/1024}')
INITIAL_CPU=$(ps -o %cpu= -p $PID)
echo "Memory: ${INITIAL_MEM} MB"
echo "CPU: ${INITIAL_CPU}%"
echo ""

# Run the API call with timing
echo "--- Running API Call ---"
START_TIME=$(date +%s.%N)

# Use curl with timing options
curl -w "\n\n--- Timing Info ---\nTime Total: %{time_total}s\nTime Connect: %{time_connect}s\nTime Start Transfer: %{time_starttransfer}s\n" \
  --location "$API_URL" \
  --header 'accept: application/json' \
  --silent \
  --output /dev/null

END_TIME=$(date +%s.%N)
ELAPSED=$(echo "$END_TIME - $START_TIME" | bc)

echo "Elapsed Time: ${ELAPSED}s"
echo ""

# Get peak memory and CPU usage during the call
echo "--- Peak State (during request) ---"
PEAK_MEM=$(ps -o rss= -p $PID | awk '{print $1/1024}')
PEAK_CPU=$(ps -o %cpu= -p $PID)
echo "Memory: ${PEAK_MEM} MB"
echo "CPU: ${PEAK_CPU}%"
echo ""

# Calculate differences
MEM_DIFF=$(echo "$PEAK_MEM - $INITIAL_MEM" | bc)
CPU_DIFF=$(echo "$PEAK_CPU - $INITIAL_CPU" | bc)

echo "--- Memory & CPU Delta ---"
echo "Memory Increase: ${MEM_DIFF} MB"
echo "CPU Increase: ${CPU_DIFF}%"
echo ""

# Get final state
echo "--- Final State ---"
FINAL_MEM=$(ps -o rss= -p $PID | awk '{print $1/1024}')
FINAL_CPU=$(ps -o %cpu= -p $PID)
echo "Memory: ${FINAL_MEM} MB"
echo "CPU: ${FINAL_CPU}%"
echo ""

echo "========================================="

