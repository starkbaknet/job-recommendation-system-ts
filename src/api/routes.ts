import { Router, Request, Response } from "express";
import { AppDataSource } from "../db/database";
import {
  Job,
  Applicant,
  ApplicantSkill,
  ApplicantFunctionalArea,
  ApplicantEducation,
  ApplicantExperience,
  ApplicantAppliedJob,
  ApplicantJobInteraction,
  JobVector,
  ApplicantVector,
} from "../db/models";
import { getRecommendationsForApplicant } from "../utils/recommendation";
import {
  JobRecommendation,
  ApplicantResponse,
  PaginatedResponse,
} from "../types";
import { validate as uuidValidate } from "uuid";

const router = Router();

/**
 * Helper function to safely convert date to ISO string format
 * Returns "N/A" for null/undefined dates (for required fields)
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";

  if (typeof date === "string") {
    // If it's already a string, try to parse and format it
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return date; // Return original string if parsing fails
      }
      return parsed.toISOString().split("T")[0];
    } catch {
      return date; // Return original string if parsing fails
    }
  }

  // If it's a Date object
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }

  return "N/A";
}

/**
 * Helper function to safely convert date to ISO string format for optional fields
 * Returns undefined for null/undefined dates
 */
function formatOptionalDate(
  date: Date | string | null | undefined
): string | undefined {
  if (!date) return undefined;

  if (typeof date === "string") {
    try {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return date;
      }
      return parsed.toISOString().split("T")[0];
    } catch {
      return date;
    }
  }

  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Format job to recommendation response
 */
function formatJobRecommendation(job: Job, score: number): JobRecommendation {
  const province = job.province_name || "N/A";
  const country = job.country_name || "N/A";
  const location =
    province !== "N/A" || country !== "N/A" ? `${province}, ${country}` : "N/A";

  return {
    id: job.id,
    title: job.title || "",
    reference: job.reference || "",
    location,
    area_name: job.area_name || "N/A",
    minimum_salary: job.minimum_salary
      ? parseFloat(job.minimum_salary.toString())
      : undefined,
    maximum_salary: job.maximum_salary
      ? parseFloat(job.maximum_salary.toString())
      : undefined,
    salary_type: job.salary_type || "Not specified",
    gender: job.gender || "any",
    period: job.period || "monthly",
    language: job.language || "any",
    publish_date: formatDate(job.publish_date),
    closing_date: formatDate(job.expiry_date),
    similarity_score: score,
  };
}

/**
 * Format applicant to response
 */
async function formatApplicantResponse(
  applicant: Applicant
): Promise<ApplicantResponse> {
  const skills = await AppDataSource.getRepository(ApplicantSkill).find({
    where: { applicant_id: applicant.id },
  });

  const functionalAreas = await AppDataSource.getRepository(
    ApplicantFunctionalArea
  ).find({
    where: { applicant_id: applicant.id },
  });

  const education = await AppDataSource.getRepository(ApplicantEducation).find({
    where: { applicant_id: applicant.id },
  });

  const experience = await AppDataSource.getRepository(
    ApplicantExperience
  ).find({
    where: { applicant_id: applicant.id },
  });

  return {
    id: applicant.id,
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone || undefined,
    bio: applicant.bio || undefined,
    nationality: applicant.nationality || undefined,
    date_of_birth: formatOptionalDate(applicant.date_of_birth),
    gender: applicant.gender || undefined,
    address: applicant.address || undefined,
    country_code: applicant.country_code || "",
    country_name: applicant.country_name || "",
    province_name: applicant.province_name || "",
    speaking_languages: applicant.speaking_languages || undefined,
    created_at: applicant.created_at.toISOString(),
    updated_at: applicant.updated_at.toISOString(),
    skills: skills.map((s: ApplicantSkill) => s.skill_name),
    functional_areas: functionalAreas.map(
      (fa: ApplicantFunctionalArea) => fa.area_name
    ),
    education: education.map((edu: ApplicantEducation) => ({
      level: edu.level,
      institute: edu.institute_name,
      field_of_study: edu.field_of_study || undefined,
    })),
    experience: experience.map((exp: ApplicantExperience) => ({
      title: exp.title,
      company: exp.company_name,
      start_date: formatOptionalDate(exp.start_date),
      end_date: formatOptionalDate(exp.end_date),
      description: exp.description || undefined,
    })),
  };
}

