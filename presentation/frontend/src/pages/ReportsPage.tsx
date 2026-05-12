// pages/ReportPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useExams } from "@/features/exams/hooks/useExams";
import { useReports } from "@/features/report/hooks/useReports";
import PLEntries from "@/features/report/components/PLEntries";
import ItemEntries from "@/features/report/components/ItemEntries";
import SummaryEntries from "@/features/report/components/SummaryEntries";
import type { Class as ClassType } from "@/features/classes/types/classes.types";
import type { Grade as GradeType } from "@/features/grades/types/grades.types";
import type { Exam as ExamType } from "@/features/exams/types/exams.types";
import {
  IconChartBar,
  IconClipboardList,
  IconGauge,
  IconDownload,
} from "@tabler/icons-react";
import { extractId } from "@/lib/extractId";

export default function ReportPage() {
    const [selectedGrade, setSelectedGrade] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedExam, setSelectedExam] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("pl-entries");
    const [plView, setPlView] = useState<"section" | "overall">("section");
    const [itemView, setItemView] = useState<"section" | "overall">("section");
    const [isExporting, setIsExporting] = useState(false);

    const { grades, loadGrades } = useGrades();
    const { classes, loadClasses } = useClasses();
    const { exams, loadExams } = useExams();
    const { 
      plData, 
      itemData,
      loading: isLoadingReport, 
      error: reportError, 
      loadPLEntries,
      loadItemEntries,
      exportReport,
      reset 
    } = useReports();

    useEffect(() => {
        loadGrades();
        loadClasses();
        loadExams();
        // intentionally run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Add useEffect to reload item entries when view changes
    useEffect(() => {
        if (plData && selectedGrade && selectedClass && selectedExam) {
            loadItemEntries({
                grade_id: selectedGrade,
                class_id: selectedClass,
                exam_id: selectedExam,
                view: itemView,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemView]);

    useEffect(() => {
        if (plData && selectedGrade && selectedClass && selectedExam) {
            loadPLEntries({
                grade_id: selectedGrade,
                class_id: selectedClass,
                exam_id: selectedExam,
                view: plView,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plView]);

    // Filter classes by selected grade
    const availableClasses = useMemo(() => {
        if (!selectedGrade) return [] as ClassType[];
        return classes.filter((c: ClassType) => extractId(c.grade_id) === selectedGrade) as ClassType[];
    }, [classes, selectedGrade]);

    // Filter exams by selected class
    const availableExams = useMemo(() => {
        if (!selectedClass) return [] as ExamType[];

        return exams.filter((e: ExamType) => {
        // Handle exam.class_id being ObjectId or string
        const examClassId = extractId(e.class_id);
        return examClassId === selectedClass;
        }) as ExamType[];
    }, [exams, selectedClass]);

    const handleGradeChange = (value: string) => {
        setSelectedGrade(value);
        setSelectedClass("");
        setSelectedExam("");
        reset();
    };

    const handleClassChange = (value: string) => {
        setSelectedClass(value);
        setSelectedExam("");
        reset();
    };

    const handleExamChange = (value: string) => {
        setSelectedExam(value);
        reset();
    };

    const isReady = Boolean(selectedGrade && selectedClass && selectedExam);

    const handleGenerateReport = async () => {
        if (!isReady) return;

        // Load both reports
        await Promise.all([
            loadPLEntries({
                grade_id: selectedGrade,
                class_id: selectedClass,
                exam_id: selectedExam,
                view: plView,
            }),
            loadItemEntries({
                grade_id: selectedGrade,
                class_id: selectedClass,
                exam_id: selectedExam,
                view: itemView,
            })
        ]);
    };

    // Handle tab change - load data if not already loaded
    const handleTabChange = async (value: string) => {
        setActiveTab(value);

        if (!isReady) return;

        const params = {
            grade_id: selectedGrade,
            class_id: selectedClass,
            exam_id: selectedExam,
        };

        // Lazy load data when switching tabs
        if (value === "pl-entries" && !plData) {
            await loadPLEntries(params);
        } else if (value === "item-entries" && !itemData) {
            await loadItemEntries(params);
        }
        // Summary tab uses plData.sections, so ensure it's loaded
        if (value === "summary" && !plData) {
            await loadPLEntries(params);
        }
    };

            useEffect(() => {
        console.log("========== REPORT DEBUG ==========");
        console.log("Selected Grade:", selectedGrade);
        console.log("Selected Class:", selectedClass);
        console.log("Selected Exam:", selectedExam);
        console.log("PL Data:", plData);
        console.log("Item Data:", itemData);
        console.log("Report Error:", reportError);
        console.log("==================================");
        }, [selectedGrade, selectedClass, selectedExam, plData, itemData, reportError]);

    return (
        <div className="min-h-screen bg-linear-to-br from-background via-background to-secondary/10">
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    Mean / PL / MPS
                </h1>
                <p className="mt-2 text-base text-muted-foreground">
                    Comprehensive analysis of student performance across all sections
                </p>
                </div>
            </div>
            </div>

            {/* Filters Section */}
            <Card className="mb-8 border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
                <div className="grid gap-4 grid-cols-1 2xl:grid-cols-2">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2 2xl:min-w-50">
                    <label className="text-sm font-semibold text-foreground">
                        Grade
                    </label>
                    <Select value={selectedGrade} onValueChange={handleGradeChange}>
                        <SelectTrigger className="bg-background w-full">
                        <SelectValue placeholder="Select a grade" />
                        </SelectTrigger>
                        <SelectContent>
                        {grades.map((g: GradeType) => (
                            <SelectItem key={g._id} value={g._id}>
                            {g.name || g._id}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="flex flex-col gap-2 2xl:min-w-50">
                    <label className="text-sm font-semibold text-foreground">
                        Class
                    </label>
                    <Select
                        value={selectedClass}
                        onValueChange={handleClassChange}
                        disabled={!selectedGrade}
                    >
                        <SelectTrigger className="bg-background w-full">
                        <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableClasses.map((classItem: ClassType) => (
                            <SelectItem key={classItem._id} value={classItem._id}>
                            {classItem.name ||
                                classItem.class_id ||
                                classItem._id}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="flex flex-col gap-2 2xl:min-w-50">
                    <label className="text-sm font-semibold text-foreground">
                        Exam
                    </label>
                    <Select
                        value={selectedExam}
                        onValueChange={handleExamChange}
                        disabled={!selectedClass}
                    >
                        <SelectTrigger className="bg-background w-full">
                        <SelectValue placeholder="Select an exam" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableExams.map((exam: ExamType) => (
                            <SelectItem key={exam._id} value={exam._id}>
                            {exam.name || exam.exam_id || exam._id}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                        Academic Year
                    </label>
                    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                        2024-2025
                    </div>
                    </div>

                    <div className="flex flex-1 items-end gap-2">
                    <Button
                        disabled={!isReady || isLoadingReport}
                        onClick={handleGenerateReport}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isLoadingReport ? "Generating..." : "Generate Report"}
                    </Button>
                    
                    <Button
                        disabled={!plData || isExporting}
                        onClick={async () => {
                          setIsExporting(true);
                          try {
                            await exportReport({
                              grade_id: selectedGrade,
                              class_id: selectedClass,
                              exam_id: selectedExam,
                            });
                          } catch (error) {
                            console.error("Export failed:", error);
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <IconDownload className="w-4 h-4" />
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                    </div>
                </div>
                </div>

                {reportError && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{reportError}</p>
                </div>
                )}
            </CardContent>
            </Card>

            {/* Tabs - Always visible after first generation attempt */}
            {(plData || itemData || isLoadingReport || reportError) && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pl-entries">
                    <IconGauge className="w-4 h-4 mr-2" />
                    PL-Entries
                </TabsTrigger>
                <TabsTrigger value="item-entries">
                    <IconChartBar className="w-4 h-4 mr-2" />
                    Item-Entries
                </TabsTrigger>
                <TabsTrigger value="summary">
                    <IconClipboardList className="w-4 h-4 mr-2" />
                    Summary
                </TabsTrigger>
                </TabsList>

                <TabsContent value="pl-entries" className="mt-6">
                {/* View Toggle */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">View:</span>
                    <Button
                        variant={plView === "section" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlView("section")}
                    >
                        By Section
                    </Button>
                    <Button
                        variant={plView === "overall" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlView("overall")}
                    >
                        Overall
                    </Button>
                </div>
                <PLEntries
                    sections={plData?.sections || []}
                    overall={plData?.overall || null}
                    view={plView}
                    isLoading={isLoadingReport && activeTab === "pl-entries"}
                    error={activeTab === "pl-entries" ? reportError : null}
                />
                </TabsContent>

                <TabsContent value="item-entries" className="mt-6">
                    {/* View Toggle */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">View:</span>
                        <Button
                            variant={itemView === "section" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setItemView("section")}
                        >
                            By Section
                        </Button>
                        <Button
                            variant={itemView === "overall" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setItemView("overall")}
                        >
                            Overall
                        </Button>
                    </div>
                    <ItemEntries
                        sections={itemData?.sections || []}
                        overall={itemData?.overall || null}
                        view={itemView}
                        isLoading={isLoadingReport && activeTab === "item-entries"}
                        error={activeTab === "item-entries" ? reportError : null}
                    />
                </TabsContent>

                <TabsContent value="summary" className="mt-6">
                <SummaryEntries
                    sections={plData?.sections || []}
                    isLoading={isLoadingReport && activeTab === "summary"}
                    error={activeTab === "summary" ? reportError : null}
                />
                </TabsContent>
            </Tabs>
            )}
        </div>
        </div>
    );
}