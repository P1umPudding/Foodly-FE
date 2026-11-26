// The session tokens live in Capacitor Preferences (CapacitorStorage.xml) and must stay out of Android's cloud backup
// and device transfer (#342). Guards the hand-written rules against an edit or a regenerated Android project.
import { describe, expect, it } from 'vitest'
import manifestRaw from '../../android/app/src/main/AndroidManifest.xml?raw'
import backupRulesRaw from '../../android/app/src/main/res/xml/backup_rules.xml?raw'
import extractionRulesRaw from '../../android/app/src/main/res/xml/data_extraction_rules.xml?raw'

const stripComments = (xml: string) => xml.replace(/<!--[\s\S]*?-->/g, '')
const manifest = stripComments(manifestRaw)
const backupRules = stripComments(backupRulesRaw)
const extractionRules = stripComments(extractionRulesRaw)

const EXCLUDE_SESSION = /<exclude\s+domain="sharedpref"\s+path="CapacitorStorage\.xml"\s*\/>/

function section(xml: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)
  if (!match) throw new Error(`<${tag}> missing`)
  return match[1]
}

describe('Android backup rules', () => {
  it('keeps backup on and points to both rule files', () => {
    const application = /<application\b([^>]*)>/.exec(manifest)?.[1] ?? ''
    expect(application).toMatch(/android:allowBackup="true"/)
    expect(application).toMatch(/android:fullBackupContent="@xml\/backup_rules"/)
    expect(application).toMatch(/android:dataExtractionRules="@xml\/data_extraction_rules"/)
  })

  it('excludes only the session up to Android 11', () => {
    const content = section(backupRules, 'full-backup-content')
    expect(content).toMatch(EXCLUDE_SESSION)
    expect(content.match(/<exclude\b/g)).toHaveLength(1)
    expect(content).not.toMatch(/<include\b/)
  })

  it('excludes only the session from cloud backup and device transfer from Android 12', () => {
    const rules = section(extractionRules, 'data-extraction-rules')
    for (const tag of ['cloud-backup', 'device-transfer']) {
      const content = section(rules, tag)
      expect(content).toMatch(EXCLUDE_SESSION)
      expect(content.match(/<exclude\b/g)).toHaveLength(1)
      expect(content).not.toMatch(/<include\b/)
    }
  })
})
