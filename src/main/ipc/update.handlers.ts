import { registerRoute } from './router'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { updateService } from '../services/update.service'
import { z } from 'zod'

export function registerUpdateHandlers() {
  registerRoute(
    IPC_CHANNELS.UPDATE_CHECK,
    { schema: z.object({}).optional() },
    async () => {
      await updateService.checkForUpdates()
      return { success: true }
    }
  )

  registerRoute(
    IPC_CHANNELS.UPDATE_DOWNLOAD,
    { schema: z.object({}).optional() },
    async () => {
      await updateService.downloadUpdate()
      return { success: true }
    }
  )

  registerRoute(
    IPC_CHANNELS.UPDATE_INSTALL,
    { schema: z.object({}).optional() },
    async () => {
      updateService.installUpdate()
      return { success: true }
    }
  )

  // Allow renderer to request current status on mount
  registerRoute(
    'update:get-status',
    { schema: z.object({}).optional() },
    async () => updateService.getStatus()
  )
}
