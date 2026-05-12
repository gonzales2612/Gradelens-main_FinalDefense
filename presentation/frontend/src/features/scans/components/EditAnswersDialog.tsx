import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconCheck, IconArrowRight, IconFilePencil } from "@tabler/icons-react";
import type { QuestionDetection } from "@packages/types/scans/scans.types";

interface Answer {
  question_id: number;
  correct: string;
  points: number;
}

interface EditAnswersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  onEditModeToggle: () => void;
  onSave: () => void;
  onCancel: () => void;
  detections: QuestionDetection[];
  answers: Answer[];
  editedAnswers: Record<number, string[]>;
  onToggleAnswer: (questionId: number, option: string) => void;
  isSaving?: boolean;
}

export function EditAnswersDialog({
  open,
  onOpenChange,
  isEditMode,
  onEditModeToggle,
  onSave,
  onCancel,
  detections,
  answers,
  editedAnswers,
  onToggleAnswer,
  isSaving = false,
}: EditAnswersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-7xl max-h-[90vh] p-6">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Compare Answers</DialogTitle>
              <DialogDescription>
                Compare detected answers with answer key and make corrections
              </DialogDescription>
            </div>
            <div className="flex gap-2 mr-5">
              {isEditMode ? (
                <>
                  <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={onSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={onEditModeToggle}>
                  Enable Edit Mode
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pr-4">
            {/* Left Column: Answer Key */}
            <div className="space-y-3">
              <div className="sticky -top-1 bg-background z-10 pb-3 border-b">
                <h4 className="text-sm font-semibold">Answer Key</h4>
                <p className="text-xs text-muted-foreground">Correct answers for this exam</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {answers.map((answer) => (
                  <div
                    key={answer.question_id}
                    className="relative flex flex-col items-center justify-center rounded-lg border border-green-300 bg-green-50 p-2 text-xs min-h-24"
                  >
                    <span className="font-mono font-bold text-sm mb-1">Q{answer.question_id}</span>
                    <span className="font-mono font-semibold text-lg text-green-700">
                      {answer.correct}
                    </span>
                    {answer.points && answer.points !== 1 && (
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {answer.points} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Answer Comparison with Edit */}
            <div className="space-y-3">
              <div className="sticky -top-1 bg-background z-10 pb-3 border-b">
                <h4 className="text-sm font-semibold">Detected Answers</h4>
                <p className="text-xs text-muted-foreground">
                  {isEditMode ? "Click options to toggle selection" : "Comparison with answer key"}
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {detections.map((detection) => {
                  const correctAnswer = answers.find(
                    (ans) => ans.question_id === detection.question_id
                  )?.correct;
                  
                  const currentAnswer = isEditMode 
                    ? (editedAnswers[detection.question_id] || detection.selected)
                    : detection.selected;
                  
                  const isCorrect = correctAnswer && currentAnswer.length === 1 && currentAnswer[0] === correctAnswer;
                  const isIncorrect = correctAnswer && currentAnswer.length > 0 && !isCorrect;
                  const isManuallyEdited = detection.manually_edited;
                  const availableOptions = Object.keys(detection.fill_ratios || {}).sort();

                  return (
                    <div
                      key={detection.question_id}
                      className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-xs transition-all min-h-24 ${
                        isEditMode
                          ? "bg-blue-50 border-blue-300 hover:border-blue-400 hover:shadow-md"
                          : isManuallyEdited
                          ? "bg-orange-50 border-orange-300"
                          : isCorrect
                          ? "bg-green-50 border-green-300"
                          : isIncorrect
                          ? "bg-red-50 border-red-300"
                          : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      {/* Status Indicators */}
                      {!isEditMode && (
                        <>
                          {isManuallyEdited && (
                            <IconFilePencil className="absolute top-1 right-1 h-3 w-3 text-orange-600" />
                          )}
                          {isCorrect && !isManuallyEdited && (
                            <IconCheck className="absolute top-1 right-1 h-3 w-3 text-green-600" />
                          )}
                          {isIncorrect && !isManuallyEdited && (
                            <span className="absolute top-1 right-1 h-3 w-3 text-red-600 font-bold">✗</span>
                          )}
                        </>
                      )}

                      {/* Question Number */}
                      <span className="font-mono font-bold text-sm mb-1">Q{detection.question_id}</span>

                      {/* Answer Display/Edit Mode */}
                      {isEditMode ? (
                        <div className="flex flex-col items-center w-full gap-1">
                          <div className="flex gap-1 flex-wrap justify-center">
                            {availableOptions.map((option) => {
                              const isSelected = currentAnswer.includes(option);
                              return (
                                <button
                                  key={option}
                                  onClick={() => onToggleAnswer(detection.question_id, option)}
                                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : "bg-white border border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-[9px] text-blue-600 font-medium mt-1">Toggle</span>
                        </div>
                      ) : (
                        <>
                          {/* Detected Answer (with strikethrough if incorrect) */}
                          {currentAnswer.length > 0 ? (
                            <span
                              className={`font-mono font-semibold text-lg ${
                                isIncorrect ? "line-through text-red-600" : "text-gray-900"
                              }`}
                            >
                              {currentAnswer.join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-lg">—</span>
                          )}

                          {/* Correct Answer (show if incorrect) */}
                          {correctAnswer && isIncorrect && (
                            <div className="flex items-center gap-1 mt-1">
                              <IconArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-xs text-green-700 font-bold">
                                {correctAnswer}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-3 mt-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-50 border border-green-300"></div>
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
                  <span>Incorrect</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-50 border border-gray-300"></div>
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-50 border border-orange-300"></div>
                  <span>Manually Edited</span>
                </div>
                {isEditMode && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-50 border border-blue-300"></div>
                    <span>Edit Mode</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