/**
 * GET /recommendations/:applicant_id
 */
router.get(
  "/recommendations/:applicant_id",
  async (req: Request, res: Response) => {
    try {
      const { applicant_id } = req.params;
      const topK = parseInt(req.query.top_k as string) || 10;
      const minThreshold =
        parseFloat(req.query.min_similarity_threshold as string) || 0.6;

      // Validate UUID
      if (!uuidValidate(applicant_id)) {
        return res.status(400).json({ detail: "Invalid applicant ID format" });
      }

      // Validate top_k
      if (topK < 1 || topK > 200) {
        return res
          .status(400)
          .json({ detail: "top_k must be between 1 and 200" });
      }

      // Validate threshold
      if (minThreshold < 0 || minThreshold > 1) {
        return res.status(400).json({
          detail: "min_similarity_threshold must be between 0.0 and 1.0",
        });
      }

      // Get applicant
      const applicantRepo = AppDataSource.getRepository(Applicant);
      const applicant = await applicantRepo.findOne({
        where: { id: applicant_id },
        relations: ["skills", "functional_areas", "education", "experience"],
      });

      if (!applicant) {
        return res
          .status(404)
          .json({ detail: `No applicant found with id ${applicant_id}` });
      }

      // Get recommendations
      const jobRepo = AppDataSource.getRepository(Job);
      const appliedJobRepo = AppDataSource.getRepository(ApplicantAppliedJob);
      const interactionRepo = AppDataSource.getRepository(
        ApplicantJobInteraction
      );
      const jobVectorRepo = AppDataSource.getRepository(JobVector);
      const applicantVectorRepo = AppDataSource.getRepository(ApplicantVector);
      const recommendations = await getRecommendationsForApplicant(
        jobRepo,
        appliedJobRepo,
        interactionRepo,
        jobVectorRepo,
        applicantVectorRepo,
        applicant,
        topK,
        minThreshold
      );

      // Format response
      const formatted = recommendations.map(
        ({ job, score }: { job: Job; score: number; source?: string }) =>
          formatJobRecommendation(job, score)
      );

      res.json(formatted);
    } catch (error: any) {
      console.error("Error getting recommendations:", error);
      res
        .status(500)
        .json({ detail: `Error processing request: ${error.message}` });
    }
  }
);

/**
 * GET /recommendations/:applicant_id/paginated
 */
