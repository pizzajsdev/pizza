# route-collector

A framework-agnostic file-based route collector inspired by Next.js's App Router

## Features

Supports all route types of [the official docs](https://reactrouter.com/start/framework/routing):

- Root and index routes: Either `index.tsx` or `page.tsx`, but a segment folder is not required,
  e.g. `posts.tsx` is the same as `posts/index.tsx`
- Dynamic Segments: `posts/[id].tsx` or `posts/[id]/index.tsx`
- Optional Segments: `[[lang]]/news.tsx`
- Splat/Wildcard routes: `api/auth/[...].tsx`
- Layout routes: `layout.tsx` at any level, inheritable.
- Extras inspired by Next:
  - Route grouping (via parentheses): `(auth)/news.tsx` will be `/news`. Has no effect more than
    code organisation purposes or for sharing the same layout without requiring a nested level.

Supports both `.ts` and `.tsx` files, depends if you use JSX inside or not.

Also supports `.mdx` and `.md` files for markdown pages, with an optional `mdxRendererFile` option
to specify the route file to use as the renderer.

## Installation

```bash
pnpm add @pizzajsdev/route-collector
```

## Usage

### Generic usage

You can use the `collectRoutes` function to collect the routes from the file system, and build your
own route configuration with any framework that supports programmatically-generated routes.

```ts
import { collectRoutes } from '@pizzajsdev/route-collector/fs'

const routeDefinitions = collectRoutes({
  projectRoot: process.cwd() + '/src',
  routesDir: 'api',
  fileExtensions: ['.ts'],
  ignoredPaths: [],
  ignoredPathPrefix: '_',
})

for (const route of routeDefinitions) {
  // define routes e.g. with Hono, Elysia, etc.
}
```

### Using with React Router

Edit the `app/routes.ts` file to use the generated routes.

```ts
// app/routes.ts
import { collectRoutes } from '@pizzajsdev/route-collector/react-router'

const routes = collectRoutes({
  projectRoot: process.cwd() + '/app',
  routesDir: 'routes',
  fileExtensions: ['.tsx', '.ts', '.mdx', '.md'],
  ignoredPaths: [],
  ignoredPathPrefix: '_',
})

export default routes
```
