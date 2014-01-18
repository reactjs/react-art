# Testing

To set up tests on your computer:

1. In a clone of React, run:

  ```
  grunt build:test
  grunt build:npm-react
  cd build/npm/react/ && npm link
  ```
1. In `react-art/`, run `npm link react`.

Afterwards, to run tests:

1. Run `npm run build:test`.
1. Open `test/index.html` in a browser.