router.get(
  "/recommendations/:applicant_id/paginated",
  async (req: Request, res: Response) => {
    try {
      const { applicant_id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const size = parseInt(req.query.size as string) || 10;
      const minThreshold =
        parseFloat(req.query.min_similarity_threshold as string) || 0.6;

      // Validate UUID
      if (!uuidValidate(applicant_id)) {
        return res.status(400).json({ detail: "Invalid applicant ID format" });
      }

      // Validate pagination
      if (page < 1) {
        return res.status(400).json({ detail: "page must be >= 1" });
      }
      if (size < 1 || size > 100) {
        return res
          .status(400)
          .json({ detail: "size must be between 1 and 100" });
      }

      // Get applicant
      const applicantRepo = AppDataSource.getRepository(Applicant);
      const applicant = await applicantRepo.findOne({
        where: { id: applicant_id },
        relations: ["skills", "functional_areas", "education", "experience"],
      });

      if (!applicant) {
        return res
          .status(404)
          .json({ detail: `No applicant found with id ${applicant_id}` });
      }

      // Get all recommendations (up to 200)
      const jobRepo = AppDataSource.getRepository(Job);
      const appliedJobRepo = AppDataSource.getRepository(ApplicantAppliedJob);
      const interactionRepo = AppDataSource.getRepository(
        ApplicantJobInteraction
      );
      const jobVectorRepo = AppDataSource.getRepository(JobVector);
      const applicantVectorRepo = AppDataSource.getRepository(ApplicantVector);
      const allRecommendations = await getRecommendationsForApplicant(
        jobRepo,
        appliedJobRepo,
        interactionRepo,
        jobVectorRepo,
        applicantVectorRepo,
        applicant,
        200,
        minThreshold
      );

      // Paginate
      const total = allRecommendations.length;
      const startIdx = (page - 1) * size;
      const endIdx = startIdx + size;
      const paginatedData = allRecommendations.slice(startIdx, endIdx);

      const totalPages = Math.ceil(total / size);

      const response: PaginatedResponse<JobRecommendation> = {
        total,
        page,
        size,
        total_pages: totalPages,
        data: paginatedData.map(
          ({ job, score }: { job: Job; score: number; source?: string }) =>
            formatJobRecommendation(job, score)
        ),
      };

      res.json(response);
    } catch (error: any) {
      console.error("Error getting paginated recommendations:", error);
      res
        .status(500)
        .json({ detail: `Error processing request: ${error.message}` });
    }
  }
);

/**
 * GET /jobs
 */
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const areaName = req.query.area_name as string | undefined;
    const companyName = req.query.company_name as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;

    const jobRepo = AppDataSource.getRepository(Job);
    let query = jobRepo.createQueryBuilder("job");

    if (areaName) {
      query = query.where("job.area_name = :areaName", { areaName });
    }
    if (companyName) {
      query = query.andWhere("job.company_name = :companyName", {
        companyName,
      });
    }

    const total = await query.getCount();
    const jobs = await query
      .skip((page - 1) * size)
      .take(size)
      .getMany();

    const totalPages = Math.ceil(total / size);

    const response: PaginatedResponse<JobRecommendation> = {
      total,
      page,
      size,
      total_pages: totalPages,
      data: jobs.map((job: Job) => formatJobRecommendation(job, 0.0)),
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error getting jobs:", error);
    res
      .status(500)
      .json({ detail: `Error processing request: ${error.message}` });
  }
});

/**
 * GET /jobs/:job_id
 */
router.get("/jobs/:job_id", async (req: Request, res: Response) => {
  try {
    const { job_id } = req.params;

    if (!uuidValidate(job_id)) {
      return res.status(400).json({ detail: "Invalid job ID format" });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const job = await jobRepo.findOne({ where: { id: job_id } });

    if (!job) {
      return res.status(404).json({ detail: "Job not found" });
    }

    res.json(formatJobRecommendation(job, 0.0));
  } catch (error: any) {
    console.error("Error getting job:", error);
    res
      .status(500)
      .json({ detail: `Error processing request: ${error.message}` });
  }
});

/**
 * GET /applicants
 */
router.get("/applicants", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;

    const applicantRepo = AppDataSource.getRepository(Applicant);
    const total = await applicantRepo.count();
    const applicants = await applicantRepo.find({
      skip: (page - 1) * size,
      take: size,
    });

    const formattedApplicants = await Promise.all(
      applicants.map((applicant) => formatApplicantResponse(applicant))
    );

    const totalPages = Math.ceil(total / size);

    const response: PaginatedResponse<ApplicantResponse> = {
      total,
      page,
      size,
      total_pages: totalPages,
      data: formattedApplicants,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error getting applicants:", error);
    res
      .status(500)
      .json({ detail: `Error processing request: ${error.message}` });
  }
});

/**
 * GET /applicants/:applicant_id
 */
router.get("/applicants/:applicant_id", async (req: Request, res: Response) => {
  try {
    const { applicant_id } = req.params;

    if (!uuidValidate(applicant_id)) {
      return res.status(400).json({ detail: "Invalid applicant ID format" });
    }

    const applicantRepo = AppDataSource.getRepository(Applicant);
    const applicant = await applicantRepo.findOne({
      where: { id: applicant_id },
      relations: ["skills", "functional_areas", "education", "experience"],
    });

    if (!applicant) {
      return res.status(404).json({ detail: "Applicant not found" });
    }

    const formatted = await formatApplicantResponse(applicant);
    res.json(formatted);
  } catch (error: any) {
    console.error("Error getting applicant:", error);
    res
      .status(500)
      .json({ detail: `Error processing request: ${error.message}` });
  }
});

/**
 * GET /health
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
