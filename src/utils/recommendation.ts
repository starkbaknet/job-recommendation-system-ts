import { Repository, In } from "typeorm";
import {
  Job,
  Applicant,
  ApplicantAppliedJob,
  ApplicantJobInteraction,
  JobVector,
  ApplicantVector,
} from "../db/models";

type Domain = "technical" | "sales" | "hybrid" | "other";

interface ApplicantMetadata {
  skills: string[];
  functional_areas: string[];
  domain: Domain;
  years_experience: number;
  has_leadership_exp: boolean;
  has_senior_exp: boolean;
}

/**
 * Extract all relevant text from a job for matching
 */
export function extractJobText(job: Job): string {
  const textParts: string[] = [];

  if (job.title) textParts.push(job.title);
  if (job.role_summary) textParts.push(cleanHtml(job.role_summary));
  if (job.job_requirements) textParts.push(cleanHtml(job.job_requirements));
  if (job.duties_and_responsibilities)
    textParts.push(cleanHtml(job.duties_and_responsibilities));
  if (job.industry_type_name) textParts.push(job.industry_type_name);
  if (job.area_name) textParts.push(job.area_name);

  if (job.minimum_experience !== null && job.maximum_experience !== null) {
    textParts.push(
      `Experience required: ${job.minimum_experience} to ${job.maximum_experience} years`
    );
  }

  if (job.education_level) textParts.push(job.education_level);
  if (job.work_type) textParts.push(job.work_type);
  if (job.company_name) textParts.push(job.company_name);
  if (job.company_work_policy) textParts.push(job.company_work_policy);
  if (job.country_name) textParts.push(job.country_name);
  if (job.province_name) textParts.push(job.province_name);

  return textParts.filter((p) => p).join(" ");
}

