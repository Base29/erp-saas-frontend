/**
 * Genie Voice & Speech Synthesis Utility
 *
 * Implements high-quality, human-like male voice selection,
 * acoustic pitch/cadence tuning, and sentence chunking for
 * smooth, uninterrupted speech playback in both English and Urdu.
 */

export interface VoiceOption {
  uri: string
  name: string
  lang: string
  gender: 'male' | 'female' | 'unknown'
  quality: 'natural' | 'neural' | 'standard'
  score: number
}

// Known robotic, novelty, or mechanical legacy synthesizer voices to exclude
const ROBOTIC_VOICE_NAMES = [
  'alex',
  'fred',
  'albert',
  'bad news',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'junior',
  'pipe organ',
  'trinoids',
  'whisper',
  'zarvox',
  'ralph',
  'agnes',
  'bruce',
]

// Explicit female indicators to de-prioritize when male voice is requested
const FEMALE_VOICE_INDICATORS = [
  'female',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'veena',
  'zira',
  'jenny',
  'aria',
  'sara',
  'ava',
  'emma',
  'susan',
  'allison',
  'sangeeta',
  'swara',
  'kalpana',
  'heera',
  'steffi',
  'anna',
  'helena',
  'joana',
  'monica',
  'paulina',
  'laura',
]

// Priority male voice indicators (macOS, Windows Edge Natural, Chrome Google)
const MALE_VOICE_KEYWORDS = [
  'male',
  'guy',
  'daniel',
  'oliver',
  'christopher',
  'ryan',
  'brian',
  'david',
  'arthur',
  'gordon',
  'aaron',
  'nathan',
  'evan',
  'rishi',
  'asif',
  'salman',
  'hamza',
  'tariq',
  'bilal',
  'george',
  'james',
  'matthew',
  'mark',
  'thomas',
  'paul',
  'tom',
]

let cachedVoices: SpeechSynthesisVoice[] = []
let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null

/**
 * Asynchronously loads all voices from window.speechSynthesis,
 * resolving once onvoiceschanged fires or fallback timeout elapses.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices)
  }

  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0) {
    cachedVoices = existing
    return Promise.resolve(existing)
  }

  if (voicesLoadedPromise) {
    return voicesLoadedPromise
  }

  voicesLoadedPromise = new Promise((resolve) => {
    let resolved = false

    const handleVoicesChanged = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0 && !resolved) {
        resolved = true
        cachedVoices = v
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
        resolve(v)
      }
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)

    // Fallback timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        const v = window.speechSynthesis.getVoices()
        cachedVoices = v
        resolve(v)
      }
    }, 500)
  })

  return voicesLoadedPromise
}

/**
 * Scores a voice based on language match, human-like male characteristics,
 * and penalty for robotic / female voices.
 */
export function scoreVoice(voice: SpeechSynthesisVoice, isUrdu: boolean): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()

  // 1. Robotic voice disqualification
  for (const robot of ROBOTIC_VOICE_NAMES) {
    if (name.includes(robot)) {
      return -5000
    }
  }

  let score = 0

  // 2. Language Matching
  if (isUrdu) {
    if (lang.startsWith('ur')) {
      score += 2000
    } else if (lang.startsWith('hi')) {
      // Hindi fallback for Urdu (similar acoustic phonetics)
      score += 800
    } else {
      score -= 1000
    }
  } else {
    if (lang.startsWith('en')) {
      score += 1000
      if (lang === 'en-us' || lang === 'en-gb') {
        score += 200
      }
    } else {
      score -= 2000
    }
  }

  // 3. Female voice penalty
  let isFemale = false
  for (const fem of FEMALE_VOICE_INDICATORS) {
    if (name.includes(fem)) {
      isFemale = true
      break
    }
  }
  if (isFemale) {
    score -= 1500
  }

  // 4. Male voice bonus
  if (MALE_VOICE_KEYWORDS.some((male) => name.includes(male))) {
    score += 800
  }

  // 5. High-quality / Neural / Natural voice bonuses
  if (name.includes('natural') || name.includes('online')) {
    score += 600
  }
  if (name.includes('neural') || name.includes('premium') || name.includes('enhanced')) {
    score += 500
  }

  // Specific top-tier male voices:
  // Edge Natural Male Voices (studio quality)
  if (name.includes('microsoft guy online (natural)') || name.includes('microsoft christopher online (natural)')) {
    score += 900
  } else if (name.includes('microsoft ryan online (natural)') || name.includes('microsoft brian online (natural)')) {
    score += 850
  }

  // Google UK English Male (Chrome's best natural male voice)
  if (name.includes('google uk english male')) {
    score += 950
  } else if (name.includes('google us english male')) {
    score += 900
  }

  // macOS Daniel / Oliver / Arthur / Aaron (Apple's best natural male voices)
  if (name.includes('daniel')) {
    score += 850
  } else if (name.includes('oliver')) {
    score += 800
  } else if (name.includes('aaron') || name.includes('arthur') || name.includes('gordon')) {
    score += 750
  }

  // Urdu male voices
  if (isUrdu && (name.includes('asif') || name.includes('salman') || name.includes('اردو'))) {
    score += 800
  }

  return score
}

/**
 * Selects the highest rated human-like male voice for the given language.
 */
