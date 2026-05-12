import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StudentsPage from "@/pages/StudentsPage";
import StudentProfilePage from "@/pages/StudentProfilePage";
import ClassesPage from "@/pages/ClassesPage";
import ExamsPage from "@/pages/ExamsPage";
import { GradesPage } from "@/pages/GradesPage";
import { SectionsPage } from "@/pages/SectionsPage";
import ReportsPage from "@/pages/ReportsPage";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { AdminRoute } from "./guards/AdminRoute";
import { PublicRoute } from "./guards/PublicRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { ROUTES } from "@/lib/constants";
import { ScanPage } from "@/pages/ScanPage";
import AccountsPage from "@/pages/AccountsPage";

export function AppRouter() {
    return (
        <BrowserRouter>
        <Routes>
            <Route
            path={ROUTES.LOGIN}
            element={
                <PublicRoute>
                <LoginPage />
                </PublicRoute>
            }
            />

            <Route
            path={ROUTES.DASHBOARD}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <DashboardPage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.SCAN}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <ScanPage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.STUDENTS}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <StudentsPage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.STUDENT_PROFILE}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <StudentProfilePage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.CLASSES}
            element={
                <AdminRoute>
                <AppLayout>
                    <ClassesPage />
                </AppLayout>
                </AdminRoute>
            }
            />

            <Route
            path={ROUTES.EXAMS}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <ExamsPage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.REPORTS}
            element={
                <ProtectedRoute>
                <AppLayout>
                    <ReportsPage />
                </AppLayout>
                </ProtectedRoute>
            }
            />

            <Route
            path={ROUTES.GRADES}
            element={
                <AdminRoute>
                <AppLayout>
                    <GradesPage />
                </AppLayout>
                </AdminRoute>
            }
            />

            <Route
            path={ROUTES.SECTIONS}
            element={
                <AdminRoute>
                <AppLayout>
                    <SectionsPage />
                </AppLayout>
                </AdminRoute>
            }
            />

            <Route
            path={ROUTES.ACCOUNTS}
            element={
                <AdminRoute>
                <AppLayout>
                    <AccountsPage />
                </AppLayout>
                </AdminRoute>
            }
            />
        </Routes>
        </BrowserRouter>
    );
}