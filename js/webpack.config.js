const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const LicenseWebpackPlugin =
  require("license-webpack-plugin").LicenseWebpackPlugin;
const webpack = require("webpack");

var devtool;

if (process.env.DEV === "1") {
  devtool = "inline-source-map";
} else {
  devtool = "source-map";
}

module.exports = {
  entry: {
    gotty: "./src/main.ts",
  },
  output: {
    path: path.resolve(__dirname, "../bindata/static/js/"),
  },
  devtool: devtool,
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new LicenseWebpackPlugin(),
    new webpack.DefinePlugin({
      PRODUCTION: process.env.DEV !== "1",
    }),
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
