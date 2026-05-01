# New Feature Requirements

## Feature 1: Input Field Validation

### Overview
All fields in the credential application form (issuer frontend) must be validated on both the frontend (instant feedback) and the backend (security enforcement) before the form can be submitted.

### Validation Rules

| Field | Rule |
|---|---|
| First Name | Letters, spaces, hyphens, apostrophes only. Length 2–100. Required. |
| Last Name | Letters, spaces, hyphens, apostrophes only. Length 2–100. Required. |
| Date of Birth | Valid calendar date. Must be in the past. Age must be ≤ 120 years. Required. |
| Document Number | Alphanumeric characters and hyphens only. Length 5–20. Required. |
| Height (cm) | Integer between 50 and 300 inclusive. |
| Postal Code | 3–10 alphanumeric characters. |
| Country | 2 uppercase letters (ISO 3166-1 alpha-2). |
| Nationality | Letters and spaces only. Length 2–50. |
| Street Address | Max 200 characters. |
| City / Suburb | Letters, spaces, hyphens only. Max 100 characters. |
| State / Region | Letters, spaces, hyphens only. Max 100 characters. |

### UX Requirements
- Each field shows an inline error message immediately below it when the rule is violated.
- The Submit button is disabled (or shows an error summary) until all validation passes.
- Backend must independently re-validate every field and return a 400 JSON error if any rule is violated (defense against bypassed frontend).

---

## Feature 2: Face Biometric Binding

### Overview
During credential issuance the applicant's face is captured via webcam and embedded in the credential as a `portrait` claim. At verification time the verifier's webcam captures a live photo, which is compared against the stored portrait. Verification passes only if the faces match.

### Architecture

```
Issuer Frontend  →  capture face (webcam)  →  base64 JPEG 160×160
       ↓
Issuer Backend   →  store face_image in applications table
       ↓
Admin approves   →  createOffer() includes portrait in credentialSubject
       ↓
Walt.id issues   →  credential JWT contains portrait field
       ↓
Wallet stores    →  credential detail screen shows portrait photo
       ↓
Verifier scan    →  walt.id returns credentialSubject including portrait
       ↓
Verifier frontend→  capture live face (webcam)
       ↓
Verifier backend →  POST /api/verify/face-check → face-service (Python)
       ↓
Face Service     →  OpenCV YuNet detection + SFace recognition
       ↓
Result           →  match: true → Access Granted / match: false → Face Mismatch
```

### Face Service (Python microservice)
- Framework: Flask
- Face detection model: OpenCV YuNet (ONNX, ~400 KB)
- Face recognition model: OpenCV SFace (ONNX, ~37 MB)
- Endpoint: `POST /compare` — `{ image1: base64, image2: base64 }` → `{ match: bool, cosine_score: float }`
- Cosine threshold: 0.363 (official OpenCV recommendation)
- Deployed as a Docker container on the same EC2 instance

### Credential Subject Changes
The `portrait` field (base64 JPEG data URL) is added to the `credentialSubject` for all credential types that include identity (NationalID, mDL, ProofOfAge). If no portrait was captured at application time, the field is omitted.

### Verifier Flow
1. Wallet submits credential → verifier backend receives credentialSubject including `portrait`
2. Frontend polls status → gets `success` state with subject data
3. Frontend shows "Face Verification Required" step
4. User allows webcam access → captures live photo
5. Frontend sends `{ sessionId, livePhoto }` to `POST /api/verify/face-check`
6. Backend calls face-service with stored portrait vs. live photo
7. If `match: true` → show final "Identity Verified" screen
8. If `match: false` → show "Face Mismatch — Access Denied" with option to retry

### Wallet Display
If the credential has a `portrait` field, it is shown as a circular avatar photo in the credential detail screen, above the attributes list.

### Security Notes
- Portrait is embedded in the signed JWT — tampering with it invalidates the signature.
- Face comparison happens server-side (face-service), never exposed to the browser.
- Cosine distance threshold 0.363 balances FAR/FRR per SFace benchmarks.
- Live photo is not stored; it is discarded after comparison.
