import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'
import { type RouteDefinition, type FileSystemRouterOptions, collectRoutes as collectRoutesBase } from './fs.ts'

function createRouterConfig(routes: RouteDefinition[]): Awaited<RouteConfig> {
  return routes.map((routeDef) => {
    if (routeDef.isLayout) {
      return layout(routeDef.filename, createRouterConfig(routeDef.siblings || []))
    }
    if (routeDef.route === '' || routeDef.route === '/') {
      return index(routeDef.filename)
    }
    return route('/' + routeDef.route, routeDef.filename, { id: routeDef.route })
  })
}

export function collectRoutes(options?: FileSystemRouterOptions): Awaited<RouteConfig> {
  return createRouterConfig(collectRoutesBase(options))
}
