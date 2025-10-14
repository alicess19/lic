const fs = require('fs');
const path = require('path');
const target = path.join(
  __dirname,
  '../node_modules/react-native-view-shot/android/src/main/java/fr/greweb/reactnativeviewshot/ViewShot.java'
);
if (!fs.existsSync(target)) {
  console.warn('react-native-view-shot negasit in ', target);
  process.exit(0);
}
let src = fs.readFileSync(target, 'utf8');
// mutare orice "@OptIn" de pe semn metodei pe linia ant
src = src.replace(
  /public void @androidx\.annotation\.OptIn\(markerClass = UnstableReactNativeAPI\.class\) execute/g,
  '@androidx.annotation.OptIn(markerClass = UnstableReactNativeAPI.class)\n    public void execute'
);
fs.writeFileSync(target, src, 'utf8');
console.log('aplicat ok- react-native-view-shot');
