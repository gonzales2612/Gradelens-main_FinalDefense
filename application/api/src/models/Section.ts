import { Schema, model, Types, Model } from "mongoose";

/**
 * Section Model
 * 
 * Represents class sections (e.g., Section A, Section B, Einstein, Newton, etc.)
 * Can be assigned to both students and classes for organizational purposes.
 */

export interface ISection {
  section_id: string;            // Unique identifier (e.g., "SEC-A", "SEC-B")
  name: string;                  // Display name (e.g., "Section A", "Einstein")
  description?: string;
  grade_id?: Types.ObjectId;     // Optional: Link section to a specific grade
  is_active: boolean;
  created_by: string;            // User ID who created this section
  created_at?: Date;
  updated_at?: Date;
}

// Instance methods interface
export interface ISectionMethods {}

// Static methods interface
export interface ISectionModel extends Model<ISection, {}, ISectionMethods> {
  findBySectionId(section_id: string): Promise<(ISection & ISectionMethods) | null>;
  findActiveSections(): Promise<(ISection & ISectionMethods)[]>;
  findByGrade(grade_id: Types.ObjectId): Promise<(ISection & ISectionMethods)[]>;
}

const SectionSchema = new Schema<ISection, ISectionModel, ISectionMethods>(
  {
    section_id: {
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
    description: {
      type: String,
      trim: true
    },
    grade_id: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
      index: true
    },
    // capacity removed
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
SectionSchema.index({ grade_id: 1, is_active: 1 });
SectionSchema.index({ created_by: 1, is_active: 1 });

// Static methods
SectionSchema.statics.findBySectionId = function(section_id: string) {
  return this.findOne({ section_id, is_active: true });
};

SectionSchema.statics.findActiveSections = function() {
  return this.find({ is_active: true }).sort({ name: 1 });
};

SectionSchema.statics.findByGrade = function(grade_id: Types.ObjectId) {
  return this.find({ grade_id, is_active: true }).sort({ name: 1 });
};

export const SectionModel = model<ISection, ISectionModel>("Section", SectionSchema);

export type SectionDocument = InstanceType<typeof SectionModel>;
