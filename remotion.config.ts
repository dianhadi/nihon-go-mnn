import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Content files are YAML. Load them as raw strings; src/engine/bundle-content.ts parses them.
Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      { test: /\.ya?ml$/, type: "asset/source" },
    ],
  },
}));
