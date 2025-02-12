const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const LicenseWebpackPlugin =
  require("license-webpack-plugin").LicenseWebpackPlugin;
const webpack = require("webpack");

const plugins = {
  PRODUCTION: process.env.DEV !== "1",
  GOTTY_VERSION: JSON.stringify(process.env.VERSION ?? "9.9.9"),
};
console.table(plugins)

const devtool = process.env.DEV === "1" ? "inline-source-map" : "source-map";

module.exports = {
  entry: {
    gotty: "./src/main.ts",
  },
  output: {
    path: path.resolve(__dirname, "../bindata/static/js/"),
  },
  devtool,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new LicenseWebpackPlugin(),
    new webpack.DefinePlugin(plugins),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sassOptions: {
                includePaths: ["node_modules/bootstrap/scss"],
              },
            },
          },
        ],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};
