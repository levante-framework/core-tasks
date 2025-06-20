// ONLY FOR STANDALONE (WEB APP)

// Change this to use your projects database API keys
const devFirebaseConfig = {
  apiKey: "AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0",
  authDomain: "hs-levante-admin-dev.firebaseapp.com",
  projectId: "hs-levante-admin-dev",
  storageBucket: "hs-levante-admin-dev.firebasestorage.app",
  messagingSenderId: "41590333418",
  appId: "1:41590333418:web:3468a7caadab802d6e5c93"
};

const productionFirebaseConfig = {
  apiKey: "AIzaSyCcnmBCojjK0_Ia87f0SqclSOihhKVD3f8",
  authDomain: "hs-levante-admin-prod.firebaseapp.com",
  projectId: "hs-levante-admin-prod",
  storageBucket: "hs-levante-admin-prod.firebasestorage.app",
  messagingSenderId: "348449903279",
  appId: "1:348449903279:web:a1b9dad734e2237c7ffa5a"
};

export const firebaseConfig = ENV === 'production' ? productionFirebaseConfig : devFirebaseConfig;
