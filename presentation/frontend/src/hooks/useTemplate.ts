import { useState, useEffect } from "react";
import { fetchTemplateApi } from "@/api/templates.api";
import type { Template } from "@/types/template.types";

export function useTemplate(templateId: string | undefined) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!templateId) {
      setTemplate(null);
      return;
    }

    let cancelled = false;

    const loadTemplate = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchTemplateApi(templateId);
        if (!cancelled) {
          setTemplate(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template");
          setTemplate(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return { template, loading, error };
}
