import type { Template } from "@/types/template.types";

const CV_SERVICE_URL = import.meta.env.VITE_CV_SERVICE_URL || "http://localhost:8000";

export const fetchTemplatesApi = async (): Promise<string[]> => {
  const response = await fetch(`${CV_SERVICE_URL}/templates`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  return response.json();
};

export const fetchTemplateApi = async (templateId: string): Promise<Template> => {
  const response = await fetch(`${CV_SERVICE_URL}/templates/${templateId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }

  return response.json();
};