function cleanHtml(html: string): string {
  if (!html) return "";
  // Simple HTML tag removal (for production, use a proper HTML parser)
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect the primary domain of an applicant's experience dynamically
 * Based on functional areas, skills, and experience data
 * Returns "other" as default - domain matching is handled by actual data comparison
 */
export function detectPrimaryExperienceDomain(applicant: Applicant): Domain {
  // Get all functional areas and skills
  const functionalAreas = (applicant.functional_areas || []).map((fa) =>
    fa.area_name.toLowerCase()
  );
  const skills = (applicant.skills || []).map((s) =>
    s.skill_name.toLowerCase()
  );

  // Check for diversity in functional areas (suggests hybrid)
  const uniqueFunctionalAreas = new Set(functionalAreas);
  if (uniqueFunctionalAreas.size > 1) {
    return "hybrid";
  }

  // Check for diverse skills (suggests hybrid)
  const uniqueSkills = new Set(skills);
  if (uniqueSkills.size > 5) {
    return "hybrid";
  }

  // Default to "other" - actual domain matching happens through
  // functional area and skills comparison in the matching algorithm
  return "other";
}

/**
 * Detect the primary domain of a job dynamically
 * Based on area_name and industry_type_name
 * Returns "other" as default - domain matching is handled by actual data comparison
 */
export function detectJobDomain(job: Job): Domain {
  const areaName = job.area_name?.toLowerCase() || "";
  const industryType = job.industry_type_name?.toLowerCase() || "";

  // If both area and industry exist and differ, suggests hybrid
  if (areaName && industryType && areaName !== industryType) {
    return "hybrid";
  }

  // Default to "other" - actual domain matching happens through
  // functional area and skills comparison in the matching algorithm
  return "other";
}

/**
 * Calculate skills match score
 */
function calculateSkillsMatchScore(
  applicantSkills: string[],
  jobText: string
): number {
  if (applicantSkills.length === 0) {
    return 0.5; // Neutral score if no skills
  }

  const jobTextLower = jobText.toLowerCase();
  const matchedSkills: string[] = [];

  for (const skill of applicantSkills) {
    const skillLower = skill.toLowerCase();
    if (jobTextLower.includes(skillLower)) {
      matchedSkills.push(skill);
    } else {
      // Check for partial matches
      const wordsInJob = jobTextLower.split(" ").filter((w) => w.length > 3);
      if (
        wordsInJob.some(
          (word) => word.includes(skillLower) || skillLower.includes(word)
        )
      ) {
        matchedSkills.push(skill);
      }
    }
  }

  const matchRatio = matchedSkills.length / applicantSkills.length;

  let baseScore: number;
  if (matchRatio >= 0.8) {
    baseScore = 1.0;
  } else if (matchRatio >= 0.6) {
    baseScore = 0.85;
  } else if (matchRatio >= 0.4) {
    baseScore = 0.7;
  } else if (matchRatio >= 0.2) {
    baseScore = 0.5;
  } else {
    baseScore = 0.3;
  }

  // Boost for multiple matched skills
  if (matchedSkills.length >= 3) {
    baseScore = Math.min(1.0, baseScore * 1.1);
  }

  return baseScore;
}

/**
 * Calculate experience match score
 */
function calculateExperienceMatchScore(
  applicant: Applicant,
  job: Job,
  applicantDomain: Domain,
  jobDomain: Domain,
  yearsExperience: number,
  hasLeadershipExp: boolean,
  hasSeniorExp: boolean
): number {
  // Dynamic domain matching based on actual functional area and skills overlap
  // Instead of hard-coded domain classification, we compare actual data
  let domainMatchBoost = 1.0;

  // Get applicant functional areas and skills
  const applicantFunctionalAreas = (applicant.functional_areas || []).map(
    (fa) => fa.area_name.toLowerCase()
  );
  const applicantSkills = (applicant.skills || []).map((s) =>
    s.skill_name.toLowerCase()
  );

  // Get job area and extract skills from job text
  const jobArea = job.area_name?.toLowerCase() || "";
  const jobText = extractJobText(job).toLowerCase();

  // Check for functional area match
  const hasFunctionalAreaMatch = applicantFunctionalAreas.some(
    (fa) =>
      jobArea &&
      (fa === jobArea || fa.includes(jobArea) || jobArea.includes(fa))
  );

  // Count skill matches in job text
  const skillMatches = applicantSkills.filter((skill) =>
    jobText.includes(skill)
  ).length;
  const skillMatchRatio =
    applicantSkills.length > 0 ? skillMatches / applicantSkills.length : 0;

  // Apply dynamic domain boost based on actual data matching
  if (hasFunctionalAreaMatch && skillMatchRatio > 0.5) {
    domainMatchBoost = 1.5; // Strong match - boost
  } else if (hasFunctionalAreaMatch || skillMatchRatio > 0.3) {
    domainMatchBoost = 1.2; // Moderate match - slight boost
  } else if (skillMatchRatio < 0.1 && applicantSkills.length > 0) {
    domainMatchBoost = 0.3; // Very low match - penalty
  }

  // Handle hybrid cases
  if (applicantDomain === "hybrid" || jobDomain === "hybrid") {
    domainMatchBoost = Math.max(1.0, domainMatchBoost * 0.9); // Slight reduction for hybrid
  }

  // Calculate base score from experience requirements
  let baseScore: number;
  if (job.minimum_experience === null && job.maximum_experience === null) {
    baseScore = 0.7;
  } else {
    const minExp = job.minimum_experience || 0;
    const maxExp = job.maximum_experience || Infinity;

    if (minExp <= yearsExperience && yearsExperience <= maxExp) {
      baseScore = 1.0;
    } else if (yearsExperience < minExp) {
      const diff = minExp - yearsExperience;
      baseScore = Math.max(0.3, 1.0 - diff * 0.15);
    } else {
      const diff = yearsExperience - maxExp;
      baseScore = Math.max(0.6, 1.0 - diff * 0.03);
    }
  }

  // Apply domain match boost/penalty
  baseScore = Math.min(1.0, Math.max(0.0, baseScore * domainMatchBoost));

  // Dynamic leadership/senior experience matching
  // Check if job title contains leadership/senior indicators dynamically
  const jobTitleLower = (job.title || "").toLowerCase();

  // Check for leadership roles - look for common leadership patterns in job title
  if (hasLeadershipExp) {
    // Dynamic pattern matching for leadership roles
    const leadershipPatterns =
      /\b(lead|manager|director|head|chief|vp|vice\s+president|executive|supervisor)\b/i;
    if (leadershipPatterns.test(jobTitleLower)) {
      baseScore = Math.min(1.0, baseScore * 1.15);
    }
  }

  // Check for senior roles - look for seniority indicators
  if (hasSeniorExp) {
    // Dynamic pattern matching for senior roles
    const seniorPatterns =
      /\b(senior|sr\.?|principal|staff|architect|expert|specialist)\b/i;
    if (seniorPatterns.test(jobTitleLower)) {
      baseScore = Math.min(1.0, baseScore * 1.1);
    }
  }

  return baseScore;
}

/**
 * Calculate functional area match score
 */
function calculateFunctionalAreaScore(
  jobArea: string | null | undefined,
  applicantFunctionalAreas: string[]
): number {
  if (!jobArea || applicantFunctionalAreas.length === 0) {
    return 0.5; // Neutral
  }

  if (
    applicantFunctionalAreas.some(
      (fa) => fa.toLowerCase() === jobArea.toLowerCase()
    )
  ) {
    return 0.7; // Moderate boost
  } else {
    return 0.4; // Slight penalty
  }
}

/**
 * Calculate location and work type match score
 */
function calculateLocationWorktypeScore(
  applicant: Applicant,
  job: Job
): number {
  let locationScore = 0.5;
  let worktypeScore = 0.5;

  // Location matching
  if (applicant.country_name && job.country_name) {
    if (
      applicant.country_name.toLowerCase() === job.country_name.toLowerCase()
    ) {
      locationScore = 0.7;
      if (applicant.province_name && job.province_name) {
        if (
          applicant.province_name.toLowerCase() ===
          job.province_name.toLowerCase()
        ) {
          locationScore = 0.9;
        }
      }
    }
  }

  // Work type matching
  if (job.work_type) {
    worktypeScore = 0.6;
  }

  return locationScore * 0.6 + worktypeScore * 0.4;
}

/**
 * Calculate applicant metadata for scoring
 */
export function calculateApplicantMetadata(
  applicant: Applicant
): ApplicantMetadata {
  const skills = (applicant.skills || []).map((s) =>
    s.skill_name.toLowerCase()
  );
  const functional_areas = (applicant.functional_areas || []).map((fa) =>
    fa.area_name.toLowerCase()
  );
  const domain = detectPrimaryExperienceDomain(applicant);

  // Calculate years of experience
  let yearsExperience = 0;
  let hasLeadershipExp = false;
  let hasSeniorExp = false;

  const today = new Date();
  for (const exp of applicant.experience || []) {
    const startDate = new Date(exp.start_date);
    const endDate = exp.end_date ? new Date(exp.end_date) : today;
    const durationDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    yearsExperience += durationDays / 365.25;

    const titleLower = (exp.title || "").toLowerCase();

    // Dynamic leadership detection using pattern matching
    const leadershipPatterns =
      /\b(lead|manager|director|head|chief|vp|vice\s+president|executive|supervisor)\b/i;
    if (leadershipPatterns.test(titleLower)) {
      hasLeadershipExp = true;
    }

    // Dynamic senior experience detection using pattern matching
    const seniorPatterns =
      /\b(senior|sr\.?|principal|staff|architect|expert|specialist)\b/i;
    if (seniorPatterns.test(titleLower)) {
      hasSeniorExp = true;
    }
  }

  return {
    skills,
    functional_areas,
    domain,
    years_experience: yearsExperience,
    has_leadership_exp: hasLeadershipExp,
    has_senior_exp: hasSeniorExp,
  };
}

/**
 * Calculate similarity between two jobs based on their content
 */
function calculateJobSimilarity(job1: Job, job2: Job): number {
  const text1 = extractJobText(job1).toLowerCase();
  const text2 = extractJobText(job2).toLowerCase();

  // Check area name match
  let areaMatch = 0;
  if (job1.area_name && job2.area_name) {
    if (job1.area_name.toLowerCase() === job2.area_name.toLowerCase()) {
      areaMatch = 0.3;
    }
  }

  // Check industry type match
  let industryMatch = 0;
  if (job1.industry_type_name && job2.industry_type_name) {
    if (
      job1.industry_type_name.toLowerCase() ===
      job2.industry_type_name.toLowerCase()
    ) {
      industryMatch = 0.2;
    }
  }

  // Check title similarity (simple word overlap)
  const title1Words = new Set((job1.title || "").toLowerCase().split(/\s+/));
  const title2Words = new Set((job2.title || "").toLowerCase().split(/\s+/));
  const commonTitleWords = [...title1Words].filter((w) => title2Words.has(w));
  const titleSimilarity =
    title1Words.size > 0 && title2Words.size > 0
      ? commonTitleWords.length / Math.max(title1Words.size, title2Words.size)
      : 0;

  // Check text overlap
  const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 3));
  const commonWords = [...words1].filter((w) => words2.has(w));
  const textSimilarity =
    words1.size > 0 && words2.size > 0
      ? commonWords.length / Math.max(words1.size, words2.size)
      : 0;

  // Combine similarities
  return Math.min(
    1.0,
    areaMatch + industryMatch + titleSimilarity * 0.3 + textSimilarity * 0.2
  );
}

