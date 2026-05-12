import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStudents } from "@/features/students/hooks/useStudents";
import { useScans } from "@/features/scans/hooks/useScans";
import { useExams } from "@/features/exams/hooks/useExams";
import { useSections } from "@/features/sections/hooks/useSections";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconMail, IconId, IconBuilding, IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScanQueue } from "@/features/scans/components/ScanQueue";
import { ScanDetails } from "@/features/scans/components/ScanDetails";

export default function StudentProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { students, loadStudents } = useStudents();
    const { scans, selectedScanId, selectScan, loadScans, deleteScan } = useScans();
    const { exams, loadExams } = useExams();
    const { sections, loadSections } = useSections();

    // Find the student by ID
    const student = useMemo(() => {
        return students.find((s) => s._id === id);
    }, [students, id]);

    // Filter scans for this student
    const studentScans = useMemo(() => {
        return scans.filter((scan) => scan.student_id === id);
    }, [scans, id]);

    // Find the student's section
    const studentSection = useMemo(() => {
        if (!student?.section_id) return null;
        return sections.find((s) => s._id === student.section_id);
    }, [sections, student]);

    useEffect(() => {
        loadStudents();
        loadScans();
        loadExams();
        loadSections();
    }, [loadStudents, loadScans, loadExams, loadSections]);

    if (!student) {
        return (
        <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Student not found</p>
        </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-6 p-6">
        {/* Header with Navigation */}
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/students")}
                className="h-10 w-10 rounded-lg hover:bg-accent"
            >
                <IconArrowLeft className="size-5" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                {student.first_name} {student.last_name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                {student.student_id}
                </p>
            </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                student.status === 'active' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-amber-50 text-amber-700'
            }`}>
            {student.status === 'active' ? (
                <IconCircleCheck className="size-4" />
            ) : (
                <IconAlertCircle className="size-4" />
            )}
            <span className="capitalize">{student.status}</span>
            </div>
        </div>

        {/* Student Info Section */}
        <Card className="border-0 bg-linear-to-br from-slate-50 to-slate-100 shadow-sm">
            <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
                {/* First Name */}
                <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">First Name</p>
                <p className="text-base font-semibold">{student.first_name}</p>
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Name</p>
                <p className="text-base font-semibold">{student.last_name}</p>
                </div>

                {/* Student ID */}
                <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconId className="size-4" />
                    <span>ID</span>
                </div>
                <p className="font-mono text-sm font-semibold">{student.student_id}</p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconMail className="size-4" />
                    <span>Email</span>
                </div>
                <p className="truncate text-sm font-medium">{student.email}</p>
                </div>

                {/* Section */}
                <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <IconBuilding className="size-4" />
                    <span>Section</span>
                </div>
                <p className="text-sm font-semibold">{studentSection?.name || "—"}</p>
                </div>

                {/* Status Badge */}
                <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    student.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                    <span className={`inline-block h-2 w-2 rounded-full ${student.status === 'active' ? 'bg-green-600' : 'bg-amber-600'}`}></span>
                    <span className="capitalize">{student.status}</span>
                </div>
                </div>
            </div>
            </CardContent>
        </Card>

        {/* Scans Section - Two Column Layout */}
        <div className="flex flex-1 gap-6">
            {/* Left Column - Scan Queue */}
            <div className="w-full min-w-0 shrink-0 lg:w-90">
            <ScanQueue 
                scans={studentScans}
                onSelect={selectScan}
                onDelete={(scanId) => {
                  deleteScan(scanId).catch((err) => {
                    console.error("Failed to delete scan:", err);
                  });
                }}
                selectedScanId={selectedScanId || undefined}
                exams={exams}
                students={students}
            />
            </div>

            {/* Right Column - Scan Details */}
            <div className="flex-1 min-w-0">
            <ScanDetails 
                onDelete={() => {
                  // Refresh scans after delete
                  loadScans();
                }}
                exams={exams}
                students={students}
            />
            </div>
        </div>
        </div>
    );
}
