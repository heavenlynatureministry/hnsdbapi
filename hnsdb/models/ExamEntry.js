const mongoose = require('mongoose')

const examEntrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  exam_type: {
    type: String,
    enum: ['PLE', 'CSE', 'Testimonial'],
    required: true,
    default: 'Testimonial'
  },
  index_number: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6,9}$/.test(v)
      },
      message: 'Index number must be between 6 and 9 digits'
    }
  },
  centre_number: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6,9}$/.test(v)
      },
      message: 'Centre number must be between 6 and 9 digits'
    }
  },
  section: {
    type: String,
    enum: ['Science', 'Arts', ''],
    default: ''
  },
  academic_year: {
    type: String,
    required: true
  },
  subjects: [{
    name: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', ''],
      default: ''
    }
  }],
  total_score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  result: {
    type: String,
    enum: ['Pass', 'Fail', ''],
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'finalized', 'printed'],
    default: 'draft'
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

// Pre-save hook to calculate totals
examEntrySchema.pre('save', function(next) {
  if (this.subjects && this.subjects.length > 0) {
    // Calculate total score
    this.total_score = this.subjects.reduce((sum, subj) => sum + (subj.score || 0), 0)
    
    // Calculate percentage (assuming each subject is out of 100)
    const maxPossible = this.subjects.length * 100
    this.percentage = maxPossible > 0 ? ((this.total_score / maxPossible) * 100) : 0
    
    // Determine result
    this.result = this.percentage >= 50 ? 'Pass' : 'Fail'
    
    // Auto-assign grades if not provided
    this.subjects.forEach(subj => {
      if (!subj.grade && subj.score !== undefined) {
        if (subj.score >= 80) subj.grade = 'A'
        else if (subj.score >= 70) subj.grade = 'B'
        else if (subj.score >= 60) subj.grade = 'C'
        else if (subj.score >= 50) subj.grade = 'D'
        else subj.grade = 'F'
      }
    })
  }
  next()
})

// Virtual for verification URL
examEntrySchema.virtual('verify_url').get(function() {
  return `/verify/testimonial/${this._id}`
})

// Ensure virtuals are included in JSON output
examEntrySchema.set('toJSON', { virtuals: true })
examEntrySchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('ExamEntry', examEntrySchema)
