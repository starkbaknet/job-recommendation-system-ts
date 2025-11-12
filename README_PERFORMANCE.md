# Performance Testing Guide

## Quick Test (Single Run)

### Using curl with timing:

```bash
curl -w "\n\n--- Performance ---\nTime Total: %{time_total}s\nTime Connect: %{time_connect}s\nTime Start Transfer: %{time_starttransfer}s\nSize: %{size_download} bytes\n" \
  --location 'http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100' \
  --header 'accept: application/json' \
  -o /dev/null \
  -s
```

### Using the performance script:

```bash
./test_performance.sh
```

## Detailed Testing (Multiple Runs)

### Using the detailed script:

```bash
./test_performance_detailed.sh 10  # Run 10 times
```

### Using Node.js profiler:

```bash
node test_with_node_profiler.js 10  # Run 10 times
```

## Monitor Server Process

### Find the server PID:

```bash
lsof -ti:8000
# or
ps aux | grep node
```

### Monitor in real-time:

```bash
# Watch memory and CPU
watch -n 0.5 'ps -o pid,rss,%cpu,command -p $(lsof -ti:8000)'

# Or use htop (if installed)
htop -p $(lsof -ti:8000)
```

### Monitor during API call:

```bash
# In one terminal, run:
while true; do
  ps -o rss=,%cpu= -p $(lsof -ti:8000) | awk '{print "Memory: " $1/1024 " MB, CPU: " $2 "%"}'
  sleep 0.1
done

# In another terminal, run your curl command
```

## Using time command:

```bash
time curl --location 'http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100' \
  --header 'accept: application/json'
```

## Using Apache Bench (if installed):

```bash
ab -n 10 -c 1 'http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100'
```

## Using wrk (if installed):

```bash
wrk -t4 -c10 -d30s 'http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100'
```

## Memory Profiling with Node.js

### Enable heap profiling:

```bash
node --inspect server.js
# Then use Chrome DevTools to profile
```

### Or use clinic.js (if installed):

```bash
npm install -g clinic
clinic doctor -- node server.js
```
