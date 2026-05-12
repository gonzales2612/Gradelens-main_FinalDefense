import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconCamera, IconAlertTriangle } from "@tabler/icons-react";
import { useGrades } from "@/features/grades/hooks/useGrades";
import { useSections } from "@/features/sections/hooks/useSections";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useExams } from "@/features/exams/hooks/useExams";
import { useStudents } from "@/features/students/hooks/useStudents";
import { useTemplate } from "@/hooks/useTemplate";
import { useScans } from "../features/scans/hooks/useScans";
import { useDuplicateScan } from "../features/scans/hooks/useDuplicateScan";

import { LiveScanner } from "../features/scans/components/LiveScanner";
import { ScanFilters } from "../features/scans/components/ScanFilters";
import { AssessmentSelection } from "../features/scans/components/AssessmentSelection";
import { ScanQueue } from "../features/scans/components/ScanQueue";
import { ScanDetails } from "../features/scans/components/ScanDetails";
import type { Class } from "@/features/classes";
import { extractId } from "@/lib/extractId";

export function ScanPage() {
  // State for filters
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // State for scan workflow
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("scanning");
  const [redoExisting, setRedoExisting] = useState<boolean>(false);

  // Use Zustand store for scans
  const { 
    scans, 
    selectedScan, 
    selectedScanId,
    loadScans, 
    selectScan,
    uploadScan,
    deleteScan
  } = useScans();

  // Detect duplicate scans
  const { hasDuplicate, existingScan } = useDuplicateScan({
    scans,
    selectedExam,
    selectedStudent,
  });

  // Load data
  const { grades, loadGrades } = useGrades();
  const { sections, loadSections } = useSections();
  const { classes, loadClasses } = useClasses();
  const { exams, loadExams } = useExams();
  const { students, loadStudents } = useStudents();

  // Load template based on selected exam
  const selectedExamDetails = exams.find(q => q._id === selectedExam);
  const { template } = useTemplate(selectedExamDetails?.template_id);

  // Load initial data once on mount
  // Using useRef to ensure functions are called only once and avoid dependency issues
  const initialLoadRef = useRef(false);
  
  useEffect(() => {
    // Prevent double execution in React StrictMode during development
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    // Load all initial data
    const loadInitialData = async () => {
      await Promise.all([
        loadGrades(),
        loadSections(),
        loadClasses(),
        loadExams(),
        loadStudents(),
        loadScans(),
      ]);
    };

    loadInitialData();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - load once on mount

  // Filter sections by selected grade
  const filteredSections = selectedGrade
      ? sections.filter(s => extractId(s.grade_id) === selectedGrade)
      : sections;

  // Filter classes by selected grade/section
  const filteredClasses = classes.filter(c => {
    if (selectedGrade && c.grade_id !== selectedGrade) return false;
    if (selectedSection) {
      // Class may belong to multiple sections (section_ids array)
      // support both new `section_ids` and possible legacy `section_id` fields
      const sectionIds: string[]  = Array.isArray((c as Class).section_ids)
        ? ((c as Class).section_ids as string[])
        : [];

      if (sectionIds.length > 0) {
        if (!sectionIds.includes(selectedSection)) return false;
      } else {
        // no section info on class, exclude when a section is selected
        return false;
      }
    }
    return true;
  });

  // Find selected exam details
  const examDetails = exams.find(q => q._id === selectedExam);

  // Filter students by selected grade/section/class and exam's class
  const filteredStudents = students.filter(s => {
    if (selectedGrade && s.grade_id !== selectedGrade) return false;
    if (selectedSection && s.section_id !== selectedSection) return false;
    if (selectedClass && !s.class_ids?.includes(selectedClass)) return false;
    
    // If exam is selected, only show students from that exam's class
    if (selectedExam && examDetails?.class_id) {
      const examClassId = typeof examDetails.class_id === 'string' 
        ? examDetails.class_id 
        : extractId(examDetails.class_id);
      if (examClassId && !s.class_ids?.includes(examClassId)) return false;
    }
    
    return true;
  });

  const handleSaveScan = async () => {
    // Refresh scans - the store will handle refreshing selected scan automatically
    await loadScans();
  };

  const handleRedoScan = () => {
    if (!selectedScan) return;
    
    // Pre-fill the exam and student from the current scan
    const exam = exams.find(q => q._id === selectedScan.exam_id);
    const student = students.find(s => s._id === selectedScan.student_id);
    
    if (exam && student) {
      setSelectedExam(exam._id!);
      setSelectedStudent(student._id!);
      // Switch to upload tab for re-scanning
      setActiveTab("upload");
    }
  };

  const handleLiveCapture = async (imageData: string) => {
    if (!selectedExam || !selectedStudent) return;

    try {
      const scanId = await uploadScan({
        image: imageData,
        exam_id: selectedExam,
        student_id: selectedStudent,
        redo_existing: redoExisting,
      });

      // Select the newly uploaded scan (will trigger polling)
      selectScan(scanId);

      // Reset redo flag after upload
      setRedoExisting(false);
    } catch (error) {
      console.error("Failed to upload scan:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-bold">Scan Management</h1>
        <p className="text-muted-foreground">Scan, upload, or manually enter student answer sheets</p>
      </div>

      {/* Filters Row */}
      <ScanFilters
        grades={grades}
        sections={sections}
        classes={classes}
        selectedGrade={selectedGrade}
        selectedSection={selectedSection}
        selectedClass={selectedClass}
        onGradeChange={(value) => {
          setSelectedGrade(value);
          setSelectedSection("");
          setSelectedClass("");
        }}
        onSectionChange={(value) => {
          setSelectedSection(value);
          setSelectedClass("");
        }}
        onClassChange={setSelectedClass}
        filteredSections={filteredSections}
        filteredClasses={filteredClasses}
      />

      {/* Assessment Selection Row */}
      <AssessmentSelection
        exams={exams}
        students={filteredStudents}
        selectedExam={selectedExam}
        selectedStudent={selectedStudent}
        onExamChange={setSelectedExam}
        onStudentChange={setSelectedStudent}
        examDetails={examDetails}
        hasDuplicate={hasDuplicate}
      />

      {/* Duplicate Scan Warning */}
      {hasDuplicate && existingScan && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardContent>
            <div className="flex items-start gap-4">
              <IconAlertTriangle className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                    Duplicate Scan Detected
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                    A scan already exists for this exam and student combination (Status is <span className="font-medium">{existingScan.status}</span>).
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <input
                    type="checkbox"
                    id="redo-existing"
                    checked={redoExisting}
                    onChange={(e) => setRedoExisting(e.target.checked)}
                    className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label
                    htmlFor="redo-existing"
                    className="text-sm font-medium text-orange-900 dark:text-orange-100 cursor-pointer"
                  >
                    Update existing scan (replace with new image)
                  </label>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 pl-1">
                  {redoExisting 
                    ? "✓ The existing scan will be updated with the new image and re-processed."
                    : "⚠ The existing scan will be marked as 'outdated' and a new scan will be created."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Input Row */}
            <Card>
        <CardHeader>
          <CardTitle>Scan Input</CardTitle>
          <CardDescription>Use the camera to scan student answer sheets</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="scanning" className="flex items-center gap-2">
                <IconCamera className="h-4 w-4" />
                Scanning
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanning" className="space-y-4 py-4">
              <LiveScanner
                selectedExam={selectedExam}
                selectedStudent={selectedStudent}
                template={template || undefined}
                onCapture={handleLiveCapture}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Scan Queue and Details Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scan Queue - Smaller Column */}
        <div className="lg:col-span-4">
          <ScanQueue
            scans={scans}
            selectedScanId={selectedScanId || undefined}
            onSelect={selectScan}
            onDelete={(scanId) => {
              deleteScan(scanId).catch((err) => {
                console.error("Failed to delete scan:", err);
              });
            }}
            exams={exams}
            students={students}
            showProfileLink={true}
          />
        </div>

        {/* Scan Details - Larger Column */}
        <div className="lg:col-span-8">
          <ScanDetails
            onSave={handleSaveScan}
            onRedoScan={handleRedoScan}
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
