import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        console.log(launchOptions.args)
        if (browser.family === 'chromium') {
          launchOptions.args.push('--full-screen')
        }
        //console.log(launchOptions.args)
      
        return launchOptions
      })
    },
  },
});
