'use strict'
// TOTP – RFC 6238 / HOTP – RFC 4226
// Kompatibel mit Google Authenticator, Authy, etc.
const crypto = require('crypto')

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(str) {
  const s = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  const bytes = []
  let bits = 0, value = 0
  for (const char of s) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function int64Buffer(n) {
  const buf = Buffer.alloc(8)
  let tmp = n
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }
  return buf
}

function hotp(secretBuf, counter) {
  const hmac = crypto.createHmac('sha1', secretBuf)
  hmac.update(int64Buffer(counter))
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code = ((digest[offset] & 0x7f) << 24) |
               ((digest[offset + 1] & 0xff) << 16) |
               ((digest[offset + 2] & 0xff) << 8) |
               (digest[offset + 3] & 0xff)
  return code % 1_000_000
}

function generateTotp(secret, timeStep = 30) {
  const secretBuf = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / timeStep)
  return hotp(secretBuf, counter).toString().padStart(6, '0')
}

// Prüft aktuelles + benachbarte Zeitfenster (±1) gegen Uhrabweichungen
function verifyTotp(secret, token, timeStep = 30, window = 1) {
  const secretBuf = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / timeStep)
  const input = String(token).replace(/\s/g, '')
  for (let delta = -window; delta <= window; delta++) {
    const code = hotp(secretBuf, counter + delta).toString().padStart(6, '0')
    if (code === input) return true
  }
  return false
}

module.exports = { generateTotp, verifyTotp, base32Decode }
