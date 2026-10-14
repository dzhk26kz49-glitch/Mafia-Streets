
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    plugins: {
      'security-rules': firebaseRulesPlugin
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules
    }
  }
];
