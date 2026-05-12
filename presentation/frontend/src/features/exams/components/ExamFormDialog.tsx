import { useEffect, useState } from "react";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconPlus,
  IconTrash,
  IconScan,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { Loading } from "@/components/loading";
import type { Exam } from "../types/exams.types";
import { LiveScanner } from "@/features/scans/components/LiveScanner";
import { useTemplate } from "@/hooks/useTemplate";
import { uploadAnswerKeyScanApi } from "@/features/scans/api/scans.api";
import { useScanPolling } from "@/features/scans/hooks/useScanPolling";

const MAX_QUESTIONS = 60;
const DEFAULT_TEMPLATE_ID = "gl_form_60";

const answerSchema = z.object({
  question_id: z
    .number()
    .min(1, "Question ID must be positive")
    .max(MAX_QUESTIONS, `Question ID cannot be greater than ${MAX_QUESTIONS}`),
  correct: z.string().regex(/^[A-E]$/, "Answer must be A, B, C, D, or E"),
  points: z.number().min(0, "Points must be non-negative").default(1),
});

const examSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  description: z.string().optional(),
  template_id: z.string(),
  class_id: z.string().min(1, "Class is required"),
  scheduled_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
  answers: z
    .array(answerSchema)
    .min(1, "At least one answer is required")
    .max(MAX_QUESTIONS, `Only up to ${MAX_QUESTIONS} questions are allowed`),
});

type ExamFormData = z.infer<typeof examSchema>;
type Answer = z.infer<typeof answerSchema>;

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExamFormData) => Promise<boolean>;
  exam?: Exam;
  mode: "create" | "edit";
  classes?: Array<{ _id: string; name: string; class_id: string }>;
}

