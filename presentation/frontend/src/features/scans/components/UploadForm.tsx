import { useState } from "react"
import { uploadScanApi } from "../api/scans.api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { IconAlertCircle, IconUpload, IconPhoto } from "@tabler/icons-react"

interface UploadFormProps {
  onUploaded: (scanId: string) => void;
  selectedExam?: string;
  selectedStudent?: string;
  redoExisting?: boolean;
}

export function UploadForm({ onUploaded, selectedExam, selectedStudent, redoExisting }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!file || !selectedExam || !selectedStudent) return

    setLoading(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1]
        const response = await uploadScanApi({
          image: base64,
          exam_id: selectedExam,
          student_id: selectedStudent,
          redo_existing: redoExisting
        })
        setFile(null)
        setLoading(false)
        onUploaded(response.scan_id)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setLoading(false)
      console.error("Upload failed:", error)
    }
  }

  const canUpload = file && selectedExam && selectedStudent && !loading

  return (
    <div className="space-y-4">
      {(!selectedExam || !selectedStudent) && (
        <Alert>
          <IconAlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm font-medium">Selection Required</p>
            <p className="text-sm text-muted-foreground">
              Please select a exam and student before uploading
            </p>
          </div>
        </Alert>
      )}

      <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-12 space-y-6 hover:border-primary/50 hover:bg-muted/20 transition-colors">
        {/* Icon and Text */}
        <div className="flex flex-col items-center space-y-4">
          {file ? (
            <IconPhoto className="h-20 w-20 text-primary" />
          ) : (
            <IconUpload className="h-20 w-20 text-muted-foreground" />
          )}
          
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">
              {file ? "File Selected" : "Upload Answer Sheet"}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {file 
                ? `Ready to upload: ${file.name}`
                : "Select an image file of the student's answer sheet to process"
              }
            </p>
          </div>
        </div>

        {/* File Input */}
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Image File</label>
            <Input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canUpload}
            className="w-full"
            size="lg"
          >
            <IconUpload className="mr-2 h-4 w-4" />
            {loading ? "Uploading..." : "Upload and Process"}
          </Button>
        </div>

        {/* Supported Formats */}
        <p className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, JPEG
        </p>
      </div>
    </div>
  )
}
