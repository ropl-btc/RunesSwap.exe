module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Relax length restrictions for AI-generated messages
    'header-max-length': [0], // Disable header length limit
    'body-max-line-length': [0], // Disable body line length limit
    'footer-max-line-length': [0], // Disable footer line length limit

    // Allow any case for subjects (AI often uses different casing)
    'subject-case': [0], // Disable case restrictions

    // Make type and subject required for basic structure
    'type-empty': [2, 'never'], // Error - type is required
    'subject-empty': [2, 'never'], // Error - subject is required

    // Allow empty scope and body
    'scope-empty': [0],
    'body-empty': [0],

    // Relax other formatting rules
    'subject-full-stop': [0], // Allow periods at end of subject
    'type-case': [0], // Allow any case for type
    'scope-case': [0], // Allow any case for scope
  },
};
