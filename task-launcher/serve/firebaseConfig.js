// ONLY FOR STANDALONE (WEB APP)

// Change this to use your projects database API keys
const devFirebaseConfig = {
  apiKey: 'AIzaSyC9IoJBEyN-BxHobeoMQRuEu0CtyQDOg8k',
  authDomain: 'hs-levante-assessment-dev.firebaseapp.com',
  projectId: 'hs-levante-assessment-dev',
  storageBucket: 'hs-levante-assessment-dev.appspot.com',
  messagingSenderId: '46792247600',
  appId: '1:46792247600:web:ea20e1fe94e0541dd5a0f5',
};

const productionFirebaseConfig = {
  apiKey: "AIzaSyCdAa6P5Ot8jjnKAi_FNLDfvWP_rDqeQYg",
  authDomain: "hs-levante-assessment-prod.firebaseapp.com",
  projectId: "hs-levante-assessment-prod",
  storageBucket: "hs-levante-assessment-prod.appspot.com",
  messagingSenderId: "928482088295",
  appId: "1:928482088295:web:1cab64d5dccb2d19ae8bc2"
};

export const firebaseConfig = ENV === 'production' ? productionFirebaseConfig : devFirebaseConfig;
