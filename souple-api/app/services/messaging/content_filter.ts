// Reset regex before use — stateful regex with /g flag requires reset
export function filterContent(text: string): { filtered: string; hadContactInfo: boolean } {
  const PHONE = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
  const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

  const hadPhone = PHONE.test(text)
  PHONE.lastIndex = 0
  const hadEmail = EMAIL.test(text)
  EMAIL.lastIndex = 0

  const filtered = text
    .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[numéro masqué]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email masqué]')

  return { filtered, hadContactInfo: hadPhone || hadEmail }
}
