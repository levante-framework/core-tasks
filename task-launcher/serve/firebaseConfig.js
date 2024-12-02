// ONLY FOR STANDALONE (WEB APP)

// Change this to use your projects database API keys
const devFirebaseConfig = {
  apiKey: 'AIzaSyDw0TnTXbvRyoVo5_oa_muhXk9q7783k_g',
    authDomain: 'gse-roar-assessment.firebaseapp.com',
    projectId: 'gse-roar-assessment',
    storageBucket: 'gse-roar-assessment.appspot.com',
    messagingSenderId: '757277423033',
    appId: '1:757277423033:web:d6e204ee2dd1047cb77268',
    siteKey: '6Lc54SEqAAAAAKJF8QNpEzU6wHtXGAteVvrdB8XK',
  }
  
  export const firebaseConfig = ENV === 'production' ? productionFirebaseConfig : devFirebaseConfig;