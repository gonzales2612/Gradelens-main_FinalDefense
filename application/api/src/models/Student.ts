import { Schema, model, Types, Model } from "mongoose";

/**
 * Student Model
 * 
 * Represents a student who can be assigned to classes and have scanned exams.
 */

export interface IStudent {
  student_id: string;           // Unique student identifier (e.g., student number)
  first_name: string;
  last_name: string;
  email?: string;
  class_ids: Types.ObjectId[];  // References to Class documents
  grade_id?: Types.ObjectId;    // Reference to Grade document
  section_id?: Types.ObjectId;  // Reference to Section document
  date_of_birth?: Date;
  status: "active" | "inactive" | "graduated";
  metadata?: {
    guardian_contact?: string;
    notes?: string;
  };
  created_by: string;            // User ID who created this student
  created_at?: Date;
  updated_at?: Date;
}

// Instance methods interface
export interface IStudentMethods {}

// Static methods interface
export interface IStudentModel extends Model<IStudent, {}, IStudentMethods> {
  findByStudentId(student_id: string): Promise<(IStudent & IStudentMethods) | null>;
  findByClass(class_id: Types.ObjectId): Promise<(IStudent & IStudentMethods)[]>;
  findActiveStudents(created_by?: string): Promise<(IStudent & IStudentMethods)[]>;
  findByGrade(grade_id: Types.ObjectId): Promise<(IStudent & IStudentMethods)[]>;
  findBySection(section_id: Types.ObjectId): Promise<(IStudent & IStudentMethods)[]>;
}

const StudentSchema = new Schema<IStudent, IStudentModel, IStudentMethods>(
  {
    student_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    first_name: {
      type: String,
      required: true,
      trim: true
    },
    last_name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    class_ids: [{
      type: Schema.Types.ObjectId,
      ref: "Class"
    }],
    grade_id: {
      type: Schema.Types.ObjectId,
      ref: "Grade",
      index: true
    },
    section_id: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      index: true
    },
    date_of_birth: {
      type: Date
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated"],
      default: "active",
      index: true
    },
    metadata: {
      guardian_contact: { type: String },
      notes: { type: String }
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

// Virtual for full name
StudentSchema.virtual("full_name").get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Indexes for common queries
StudentSchema.index({ last_name: 1, first_name: 1 });
StudentSchema.index({ created_by: 1, status: 1 });
StudentSchema.index({ class_ids: 1 });
StudentSchema.index({ grade_id: 1, section_id: 1 });

// Static methods
StudentSchema.statics.findByStudentId = function(student_id: string) {
  return this.findOne({ student_id, status: { $ne: "inactive" } });
};

StudentSchema.statics.findByClass = function(class_id: Types.ObjectId) {
  return this.find({ 
    class_ids: class_id, 
    status: "active" 
  }).sort({ last_name: 1, first_name: 1 });
};

StudentSchema.statics.findActiveStudents = function(created_by?: string) {
  const query: any = { status: "active" };
  if (created_by) query.created_by = created_by;
  return this.find(query).sort({ last_name: 1, first_name: 1 });
};

StudentSchema.statics.findByGrade = function(grade_id: Types.ObjectId) {
  return this.find({ grade_id, status: "active" }).sort({ last_name: 1, first_name: 1 });
};

StudentSchema.statics.findBySection = function(section_id: Types.ObjectId) {
  return this.find({ section_id, status: "active" }).sort({ last_name: 1, first_name: 1 });
};

export const StudentModel = model<IStudent, IStudentModel>("Student", StudentSchema);

export type StudentDocument = InstanceType<typeof StudentModel>;
