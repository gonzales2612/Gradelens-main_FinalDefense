export const API_ROUTES = {
    BASE: {
        API: "/api",
    },
    AUTH: {
        LOGIN: "/auth/login",
        REFRESH: "/auth/refresh",
        REFRESH_PATH: "/api/auth/refresh",
        LOGOUT: "/auth/logout",
        ME: "/auth/me",
    },
    SCANS: {
        BASE: "/scans",
        BY_ID: (scanId: string) => `/scans/${scanId}`,
        ANSWERS: (scanId: string) => `/scans/${scanId}/answers`,
        REVIEWED: (scanId: string) => `/scans/${scanId}/reviewed`,
    },
    STUDENTS: {
        BASE: "/students",
        BY_ID: (studentId: string) => `/students/${studentId}`,
        BY_STUDENT_ID: (studentId: string) => `/students/by-student-id/${studentId}`,
    },
    CLASSES: {
        BASE: "/classes",
        BY_ID: (classId: string) => `/classes/${classId}`,
        STUDENTS: (classId: string) => `/classes/${classId}/students`,
        REMOVE_STUDENT: (classId: string, studentId: string) => `/classes/${classId}/students/${studentId}`,
    },
    EXAMS: {
        BASE: "/exams",
        BY_ID: (examId: string) => `/exams/${examId}`,
        STATUS: (examId: string) => `/exams/${examId}/status`,
        STATISTICS: (examId: string) => `/exams/${examId}/statistics`,
        SCANS: (examId: string) => `/exams/${examId}/scans`,
    },
    GRADES: {
        BASE: "/grades",
        BY_ID: (gradeId: string) => `/grades/${gradeId}`,
    },
    SECTIONS: {
        BASE: "/sections",
        BY_ID: (sectionId: string) => `/sections/${sectionId}`,
    },
    ACCOUNTS: {
        BASE: "/accounts",
        STATS: "/accounts/stats",
    },
    HEALTH: "/",
} as const;