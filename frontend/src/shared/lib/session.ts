const guestTokenKey = 'shopcart.guest-token'

export function getGuestToken(): string | null {
  return localStorage.getItem(guestTokenKey)
}

export function setGuestToken(token: string | null): void {
  if (token) {
    localStorage.setItem(guestTokenKey, token)
    return
  }
  localStorage.removeItem(guestTokenKey)
}
