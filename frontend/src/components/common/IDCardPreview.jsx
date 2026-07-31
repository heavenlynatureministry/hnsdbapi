import { Printer } from 'lucide-react'
import Button from './Button'

function IDCardPreview({ person, type = 'student', onPrint }) {
  if (!person) return null

  const idNumber = person.student_id || person.teacher_id || person.board_id || 'N/A'
  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim()
  const role = type === 'student' ? person.class_name : type === 'teacher' ? 'Teacher' : 'Board Member'

  return (
    <div className="space-y-4">
      <div className="w-80 border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg print:shadow-none">
        {/* Template Background */}
        <div
          className="relative p-4"
          style={{
            backgroundImage: 'url(/id-card.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* School Name */}
          <div className="text-center mb-3">
            <h3 className="text-sm font-bold text-white">Hope Nursery & Primary School</h3>
            <p className="text-xs text-white/80">Nimule, South Sudan</p>
          </div>

          {/* Photo */}
          <div className="flex justify-center mb-3">
            <div className="w-24 h-28 border-2 border-white rounded-lg overflow-hidden bg-gray-200">
              {person.photo_url ? (
                <img
                  src={person.photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Photo
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1 text-center">
            <p className="font-bold text-sm text-white">{fullName}</p>
            <p className="text-xs text-white/90">{role}</p>
            <p className="text-xs text-white/80 font-mono">ID: {idNumber}</p>
          </div>

          {/* Barcode/QR */}
          <div className="flex justify-center mt-3">
            <div className="w-32 h-8 bg-white/80 rounded flex items-center justify-center text-xs">
              {idNumber}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-2">
            <p className="text-[10px] text-white/70">Valid: {new Date().getFullYear()}/{new Date().getFullYear() + 1}</p>
          </div>
        </div>
      </div>

      <div className="no-print">
        <Button onClick={onPrint} variant="primary" icon={<Printer size={16} />}>
          Print ID Card
        </Button>
      </div>
    </div>
  )
}

export default IDCardPreview
