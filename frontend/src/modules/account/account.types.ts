export interface Address {
  id: number
  alias: string
  line1: string
  line2: string | null
  municipality: string
  department: string
  phone: string
}

export interface Profile {
  name: string
  email: string
  addresses: Address[]
}

export interface AddressInput {
  alias: string
  line1: string
  line2: string | null
  municipality: string
  department: string
  phone: string
}
