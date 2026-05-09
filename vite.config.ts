import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const puzzleFilePath = path.resolve(process.cwd(), 'public/data/puzzles.json')
const soundSettingsFilePath = path.resolve(
  process.cwd(),
  'public/data/sound-settings.json',
)
const finalPuzzleFilePath = path.resolve(
  process.cwd(),
  'public/data/final-puzzle.json',
)

const createJsonFileApiMiddleware = (
  filePath: string,
  readErrorMessage: string,
  writeErrorMessage: string,
) => {
  return async (req: NodeJS.ReadableStream & { method?: string; url?: string }, res: any) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Bad request.')
      return
    }

    if (req.method === 'GET') {
      try {
        const contents = await fs.readFile(filePath, 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.end(contents)
      } catch {
        res.statusCode = 500
        res.end(readErrorMessage)
      }
      return
    }

    if (req.method === 'PUT') {
      try {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body) as unknown
            const serialized = `${JSON.stringify(parsed, null, 2)}\n`
            await fs.writeFile(filePath, serialized, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(serialized)
          } catch {
            res.statusCode = 400
            res.end('Invalid JSON payload.')
          }
        })
      } catch {
        res.statusCode = 500
        res.end(writeErrorMessage)
      }
      return
    }

    res.statusCode = 405
    res.end('Method not allowed.')
  }
}

const puzzleApiPlugin = (): Plugin => ({
  name: 'puzzle-api-plugin',
  configureServer(server) {
    server.middlewares.use(
      '/api/puzzles',
      createJsonFileApiMiddleware(
        puzzleFilePath,
        'Could not read puzzle file.',
        'Could not save puzzle file.',
      ),
    )
    server.middlewares.use(
      '/api/sound-settings',
      createJsonFileApiMiddleware(
        soundSettingsFilePath,
        'Could not read sound settings file.',
        'Could not save sound settings file.',
      ),
    )
    server.middlewares.use(
      '/api/final-puzzle',
      createJsonFileApiMiddleware(
        finalPuzzleFilePath,
        'Could not read final puzzle file.',
        'Could not save final puzzle file.',
      ),
    )
  },
})

export default defineConfig({
  plugins: [react(), puzzleApiPlugin()],
})
