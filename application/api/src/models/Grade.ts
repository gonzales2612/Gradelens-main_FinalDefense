import { Schema, model, Model } from "mongoose";

/**
 * Grade Model
 * 
 * Represents grade levels (e.g., Grade 7, Grade 8, Grade 9, etc.)
 * Used to organize students and classes by academic level.
 */

export interface IGrade {
  grade_id: string;              // Unique identifier (e.g., "G7", "G8")
  name: string;                  // Display name (e.g., "Grade 7", "7th Grade")
  level: number;                 // Numeric level for sorting (7, 8, 9, etc.)
  description?: string;
  is_active: boolean;
  created_by: string;            // User ID who created this grade
  created_at?: Date;
  updated_at?: Date;
}

// Instance methods interface
export interface IGradeMethods {}

// Static methods interface
export interface IGradeModel extends Model<IGrade, {}, IGradeMethods> {
  findByGradeId(grade_id: string): Promise<(IGrade & IGradeMethods) | null>;
  findActiveGrades(): Promise<(IGrade & IGradeMethods)[]>;
  findByLevel(level: number): Promise<(IGrade & IGradeMethods) | null>;
}

const GradeSchema = new Schema<IGrade, IGradeModel, IGradeMethods>(
  {
    grade_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    created_by: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common queries
GradeSchema.index({ level: 1, is_active: 1 });
GradeSchema.index({ created_by: 1, is_active: 1 });

// Static methods
GradeSchema.statics.findByGradeId = function(grade_id: string) {
  return this.findOne({ grade_id, is_active: true });
};

GradeSchema.statics.findActiveGrades = function() {
  return this.find({ is_active: true }).sort({ level: 1 });
};

GradeSchema.statics.findByLevel = function(level: number) {
  return this.findOne({ level, is_active: true });
};

export const GradeModel = model<IGrade, IGradeModel>("Grade", GradeSchema);

export type GradeDocument = InstanceType<typeof GradeModel>;
