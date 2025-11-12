import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
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
  JobRecommendationsCache,
} from "./models";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/job_recommender",
  entities: [
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
    JobRecommendationsCache,
  ],
  synchronize: false, // We'll use migrations or init.sql
  logging: false,
});

export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("Database connection established");
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await AppDataSource.destroy();
}
