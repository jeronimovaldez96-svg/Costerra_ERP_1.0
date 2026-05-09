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

export async function listClients(params: ListParams): Promise<PaginatedResult<Client>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''
  return repo.listClients(page, pageSize, search, params.sortBy, params.sortDir)
}

export async function getClient(id: number): Promise<ClientWithHistory> {
  const client = await repo.getClient(id)
  if (client === null) {
    throw new Error(`Client with ID ${id} not found`)
  }
  return client
}

export async function createClient(data: Omit<ClientInsert, 'clientNumber'>): Promise<Client> {
  return repo.createClient(data)
}

export async function updateClient(id: number, data: LoosePartial<ClientInsert>): Promise<Client> {
  return repo.updateClient(id, data)
}