/**
 * Calculate cosine similarity between two vectors (optimized)
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length || vec1.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  // Use single loop for better cache performance
  for (let i = 0; i < vec1.length; i++) {
    const v1 = vec1[i];
    const v2 = vec2[i];
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const denominator = Math.sqrt(norm1 * norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Parse embedding string (JSON array) to number array
 */
function parseEmbedding(embedding: string): number[] {
  try {
    return JSON.parse(embedding);
  } catch {
    return [];
  }
}

/**
 * Get job recommendations for an applicant using pure vector cosine similarity
 * Optimized for performance - no rule-based scoring, no fallbacks
 */
export async function getRecommendationsForApplicant(
  jobRepo: Repository<Job>,
  appliedJobRepo: Repository<ApplicantAppliedJob>,
  interactionRepo: Repository<ApplicantJobInteraction>,
  jobVectorRepo: Repository<JobVector>,
  applicantVectorRepo: Repository<ApplicantVector>,
  applicant: Applicant,
  topK: number = 10,
  minSimilarityThreshold: number = 0.6
): Promise<Array<{ job: Job; score: number; source?: string }>> {
  // Parallelize independent queries for better performance
  const [appliedJobs, interactions, applicantVector] = await Promise.all([
    appliedJobRepo.find({
      where: { applicant_id: applicant.id },
      select: ["job_id"],
    }),
    interactionRepo.find({
      where: { applicant_id: applicant.id },
      select: [
        "job_id",
        "interaction_type",
        "time_spent_seconds",
        "scroll_depth",
        "click_count",
      ],
    }),
    applicantVectorRepo.findOne({
      where: { applicant_id: applicant.id },
    }),
  ]);

  if (!applicantVector || !applicantVector.embedding) {
    return [];
  }

  const applicantEmbedding = parseEmbedding(applicantVector.embedding);
  if (applicantEmbedding.length === 0) {
    return [];
  }

  // Extract experience titles for boosting exact matches (pre-normalize for performance)
  const experienceTitles = new Set<string>();
  const experienceWordsMap = new Map<string, Set<string>>(); // Cache word sets for partial matching
  if (applicant.experience && applicant.experience.length > 0) {
    for (const exp of applicant.experience) {
      if (exp.title) {
        // Normalize title: lowercase, remove extra spaces
        const normalizedTitle = exp.title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
        experienceTitles.add(normalizedTitle);
        // Pre-compute words for partial matching (words longer than 2 chars)
        const words = normalizedTitle.split(" ").filter((w) => w.length > 2);
        experienceWordsMap.set(normalizedTitle, new Set(words));
      }
    }
  }

  // Extract skills for relevance checking
  const applicantSkills = new Set<string>();
  if (applicant.skills && applicant.skills.length > 0) {
    for (const skill of applicant.skills) {
      if (skill.skill_name) {
        applicantSkills.add(skill.skill_name.toLowerCase().trim());
      }
    }
  }

  const appliedJobIds = new Set(appliedJobs.map((aj) => aj.job_id));

  // Calculate engagement scores (simplified)
  const jobEngagementMap = new Map<string, number>();
  for (const interaction of interactions) {
    let score = jobEngagementMap.get(interaction.job_id) || 0;
    if (interaction.interaction_type === "view") score += 1;
    if (interaction.interaction_type === "click") score += 2;
    if (interaction.interaction_type === "save") score += 3;
    if (interaction.time_spent_seconds > 30) score += 2;
    if (interaction.scroll_depth > 50) score += 1;
    if (interaction.click_count > 0) score += interaction.click_count;
    jobEngagementMap.set(interaction.job_id, score);
  }

  // Get top engaged job IDs
  const topEngagedJobIds = Array.from(jobEngagementMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([jobId]) => jobId);

  // Fetch only job vectors (not full job data) to minimize memory usage
  // We'll fetch full job data only for top candidates
  // Use select to only get job_id and embedding, not full job entities
  const jobVectors = await jobVectorRepo
    .createQueryBuilder("jv")
    .innerJoin("jv.job", "job")
    .where("job.status = :status", { status: "published" })
    .andWhere("job.is_open = :isOpen", { isOpen: true })
    .andWhere("jv.embedding IS NOT NULL")
    .select(["jv.job_id", "jv.embedding"])
    .getRawMany()
    .then((rows) =>
      rows.map((row) => ({
        job_id: row.jv_job_id,
        embedding: row.jv_embedding,
      }))
    );

  // Pre-parse all job embeddings into a map for faster lookups
  const jobEmbeddingsMap = new Map<string, number[]>();
  for (const jobVector of jobVectors) {
    if (appliedJobIds.has(jobVector.job_id)) continue;
    const embedding = parseEmbedding(jobVector.embedding);
    if (embedding.length > 0) {
      jobEmbeddingsMap.set(jobVector.job_id, embedding);
    }
  }

  // Pre-parse all embeddings and calculate similarities (optimized)
  const candidateScores: Array<{ jobId: string; score: number }> = [];
  const initialThreshold = Math.max(0.2, minSimilarityThreshold * 0.5);
  for (const [jobId, jobEmbedding] of jobEmbeddingsMap) {
    const vectorScore = cosineSimilarity(applicantEmbedding, jobEmbedding);
    if (vectorScore >= initialThreshold) {
      candidateScores.push({ jobId, score: vectorScore });
    }
  }

  // Sort by score and take top candidates (5x more than needed to ensure we have enough after filtering)
  candidateScores.sort((a, b) => b.score - a.score);
  const topCandidateIds = candidateScores
    .slice(0, Math.max(topK * 5, 100)) // Take at least 100 candidates or 5x topK
    .map((c) => c.jobId);

  // If no candidates found, return empty array
  if (topCandidateIds.length === 0) {
    // Still return applied/interacted jobs if any
    const scoredJobs: Array<{ job: Job; score: number; source?: string }> = [];

    // Add interacted jobs if any
    if (topEngagedJobIds.length > 0) {
      const interactedJobs = await jobRepo.find({
        where: { id: In(topEngagedJobIds) },
      });
      for (const job of interactedJobs) {
        const engagementScore = jobEngagementMap.get(job.id) || 0;
        scoredJobs.push({
          job,
          score: Math.min(0.5, 0.2 + engagementScore * 0.05),
          source: "interacted",
        });
      }
    }

    // Add applied jobs at bottom
    if (appliedJobIds.size > 0) {
      const appliedJobsData = await jobRepo.find({
        where: { id: In(Array.from(appliedJobIds)) },
      });
      for (const job of appliedJobsData) {
        scoredJobs.push({ job, score: 0.1, source: "applied" });
      }
    }

    // Sort before returning (applied jobs at bottom, then by score descending)
    scoredJobs.sort((a, b) => {
      if (a.source === "applied" && b.source !== "applied") return 1;
      if (b.source === "applied" && a.source !== "applied") return -1;
      return b.score - a.score;
    });

    // Fallback: If no regular recommendations found, return some jobs from database
    const regular = scoredJobs.filter((item) => item.source !== "applied");
    if (regular.length === 0) {
      // Fetch some published, open jobs from the database
      const fallbackJobs = await jobRepo.find({
        where: {
          status: "published",
          is_open: true,
        },
        take: topK,
        order: {
          publish_date: "DESC", // Most recent jobs first
        },
      });

      // Filter out applied jobs
      const filteredFallbackJobs = fallbackJobs.filter(
        (job) => !appliedJobIds.has(job.id)
      );

      // Add fallback jobs with a low score
      const fallbackScored = filteredFallbackJobs.map((job) => ({
        job,
        score: 0.3,
        source: "fallback",
      }));

      // Return fallback jobs + applied jobs
      return [
        ...fallbackScored,
        ...scoredJobs.filter((item) => item.source === "applied"),
      ];
    }

    return scoredJobs;
  }

  // Now fetch full job data only for top candidates
  const topJobVectors = await jobVectorRepo
    .createQueryBuilder("jv")
    .innerJoinAndSelect("jv.job", "job")
    .where("jv.job_id IN (:...jobIds)", { jobIds: topCandidateIds })
    .getMany();

  // Create map for quick lookup
  const jobVectorMap = new Map(topJobVectors.map((jv) => [jv.job_id, jv]));
  const candidateScoreMap = new Map(
    candidateScores.map((c) => [c.jobId, c.score])
  );

  // 1. Main recommendations: apply boosts to top candidates
  const scoredJobs: Array<{ job: Job; score: number; source?: string }> = [];
  const includedJobIds = new Set<string>();

  // Define final threshold early so it can be used in downranking logic
  const finalThreshold = Math.max(0.3, minSimilarityThreshold * 0.7);

  for (const jobId of topCandidateIds) {
    const jobVector = jobVectorMap.get(jobId);
    if (!jobVector || !jobVector.job) continue;

    let vectorScore = candidateScoreMap.get(jobId) || 0;

    // Boost for exact title match with experience - CRITICAL for accuracy
    if (jobVector.job.title) {
      const normalizedJobTitle = jobVector.job.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
      if (experienceTitles.has(normalizedJobTitle)) {
        // Very strong boost for exact title match - ensures user's experience ranks highest
        // Boost by 0.25 (25% of score range) to ensure it beats semantically similar but irrelevant jobs
        vectorScore = Math.min(1.0, vectorScore + 0.25);
      } else {
        // Check for partial title match (optimized with pre-computed word sets)
        const jobWords = normalizedJobTitle.split(" ");
        const jobWordsSet = new Set(jobWords);
        for (const [expTitle, expWords] of experienceWordsMap) {
          // Count matching words (only words longer than 3 chars for partial match)
          const longExpWords = Array.from(expWords).filter((w) => w.length > 3);
          let matchCount = 0;
          for (const word of longExpWords) {
            if (
              jobWordsSet.has(word) ||
              jobWords.some((jw) => jw.includes(word) || word.includes(jw))
            ) {
              matchCount++;
              if (matchCount >= 2) {
                // Moderate boost for partial match (up to 0.12 boost)
                vectorScore = Math.min(1.0, vectorScore + 0.12);
                break;
              }
            }
          }
          if (matchCount >= 2) break;
        }
      }
    }

    // Boost for skill relevance in job title/area
    if (jobVector.job.area_name) {
      const normalizedArea = jobVector.job.area_name.toLowerCase().trim();
      if (applicant.functional_areas && applicant.functional_areas.length > 0) {
        const hasAreaMatch = applicant.functional_areas.some(
          (fa) => fa.area_name.toLowerCase().trim() === normalizedArea
        );
        if (hasAreaMatch) {
          vectorScore = Math.min(1.0, vectorScore + 0.05);
        }
      }
    }

    // Downrank jobs that are semantically similar but not directly relevant
    // This is critical for preventing irrelevant jobs from ranking too high
    if (jobVector.job.title) {
      const jobTitleLower = jobVector.job.title.toLowerCase();
      const normalizedJobTitle = jobTitleLower.trim().replace(/\s+/g, " ");

      // Check if job has direct relevance to user's experience (optimized)
      const hasExactMatch = experienceTitles.has(normalizedJobTitle);
      let hasPartialMatch = false;
      if (!hasExactMatch && experienceWordsMap.size > 0) {
        // Use pre-computed word sets for faster partial matching
        const jobWords = normalizedJobTitle.split(" ");
        const jobWordsSet = new Set(jobWords);
        for (const [expTitle, expWords] of experienceWordsMap) {
          // Count matching words
          let matchCount = 0;
          for (const word of expWords) {
            if (
              jobWordsSet.has(word) ||
              jobWords.some((jw) => jw.includes(word) || word.includes(jw))
            ) {
              matchCount++;
              if (matchCount >= 2) {
                hasPartialMatch = true;
                break;
              }
            }
          }
          if (hasPartialMatch) break;
        }
      }
      const hasDirectRelevance = hasExactMatch || hasPartialMatch;

      // Downrank jobs that don't match user's experience but are in the same area
      // This is fully dynamic - no hard-coded job types or keywords
      if (!hasDirectRelevance) {
        // Check if job is in the same functional area as user's experience
        const jobArea = jobVector.job.area_name?.toLowerCase().trim();
        const isSameArea =
          jobArea &&
          applicant.functional_areas?.some(
            (fa) => fa.area_name.toLowerCase().trim() === jobArea
          );

        if (isSameArea) {
          // Job is in same area but doesn't match experience - downrank it
          // The downranking is proportional to how high the score is
          // Higher scores get more aggressive downranking to prevent irrelevant jobs from ranking too high
          const downrankPercent =
            vectorScore > 0.7 ? 0.4 : vectorScore > 0.5 ? 0.25 : 0.15;
          const downrankAmount = vectorScore * downrankPercent;
          vectorScore = Math.max(
            finalThreshold * 0.7,
            vectorScore - downrankAmount
          );
        }
      }
    }

    // Use final threshold to filter jobs after boosts/downranks
    if (vectorScore >= finalThreshold) {
      scoredJobs.push({
        job: jobVector.job,
        score: vectorScore,
        source: "vector_profile",
      });
      includedJobIds.add(jobVector.job_id);
    }
  }

  // 2. Recommendations based on applied jobs (if any)
  if (appliedJobIds.size > 0) {
    // Get vectors for applied jobs in batch
    const appliedJobVectors = await jobVectorRepo.find({
      where: { job_id: In(Array.from(appliedJobIds)) },
    });

    const appliedJobEmbeddings = new Map<string, number[]>();
    for (const av of appliedJobVectors) {
      const embedding = parseEmbedding(av.embedding);
      if (embedding.length > 0) {
        appliedJobEmbeddings.set(av.job_id, embedding);
      }
    }

    // Find similar jobs for each applied job (optimized with pre-parsed embeddings)
    for (const [appliedJobId, appliedJobEmbedding] of appliedJobEmbeddings) {
      const similarScores: Array<{ jobId: string; score: number }> = [];

      // Calculate similarity using pre-parsed embeddings map
      for (const [jobId, jobEmbedding] of jobEmbeddingsMap) {
        if (jobId === appliedJobId) continue;
        if (appliedJobIds.has(jobId)) continue;
        if (includedJobIds.has(jobId)) continue;

        const vectorScore = cosineSimilarity(appliedJobEmbedding, jobEmbedding);
        if (vectorScore > 0.3) {
          similarScores.push({
            jobId,
            score: Math.min(0.7, vectorScore * 0.7),
          });
        }
      }

      // Sort and get top 10 job IDs
      similarScores.sort((a, b) => b.score - a.score);
      const topSimilarJobIds = similarScores.slice(0, 10).map((s) => s.jobId);

      // Fetch full job data only for top similar jobs
      if (topSimilarJobIds.length > 0) {
        const similarJobs = await jobRepo.find({
          where: { id: In(topSimilarJobIds) },
        });
        const similarJobMap = new Map(similarJobs.map((j) => [j.id, j]));

        for (const jobId of topSimilarJobIds) {
          const job = similarJobMap.get(jobId);
          const score =
            similarScores.find((s) => s.jobId === jobId)?.score || 0;
          if (job) {
            scoredJobs.push({ job, score, source: "applied_similar" });
            includedJobIds.add(job.id);
          }
        }
      }
    }
  }

  // 3. Recommendations based on highly engaged jobs
  if (topEngagedJobIds.length > 0) {
    const engagedJobVectors = await jobVectorRepo.find({
      where: { job_id: In(topEngagedJobIds) },
    });

    for (const ev of engagedJobVectors) {
      const engagementScore = jobEngagementMap.get(ev.job_id) || 0;
      if (engagementScore < 3) continue;

      const engagedJobEmbedding = parseEmbedding(ev.embedding);
      if (engagedJobEmbedding.length === 0) continue;

      const similarScores: Array<{ jobId: string; score: number }> = [];
      // Calculate similarity using pre-parsed embeddings map (optimized)
      for (const [jobId, jobEmbedding] of jobEmbeddingsMap) {
        if (jobId === ev.job_id) continue;
        if (appliedJobIds.has(jobId)) continue;
        if (includedJobIds.has(jobId)) continue;

        const vectorScore = cosineSimilarity(engagedJobEmbedding, jobEmbedding);
        if (vectorScore > 0.3) {
          const engagementBoost = Math.min(0.2, engagementScore * 0.05);
          similarScores.push({
            jobId,
            score: Math.min(0.8, vectorScore * 0.6 + engagementBoost),
          });
        }
      }

      // Sort and get top 10 job IDs
      similarScores.sort((a, b) => b.score - a.score);
      const topSimilarJobIds = similarScores.slice(0, 10).map((s) => s.jobId);

      // Fetch full job data only for top similar jobs
      if (topSimilarJobIds.length > 0) {
        const similarJobs = await jobRepo.find({
          where: { id: In(topSimilarJobIds) },
        });
        const similarJobMap = new Map(similarJobs.map((j) => [j.id, j]));

        for (const jobId of topSimilarJobIds) {
          const job = similarJobMap.get(jobId);
          const score =
            similarScores.find((s) => s.jobId === jobId)?.score || 0;
          if (job) {
            scoredJobs.push({ job, score, source: "interaction_similar" });
            includedJobIds.add(job.id);
          }
        }
      }
    }
  }

  // 4. Add interacted jobs with engagement-based score
  if (topEngagedJobIds.length > 0) {
    const interactedJobs = await jobRepo.find({
      where: { id: In(topEngagedJobIds) },
    });
    const interactedJobMap = new Map(interactedJobs.map((j) => [j.id, j]));

    for (const jobId of topEngagedJobIds) {
      if (appliedJobIds.has(jobId)) continue;
      if (includedJobIds.has(jobId)) continue;

      const engagementScore = jobEngagementMap.get(jobId) || 0;
      const job = interactedJobMap.get(jobId);
      if (!job) continue;

      scoredJobs.push({
        job,
        score: Math.min(0.5, 0.2 + engagementScore * 0.05),
        source: "interacted",
      });
      includedJobIds.add(jobId);
    }
  }

  // 5. Add applied jobs at bottom
  if (appliedJobIds.size > 0) {
    const appliedJobsData = await jobRepo.find({
      where: { id: In(Array.from(appliedJobIds)) },
    });
    for (const job of appliedJobsData) {
      scoredJobs.push({ job, score: 0.1, source: "applied" });
    }
  }

  // Sort: applied jobs at bottom, then by score (descending)
  // Sort in place to ensure proper ordering
  scoredJobs.sort((a, b) => {
    // Applied jobs always go to bottom
    if (a.source === "applied" && b.source !== "applied") return 1;
    if (b.source === "applied" && a.source !== "applied") return -1;
    // For non-applied jobs, sort by score descending (highest first)
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    // If scores are equal, maintain stable sort (keep original order)
    return 0;
  });

  // Separate regular and applied jobs (order is preserved from sort)
  const regular = scoredJobs.filter((item) => item.source !== "applied");
  const applied = scoredJobs.filter((item) => item.source === "applied");

  // Fallback: If no regular recommendations found, return some jobs from database
  // This provides a better user experience by always showing some jobs
  if (regular.length === 0) {
    // Fetch some published, open jobs from the database
    // Exclude applied jobs to avoid duplicates
    const fallbackJobs = await jobRepo.find({
      where: {
        status: "published",
        is_open: true,
      },
      take: topK,
      order: {
        publish_date: "DESC", // Most recent jobs first
      },
    });

    // Filter out applied jobs
    const filteredFallbackJobs = fallbackJobs.filter(
      (job) => !appliedJobIds.has(job.id)
    );

    // Add fallback jobs with a low score to indicate they're not personalized
    const fallbackScored = filteredFallbackJobs.map((job) => ({
      job,
      score: 0.3, // Low score to indicate these are fallback recommendations
      source: "fallback",
    }));

    // Return fallback jobs + applied jobs
    return [...fallbackScored, ...applied];
  }

  // Return top K regular jobs (already sorted by score descending) + all applied jobs
  return [...regular.slice(0, topK), ...applied];
}
