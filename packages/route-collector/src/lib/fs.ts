import fs from 'node:fs'
import path from 'node:path'

export type RouteDefinition =
  | {
      route: string
      filename: string
      layout: string | null
      isLayout?: never
      siblings?: never
    }
  | {
      filename: string
      isLayout: true
      siblings: RouteDefinition[]
    }

export type FileSystemRouterOptions = {
  projectRoot?: string
  routesDir?: string
  fileExtensions?: string[]
  ignoredPaths?: string[]
  ignoredPathPrefix?: string
  mdxRendererFile?: string
}

export class FileSystemRouter {
  #fileExts: string[]
  #fileExtsMatcher: string
  #projectRoot: string
  #ignoredPaths: string[]
  #ignoredPathPrefix: string
  #mdxRendererFile: string | undefined

  constructor(options: FileSystemRouterOptions) {
    this.#fileExts = (options.fileExtensions ?? ['.tsx', '.ts']).map((ext) => ext.toLowerCase())
    this.#fileExtsMatcher = `(${this.#fileExts.map((ext) => ext.replace('.', '')).join('|')})`
    this.#projectRoot = options.projectRoot ?? process.cwd()
    this.#ignoredPaths = options.ignoredPaths ?? []
    this.#ignoredPathPrefix = options.ignoredPathPrefix ?? '_'
    this.#mdxRendererFile = options.mdxRendererFile
  }

