// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Dashboard IPC Handlers
// ────────────────────────────────────────────────────────

import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as dashboardService from '../services/dashboard.service'
import { z } from 'zod'

export function registerDashboardHandlers(): void {
  registerRoute(
    IPC_CHANNELS.DASHBOARD_METRICS,
    { schema: z.any() }, // no params
    async () => dashboardService.getDashboardMetrics()
  )
}
