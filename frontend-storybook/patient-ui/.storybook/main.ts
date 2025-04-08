import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-essentials",
    "@storybook/preset-create-react-app",
    "@storybook/addon-onboarding",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-themes"
  ],
  "framework": {
    "name": "@storybook/react-webpack5",
    "options": {}
  },
  "staticDirs": ["../public"],
  "core": {
    "builder": "@storybook/builder-webpack5"
  }
};

export default config;