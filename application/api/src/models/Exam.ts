import { Schema, model, Types } from "mongoose";
import type { AnswerKey } from "../types/answer_key.types.ts";

/**
 * Exam/Exam Model
 * 
 * Stores exam/exam definitions including answer keys, grading policies,
 * and class assignments. Used by Node.js grading logic to compare detection results.
 */

const AnswerSchema = new Schema({
  question_id: { type: Number, required: true },
  correct: { type: String, required: true, match: /^[A-Z]$/ },
  points: { type: Number, default: 1, min: 0 }
}, { _id: false });

const GradingPolicySchema = new Schema({
  partial_credit: { type: Boolean, default: false },
  penalty_incorrect: { type: Number, default: 0, min: 0 },
  require_manual_review_on_ambiguity: { type: Boolean, default: true }
}, { _id: false });

const ExamMetadataSchema = new Schema({
  created_at: { type: Date },
  created_by: { type: String }, // User ID reference
  total_points: { type: Number }
}, { _id: false });

const ExamSchema = new Schema(
  {
    exam_id: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    template_id: { 
      type: String, 
      required: true,
      index: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    description: {
      type: String,
      trim: true
    },
    
    // Class assignment
    class_id: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      index: true
    },
    
    // Exam/Exam scheduling
    scheduled_date: {
      type: Date
      // index defined at schema level below
    },
    due_date: {
      type: Date
    },
    
    answers: { 
      type: [AnswerSchema], 
      required: true,
      validate: {
        validator: (v: any[]) => v && v.length > 0,
        message: "Exam must have at least one answer"
      }
    },
    grading_policy: { 
      type: GradingPolicySchema, 
      default: () => ({
        partial_credit: false,
        penalty_incorrect: 0,
        require_manual_review_on_ambiguity: true
      })
    },
    metadata: { 
      type: ExamMetadataSchema 
    },
    
    // Denormalized fields for quick queries
    question_count: { 
      type: Number, 
      index: true 
    },
    total_points: { 
      type: Number 
    },
    
    // Audit fields
    created_by: { 
      type: String, 
      required: true 
    },
    is_active: { 
      type: Boolean, 
      default: true, 
      index: true 
    },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "archived"],
      default: "draft",
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common queries
ExamSchema.index({ template_id: 1, is_active: 1 });
ExamSchema.index({ created_by: 1, createdAt: -1 });
ExamSchema.index({ class_id: 1, status: 1 });
ExamSchema.index({ scheduled_date: 1 });

// Pre-save middleware to calculate denormalized fields
ExamSchema.pre("save", function(next) {
  if (this.isModified("answers")) {
    this.question_count = this.answers.length;
    this.total_points = this.answers.reduce((sum, ans) => sum + (ans.points || 1), 0);
  }
  next();
});

// Instance methods
ExamSchema.methods.toAnswerKey = function(): AnswerKey {
    return {
        exam_id: this.exam_id,
        template_id: this.template_id,
        name: this.name,
        answers: this.answers.map((a: any) => ({
        question_id: a.question_id,
        correct: a.correct,
        points: a.points
        })),
        grading_policy: this.grading_policy,
        metadata: {
        created_at: this.metadata?.created_at?.toISOString(),
        created_by: this.metadata?.created_by || this.created_by,
        total_points: this.total_points
        }
    };
};

// Static methods
ExamSchema.statics.findActiveByTemplate = function(template_id: string) {
  return this.find({ template_id, is_active: true }).sort({ createdAt: -1 });
};

ExamSchema.statics.findByExamId = function(exam_id: string) {
  return this.findOne({ exam_id, is_active: true });
};

ExamSchema.statics.findByClass = function(class_id: Types.ObjectId, status?: string) {
  const query: any = { class_id, is_active: true };
  if (status) query.status = status;
  return this.find(query).sort({ scheduled_date: -1, createdAt: -1 });
};

ExamSchema.statics.findActiveExams = function(created_by?: string) {
  const query: any = { status: "active", is_active: true };
  if (created_by) query.created_by = created_by;
  return this.find(query).sort({ scheduled_date: -1 });
};

export const ExamModel = model("Exam", ExamSchema);

export interface ExamDocument extends InstanceType<typeof ExamModel> {
  toAnswerKey(): AnswerKey;
}
