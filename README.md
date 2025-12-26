# Job Recommendation System (TypeScript)

> **Production Use**: This project powers the job recommendation system for **[jobs.af](https://jobs.af)**, providing intelligent job matching for thousands of job seekers.

A high-performance job recommendation system built with TypeScript, Express, TypeORM, and PostgreSQL. The system uses vector embeddings and cosine similarity to provide accurate, personalized job recommendations at scale.

This is a production-ready TypeScript job recommendation system using **vector-based cosine similarity**. It provides intelligent job matching based on semantic similarity, applicant experience, applied jobs, and user interactions.

## Features

- **Vector-Based Recommendations**: Uses cosine similarity between job and applicant embeddings for semantic matching
- **Dynamic Domain Detection**: Fully dynamic system with no hard-coded keywords or job types
- **Experience-Based Boosting**: Automatically boosts jobs matching applicant's exact or partial experience titles
- **Applied Jobs Integration**: Tracks and includes applied jobs in recommendations
- **User Interaction Tracking**: Uses job views, clicks, saves, and engagement metrics to improve recommendations
- **Memory Efficient**: Only loads embeddings initially, fetches full job data only for top candidates
- **Performance Optimized**: Parallel queries, pre-parsed embeddings, optimized similarity calculations
- **Fallback Mechanism**: Returns jobs from database when no vector matches are found
- **RESTful API**: Express.js with TypeScript
- **Type Safety**: Full TypeScript support with type-safe database models

## Performance

- **Response Time**: ~500-700ms for typical requests (optimized from ~878ms)
- **Memory Efficient**: Only loads embeddings initially (~500MB-1GB for 1M jobs), full job data only for top candidates (~1-5MB)
- **Scalable**: Handles millions of jobs without loading all data into memory
- **Database-Level Queries**: All vector lookups performed at database level
- **Parallel Processing**: Independent queries run in parallel for better performance

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Express Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐        │
│  │   API Layer  │  │  Vector      │  │ Recommendation│        │
│  │  (routes.ts) │→ │  Similarity  │→ │   Algorithm   │        │
│  └──────────────┘  └──────────────┘  └───────────────┘        │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  job_vectors │  │applicant_    │  │  Applied &   │       │
│  │  (embeddings)│  │vectors       │  │  Interactions│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Jobs      │  │  Applicants  │  │  Relations   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
job_recommender_ts/
├── src/
│   ├── api/                 # API routes
│   │   └── routes.ts        # Express routes
│   ├── db/                  # Database models and connection
│   │   ├── models.ts        # TypeORM entities (including vectors)
│   │   └── database.ts      # Database connection
│   ├── utils/               # Core utilities
│   │   └── recommendation.ts # Vector-based recommendation algorithm
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # API response types
│   └── index.ts             # Application entry point
├── test_performance.sh      # Performance testing script
├── test_performance_detailed.sh # Detailed performance testing
├── test_with_node_profiler.js   # Node.js performance profiler
├── README_PERFORMANCE.md    # Performance testing guide
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── init.sql                 # Database schema (includes vector tables)
└── README.md                # This file
```

## Recommendation Algorithm

The system uses **pure vector cosine similarity** with intelligent boosting and downranking:

### Core Algorithm

1. **Vector Similarity (Primary)**

   - Calculates cosine similarity between applicant embedding and all job embeddings
   - Uses pre-parsed embeddings map for efficient computation
   - Filters candidates with similarity >= threshold (default: 0.6)

2. **Experience-Based Boosting**

   - **Exact Title Match**: +0.25 boost (ensures user's experience ranks highest)
   - **Partial Title Match**: +0.12 boost (for jobs with similar titles)
   - **Functional Area Match**: +0.05 boost (for jobs in same area)

3. **Dynamic Downranking**

   - Jobs in same functional area but not matching experience: 15-40% downrank
   - Fully dynamic - no hard-coded job types or keywords
   - Proportional to score (higher scores get more aggressive downranking)

4. **Applied Jobs Similarity**

   - Finds jobs similar to jobs the applicant has applied to
   - Uses cosine similarity between applied job embeddings and other jobs
   - Score capped at 0.7 × similarity

5. **Interaction-Based Recommendations**

   - Uses engagement scores (views, clicks, saves, time spent, scroll depth)
   - Finds jobs similar to highly engaged jobs
   - Applies engagement boost (up to 0.2)
   - Score capped at 0.8

6. **Direct Inclusion**

   - Includes jobs the user interacted with (scored by engagement)
   - Includes applied jobs at the bottom (score: 0.1)

7. **Fallback Mechanism**
   - If no vector matches found, returns recent published jobs
   - Ensures users always see some jobs for better UX

### Memory Optimization

- **Initial Load**: Only `job_id` and `embedding` (not full job data)
- **Top Candidates**: Full job data loaded only for top candidates (topK × 5 or 100, whichever is larger)
- **Applied/Interaction Similarity**: Only loads embeddings, fetches full data for top 10 similar jobs per source
- **Scales to Millions**: Works efficiently with millions of jobs

## Technology Stack

- **Backend Framework**: Express.js (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Language**: TypeScript
- **Vector Storage**: JSON arrays in TEXT columns (can be upgraded to pgvector)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ (or Docker)
- TypeScript 5+
- Vector embeddings service (external service that generates embeddings for jobs and applicants)

## Quick Start

### 1. Install Dependencies

```bash
cd job_recommender_ts
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_recommender
PORT=8000
```

### 3. Initialize Database

```bash
# Using psql
psql -U postgres -d job_recommender -f init.sql

# Or using Docker
docker exec -i <postgres_container> psql -U postgres -d job_recommender < init.sql
```

### 4. Populate Vector Data

**Important**: This system requires pre-computed embeddings. You need to:

1. Generate embeddings for all jobs (store in `job_vectors` table)
2. Generate embeddings for applicants (store in `applicant_vectors` table)

The embeddings should be JSON arrays of floats, stored as TEXT in the database.

### 5. Build and Run

```bash
# Build TypeScript
npm run build

# Run in production
npm start

# Or run in development mode
npm run dev
```

The API will be available at `http://localhost:8000`

## API Documentation

### Core Endpoints

#### Get Job Recommendations

```http
GET /recommendations/{applicant_id}?top_k=20&min_similarity_threshold=0.60
```

**Parameters**:

- `applicant_id` (path): UUID of the applicant
- `top_k` (query, optional): Number of recommendations (default: 10, max: 200)
- `min_similarity_threshold` (query, optional): Minimum similarity score (default: 0.60)

**Response**:

```json
[
  {
    "id": "job-uuid",
    "title": "Risk Manager",
    "reference": "JOB12345",
    "location": "California, United States",
    "area_name": "Finance",
    "minimum_salary": 120000.0,
    "maximum_salary": 180000.0,
    "salary_type": "range",
    "gender": "any",
    "period": "yearly",
    "language": "English",
    "publish_date": "2025-01-15",
    "closing_date": "2025-03-15",
    "similarity_score": 0.846,
    "source": "vector_profile"
  }
]
```

**Response Fields**:

- `id`: Job UUID
- `source`: Recommendation source (`vector_profile`, `applied_similar`, `interaction_similar`, `interacted`, `applied`, `fallback`)

#### Get Paginated Recommendations

```http
GET /recommendations/{applicant_id}/paginated?page=1&size=10&min_similarity_threshold=0.60
```

**Parameters**:

- `applicant_id` (path): UUID of the applicant
- `page` (query, optional): Page number (default: 1, min: 1)
- `size` (query, optional): Page size (default: 10, min: 1, max: 100)
- `min_similarity_threshold` (query, optional): Minimum similarity score (default: 0.60)

**Response**:

```json
{
  "total": 145,
  "page": 1,
  "size": 100,
  "total_pages": 2,
  "data": [
    {
      "id": "job-uuid",
      "title": "Risk Manager",
      "similarity_score": 0.846,
      "source": "vector_profile",
      ...
    }
  ]
}
```

#### Get Jobs

```http
GET /jobs?page=1&size=10&area_name=Finance
```

#### Get Applicants

```http
GET /applicants?page=1&size=10
```

### Example Usage

```bash
# 1. Get an applicant ID
curl "http://localhost:8000/applicants?page=1&size=1"

# 2. Get job recommendations (replace {applicant_id} with actual UUID)
curl "http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155?top_k=20"

# 3. Get paginated recommendations
curl "http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100"

# 4. Test performance
./test_performance.sh
```

## Database Schema

### Key Tables

- **`jobs`**: Job postings with all required fields
- **`applicants`**: Applicant profiles
- **`applicant_skills`**: Skills associated with applicants
- **`applicant_education`**: Education history
- **`applicant_experience`**: Work experience
- **`applicant_functional_areas`**: Functional areas of expertise
- **`job_vectors`**: Vector embeddings for jobs (JSON array stored as TEXT)
- **`applicant_vectors`**: Vector embeddings for applicants (JSON array stored as TEXT)
- **`applicant_applied_jobs`**: Tracks jobs applicants have applied to
- **`applicant_job_interactions`**: Tracks user interactions (views, clicks, saves, etc.)
- **`job_recommendations_cache`**: (Optional) Cache for pre-computed recommendations

## Performance Testing

See [README_PERFORMANCE.md](./README_PERFORMANCE.md) for detailed performance testing guide.

### Quick Performance Test

```bash
# Single run with timing
time curl --location 'http://localhost:8000/recommendations/2085d6cd-b96a-4872-b61c-513feb652155/paginated?page=1&size=100' \
  --header 'accept: application/json' -o /dev/null -s

# Detailed performance test
./test_performance.sh

# Multiple runs with statistics
./test_performance_detailed.sh 10

# Node.js profiler
node test_with_node_profiler.js 10
```

## How It Works

### Recommendation Flow

1. **Fetch Applicant Vector**: Gets applicant's embedding from `applicant_vectors` table
2. **Fetch Job Vectors**: Gets all published/open job embeddings (only `job_id` and `embedding`)
3. **Calculate Similarities**: Computes cosine similarity for all jobs
4. **Filter Candidates**: Keeps jobs with similarity >= threshold (0.3-0.6 depending on settings)
5. **Fetch Top Candidates**: Loads full job data only for top candidates (topK × 5)
6. **Apply Boosts/Downranks**:
   - Boosts exact/partial experience matches
   - Downranks jobs in same area but not matching experience
7. **Applied Jobs Similarity**: Finds jobs similar to applied jobs
8. **Interaction Similarity**: Finds jobs similar to highly engaged jobs
9. **Include Direct Jobs**: Adds interacted and applied jobs
10. **Sort & Return**: Sorts by score (applied jobs at bottom), returns top K

### Memory Efficiency

- **Initial Query**: Only loads `job_id` + `embedding` (small data)
- **Top Candidates**: Loads full job data for ~100 jobs max
- **Applied/Interaction**: Only loads embeddings, fetches full data for top 10 per source
- **Total Memory**: ~500MB-1GB for 1M jobs (embeddings only) + ~1-5MB (full job data)

## Troubleshooting

### Issue: Database connection failed

**Solution**: Check your `DATABASE_URL` environment variable and ensure PostgreSQL is running.

### Issue: Empty recommendations

**Solutions**:

1. Verify applicant has a vector in `applicant_vectors` table
2. Verify jobs have vectors in `job_vectors` table
3. Lower `min_similarity_threshold` (default: 0.60)
4. Check that jobs are published and open (`status='published'`, `is_open=true`)
5. System will fallback to recent jobs if no matches found

### Issue: "No applicant vector found"

**Solution**: Ensure the applicant has an embedding in the `applicant_vectors` table. The system requires pre-computed embeddings.

### Issue: TypeScript compilation errors

**Solution**: Run `npm install` to ensure all dependencies are installed, then `npm run build`.

### Issue: Slow performance

**Solutions**:

1. Check database indexes on `job_vectors.job_id` and `applicant_vectors.applicant_id`
2. Ensure embeddings are pre-computed (not generated on-the-fly)
3. Consider using `pgvector` extension for native vector operations
4. Monitor with `./test_performance.sh`

## Future Improvements

- [ ] Upgrade to `pgvector` extension for native vector operations
- [ ] Add caching layer (Redis) for frequently accessed recommendations
- [ ] Implement recommendation caching in `job_recommendations_cache` table
- [ ] Add rate limiting and API authentication
- [ ] Support for real-time embedding updates
- [ ] Analytics dashboard for recommendation quality metrics
- [ ] A/B testing framework for recommendation algorithms
- [ ] GraphQL API option

## License

This project is open-source and available under the MIT license.

---

**Built with ❤️ using TypeScript, Express, PostgreSQL, and Vector Similarity**
