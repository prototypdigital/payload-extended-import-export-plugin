import type { Payload } from 'payload'

export interface UploadFieldData {
  url: string
  alt?: string
  filename?: string
}

/**
 * Handles upload field values and stores referenced images in Payload media collections.
 */
export const handleUploadField = async (
  payload: Payload,
  value: string | string[] | null | undefined,
  relationTo: string,
  hasMany: boolean = false,
): Promise<null | string | string[]> => {
  if (!value) {
    return null
  }

  try {
    if (hasMany) {
      // Handle multiple image URLs
      let urls: string[] = []

      if (Array.isArray(value)) {
        // Already an array
        urls = value
      } else if (typeof value === 'string') {
        // Try parsing the string as JSON
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            urls = parsed
          } else {
            // Fallback: comma-separated string with URLs
            urls = value
              .split(',')
              .map((url) => url.trim())
              .filter(Boolean)
          }
        } catch {
          // If JSON parsing fails, fall back to comma-separated parsing
          urls = value
            .split(',')
            .map((url) => url.trim())
            .filter(Boolean)
        }
      }

      const uploadPromises = urls.map((url) => processUploadUrl(payload, url, relationTo))
      // Process uploads in batches to avoid hammering MongoDB with concurrent writes
      const results = await processInBatches(uploadPromises, 3) // Max 3 concurrent uploads
      return results.filter(Boolean) as string[] // Drop null results
    } else {
      // Handle a single image URL
      let url = ''

      if (typeof value === 'string') {
        // Try parsing the string as JSON
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed) && parsed.length > 0) {
            url = parsed[0]
          } else if (typeof parsed === 'string') {
            url = parsed
          } else {
            url = value.trim()
          }
        } catch {
          // Leave the string as-is if JSON parsing fails
          url = value.trim()
        }
      } else if (Array.isArray(value) && value.length > 0) {
        url = value[0]
      }

      if (!url) {
        return null
      }

      return await processUploadUrl(payload, url, relationTo)
    }
  } catch (error) {
    // Log errors during development for easier debugging
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error while processing upload field:', error)
    }
    return null
  }
}

/**
 * Processes promises in small batches to avoid overloading MongoDB writes.
 */
const processInBatches = async <T>(promises: Promise<T>[], batchSize: number): Promise<T[]> => {
  const results: T[] = []

  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)

    // Short pause between batches to spread the load
    if (i + batchSize < promises.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Uploads a single image URL with retry logic.
 */
const processUploadUrl = async (
  payload: Payload,
  url: string,
  relationTo: string,
  retries: number = 3,
): Promise<null | string> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!isValidUrl(url)) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn(`Invalid URL: ${url}`)
        }
        return null
      }

      // Check whether the media already exists
      const existingMedia = await payload.find({
        collection: relationTo,
        where: {
          url: {
            equals: url,
          },
        },
        limit: 1,
      })

      if (existingMedia.docs.length > 0) {
        return String(existingMedia.docs[0].id)
      }

      // Download the image
      const response = await fetch(url)
      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn(`Failed to download image: ${url} - status: ${response.status}`)
        }
        return null
      }

      const contentType = response.headers.get('content-type') || ''

      // Ensure the response is actually an image
      if (!contentType.startsWith('image/')) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn(`URL does not contain an image: ${url} - content-type: ${contentType}`)
        }
        return null
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const filename = extractFilenameFromUrl(url)

      // Build a file object Payload can accept
      const file = {
        data: buffer,
        mimetype: contentType,
        name: filename,
        size: buffer.length,
      }

      // Create a media document
      const mediaDoc = await payload.create({
        collection: relationTo,
        data: {
          alt: `${filename}`,
          // Add more collection-specific fields here if needed
        },
        file,
      })

      return String(mediaDoc.id)
    } catch (error) {
      const isLastAttempt = attempt === retries

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(`Attempt ${attempt}/${retries} to upload image ${url} failed:`, error)
      }

      // Special handling for network/storage errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string | number }).code

        // Network-related errors
        if (
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ECONNREFUSED' ||
          errorCode === 'ETIMEDOUT'
        ) {
          if (isLastAttempt) {
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.warn(`Network error after ${retries} attempts for ${url}. Skipping.`)
            }
            return null
          }
          // Wait before retrying to give the network a chance to recover
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          continue
        }

        // MongoDB WriteConflict errors
        if (errorCode === 112 || (error as { codeName?: string }).codeName === 'WriteConflict') {
          if (isLastAttempt) {
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.warn(`MongoDB WriteConflict after ${retries} attempts for ${url}. Skipping.`)
            }
            return null
          }
          // Use exponential backoff for MongoDB conflicts
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      if (isLastAttempt) {
        return null
      }

      // Wait before trying again
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }

  return null
}

/**
 * Validates URL structure.
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true // Only ensure the URL is structurally valid (no extension check)
  } catch {
    return false
  }
}

/**
 * Extracts the file name from a URL.
 */
const extractFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || 'image.jpg'

    // Strip query parameters from the file name
    return filename.split('?')[0] || 'image.jpg'
  } catch {
    return 'image.jpg'
  }
}
