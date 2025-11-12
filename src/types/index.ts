export interface JobRecommendation {
  id: string;
  title: string;
  reference: string;
  location: string;
  area_name: string;
  minimum_salary?: number;
  maximum_salary?: number;
  salary_type: string;
  gender: string;
  period: string;
  language: string;
  publish_date: string;
  closing_date: string;
  similarity_score: number;
}

export interface ApplicantResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  nationality?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  country_code: string;
  country_name: string;
  province_name: string;
  speaking_languages?: string;
  created_at: string;
  updated_at: string;
  skills: string[];
  functional_areas: string[];
  education: Array<{
    level: string;
    institute: string;
    field_of_study?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  size: number;
  total_pages: number;
  data: T[];
}
