import { configure } from '@storybook/react';

import 'bootstrap/dist/css/bootstrap.css';
import 'react-select/dist/react-select.min.css';

// automatically import all files ending in *.stories.js
const req = require.context('../stories', true, /.stories.js$/);
function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
