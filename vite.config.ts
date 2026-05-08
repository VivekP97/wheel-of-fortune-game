import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const puzzleFilePath = path.resolve(process.cwd(), 'public/data/puzzles.json')

const puzzleApiPlugin = (): Plugin => ({
  name: 'puzzle-api-plugin',
  configureServer(server) {
    server.middlewares.use('/api/puzzles', async (req, res) => {
      if (!req.url) {
        res.statusCode = 400
        res.end('Bad request.')
        return
      }

      if (req.method === 'GET') {
        try {
          const contents = await fs.readFile(puzzleFilePath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(contents)
        } catch {
          res.statusCode = 500
          res.end('Could not read puzzle file.')
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
              await fs.writeFile(puzzleFilePath, serialized, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(serialized)
            } catch {
              res.statusCode = 400
              res.end('Invalid JSON payload.')
            }
          })
        } catch {
          res.statusCode = 500
          res.end('Could not save puzzle file.')
        }
        return
      }

      res.statusCode = 405
      res.end('Method not allowed.')
    })
  },
})

export default defineConfig({
  plugins: [react(), puzzleApiPlugin()],
})
