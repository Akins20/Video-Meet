// utils/deviceUtils.ts

/**
 * Generate or retrieve persistent device ID
 * This ID persists across browser sessions but is unique per device/browser
 */
export const generateDeviceId = async (): Promise<string> => {
  const STORAGE_KEY = 'videomeet_device_id'
  
  // Try to get existing device ID from localStorage
  let deviceId = localStorage.getItem(STORAGE_KEY)
  
  if (!deviceId) {
    // Generate new device ID based on browser fingerprint
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('VideoMeet Device Fingerprint', 2, 2)
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
    ].join('|')
    
    // Create hash of fingerprint
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Use first 16 characters as device ID
    deviceId = hashHex.substring(0, 16)
    
    // Store for future use
    localStorage.setItem(STORAGE_KEY, deviceId)
  }
  
  return deviceId
}

/**
 * Generate unique session ID for this specific session
 */
export const generateSessionId = (): string => {
  return crypto.randomUUID()
}

/**
 * Get client IP address (requires external service)
 */
export const getClientIP = async (): Promise<string> => {
  try {
    // Try multiple IP detection services
    const services = [
      'https://api.ipify.org?format=json',
      'https://jsonip.com',
      'https://api.my-ip.io/ip.json',
    ]
    
    for (const service of services) {
      try {
        const response = await fetch(service, { timeout: 3000 } as any)
        const data = await response.json()
        
        // Different services return IP in different formats
        const ip = data.ip || data.IP || data.query
        if (ip) return ip
      } catch (error) {
        console.warn(`IP service ${service} failed:`, error)
        continue
      }
    }
    
    // Fallback: return local IP indicator
    return 'unknown'
  } catch (error) {
    console.warn('Could not determine client IP:', error)
    return 'unknown'
  }
}

/**
 * Detect device type based on user agent and screen characteristics
 */
export const detectDeviceType = (): 'web' | 'mobile' | 'desktop' => {
  // Check if running in Electron (desktop app)
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return 'desktop'
  }
  
  // Check for mobile user agents
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'iemobile', 'opera mini', 'mobile'
  ]
  
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
  
  // Check screen size as additional indicator
  const isMobileScreen = window.innerWidth <= 768
  
  if (isMobileUA || isMobileScreen) {
    return 'mobile'
  }
  
  return 'web'
}

/**
 * Get device capabilities (camera, microphone, screen share)
 */
export const getDeviceCapabilities = async () => {
  const capabilities = {
    supportsVideo: false,
    supportsAudio: false,
    supportsScreenShare: false,
  }
  
  try {
    // Check if getUserMedia is available
    if (navigator.mediaDevices && await navigator.mediaDevices.getUserMedia()) {
      capabilities.supportsAudio = true
      capabilities.supportsVideo = true
    }
    
    // Check if getDisplayMedia is available (screen sharing)
    if (navigator.mediaDevices && await navigator.mediaDevices.getDisplayMedia()) {
      capabilities.supportsScreenShare = true
    }
    
    // Additional checks for specific browser limitations
    if (detectDeviceType() === 'mobile') {
      // Some mobile browsers have limited screen sharing support
      capabilities.supportsScreenShare = false
    }
    
  } catch (error) {
    console.warn('Error checking device capabilities:', error)
  }
  
  return capabilities
}

/**
 * Validate session data
 */
export const validateSessionData = (sessionData: any): boolean => {
  return !!(
    sessionData?.sessionId &&
    sessionData?.deviceId &&
    sessionData?.deviceType &&
    sessionData?.userAgent
  )
}

/**
 * Clean up stored device data (for privacy/debugging)
 */
export const clearDeviceData = (): void => {
  localStorage.removeItem('videomeet_device_id')
}

/**
 * Get comprehensive device information
 */
export const getFullDeviceInfo = async () => {
  const deviceType = detectDeviceType()
  const deviceId = await generateDeviceId()
  const sessionId = generateSessionId()
  const capabilities = await getDeviceCapabilities()
  
  let ipAddress: string | undefined
  try {
    ipAddress = await getClientIP()
  } catch (error) {
    console.warn('Could not get IP address:', error)
  }
  
  return {
    deviceType,
    deviceId,
    sessionId,
    userAgent: navigator.userAgent,
    ipAddress,
    capabilities,
    timestamp: new Date().toISOString(),
    browserInfo: {
      name: getBrowserName(),
      version: getBrowserVersion(),
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    },
    screenInfo: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
    }
  }
}

/**
 * Get browser name from user agent
 */
export const getBrowserName = (): string => {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (userAgent.includes('chrome')) return 'Chrome'
  if (userAgent.includes('firefox')) return 'Firefox'
  if (userAgent.includes('safari')) return 'Safari'
  if (userAgent.includes('edge')) return 'Edge'
  if (userAgent.includes('opera')) return 'Opera'
  
  return 'Unknown'
}

/**
 * Get browser version from user agent
 */
export const getBrowserVersion = (): string => {
  const userAgent = navigator.userAgent
  
  try {
    const match = userAgent.match(/(chrome|firefox|safari|edge|opera)\/([0-9.]+)/i)
    return match ? match[2] : 'Unknown'
  } catch (error) {
    return 'Unknown'
  }
}