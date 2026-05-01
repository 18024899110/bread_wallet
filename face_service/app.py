"""
Face comparison microservice using OpenCV SFace deep learning model.

SFace generates 128-dim face embeddings that are invariant to lighting,
pose, and resolution differences — works correctly for cross-device
comparisons (browser webcam portrait vs phone front camera).

Model files (downloaded separately):
  yunet.onnx  — YuNet face detector (~228 KB)
  sface.onnx  — SFace face recognizer (~37 MB)

Threshold (cosine similarity):
  same person  → typically > 0.40
  diff person  → typically < 0.30
  Threshold: 0.363  (OpenCV recommended value)
"""

import base64
import io
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image, ImageOps

app = Flask(__name__)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(MODEL_DIR, 'yunet.onnx')
SFACE_PATH = os.path.join(MODEL_DIR, 'sface.onnx')
MATCH_THRESHOLD = 0.363   

_detector = cv2.FaceDetectorYN.create(YUNET_PATH, '', (320, 320), score_threshold=0.6, nms_threshold=0.3)
_recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, '')


def decode_image(b64str: str):
    """Decode base64 image → BGR numpy array, correcting EXIF orientation."""
    if not b64str:
        return None
    if ',' in b64str:
        b64str = b64str.split(',', 1)[1]
    try:
        data = base64.b64decode(b64str)
        pil = Image.open(io.BytesIO(data))
       
        pil = ImageOps.exif_transpose(pil)
        pil = pil.convert('RGB')
        return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    except Exception:
        return None


SFACE_INPUT = 112  

MAX_DETECT_DIM = 640  
SFACE_INPUT = 112   


def get_face_feature(bgr: np.ndarray):
    """
    Detect the largest face, align it, and return its SFace embedding.
    Handles both tiny low-res portraits (upscale) and large phone photos (downscale).
    Falls back to centre crop if detection still fails.
    """
    h, w = bgr.shape[:2]
    detect_img = bgr
    scale = 1.0

    if max(h, w) > MAX_DETECT_DIM:
        
        scale = MAX_DETECT_DIM / max(h, w)
        detect_img = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    elif max(h, w) < 300:
        
        scale = 300 / max(h, w)
        detect_img = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    dh, dw = detect_img.shape[:2]
    _detector.setInputSize((dw, dh))
    _, faces = _detector.detect(detect_img)

    if faces is None or len(faces) == 0:
        
        print(f'[get_face_feature] no face in {bgr.shape[:2]}, using centre crop', flush=True)
        cy, cx = h // 2, w // 2
        half = min(h, w) // 2
        crop = bgr[cy - half:cy + half, cx - half:cx + half]
        return _recognizer.feature(cv2.resize(crop, (SFACE_INPUT, SFACE_INPUT)))


    if scale != 1.0:
        faces = faces.copy()
        faces[:, :14] /= scale

    face = max(faces, key=lambda f: f[2] * f[3])
    aligned = _recognizer.alignCrop(bgr, face)
    return _recognizer.feature(aligned)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/detect', methods=['POST'])
def detect():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'face_detected': False, 'error': 'Invalid JSON body'}), 400

    bgr = decode_image(data.get('image', ''))
    if bgr is None:
        return jsonify({'face_detected': False, 'error': 'Failed to decode image'})

    h, w = bgr.shape[:2]
    _detector.setInputSize((w, h))
    _, faces = _detector.detect(bgr)
    return jsonify({'face_detected': faces is not None and len(faces) > 0})


@app.route('/compare', methods=['POST'])
def compare():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'match': False, 'error': 'Invalid JSON body'}), 400

    bgr1 = decode_image(data.get('image1', ''))
    bgr2 = decode_image(data.get('image2', ''))

    if bgr1 is None:
        return jsonify({'match': False, 'error': 'Failed to decode stored portrait'})
    if bgr2 is None:
        return jsonify({'match': False, 'error': 'Failed to decode live photo'})

    feat1 = get_face_feature(bgr1)
    feat2 = get_face_feature(bgr2)

    if feat1 is None:
        return jsonify({'match': False, 'error': 'No face detected in stored portrait'})
    if feat2 is None:
        return jsonify({'match': False, 'error': 'No face detected in live photo'})

    score = float(_recognizer.match(feat1, feat2, cv2.FaceRecognizerSF_FR_COSINE))
    match = score >= MATCH_THRESHOLD

    print(f'[compare] score={score:.4f} threshold={MATCH_THRESHOLD} match={match} '
          f'img1={bgr1.shape[:2]} img2={bgr2.shape[:2]}', flush=True)

    return jsonify({'match': match, 'cosine_score': score})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5010, debug=False)
