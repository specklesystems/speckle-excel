export const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
export const SERVER_URL = process.env.VUE_APP_SERVER_URL
export const TOKEN = `${APP_NAME}.AuthToken`
export const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`
export const CHALLENGE = `${APP_NAME}.Challenge`

export function goToSpeckleAuthPage() {
  // Generate random challenge
  var challenge =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  // Save challenge in localStorage
  localStorage.setItem(CHALLENGE, challenge)
  // Send user to auth page
  window.location = `${SERVER_URL}/authn/verify/${process.env.VUE_APP_SPECKLE_ID}/${challenge}`
}

export function speckleLogOut() {
  localStorage.removeItem(TOKEN)
  localStorage.removeItem(REFRESH_TOKEN)
}

export function exchangeAccessCode(accessCode) {
  return fetch(`${SERVER_URL}/auth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accessCode: accessCode,
      appId: process.env.VUE_APP_SPECKLE_ID,
      appSecret: process.env.VUE_APP_SPECKLE_SECRET,
      challenge: localStorage.getItem(CHALLENGE)
    })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.token) {
        localStorage.removeItem(CHALLENGE)
        localStorage.setItem(TOKEN, data.token)
        localStorage.setItem(REFRESH_TOKEN, data.refreshToken)
      }
      return data
    })
}
