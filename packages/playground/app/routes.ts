import { collectRoutes } from '@pizzajsdev/app-router-fs'
import { createRouterConfig } from '@pizzajsdev/app-router-fs/adapters/react-router'
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
export const collectedRoutes = collectRoutes('routes', ['.tsx', '.ts'], __dirname)
const routes = createRouterConfig(collectedRoutes)

export default routes
