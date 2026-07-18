import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// TODO(foodondoor): This is Nutriwow's Firebase project. Replace with Foodondoor's own
// Firebase config before launch, otherwise Foodondoor analytics/events flow into Nutriwow's project.
const firebaseConfig = {
  apiKey: "AIzaSyAdxsgy148NzgZaQGOk4ONha_XOfzZKG0g",
  authDomain: "nutriwow.firebaseapp.com",
  projectId: "nutriwow",
  storageBucket: "nutriwow.firebasestorage.app",
  messagingSenderId: "821263813135",
  appId: "1:821263813135:web:0fe002e4bc1661530ff17a",
  measurementId: "G-JFJPBSJ3SZ",
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export async function initFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;

  return getAnalytics(firebaseApp);
}
