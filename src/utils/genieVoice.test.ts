import { describe, it, expect } from 'vitest'
import {
  scoreVoice,
  chunkTextForSpeech,
} from './genieVoice'

describe('genieVoice Utility', () => {
  const mockVoice = (name: string, lang: string): SpeechSynthesisVoice => ({
    name,
    lang,
    voiceURI: `uri-${name}`,
    default: false,
    localService: true,
  })

  describe('scoreVoice - Human Male Prioritization', () => {
    it('disqualifies legacy robotic voices like Alex and Fred', () => {
      const alex = mockVoice('Alex', 'en-US')
      const fred = mockVoice('Fred', 'en-US')
      const zarvox = mockVoice('Zarvox', 'en-US')

      expect(scoreVoice(alex, false)).toBeLessThan(-1000)
      expect(scoreVoice(fred, false)).toBeLessThan(-1000)
      expect(scoreVoice(zarvox, false)).toBeLessThan(-1000)
    })

    it('penalizes female voices when male voice is targeted', () => {
      const samantha = mockVoice('Samantha', 'en-US')
      const victoria = mockVoice('Victoria', 'en-US')
      const daniel = mockVoice('Daniel', 'en-GB')

      expect(scoreVoice(daniel, false)).toBeGreaterThan(scoreVoice(samantha, false))
      expect(scoreVoice(daniel, false)).toBeGreaterThan(scoreVoice(victoria, false))
    })

    it('prioritizes top-tier natural/neural male voices for English', () => {
      const msGuy = mockVoice('Microsoft Guy Online (Natural) - English (United States)', 'en-US')
      const googleUKMale = mockVoice('Google UK English Male', 'en-GB')
      const daniel = mockVoice('Daniel (Enhanced)', 'en-GB')
      const genericEn = mockVoice('Generic Speaker', 'en-US')

      expect(scoreVoice(msGuy, false)).toBeGreaterThan(scoreVoice(genericEn, false))
      expect(scoreVoice(googleUKMale, false)).toBeGreaterThan(scoreVoice(genericEn, false))
      expect(scoreVoice(daniel, false)).toBeGreaterThan(scoreVoice(genericEn, false))
    })

    it('scores Urdu male voices highest when isUrdu is true', () => {
      const urduMale = mockVoice('Microsoft Asif Online (Natural) - Urdu (Pakistan)', 'ur-PK')
      const urduDefault = mockVoice('Google اردو', 'ur')
      const englishMale = mockVoice('Daniel', 'en-GB')

      expect(scoreVoice(urduMale, true)).toBeGreaterThan(scoreVoice(urduDefault, true))
      expect(scoreVoice(urduMale, true)).toBeGreaterThan(scoreVoice(englishMale, true))
    })
  })

  describe('chunkTextForSpeech - Formatting & Sentence Splitting', () => {
    it('cleans markdown, code blocks, bold markers, and emojis', () => {
      const input = '### Summary\nHere is invoice `INV-0001` with **$10,000** total. 👍 Please review.'
      const chunks = chunkTextForSpeech(input)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join(' ')).not.toContain('###')
      expect(chunks.join(' ')).not.toContain('`')
      expect(chunks.join(' ')).not.toContain('**')
      expect(chunks.join(' ')).not.toContain('👍')
    })

    it('splits on Urdu punctuation (۔) correctly', () => {
      const input = 'یہ آپ کی انوائس ہے۔ برائے مہربانی چیک کر لیں۔'
      const chunks = chunkTextForSpeech(input)

      expect(chunks.length).toBe(2)
      expect(chunks[0]).toContain('یہ آپ کی انوائس ہے۔')
      expect(chunks[1]).toContain('برائے مہربانی چیک کر لیں۔')
    })
  })
})
