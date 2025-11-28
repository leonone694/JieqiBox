// src/composables/image-recognition.ts
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import * as ort from 'onnxruntime-web'
// Import types from the new file
import { LABELS, type DetectionBox, type ProcessedImage } from './types'

// 导出必要的常量给外部使用
export { LABELS, type DetectionBox }

export const useImageRecognition = () => {
  const { t } = useI18n()
  const session = ref<ort.InferenceSession | null>(null)
  const isModelLoading = ref(false)
  const isProcessing = ref(false)
  const status = ref('')
  const detectedBoxes = ref<DetectionBox[]>([])
  const inputImage = ref<HTMLImageElement | null>(null)
  const outputCanvas = ref<HTMLCanvasElement | null>(null)
  const showBoundingBoxes = ref(true)

  // Initialize model
  const initializeModel = async (): Promise<void> => {
    if (session.value) return

    try {
      isModelLoading.value = true
      status.value = t('positionEditor.imageRecognitionStatus.loadingModel')
      const base = (import.meta as any).env?.BASE_URL || '/'
      ort.env.wasm.wasmPaths = base + 'ort/'
      session.value = await ort.InferenceSession.create(
        base + 'models/best.onnx',
        {
          executionProviders: ['webgl','wasm'],
          graphOptimizationLevel: 'all',
        }
      )
      status.value = t(
        'positionEditor.imageRecognitionStatus.modelLoadedSuccessfully'
      )
    } catch (error) {
      console.error('Model loading failed:', error)
      status.value = t(
        'positionEditor.imageRecognitionStatus.modelLoadingFailed',
        {
          error:
            error instanceof Error
              ? error.message
              : t('positionEditor.imageRecognitionStatus.unknownError'),
        }
      )
      throw error
    } finally {
      isModelLoading.value = false
    }
  }

  // --- 原有 Utility Functions (Letterbox, Sigmoid, IOU, NMS, Overlap) ---

  const letterbox = (
    image: HTMLImageElement,
    newShape = [640, 640],
    color = 114
  ): ProcessedImage => {
    const [newH, newW] = newShape
    const imgW = image.naturalWidth || image.width
    const imgH = image.naturalHeight || image.height

    const r = Math.min(newW / imgW, newH / imgH)
    const newUnpadW = Math.round(imgW * r)
    const newUnpadH = Math.round(imgH * r)
    const dw = (newW - newUnpadW) / 2
    const dh = (newH - newUnpadH) / 2

    const canvas = document.createElement('canvas')
    canvas.width = newW
    canvas.height = newH
    const context = canvas.getContext('2d')!

    context.fillStyle = `rgb(${color}, ${color}, ${color})`
    context.fillRect(0, 0, newW, newH)

    context.drawImage(
      image,
      0,
      0,
      imgW,
      imgH,
      Math.round(dw),
      Math.round(dh),
      newUnpadW,
      newUnpadH
    )

    return {
      canvas,
      context,
      meta: { r, dw, dh, newW, newH, imgW, imgH },
    }
  }

  const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))

  const iou = (boxA: DetectionBox, boxB: DetectionBox): number => {
    const [x1A, y1A, wA, hA] = boxA.box
    const [x1B, y1B, wB, hB] = boxB.box
    const x2A = x1A + wA, y2A = y1A + hA
    const x2B = x1B + wB, y2B = y1B + hB
    const intersectX1 = Math.max(x1A, x1B)
    const intersectY1 = Math.max(y1A, y1B)
    const intersectX2 = Math.min(x2A, x2B)
    const intersectY2 = Math.min(y2A, y2B)
    const iw = Math.max(0, intersectX2 - intersectX1)
    const ih = Math.max(0, intersectY2 - intersectY1)
    const inter = iw * ih
    const union = wA * hA + wB * hB - inter
    return union > 0 ? inter / union : 0
  }

  const nms = (boxes: DetectionBox[], iouThresh = 0.7, classAgnostic = false): DetectionBox[] => {
    boxes.sort((a, b) => b.score - a.score)
    const result: DetectionBox[] = []
    const removed = new Array(boxes.length).fill(false)
    for (let i = 0; i < boxes.length; i++) {
      if (removed[i]) continue
      const a = boxes[i]
      result.push(a)
      for (let j = i + 1; j < boxes.length; j++) {
        if (removed[j]) continue
        const b = boxes[j]
        if (!classAgnostic && a.labelIndex !== b.labelIndex) continue
        if (iou(a, b) > iouThresh) removed[j] = true
      }
    }
    return result
  }

  const doBoxesOverlap = (
    boxA: [number, number, number, number],
    boxB: [number, number, number, number]
  ): boolean => {
    const [x1A, y1A, wA, hA] = boxA
    const [x1B, y1B, wB, hB] = boxB
    const x2A = x1A + wA, y2A = y1A + hA
    const x2B = x1B + wB, y2B = y1B + hB
    return !(x2A < x1B || x1A > x2B || y2A < y1B || y1A > y2B)
  }

  // --- 原有 Image Preprocessing (保留给 processImage/processImageDirect) ---
  const preprocess = async (
    image: HTMLImageElement
  ): Promise<{ tensor: ort.Tensor; meta: ProcessedImage['meta'] }> => {
    const modelW = 640
    const modelH = 640
    const { canvas, meta } = letterbox(image, [modelH, modelW], 114)
    const context = canvas.getContext('2d')!
    const imageData = context.getImageData(0, 0, modelW, modelH)
    const { data } = imageData
    const red = new Float32Array(modelW * modelH)
    const green = new Float32Array(modelW * modelH)
    const blue = new Float32Array(modelW * modelH)
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      red[p] = data[i] / 255
      green[p] = data[i + 1] / 255
      blue[p] = data[i + 2] / 255
    }
    const input = new Float32Array(modelW * modelH * 3)
    input.set(red, 0)
    input.set(green, modelW * modelH)
    input.set(blue, modelW * modelH * 2)
    const tensor = new ort.Tensor('float32', input, [1, 3, modelH, modelW])
    return { tensor, meta }
  }

  // --- Post-processing (Compatible with YOLOv11) ---
  const postprocess = (
    outputDataRaw: any,
    outShape: number[],
    meta: ProcessedImage['meta']
  ): DetectionBox[] => {
    // Unify TypedArray/number[] for Float32Array access
    const outputData = outputDataRaw instanceof Float32Array ? outputDataRaw : Float32Array.from(outputDataRaw as number[])

    const num_classes = 34
    const num_coords = 4

    const { r, dw, dh, imgW, imgH, newW, newH } = meta
    const confThresh = 0.25
    const iouThresh = 0.7
    const classAgnostic = false

    // ---------- Branch 3: xyxy+score+classIdx ----------
    const handleXYXYFormat = (data: Float32Array, shape: number[]): DetectionBox[] => {
      let N: number, stride: number, offset = 0
      if (shape.length === 3 && shape[2] === 6) { N = shape[1]; stride = 6 }
      else if (shape.length === 2 && shape[1] === 6) { N = shape[0]; stride = 6 }
      else return []

      let maxAbsCoord = 0
      const sample = Math.min(N, 64)
      for (let i = 0; i < sample; i++) {
        const base = offset + i * stride
        maxAbsCoord = Math.max(maxAbsCoord, Math.abs(data[base]), Math.abs(data[base+1]), Math.abs(data[base+2]), Math.abs(data[base+3]))
      }
      const coordsAreNormalized = maxAbsCoord <= 1.5

      const boxes: DetectionBox[] = []
      for (let i = 0; i < N; i++) {
        const base = offset + i * stride
        let x1 = data[base+0], y1 = data[base+1], x2 = data[base+2], y2 = data[base+3]
        const score = data[base+4], clsIdx = Math.round(data[base+5])
        if (score < confThresh) continue

        if (coordsAreNormalized) { x1 *= newW; y1 *= newH; x2 *= newW; y2 *= newH }

        let cx = (x1+x2)/2, cy = (y1+y2)/2
        let w = Math.max(0, x2-x1), h = Math.max(0, y2-y1)

        let bx = (cx - w/2 - dw) / r
        let by = (cy - h/2 - dh) / r
        let bw = w/r, bh = h/r

        bx = Math.max(0, Math.min(bx, imgW-1))
        by = Math.max(0, Math.min(by, imgH-1))
        bw = Math.max(0, Math.min(bw, imgW-bx))
        bh = Math.max(0, Math.min(bh, imgH-by))
        boxes.push({ box: [bx, by, bw, bh], score, labelIndex: clsIdx })
      }
      return boxes
    }

    if ((outShape.length === 3 && outShape[2] === 6) || (outShape.length === 2 && outShape[1] === 6)) {
      return nms(handleXYXYFormat(outputData, outShape), iouThresh, classAgnostic)
    }

    // ---------- Branch 1/2: YOLO style (xywh [+obj] + classes) ----------
    const channelsCandidate1 = outShape[1], predsCandidate1 = outShape[2]
    const channelsCandidate2 = outShape[2], predsCandidate2 = outShape[1]
    const matchesChannels = (c: number) => c === num_coords + num_classes || c === num_coords + num_classes + 1
    let layout: 'cf' | 'cl' = 'cf', num_channels = channelsCandidate1, num_predictions = predsCandidate1
    if (matchesChannels(channelsCandidate1)) { layout = 'cf'; num_channels = channelsCandidate1; num_predictions = predsCandidate1 }
    else if (matchesChannels(channelsCandidate2)) { layout = 'cl'; num_channels = channelsCandidate2; num_predictions = predsCandidate2 }
    else {
      if (channelsCandidate1 >= channelsCandidate2) { layout = 'cf'; num_channels = channelsCandidate1; num_predictions = predsCandidate1 }
      else { layout = 'cl'; num_channels = channelsCandidate2; num_predictions = predsCandidate2 }
    }
    const hasObjectness = num_channels === num_coords + num_classes + 1
    const getVal = (ch: number, i: number): number => layout === 'cf' ? outputData[ch * num_predictions + i] : outputData[i * num_channels + ch]

    let needSigmoid = false
    {
      const startCh = num_coords + (hasObjectness ? 1 : 0)
      let sampled = 0
      for (let ch = startCh; ch < num_channels && sampled < 64; ch += Math.max(1, Math.floor(num_classes / 8))) {
        if (getVal(ch, 0) < 0 || getVal(ch, 0) > 1) { needSigmoid = true; break }
        sampled++
      }
    }

    let maxAbsCoord = 0
    const sampleCount = Math.min(num_predictions, 64)
    const step = Math.max(1, Math.floor(num_predictions/sampleCount))
    for (let i = 0; i < num_predictions && i < sampleCount*step; i+=step) {
      maxAbsCoord = Math.max(maxAbsCoord, Math.abs(getVal(0, i)), Math.abs(getVal(1, i)), Math.abs(getVal(2, i)), Math.abs(getVal(3, i)))
    }
    const coordsAreNormalized = maxAbsCoord <= 1.5

    const boxes: DetectionBox[] = []
    for (let i = 0; i < num_predictions; i++) {
      let x = getVal(0, i), y = getVal(1, i), w = getVal(2, i), h = getVal(3, i)
      if (coordsAreNormalized) { x *= newW; y *= newH; w *= newW; h *= newH }
      let obj = 1.0; let clsStart = 4
      if (hasObjectness) {
        obj = getVal(4, i); if (needSigmoid) obj = sigmoid(obj)
        clsStart = 5
      }
      let maxScore = -Infinity; let maxIndex = -1
      for (let c = 0; c < num_classes; c++) {
        let s = getVal(clsStart + c, i); if (needSigmoid) s = sigmoid(s)
        const clsConf = hasObjectness ? obj * s : s
        if (clsConf > maxScore) { maxScore = clsConf; maxIndex = c }
      }
      if (maxScore >= confThresh) {
        let bx = x - w/2, by = y - h/2, bw = w, bh = h
        bx = (bx - dw) / r; by = (by - dh) / r; bw = bw / r; bh = bh / r
        bx = Math.max(0, Math.min(bx, imgW-1)); by = Math.max(0, Math.min(by, imgH-1))
        bw = Math.max(0, Math.min(bw, imgW-bx)); bh = Math.max(0, Math.min(bh, imgH-by))
        boxes.push({ box: [bx, by, bw, bh], score: maxScore, labelIndex: maxIndex })
      }
    }
    return nms(boxes, iouThresh, classAgnostic)
  }

  // --- Visualization (syncCanvasToImage, drawBoundingBoxes) ---
  const syncCanvasToImage = (imgElement: HTMLImageElement, canvasElement: HTMLCanvasElement) => {
    const dispW = imgElement.clientWidth; const dispH = imgElement.clientHeight
    canvasElement.style.width = dispW + 'px'; canvasElement.style.height = dispH + 'px'
    const dpr = window.devicePixelRatio || 1
    canvasElement.width = Math.round(dispW * dpr); canvasElement.height = Math.round(dispH * dpr)
    const ctx = canvasElement.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, dispW, dispH)
    const natW = imgElement.naturalWidth || imgElement.width
    const natH = imgElement.naturalHeight || imgElement.height
    return { dispW, dispH, natW, natH, scaleX: dispW/natW, scaleY: dispH/natH }
  }

  const drawBoundingBoxes = (boxes: DetectionBox[], imgElement: HTMLImageElement, canvasElement: HTMLCanvasElement) => {
    const { scaleX, scaleY, dispW, dispH } = syncCanvasToImage(imgElement, canvasElement)
    const ctx = canvasElement.getContext('2d')!
    ctx.clearRect(0, 0, dispW, dispH)
    if (!showBoundingBoxes.value) return
    ctx.font = '14px Arial'
    boxes.forEach(({ box, score, labelIndex }) => {
      const label = LABELS[labelIndex]; if (!label) return
      const x = box[0]*scaleX, y = box[1]*scaleY, w = box[2]*scaleX, h = box[3]*scaleY
      ctx.strokeStyle = label.color; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h)
      const text = `${label.name}: ${score.toFixed(2)}`
      const textWidth = ctx.measureText(text).width
      ctx.fillStyle = label.color; ctx.fillRect(x-1, y-18, textWidth+8, 18)
      ctx.fillStyle = 'white'; ctx.fillText(text, x+3, y-4)
    })
  }

  // --- Inference Logic ---
  const runInference = async (img: HTMLImageElement): Promise<DetectionBox[]> => {
    const prep = await preprocess(img)
    const inputName = session.value!.inputNames.includes('images') ? 'images' : session.value!.inputNames[0]
    const results = await session.value!.run({ [inputName]: prep.tensor })
    const firstOut = results.output0 || results[Object.keys(results)[0]]
    return postprocess(firstOut.data as unknown as number[], firstOut.dims as number[], prep.meta)
  }

  // --- Public Methods (processImage, updateBoardGrid) ---
  const processImage = async (file: File): Promise<void> => {
    try {
      isProcessing.value = true
      status.value = t('positionEditor.imageRecognitionStatus.loadingImage')
      await initializeModel()
      const img = new Image(); const imageUrl = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = imageUrl })
      inputImage.value = img
      status.value = t('positionEditor.imageRecognitionStatus.runningModelInference')
      const boxes = await runInference(img)
      detectedBoxes.value = boxes
      status.value = t('positionEditor.imageRecognitionStatus.recognitionCompleted')
    } catch (error) {
      console.error(error)
      throw error
    } finally { isProcessing.value = false }
  }

  const updateBoardGrid = (boxes: DetectionBox[]): (DetectionBox | null)[][] => {
    const boardBox = boxes.filter(b => LABELS[b.labelIndex]?.name === 'Board').sort((a, b) => b.score - a.score)[0]
    if (!boardBox) return Array(10).fill(null).map(() => Array(9).fill(null))
    const piecesOnBoard = boxes.filter(p => {
      if (LABELS[p.labelIndex]?.name === 'Board') return false
      return doBoxesOverlap(p.box, boardBox.box)
    })
    const [bx, by, bw, bh] = boardBox.box
    const grid: Array<Array<DetectionBox | null>> = Array(10).fill(null).map(() => Array(9).fill(null))
    for (const piece of piecesOnBoard) {
      const [px, py, pw, ph] = piece.box; const cx = px+pw/2, cy = py+ph/2
      let bestPos = { i: -1, j: -1, dist: Infinity }
      for (let j=0; j<10; j++) {
        for (let i=0; i<9; i++) {
          const u = i/8, v = j/9
          //const tx = bx + u*bw, ty = by, bx_ = bx + u*bw, by_ = by + bh // Simplified grid mapping (assumes rect)
          // Use bilinear if trapezoid needed (omitted for brevity, assume rect here or restore full math)
          // Restore full math from original:
          const p_tl = {x:bx, y:by}, p_tr = {x:bx+bw, y:by}, p_bl = {x:bx, y:by+bh}, p_br = {x:bx+bw, y:by+bh}
          const topX = (1-u)*p_tl.x + u*p_tr.x, topY = (1-u)*p_tl.y + u*p_tr.y
          const botX = (1-u)*p_bl.x + u*p_br.x, botY = (1-u)*p_bl.y + u*p_br.y
          const gx = (1-v)*topX + v*botX, gy = (1-v)*topY + v*botY
          const dist = Math.hypot(cx-gx, cy-gy)
          if (dist < bestPos.dist) bestPos = { i, j, dist }
        }
      }
      const { i, j } = bestPos
      if (i !== -1 && (!grid[j][i] || piece.score > grid[j][i]!.score)) grid[j][i] = piece
    }
    return grid
  }

  const processImageDirect = async (img: HTMLImageElement): Promise<void> => {
    if (!session.value) await initializeModel()
    try { isProcessing.value = true; detectedBoxes.value = await runInference(img) }
    finally { isProcessing.value = false }
  }

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★★★ 新增：极速处理 Raw RGB Data (Uint8Array) ★★★
  // ★★★ 0ms 解码，5ms 预处理，彻底告别 Base64 ★★★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const processRawData = async (data: Uint8Array, width: number, height: number) => {
    if (!session.value) await initializeModel()
    
    // 1. Preprocess: Uint8 [0-255] -> Float32 [0-1] (NCHW)
    // No resize needed because Rust already resized it to 640x640!
    const float32Data = new Float32Array(3 * width * height)
    
    // JS loop is extremely fast for TypedArrays (~2-5ms for 640x640)
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 3]
      const g = data[i * 3 + 1]
      const b = data[i * 3 + 2]
      float32Data[i] = r / 255.0
      float32Data[width * height + i] = g / 255.0
      float32Data[2 * width * height + i] = b / 255.0
    }

    // 2. Inference
    const inputName = session.value!.inputNames.includes('images') ? 'images' : session.value!.inputNames[0]
    const tensor = new ort.Tensor('float32', float32Data, [1, 3, height, width])
    const results = await session.value!.run({ [inputName]: tensor })

    // 3. Postprocess
    // Construct a fake "meta" object because we don't need letterbox padding removal
    // (The image from Rust is already exactly 640x640, stretched or fit)
    const meta = {
      r: 1, dw: 0, dh: 0,
      newW: width, newH: height,
      imgW: width, imgH: height // Coordinate system is 640x640
    }

    const firstOut = results.output0 || results[Object.keys(results)[0]]
    const boxes = postprocess(firstOut.data as unknown as number[], firstOut.dims as number[], meta)
    
    detectedBoxes.value = boxes
  }

  return {
    session, isModelLoading, isProcessing, status, detectedBoxes, inputImage, outputCanvas, showBoundingBoxes,
    processImage, processImageDirect, processRawData, // Export new method
    drawBoundingBoxes, updateBoardGrid, initializeModel
  }
}
