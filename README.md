# Vega Editor [![Build Status](https://github.com/vega/editor/workflows/Test/badge.svg)](https://github.com/vega/editor/actions) [![Deploy to Pages](https://github.com/vega/editor/actions/workflows/publish.yml/badge.svg)](https://github.com/vega/editor/actions/workflows/publish.yml)

nvm use
yarn install
yarn build
yarn start

## デプロイ先

GitHub Pages

## ビルドとデプロイ方法

ローカルで以下を実行する。mainブランチに変更はなく、ビルドしたファイルをgh-pagesブランチのみに送信する。

```
npm run deploy
```

なお、`npm run deploy` (または `yarn deploy`) は、`gh-pages` ブランチにビルド済みのファイルを自動的にプッシュします。
手動で `gh-pages` ブランチを操作する必要はありません。
