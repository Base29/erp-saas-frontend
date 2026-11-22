import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

function getLatestGitTag(): string {
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
  return 'v0.2.7'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const latestTag = env.VITE_APP_VERSION || getLatestGitTag()

  return {
    define: {
      __APP_VERSION__: JSON.stringify(latestTag),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(latestTag),
    },
    plugins: [react()],
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
