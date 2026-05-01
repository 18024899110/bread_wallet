import multer from 'multer'
import path from 'path'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export const UPLOADS_DIR = join(__dirname, '../uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF and image files (JPEG, PNG, WebP) are allowed'))
    }
  },
})
