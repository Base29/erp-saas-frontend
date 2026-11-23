import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

function getLatestGitTag(): string {
  // 1. Check VERSION file in frontend or root
  try {
    const vFile = path.resolve(__dirname, 'VERSION')
    if (fs.existsSync(vFile)) {
      const v = fs.readFileSync(vFile, 'utf-8').trim()
      if (v) return v
    }
  } catch {
    // ignore
  }

  try {
    const rootVFile = path.resolve(__dirname, '../VERSION')
    if (fs.existsSync(rootVFile)) {
      const v = fs.readFileSync(rootVFile, 'utf-8').trim()
      if (v) return v
    }
  } catch {
    // ignore
  }

  // 2. Git describe
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (tag) return tag
  } catch {
    // try fallback to tag list
    try {
      const tagList = execSync('git tag -l --sort=-v:refname', {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim()
        .split('\n')
      if (tagList[0]?.trim()) return tagList[0].trim()
    } catch {
      // fallback
    }
  }

  return 'v0.2.8'
}

function dynamicVersionPlugin(): Plugin {
  return {
    name: 'dynamic-version-plugin',
    configureServer(server) {
      server.middlewares.use('/__version', (req, res) => {
        const liveTag = getLatestGitTag()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ version: liveTag }))
      })
    },
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, 'dist')
        if (fs.existsSync(outDir)) {
          const liveTag = getLatestGitTag()
          fs.writeFileSync(
            path.join(outDir, 'version.json'),
            JSON.stringify({ version: liveTag }, null, 2)
          )
        }
      } catch {
        // ignore
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const latestTag = env.VITE_APP_VERSION || getLatestGitTag()

  return {
    define: {
      __APP_VERSION__: JSON.stringify(latestTag),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(latestTag),
    },
    plugins: [react(), dynamicVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'https://backend.test',
          changeOrigin: true,
          secure: false, // allow self-signed certs from Valet
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
