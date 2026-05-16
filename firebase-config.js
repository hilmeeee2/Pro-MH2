import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAEAEYZjv8VGkpu7MlBggFIdY8e_1xZYS4",
  authDomain: "phone-2f7ee.firebaseapp.com",
  projectId: "phone-2f7ee",
  storageBucket: "phone-2f7ee.appspot.com",
  messagingSenderId: "1017451701717",
  appId: "1:1017451701717:web:eaa50d92c166897a7d895c",
  databaseURL: "https://phone-2f7ee-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
