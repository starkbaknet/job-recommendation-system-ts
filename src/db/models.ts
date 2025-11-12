import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";

@Entity("jobs")
export class Job {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 50, unique: true })
  reference: string;

  @Column({ type: "int", default: 1 })
  number_of_vacancies: number = 1;

  @Column({ type: "varchar", length: 20, default: "draft" })
  status: string = "draft";

  @Column({ type: "boolean", default: true })
  is_open: boolean = true;

  @Column({ type: "text", nullable: true })
  job_requirements?: string;

  @Column({ type: "text", nullable: true })
  role_summary?: string;

  @Column({ type: "text", nullable: true })
  duties_and_responsibilities?: string;

  @Column({ type: "int", nullable: true })
  minimum_experience?: number;

  @Column({ type: "int", nullable: true })
  maximum_experience?: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  education_level?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  salary_type?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  minimum_salary?: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  maximum_salary?: number;

  @Column({ type: "varchar", length: 10, default: "USD" })
  currency: string = "USD";

  @Column({ type: "varchar", length: 20, default: "monthly" })
  period: string = "monthly";

  @Column({ type: "varchar", length: 20, default: "full_time" })
  work_type: string = "full_time";

  @Column({ type: "varchar", length: 20, default: "any" })
  gender: string = "any";

  @Column({ type: "varchar", length: 100, nullable: true })
  nationality?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  language?: string;

  @Column({ type: "date", nullable: true })
  publish_date?: Date;

  @Column({ type: "date", nullable: true })
  expiry_date?: Date;

  @Column({ type: "uuid", nullable: true })
  company_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  company_name?: string;

  @Column({ type: "boolean", default: false })
  company_is_public: boolean = false;

  @Column({ type: "varchar", length: 20, default: "hybrid" })
  company_work_policy: string = "hybrid";

  @Column({ type: "varchar", length: 50, nullable: true })
  industry_type_id?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry_type_name?: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  country_code?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country_name?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  province_name?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  area_name?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity("applicants")
export class Applicant {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone?: string;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  nationality?: string;

  @Column({ type: "date", nullable: true })
  date_of_birth?: Date;

  @Column({ type: "varchar", length: 20, nullable: true })
  gender?: string;

  @Column({ type: "text", nullable: true })
  address?: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  country_code?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country_name?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  province_name?: string;

  @Column({ type: "text", nullable: true })
  speaking_languages?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ApplicantSkill, (skill: ApplicantSkill) => skill.applicant, {
    cascade: true,
  })
  skills: ApplicantSkill[];

  @OneToMany(
    () => ApplicantFunctionalArea,
    (area: ApplicantFunctionalArea) => area.applicant,
    { cascade: true }
  )
  functional_areas: ApplicantFunctionalArea[];

  @OneToMany(
    () => ApplicantEducation,
    (education: ApplicantEducation) => education.applicant,
    { cascade: true }
  )
  education: ApplicantEducation[];

  @OneToMany(
    () => ApplicantExperience,
    (experience: ApplicantExperience) => experience.applicant,
    { cascade: true }
  )
  experience: ApplicantExperience[];

  @OneToMany(
    () => ApplicantAppliedJob,
    (appliedJob: ApplicantAppliedJob) => appliedJob.applicant,
    { cascade: true }
  )
  applied_jobs: ApplicantAppliedJob[];

  @OneToMany(
    () => ApplicantJobInteraction,
    (interaction: ApplicantJobInteraction) => interaction.applicant,
    { cascade: true }
  )
  job_interactions: ApplicantJobInteraction[];
}

@Entity("applicant_skills")
export class ApplicantSkill {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @ManyToOne(() => Applicant, (applicant: Applicant) => applicant.skills, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @Column({ type: "varchar", length: 100 })
  skill_name: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity("applicant_functional_areas")
export class ApplicantFunctionalArea {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @ManyToOne(
    () => Applicant,
    (applicant: Applicant) => applicant.functional_areas,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @Column({ type: "varchar", length: 100 })
  area_name: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity("applicant_education")
export class ApplicantEducation {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @ManyToOne(() => Applicant, (applicant: Applicant) => applicant.education, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @Column({ type: "varchar", length: 50 })
  level: string;

  @Column({ type: "varchar", length: 255 })
  institute_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  field_of_study?: string;

  @Column({ type: "date", nullable: true })
  start_date?: Date;

  @Column({ type: "date", nullable: true })
  end_date?: Date;

  @CreateDateColumn()
  created_at: Date;
}

@Entity("applicant_experience")
export class ApplicantExperience {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @ManyToOne(() => Applicant, (applicant: Applicant) => applicant.experience, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255 })
  company_name: string;

  @Column({ type: "date" })
  start_date: Date;

  @Column({ type: "date", nullable: true })
  end_date?: Date;

  @Column({ type: "text", nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity("applicant_applied_jobs")
export class ApplicantAppliedJob {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @Column({ type: "uuid" })
  job_id: string;

  @ManyToOne(
    () => Applicant,
    (applicant: Applicant) => applicant.applied_jobs,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @ManyToOne(() => Job, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "varchar", length: 50, default: "applied" })
  status: string = "applied"; // applied, viewed, shortlisted, rejected, etc.

  @CreateDateColumn()
  applied_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity("applicant_job_interactions")
export class ApplicantJobInteraction {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @Column({ type: "uuid" })
  job_id: string;

  @ManyToOne(
    () => Applicant,
    (applicant: Applicant) => applicant.job_interactions,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @ManyToOne(() => Job, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "varchar", length: 50 })
  interaction_type: string; // view, scroll, click, save, share, etc.

  @Column({ type: "int", default: 0 })
  time_spent_seconds: number = 0; // Time spent viewing the job in seconds

  @Column({ type: "int", default: 0 })
  scroll_depth: number = 0; // Percentage of page scrolled (0-100)

  @Column({ type: "int", default: 0 })
  click_count: number = 0; // Number of clicks on the job

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>; // Additional interaction data

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity("job_vectors")
export class JobVector {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid", unique: true })
  job_id: string;

  @ManyToOne(() => Job, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "text" })
  embedding: string; // JSON array of floats

  @CreateDateColumn()
  computed_at: Date;
}

@Entity("applicant_vectors")
export class ApplicantVector {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid", unique: true })
  applicant_id: string;

  @ManyToOne(() => Applicant, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @Column({ type: "text" })
  embedding: string; // JSON array of floats

  @CreateDateColumn()
  computed_at: Date;
}

@Entity("job_recommendations_cache")
export class JobRecommendationsCache {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column({ type: "uuid" })
  applicant_id: string;

  @Column({ type: "uuid" })
  job_id: string;

  @ManyToOne(() => Applicant, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "applicant_id" })
  applicant: Applicant;

  @ManyToOne(() => Job, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "decimal", precision: 5, scale: 4, nullable: true })
  similarity_score?: number;

  @CreateDateColumn()
  computed_at: Date;
}