export function ExamFormDialog({
  open,
  onOpenChange,
  onSubmit,
  exam,
  mode,
  classes = [],
}: ExamFormDialogProps) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isScanningAnswerKey, setIsScanningAnswerKey] = useState(false);
  const [answerKeyScanId, setAnswerKeyScanId] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema) as unknown as Resolver<ExamFormData>,
    defaultValues: {
      status: "draft",
      template_id: DEFAULT_TEMPLATE_ID,
      answers: [],
    },
  });

  const templateId = watch("template_id");
  const { template } = useTemplate(templateId);

  const { scan: answerKeyScan } = useScanPolling(
    answerKeyScanId,
    !!answerKeyScanId && isScanningAnswerKey
  );

  const setFixedAnswers = (items: Answer[]) => {
    const fixedAnswers = items.slice(0, MAX_QUESTIONS).map((answer, index) => ({
      ...answer,
      question_id: index + 1,
    }));

    setAnswers(fixedAnswers);
    setValue("answers", fixedAnswers);
  };

  useEffect(() => {
    if (!answerKeyScan || !isScanningAnswerKey) return;

    if (
      answerKeyScan.status === "detected" ||
      answerKeyScan.status === "graded"
    ) {
      const detections = answerKeyScan.detection_result?.detections;

      if (detections && detections.length > 0) {
        const scannedAnswers: Answer[] = detections
          .filter(
            (d) =>
              d.question_id >= 1 &&
              d.question_id <= MAX_QUESTIONS &&
              d.selected &&
              d.selected.length === 1
          )
          .slice(0, MAX_QUESTIONS)
          .map((d) => ({
            question_id: d.question_id,
            correct: d.selected[0],
            points: 1,
          }));

        if (scannedAnswers.length > 0) {
          setFixedAnswers(scannedAnswers);
          setIsScanningAnswerKey(false);
          setAnswerKeyScanId(undefined);
        }
      }
    }
  }, [answerKeyScan, isScanningAnswerKey, setValue]);

  const generateAnswerKey = () => {
    const newAnswers: Answer[] = [];

    for (let i = 1; i <= MAX_QUESTIONS; i++) {
      newAnswers.push({
        question_id: i,
        correct: "A",
        points: 1,
      });
    }

    setFixedAnswers(newAnswers);
  };

  useEffect(() => {
    if (exam && mode === "edit") {
      setValue("name", exam.name);
      setValue("description", exam.description || "");
      setValue("template_id", exam.template_id || DEFAULT_TEMPLATE_ID);

      if (exam.class_id) {
        const cid =
          typeof exam.class_id === "string"
            ? exam.class_id
            : typeof exam.class_id === "object" && "_id" in exam.class_id
              ? (exam.class_id as { _id: string })._id
              : "";

        setValue("class_id", cid);
      } else {
        setValue("class_id", "");
      }

      setValue("status", exam.status);

      if (exam.scheduled_date) {
        const date = new Date(exam.scheduled_date);
        setValue("scheduled_date", date.toISOString().split("T")[0]);
      }

      if (exam.due_date) {
        const date = new Date(exam.due_date);
        setValue("due_date", date.toISOString().split("T")[0]);
      }

      if (exam.answers && exam.answers.length > 0) {
        const limitedAnswers = exam.answers
          .slice(0, MAX_QUESTIONS)
          .map((answer, index) => ({
            ...answer,
            question_id: index + 1,
          }));

        setFixedAnswers(limitedAnswers);
      }
    } else {
      reset({
        name: "",
        description: "",
        template_id: DEFAULT_TEMPLATE_ID,
        class_id: "",
        scheduled_date: "",
        due_date: "",
        status: "draft",
        answers: [],
      });

      setAnswers([]);
    }
  }, [exam, mode, setValue, reset]);

  const updateAnswer = (
    index: number,
    field: keyof Omit<Answer, "question_id">,
    value: string | number
  ) => {
    const newAnswers = [...answers];

    if (field === "points") {
      newAnswers[index][field] = Number(value);
    } else {
      newAnswers[index][field] = value as string;
    }

    setFixedAnswers(newAnswers);
  };

  const addAnswer = () => {
    if (answers.length >= MAX_QUESTIONS) {
      return;
    }

    const newAnswer: Answer = {
      question_id: answers.length + 1,
      correct: "A",
      points: 1,
    };

    setFixedAnswers([...answers, newAnswer]);
  };

  const removeAnswer = (index: number) => {
    const newAnswers = answers.filter((_, i) => i !== index);

    setFixedAnswers(newAnswers);
  };

  const handleAnswerKeyCapture = async (imageData: string) => {
    try {
      if (!templateId) {
        console.error("No template selected");
        setIsScanningAnswerKey(false);
        return;
      }

      const response = await uploadAnswerKeyScanApi(imageData, templateId);

      setAnswerKeyScanId(response.scan_id);
    } catch (error) {
      console.error("Failed to upload answer key:", error);
      setIsScanningAnswerKey(false);
    }
  };

  const cancelAnswerKeyScanning = () => {
    setIsScanningAnswerKey(false);
    setAnswerKeyScanId(undefined);
  };

  const onSubmitForm: SubmitHandler<ExamFormData> = async (data) => {
    const fixedData: ExamFormData = {
      ...data,
      answers: answers.map((answer, index) => ({
        ...answer,
        question_id: index + 1,
      })),
    };

    const success = await onSubmit(fixedData);

    if (success) {
      reset();
      setAnswers([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto min-w-[95vw] lg:min-w-350">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Exam" : "Edit Exam"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new exam with an answer key. All fields marked with * are required."
              : "Update exam information. Changes will be saved immediately."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Exam Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g., Midterm Exam, Chapter 5 Exam"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of the exam content"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_id">
                    Template <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="template_id"
                    {...register("template_id")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    <option value="gl_form_60">60-Questions Form</option>
                  </select>
                  {errors.template_id && (
                    <p className="text-sm text-destructive">
                      {errors.template_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    {...register("status")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_id">
                  Class <span className="text-destructive">*</span>
                </Label>
                <select
                  id="class_id"
                  {...register("class_id")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} ({cls.class_id})
                    </option>
                  ))}
                </select>
                {errors.class_id && (
                  <p className="text-sm text-destructive">
                    {errors.class_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Schedule</h4>
                  <Badge variant="outline">Optional</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date">Scheduled Date</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      {...register("scheduled_date")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      {...register("due_date")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {!isScanningAnswerKey ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Answer Key</CardTitle>
                        <CardDescription>
                          Enter correct answers manually or scan an answer sheet
                        </CardDescription>
                      </div>

                      <div className="flex gap-2">
                        {template && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsScanningAnswerKey(true)}
                          >
                            <IconScan className="mr-2 h-4 w-4" />
                            Scan Answer Key
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateAnswerKey}
                        >
                          <IconPlus className="mr-2 h-4 w-4" />
                          Generate from Template
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {answers.length} / {MAX_QUESTIONS} questions
                        </Badge>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAnswer}
                          disabled={answers.length >= MAX_QUESTIONS}
                        >
                          <IconPlus className="h-4 w-4" />
                          Add Question
                        </Button>
                      </div>

                      {answers.length >= MAX_QUESTIONS && (
                        <p className="text-xs text-muted-foreground">
                          Maximum of {MAX_QUESTIONS} questions reached.
                        </p>
                      )}

                      {errors.answers && (
                        <p className="text-sm text-destructive">
                          {errors.answers.message || "Answer key is required"}
                        </p>
                      )}

                      {answers.length > 0 ? (
                        <div className="max-h-[400px] space-y-2 overflow-y-auto">
                          <div className="grid grid-cols-[80px_1fr_80px_60px] gap-2 text-sm font-medium text-muted-foreground">
                            <div>Question</div>
                            <div>Correct Answer</div>
                            <div>Points</div>
                            <div></div>
                          </div>

                          {answers.map((answer, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-[80px_1fr_80px_60px] gap-2 items-center"
                            >
                              <div className="h-8 flex items-center rounded-md border border-input px-3 text-sm bg-muted">
                                {index + 1}
                              </div>

                              <select
                                value={answer.correct}
                                onChange={(e) =>
                                  updateAnswer(index, "correct", e.target.value)
                                }
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                              </select>

                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={answer.points}
                                onChange={(e) =>
                                  updateAnswer(
                                    index,
                                    "points",
                                    e.target.value
                                  )
                                }
                                className="h-8"
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAnswer(index)}
                                className="h-8 w-8 p-0"
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          No answer key defined. Click "Generate from Template"
                          or "Add Question" to add manually.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Scan Answer Key</CardTitle>
                        <CardDescription>
                          {answerKeyScan?.status === "processing" ||
                          answerKeyScan?.status === "queued" ? (
                            <span className="text-blue-600 font-medium">
                              Processing... Detecting answers from scan
                            </span>
                          ) : answerKeyScan?.status === "detected" ||
                            answerKeyScan?.status === "graded" ? (
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <IconCheck className="h-4 w-4" />
                              Scan complete! Answers populated
                            </span>
                          ) : (
                            "Position the answer sheet in the camera viewfinder"
                          )}
                        </CardDescription>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelAnswerKeyScanning}
                      >
                        <IconX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {answerKeyScan?.status === "queued" ||
                    answerKeyScan?.status === "processing" ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loading text="Processing scan..." />
                        <p className="text-sm text-muted-foreground text-center">
                          Detecting answers from the scanned answer key.
                          <br />
                          This usually takes a few seconds.
                        </p>
                      </div>
                    ) : (
                      template && (
                        <LiveScanner
                          selectedExam="answer-key-scan"
                          selectedStudent="answer-key"
                          template={template}
                          onCapture={handleAnswerKeyCapture}
                        />
                      )
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Exam"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}