export async function getBestMaleVoice(isUrdu: boolean, preferredUri?: string | null): Promise<SpeechSynthesisVoice | null> {
  const voices = await getAvailableVoices()
  if (!voices || voices.length === 0) return null

  // If user selected a specific voice URI that exists, use it
  if (preferredUri) {
    const preferred = voices.find((v) => v.voiceURI === preferredUri)
    if (preferred) {
      // Check if it's language compatible
      const pLang = preferred.lang.toLowerCase()
      if (isUrdu && (pLang.startsWith('ur') || pLang.startsWith('hi'))) {
        return preferred
      }
      if (!isUrdu && pLang.startsWith('en')) {
        return preferred
      }
    }
  }

  // Rank all available voices
  const ranked = [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, isUrdu) }))
    .filter((item) => item.score > -1000)
    .sort((a, b) => b.score - a.score)

  if (ranked.length > 0) {
    return ranked[0].voice
  }

  // Fallback: pick any language match that is not robotic
  const langMatch = voices.find((v) => {
    const vLang = v.lang.toLowerCase()
    const isLangOk = isUrdu ? vLang.startsWith('ur') || vLang.startsWith('hi') : vLang.startsWith('en')
    const vName = v.name.toLowerCase()
    const isRobotic = ROBOTIC_VOICE_NAMES.some((r) => vName.includes(r))
    return isLangOk && !isRobotic
  })

  return langMatch || voices[0] || null
}

/**
 * Returns a list of candidate male voices suitable for display in UI selector.
 */
export async function getCandidateMaleVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await getAvailableVoices()
  if (!voices || voices.length === 0) return []

  return voices.filter((v) => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()

    // Exclude robotic
    if (ROBOTIC_VOICE_NAMES.some((r) => name.includes(r))) return false

    // Exclude female
    if (FEMALE_VOICE_INDICATORS.some((f) => name.includes(f))) return false

    // Include English or Urdu/Hindi
    const isLang = lang.startsWith('en') || lang.startsWith('ur') || lang.startsWith('hi')
    if (!isLang) return false

    // Match male keywords or natural/neural badges
    const isMale = MALE_VOICE_KEYWORDS.some((m) => name.includes(m))
    const isNatural = name.includes('natural') || name.includes('online') || name.includes('enhanced') || name.includes('google')
    return isMale || isNatural
  })
}

/**
 * Splits text into natural sentence chunks for Web Speech API.
 * Prevents Chrome/Safari 15-second speech truncation bugs.
 */
export function chunkTextForSpeech(text: string): string[] {
  if (!text) return []

  // Clean Markdown and punctuation noise
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\|[^\n]+\|/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[#*_~>\[\]\(\)]/g, '')
    .replace(/[-•–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return []

  // Split on sentence boundaries: periods, question marks, exclamation marks, or Urdu full stop (۔)
  const sentences = clean
    .split(/(?<=[.?!۔\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Sub-chunk any unusually long sentence (> 200 chars) on comma or semicolon
  const chunks: string[] = []
  for (const s of sentences) {
    if (s.length <= 200) {
      chunks.push(s)
    } else {
      const parts = s.split(/(?<=[,;،])\s+/).filter(Boolean)
      chunks.push(...parts)
    }
  }

  return chunks.length > 0 ? chunks : [clean]
}

/**
 * Speech Player controller with active queue and cancellation
 */
class GenieVoicePlayer {
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private chunkQueue: string[] = []
  private isPlaying = false
  private activeVoice: SpeechSynthesisVoice | null = null
  private onStateChange: ((speaking: boolean) => void) | null = null
  private isUrdu = false

  public setStateListener(listener: (speaking: boolean) => void) {
    this.onStateChange = listener
  }

  public async speak(
    text: string,
    preferredVoiceUri?: string | null,
    onFinish?: () => void
  ) {
    this.stop()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const chunks = chunkTextForSpeech(text)
    if (chunks.length === 0) return

    this.isUrdu = /[\u0600-\u06FF]/.test(text)
    this.activeVoice = await getBestMaleVoice(this.isUrdu, preferredVoiceUri)
    this.chunkQueue = chunks
    this.isPlaying = true

    if (this.onStateChange) this.onStateChange(true)

    this.playNextChunk(onFinish)
  }

  private playNextChunk(onFinish?: () => void) {
    if (!this.isPlaying || this.chunkQueue.length === 0) {
      this.isPlaying = false
      if (this.onStateChange) this.onStateChange(false)
      if (onFinish) onFinish()
      return
    }

    const chunk = this.chunkQueue.shift()!
    const utterance = new SpeechSynthesisUtterance(chunk)

    if (this.activeVoice) {
      utterance.voice = this.activeVoice
      utterance.lang = this.activeVoice.lang
    } else {
      utterance.lang = this.isUrdu ? 'ur-PK' : 'en-US'
    }

    // Acoustic tuning for warm, resonant, natural male speech
    if (this.isUrdu) {
      utterance.pitch = 0.92 // Warm male pitch
      utterance.rate = 0.94  // Natural Urdu cadence
    } else {
      utterance.pitch = 0.94 // Resonant, confident male tone (eliminates robotic tinny treble)
      utterance.rate = 0.98  // Relaxed, conversational human cadence
    }

    utterance.onend = () => {
      this.playNextChunk(onFinish)
    }

    utterance.onerror = (e) => {
      console.warn('Genie speech chunk error:', e)
      // Continue next chunk even if one errors out
      this.playNextChunk(onFinish)
    }

    this.currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  }

  public stop() {
    this.isPlaying = false
    this.chunkQueue = []
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    this.currentUtterance = null
    if (this.onStateChange) this.onStateChange(false)
  }

  public getActiveVoice(): SpeechSynthesisVoice | null {
    return this.activeVoice
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance
  }
}

export const genieVoicePlayer = new GenieVoicePlayer()
