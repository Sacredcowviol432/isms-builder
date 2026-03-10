// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
function showError(msg) {
  const el = document.getElementById('error-msg')
  if (!el) { alert(msg); return }
  // Neues Layout: #error-text-Span, falls vorhanden; sonst direkt textContent
  const textEl = document.getElementById('error-text')
  if (textEl) textEl.textContent = msg
  else el.textContent = msg
  el.style.display = 'flex'
}

// Handles login submission for autark login (email + password) with optional 2FA (Totp)
async function submitLogin() {
  const emailEl = document.getElementById('email')
  const pwdEl = document.getElementById('password')
  const totpEl = document.getElementById('totp-input')
  if (!emailEl || !pwdEl) return
  const payload = {
    email: emailEl.value,
    password: pwdEl.value,
    totp: totpEl ? totpEl.value : undefined
  }
  try {
    const resp = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await resp.json()
    if (resp.ok) {
      // Persist session info
      localStorage.setItem('isms_current_user', data.username)
      localStorage.setItem('isms_current_role', data.role)
      localStorage.setItem('isms_current_functions', JSON.stringify(data.functions || []))
      if (data.domain) localStorage.setItem('isms_current_domain', data.domain)
      window.location.href = '/ui/index.html'
    } else {
      if (data && data.code === 'ENFORCE_2FA') {
        // 2FA systemweit erzwungen, aber für diesen Account noch nicht eingerichtet
        showError('Zugang gesperrt: Zwei-Faktor-Authentifizierung (2FA) ist für alle Benutzer verpflichtend. Bitte wende dich an den Administrator, damit 2FA für deinen Account eingerichtet wird.')
        const el = document.getElementById('error-msg')
        if (el) el.style.borderLeft = '4px solid #f0b429'
      } else if (data && data.twoFactorRequired) {
        // Show inline 2FA area for test/demo (instead of prompt)
        const area = document.getElementById('totp-area')
        if (area) area.style.display = 'block'
        const totpInput = document.getElementById('totp-input')
        const btn = document.getElementById('totp-submit')
        if (totpInput && btn) {
          btn.onclick = async () => {
            const totp = totpInput.value
            if (!totp) { alert('2FA-Code fehlt'); return }
            payload.totp = totp
            const retry = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data2 = await retry.json()
            if (retry.ok) {
              localStorage.setItem('isms_current_user', data2.username)
              localStorage.setItem('isms_current_role', data2.role)
              localStorage.setItem('isms_current_functions', JSON.stringify(data2.functions || []))
              if (data2.domain) localStorage.setItem('isms_current_domain', data2.domain)
              window.location.href = '/ui/index.html'
            } else {
              showError('Login fehlgeschlagen: ' + (data2.error || 'Unbekannter Fehler'))
            }
          }
        }
      } else {
        showError('Login fehlgeschlagen: ' + (data.error || 'Unbekannter Fehler'))
      }
    }
  } catch (e) {
    console.error(e)
    showError('Login-Fehler: Netzwerkfehler')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('loginBtn')
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); submitLogin() })
})
