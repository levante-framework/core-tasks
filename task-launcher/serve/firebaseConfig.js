// ONLY FOR STANDALONE (WEB APP)

// Change this to use your projects database API keys
const devFirebaseConfig = {
  apiKey: "AIzaSyC9IoJBEyN-BxHobeoMQRuEu0CtyQDOg8k",
  authDomain: "hs-levante-assessment-dev.firebaseapp.com",
  projectId: "hs-levante-assessment-dev",
  storageBucket: "hs-levante-assessment-dev.appspot.com",
  messagingSenderId: "46792247600",
  appId: "1:46792247600:web:ea20e1fe94e0541dd5a0f5"
};

const productionFirebaseConfig = {
  apiKey: "AIzaSyC9IoJBEyN-BxHobeoMQRuEu0CtyQDOg8k",
  authDomain: "hs-levante-assessment-dev.firebaseapp.com",
  projectId: "hs-levante-assessment-dev",
  storageBucket: "hs-levante-assessment-dev.appspot.com",
  messagingSenderId: "46792247600",
  appId: "1:46792247600:web:ea20e1fe94e0541dd5a0f5"
};

export const firebaseConfig = ENV === "production" ? productionFirebaseConfig : devFirebaseConfig;