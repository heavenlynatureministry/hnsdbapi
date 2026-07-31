import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, RotateCw } from 'lucide-react'

function PhotoCapture({ onPhotoCapture, initialPhoto }) {
  const [mode, setMode] = useState('none') // 'none', 'camera', 'preview'
  const [photo, setPhoto] = useState(initialPhoto || null)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 400 }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setMode('camera')
    } catch (error) {
      console.error('Camera error:', error)
      alert('Unable to access camera. Please check permissions or use file upload.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      setPhoto(imageData)
      onPhotoCapture(imageData)
      stopCamera()
      setMode('preview')
    }
  }, [stopCamera, onPhotoCapture])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should be less than 2MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageData = event.target.result
        setPhoto(imageData)
        onPhotoCapture(imageData)
        setMode('preview')
      }
      reader.readAsDataURL(file)
    }
  }

  const retake = () => {
    setPhoto(null)
    onPhotoCapture(null)
    setMode('none')
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Photo
      </label>

      {/* Preview */}
      {(photo || initialPhoto) && mode !== 'camera' && (
        <div className="relative w-32 h-40 border-2 border-gray-300 rounded-lg overflow-hidden">
          <img
            src={photo || initialPhoto}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            onClick={retake}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Camera View */}
      {mode === 'camera' && (
        <div className="space-y-2">
          <div className="relative w-64 h-80 bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Camera size={16} /> Capture
            </button>
            <button
              onClick={() => { stopCamera(); setMode('none') }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Capture Options */}
      {mode === 'none' && !photo && (
        <div className="flex gap-3">
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Camera size={16} /> Take Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Upload size={16} /> Upload Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default PhotoCapture
