#!/bin/bash

# Detailed performance testing with multiple runs
# Usage: ./test_performance_detailed.sh [number_of_runs]

RUNS=${1:-5}
API_URL="http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100"
PID=$(lsof -ti:8000)

if [ -z "$PID" ]; then
    echo "Error: Server not running on port 8000"
    exit 1
fi

echo "========================================="
echo "Detailed Performance Test"
echo "========================================="
echo "Server PID: $PID"
echo "Number of runs: $RUNS"
echo ""

TIMES=()
MEMORY_PEAKS=()
CPU_PEAKS=()

for i in $(seq 1 $RUNS); do
    echo "--- Run $i/$RUNS ---"
    
    # Initial state
    INIT_MEM=$(ps -o rss= -p $PID | awk '{print $1/1024}')
    
    # Time the request
    START=$(date +%s.%N)
    curl --location "$API_URL" \
         --header 'accept: application/json' \
         --silent \
         --output /dev/null \
         --write-out "HTTP Status: %{http_code}\n"
    END=$(date +%s.%N)
    
    ELAPSED=$(echo "$END - $START" | bc)
    TIMES+=($ELAPSED)
    
    # Get peak memory during request
    PEAK_MEM=$(ps -o rss= -p $PID | awk '{print $1/1024}')
    MEMORY_PEAKS+=($PEAK_MEM)
    
    # Get CPU usage
    CPU=$(ps -o %cpu= -p $PID)
    CPU_PEAKS+=($CPU)
    
    echo "Time: ${ELAPSED}s | Memory: ${PEAK_MEM} MB | CPU: ${CPU}%"
    echo ""
    
    # Small delay between runs
    sleep 0.5
done

# Calculate statistics
echo "========================================="
echo "Statistics (${RUNS} runs)"
echo "========================================="

# Time statistics
TOTAL_TIME=0
for time in "${TIMES[@]}"; do
    TOTAL_TIME=$(echo "$TOTAL_TIME + $time" | bc)
done
AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $RUNS" | bc)

MIN_TIME=$(printf '%s\n' "${TIMES[@]}" | sort -n | head -1)
MAX_TIME=$(printf '%s\n' "${TIMES[@]}" | sort -n | tail -1)

echo "Time:"
echo "  Average: ${AVG_TIME}s"
echo "  Min: ${MIN_TIME}s"
echo "  Max: ${MAX_TIME}s"
echo ""

# Memory statistics
TOTAL_MEM=0
for mem in "${MEMORY_PEAKS[@]}"; do
    TOTAL_MEM=$(echo "$TOTAL_MEM + $mem" | bc)
done
AVG_MEM=$(echo "scale=2; $TOTAL_MEM / $RUNS" | bc)

MIN_MEM=$(printf '%s\n' "${MEMORY_PEAKS[@]}" | sort -n | head -1)
MAX_MEM=$(printf '%s\n' "${MEMORY_PEAKS[@]}" | sort -n | tail -1)

echo "Memory (Peak):"
echo "  Average: ${AVG_MEM} MB"
echo "  Min: ${MIN_MEM} MB"
echo "  Max: ${MAX_MEM} MB"
echo ""

# CPU statistics
TOTAL_CPU=0
for cpu in "${CPU_PEAKS[@]}"; do
    TOTAL_CPU=$(echo "$TOTAL_CPU + $cpu" | bc)
done
AVG_CPU=$(echo "scale-2; $TOTAL_CPU / $RUNS" | bc)

MIN_CPU=$(printf '%s\n' "${CPU_PEAKS[@]}" | sort -n | head -1)
MAX_CPU=$(printf '%s\n' "${CPU_PEAKS[@]}" | sort -n | tail -1)

echo "CPU:"
echo "  Average: ${AVG_CPU}%"
echo "  Min: ${MIN_CPU}%"
echo "  Max: ${MAX_CPU}%"
echo ""

