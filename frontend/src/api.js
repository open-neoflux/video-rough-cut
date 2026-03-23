import axios from 'axios'

const client = axios.create({
  baseURL: '/',
  timeout: 30000,
})

/**
 * Start processing a video file.
 * @param {string} filePath - Absolute path to the video file on the local filesystem.
 * @returns {Promise<{task_id: string}>}
 */
export async function processVideo(filePath) {
  const res = await client.post('/api/process', { file_path: filePath })
  return res.data
}

/**
 * Get current status of a task.
 * @param {string} taskId
 * @returns {Promise<{status: string, progress: number, step: string, result?: object, error?: string}>}
 */
export async function getTaskStatus(taskId) {
  const res = await client.get(`/api/task/${taskId}`)
  return res.data
}

/**
 * Start exporting video with selected segments.
 * @param {string} filePath - Source video path.
 * @param {Array} segments - Array of segment objects (with selected field).
 * @param {string} outputPath - Output file path.
 * @returns {Promise<{task_id: string}>}
 */
export async function exportVideo(filePath, segments, outputPath) {
  const res = await client.post('/api/export', {
    file_path: filePath,
    segments,
    output_path: outputPath,
  })
  return res.data
}

/**
 * Poll a task until it is done or errored.
 * @param {string} taskId
 * @param {function} onProgress - Called with (progress: number, step: string) while pending/processing
 * @param {function} onDone - Called with (data: object) when status === 'done'
 * @param {function} onError - Called with (errorMessage: string) when status === 'error'
 * @param {number} intervalMs - Polling interval in ms (default 1500)
 * @returns {function} cancel - Call this to stop polling early
 */
export function pollTask(taskId, onProgress, onDone, onError, intervalMs = 1500) {
  let cancelled = false
  let timeoutId = null

  async function poll() {
    if (cancelled) return
    try {
      const data = await getTaskStatus(taskId)
      if (cancelled) return

      if (data.status === 'done') {
        onDone(data)
        return
      }

      if (data.status === 'error') {
        onError(data.error || '未知错误')
        return
      }

      // pending or processing
      onProgress(data.progress || 0, data.step || '处理中...')
      timeoutId = setTimeout(poll, intervalMs)
    } catch (err) {
      if (!cancelled) {
        const msg = err?.response?.data?.detail || err.message || '网络请求失败'
        onError(msg)
      }
    }
  }

  // Start polling after a brief delay
  timeoutId = setTimeout(poll, 500)

  return function cancel() {
    cancelled = true
    if (timeoutId) clearTimeout(timeoutId)
  }
}
