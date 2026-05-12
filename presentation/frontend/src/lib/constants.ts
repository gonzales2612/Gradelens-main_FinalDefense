export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  SCAN: "/scans",
  STUDENTS: "/students",
  STUDENT_PROFILE: "/students/:id",
  CLASSES: "/classes",
  EXAMS: "/exams",
  GRADES: "/grades",
  SECTIONS: "/sections",
  REPORTS: "/reports",
  ACCOUNTS: "/accounts",
} as const;

export const QUERY_KEYS = {
  AUTH_ME: "auth_me",
} as const;

export const AUTH_API_ROUTES = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
} as const;