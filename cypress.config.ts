import { defineConfig } from 'cypress'
import coverageTask from '@cypress/code-coverage/task'

export default defineConfig({
    viewportWidth: 1440,
    viewportHeight: 900,
    trashAssetsBeforeRuns: true,
    screenshotOnRunFailure: true,
    video: true,
    e2e: {
        setupNodeEvents(on, config) {
            coverageTask(on, config)
            return config
        },
        excludeSpecPattern: '*.md',
        baseUrl: 'http://localhost:5173',
    },
})