  #isSupportedFile(filename: string): boolean {
    return this.#fileExts.some((ext) => filename.endsWith(ext))
  }

  #isIndexFile(filename: string): boolean {
    return filename.match(new RegExp(`^(index|page)\.${this.#fileExtsMatcher}$`)) !== null
  }

  #isLayoutFile(filename: string): boolean {
    return (
      filename.match(new RegExp(`^layout\.${this.#fileExtsMatcher}$`)) !== null ||
      filename.match(new RegExp(`\/layout\.${this.#fileExtsMatcher}$`)) !== null
    )
  }

  #isDtsFile(filename: string): boolean {
    // matches .d.ts, .d.json.ts, etc.
    return filename.endsWith('.d.ts') || filename.match(/\.d\.([a-z0-9]+).ts$/) !== null
  }

  #isIgnoredPath(filename: string): boolean {
    return filename.startsWith(this.#ignoredPathPrefix) || this.#ignoredPaths.includes(filename)
  }

  #isGrouping(filename: string): boolean {
    return /^\(.*\)$/.test(filename)
  }

  #isSplatRoute(filename: string): boolean {
    return filename.startsWith('[...') && filename.endsWith(']')
  }

  #isDynamicRoute(filename: string): boolean {
    return filename.startsWith('[') && filename.endsWith(']')
  }

  #transformSegment(routeName: string, basePath: string): string {
    let routePath = ''
    if (routeName === 'index' || routeName === 'page') {
      routePath = basePath
    } else if (this.#isSplatRoute(routeName)) {
      // Catch-all or Splat route, @see https://reactrouter.com/start/framework/routing#splats
      // const param = routeName.slice(4, -1)
      routePath = path.join(basePath, '*')
    } else if (this.#isDynamicRoute(routeName)) {
      // Dynamic segment route
      let param = routeName.slice(1, -1)
      if (param.startsWith('[') && routeName.endsWith(']')) {
        // Optional segment route
        param = param.slice(1, -1) + '?'
      }
      routePath = path.join(basePath, `:${param}`)
    } else {
      routePath = path.join(basePath, routeName)
    }

    // Clean up the route path
    routePath = routePath.replace(/\\/g, '/') // Convert Windows paths
    return routePath
  }

  #isMdxFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.mdx') || filename.toLowerCase().endsWith('.md')
  }

  #safeLayoutFile(layoutFile: string): string {
    if (this.#isMdxFile(layoutFile)) {
      throw new Error(
        `Markdown Layout files are not supported: ${layoutFile}.` +
          'If your intention was to create a route with a layout/ path segment, ' +
          `use ./layout/index.mdx instead.`,
      )
    }
    return layoutFile
  }

  collectRoutes(
    dir: string = 'app/routes',
    basePath: string = '',
    parentLayoutFile: string | null = null,
  ): RouteDefinition[] {
    let routesDir = path.join(this.#projectRoot, dir)
    if (!fs.existsSync(routesDir)) {
      throw new Error(`[app-router-fs] Routes directory not found: ${routesDir}`)
    }

    let entries = fs.readdirSync(routesDir, { withFileTypes: true })
    let routes: RouteDefinition[] = []
    let layoutFile: string | null = parentLayoutFile

    // First pass: find layout file if it exists
    for (let entry of entries) {
      if (!entry.isDirectory() && this.#isLayoutFile(entry.name)) {
        layoutFile = path.join(dir, entry.name).replace(/\\/g, '/')
        break
      }
    }

    // Sort entries to ensure index files come first
    entries.sort((a, b) => {
      if (this.#isIndexFile(a.name)) return -1
      if (this.#isIndexFile(b.name)) return 1
      return a.name.localeCompare(b.name)
    })

    // Second pass: process all routes
    let processedRoutes: RouteDefinition[] = []
    for (let entry of entries) {
      // Skip files/folders starting with underscore and layout files (handled separately)
      if (this.#isIgnoredPath(entry.name) || this.#isLayoutFile(entry.name)) {
        continue
      }

      let routeName = entry.name.replace(new RegExp(`\\.${this.#fileExtsMatcher}$`), '') // Remove extensions

      if (entry.isDirectory()) {
        // Skip if directory is a special route directory (starts with underscore)
        if (routeName.startsWith('_')) {
          continue
        }

        // Handle parentheses folders - they don't count as segments
        let newBasePath = this.#isGrouping(routeName)
          ? basePath
          : path.join(basePath, this.#transformSegment(routeName, ''))
        let childRoutes = this.collectRoutes(path.join(dir, entry.name), newBasePath, layoutFile)
        processedRoutes.push(...childRoutes)
      } else {
        // Skip non-route files
        if (
          this.#isDtsFile(entry.name) || // Skip d.ts files
          !this.#isSupportedFile(entry.name) || // Skip if not matching any supported extension
          this.#isIgnoredPath(entry.name) || // Skip ignored files and dirs with leading underscore
          this.#isLayoutFile(entry.name) // Skip layout files
        ) {
          continue
        }

        let routePath = this.#transformSegment(routeName, basePath)
        let routeFilePath = path.join(dir, entry.name)

        // Clean up the route path
        routePath = routePath.replace(/\\/g, '/') // Convert Windows paths
        if (routePath.startsWith('/')) {
          routePath = routePath.slice(1)
        }

        processedRoutes.push({
          route: routePath,
          layout: layoutFile ? this.#safeLayoutFile(layoutFile) : null,
          filename:
            this.#isMdxFile(routeFilePath) && this.#mdxRendererFile !== undefined
              ? this.#mdxRendererFile
              : routeFilePath,
        })
      }
    }

    // If we found a layout file, create a layout route with all siblings
    if (layoutFile && layoutFile !== parentLayoutFile) {
      routes.push({
        filename: this.#safeLayoutFile(layoutFile),
        isLayout: true,
        siblings: processedRoutes,
      })
    } else {
      routes.push(...processedRoutes)
    }

    return routes
  }

  #getRoutesAsTable(routes: RouteDefinition[]): { route: string; filename: string; layout: string }[] {
    return routes.flatMap((r) => {
      if (r.isLayout) {
        return this.#getRoutesAsTable(r.siblings)
      }
      return [{ route: '/' + r.route, filename: r.filename, layout: r.layout ?? 'root' }]
    })
  }

  debug(routes: RouteDefinition[]) {
    console.log(JSON.stringify(routes, null, 2))
    let tableData = this.#getRoutesAsTable(routes)
    console.log('\n🚀 Route List:')
    console.table(tableData)
    console.log('Supported page extensions:', this.#fileExts.join(', '))
  }
}

export function collectRoutes(options?: FileSystemRouterOptions): RouteDefinition[] {
  let _options = Object.assign(
    {
      routesDir: 'app/routes',
      fileExtensions: ['.tsx', '.ts'],
      projectRoot: process.cwd(),
      ignoredPaths: [],
      ignoredPathPrefix: '_',
      mdxRendererFile: undefined,
    } satisfies FileSystemRouterOptions,
    options,
  )

  return new FileSystemRouter(_options).collectRoutes(_options.routesDir)
}
