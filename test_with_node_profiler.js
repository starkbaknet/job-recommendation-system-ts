#!/usr/bin/env node

/**
 * Node.js performance profiler for API testing
 * Usage: node test_with_node_profiler.js
 */

const http = require("http");
const { performance } = require("perf_hooks");

const API_URL =
  "http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100";

// Get process memory usage
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: (usage.rss / 1024 / 1024).toFixed(2), // Resident Set Size in MB
    heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
    external: (usage.external / 1024 / 1024).toFixed(2),
  };
}

// Make API request
function makeRequest() {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const startMemory = getMemoryUsage();

    const req = http.get(
      API_URL,
      { headers: { accept: "application/json" } },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const endTime = performance.now();
          const endMemory = getMemoryUsage();
          const duration = (endTime - startTime).toFixed(2);

          try {
            const json = JSON.parse(data);
            resolve({
              duration: parseFloat(duration),
              statusCode: res.statusCode,
              dataSize: (data.length / 1024).toFixed(2), // KB
              totalJobs: json.total || 0,
              memory: {
                start: startMemory,
                end: endMemory,
                delta: {
                  rss: (
                    parseFloat(endMemory.rss) - parseFloat(startMemory.rss)
                  ).toFixed(2),
                  heapUsed: (
                    parseFloat(endMemory.heapUsed) -
                    parseFloat(startMemory.heapUsed)
                  ).toFixed(2),
                },
              },
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
  });
}

// Run test
async function runTest(runs = 5) {
  console.log("=========================================");
  console.log("Node.js Performance Test");
  console.log("=========================================");
  console.log(`API URL: ${API_URL}`);
  console.log(`Number of runs: ${runs}`);
  console.log("");

  const results = [];

  for (let i = 1; i <= runs; i++) {
    console.log(`--- Run ${i}/${runs} ---`);
    try {
      const result = await makeRequest();
      results.push(result);
      console.log(`Time: ${result.duration}ms`);
      console.log(`Status: ${result.statusCode}`);
      console.log(`Response Size: ${result.dataSize} KB`);
      console.log(`Total Jobs: ${result.totalJobs}`);
      console.log(
        `Memory Delta: RSS +${result.memory.delta.rss} MB, Heap +${result.memory.delta.heapUsed} MB`
      );
      console.log("");

      // Small delay between runs
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error in run ${i}:`, error.message);
      console.log("");
    }
  }

  // Calculate statistics
  if (results.length > 0) {
    const times = results.map((r) => r.duration);
    const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(
      2
    );
    const minTime = Math.min(...times).toFixed(2);
    const maxTime = Math.max(...times).toFixed(2);

    const memoryDeltas = results.map((r) => parseFloat(r.memory.delta.rss));
    const avgMemory = (
      memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length
    ).toFixed(2);

    console.log("=========================================");
    console.log("Statistics");
    console.log("=========================================");
    console.log(`Time (ms):`);
    console.log(`  Average: ${avgTime}`);
    console.log(`  Min: ${minTime}`);
    console.log(`  Max: ${maxTime}`);
    console.log(`Memory Delta (RSS MB):`);
    console.log(`  Average: ${avgMemory}`);
    console.log("=========================================");
  }
}

// Run
const runs = process.argv[2] ? parseInt(process.argv[2]) : 5;
runTest(runs).catch(console.error);
