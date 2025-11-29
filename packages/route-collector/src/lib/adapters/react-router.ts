import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'
import type { RouteDefinition } from '../fs.ts'

export function createRouteConfig(collectedRoutes: RouteDefinition[]): Awaited<RouteConfig> {
  return collectedRoutes.map((routeDef) => {
    if (routeDef.isLayout) {
      return layout(routeDef.filename, createRouteConfig(routeDef.siblings || []))
    }
    if (routeDef.route === '') {
      return index(routeDef.filename)
    }
    return route('/' + routeDef.route, routeDef.filename)
  })
}
