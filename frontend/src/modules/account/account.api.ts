import { api } from '../../shared/api/client.ts'
import type { Address, AddressInput, Profile } from './account.types.ts'

interface Envelope<T> {
  data: T
  message?: string
}

export async function getProfile(): Promise<Profile> {
  const body = await api<Envelope<Profile>>('/api/v1/users/me')
  return body.data
}

export async function updateProfile(input: { name?: string; email?: string }): Promise<Profile> {
  const body = await api<Envelope<Profile>>('/api/v1/users/me', { method: 'PATCH', body: input })
  return body.data
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const body = await api<Envelope<Address>>('/api/v1/users/me/addresses', { method: 'POST', body: input })
  return body.data
}

export async function updateAddress(addressId: number, input: AddressInput): Promise<Address> {
  const body = await api<Envelope<Address>>(`/api/v1/users/me/addresses/${addressId}`, {
    method: 'PUT',
    body: input,
  })
  return body.data
}
