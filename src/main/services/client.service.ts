// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Client Service
// ────────────────────────────────────────────────────────

import * as repo from '../repositories/client.repository'
import type {
  Client,
  ClientInsert,
  ClientWithHistory,
  PaginatedResult,
  ListParams,
  LoosePartial
} from '../../shared/types'

export function listClients(params: ListParams): PaginatedResult<Client> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''
  return repo.listClients(page, pageSize, search, params.sortBy, params.sortDir)
}

export function getClient(id: number): ClientWithHistory {
  const client = repo.getClient(id)
  if (client === null) {
    throw new Error(`Client with ID ${id.toString()} not found`)
  }
  return client
}

export function createClient(data: Omit<ClientInsert, 'clientNumber'>): Client {
  return repo.createClient(data)
}

export function updateClient(id: number, data: LoosePartial<ClientInsert>): Client {
  return repo.updateClient(id, data)
}
