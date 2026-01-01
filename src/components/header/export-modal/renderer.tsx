import stringify from 'json-stringify-pretty-compact';
import * as React from 'react';
import {useState} from 'react';
import {Book, BookOpen, Code, Image, Map} from 'react-feather';
import {mergeConfig, version as VG_VERSION} from 'vega';
import {version as VE_VERSION} from 'vega-embed';
import {version as VL_VERSION} from 'vega-lite';
import {useAppContext} from '../../../context/app-context.js';
import {Mode} from '../../../constants/consts.js';
import './index.css';

export default function ExportModal() {
  const {state} = useAppContext();
  const {baseURL, config, mode, vegaLiteSpec, vegaSpec, view} = state;

  const [loadingPDF, setLoadingPDF] = useState(false);
  const [errorLoadingPdf, setErrorLoadingPdf] = useState(null);
  const [includeConfig, setIncludeConfig] = useState(true);
  const [downloadVegaJSON, setDownloadVegaJSON] = useState(false);

  const downloadViz = async (ext: string) => {
    const url = await view.toImageURL(ext, 2);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.setAttribute('download', `visualization.${ext}`);
    link.dispatchEvent(new MouseEvent('click'));
  };

  const openViz = async (ext: string) => {
    const url = await view.toImageURL(ext);
    const tab = window.open('about:blank', '_blank');
    tab.document.write(`<title>Chart</title><img src="${url}" />`);
    tab.document.close();
  };

  const downloadPDF = async () => {
    setLoadingPDF(true);

    const isVega = mode === Mode.Vega;
    const spec = isVega ? vegaSpec : vegaLiteSpec;

    const pdf = await fetch(`https://vl-convert.vercel.app/api/${isVega ? 'vg' : 'vl'}2pdf/?baseURL=${baseURL}`, {
      body: JSON.stringify(spec),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/pdf',
      },
      method: 'post',
      mode: 'cors',
    });
    if (!pdf.ok) {
      console.error('Error loading PDF', pdf);
      setLoadingPDF(false);
      setErrorLoadingPdf(pdf.statusText || `Unknown error (code ${pdf.status})`);
      return;
    }
    setLoadingPDF(false);
    setErrorLoadingPdf(null);
    const blob = await pdf.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.setAttribute('download', `visualization.pdf`);
    link.dispatchEvent(new MouseEvent('click'));
  };

  const downloadJSON = () => {
    let content;
    let filename: string;
    if (mode === Mode.Vega) {
      content = vegaSpec;
      filename = `visualization.vg.json`;
    } else {
      content = downloadVegaJSON ? vegaSpec : vegaLiteSpec;
      filename = downloadVegaJSON ? `visualization.vg.json` : `visualization.vl.json`;
    }

    if (includeConfig && config) {
      content = {...content};
      content.config = mergeConfig({}, config, content.config);
    }

    const blob = new Blob([stringify(content)], {
      type: `application/json`,
    });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement(`a`);
    link.setAttribute(`href`, url);
    link.setAttribute(`target`, `_blank`);
    link.setAttribute(`download`, filename);
    link.dispatchEvent(new MouseEvent(`click`));
  };

  const downloadHTML = () => {
    let content = mode === Mode.Vega ? vegaSpec : vegaLiteSpec;
    if (config) {
      content = {...content};
      content.config = mergeConfig({}, config, content.config);
    }
    const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/vega@${VG_VERSION}"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@${VL_VERSION}"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@${VE_VERSION}"></script>
</head>
<body>
  <div id="vis"/>
  <script>
    const spec = ${stringify(content)};
    vegaEmbed("#vis", spec, {mode: "${mode}"}).then(console.log).catch(console.warn);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], {type: `text/html;charset=utf-8`});
    const link = document.createElement(`a`);
    link.setAttribute(`href`, window.URL.createObjectURL(blob));
    link.setAttribute(`target`, `_blank`);
    link.setAttribute(`download`, 'visualization.html');
    link.dispatchEvent(new MouseEvent(`click`));
  };

  return (
    <>
      <h1>エクスポート</h1>
      <div className="exports">
        <div className="export-container">
          <div className="header-text">
            <Image />
            <span>PNG</span>
          </div>
          <p>PNGは、固定数のピクセルで構成されるビットマップ画像形式です。</p>
          <button onClick={() => downloadViz('png')}>ダウンロード</button>
        </div>

        <div className="export-container">
          <div className="header-text">
            <Code />
            <span>JSON</span>
          </div>
          <p>JSONは軽量なデータ交換フォーマットです。</p>
          {mode === Mode.VegaLite && (
            <div className="input-container">
              <label>
                <input
                  type="radio"
                  name="json-type"
                  value="vega"
                  checked={downloadVegaJSON}
                  onChange={() => setDownloadVegaJSON(true)}
                />{' '}
                Compiled Vega (コンパイル済みVega)
              </label>
              <label htmlFor="json-type[vega-lite]" className="vl-label">
                <input
                  type="radio"
                  name="json-type"
                  value="vega-lite"
                  checked={!downloadVegaJSON}
                  onChange={() => setDownloadVegaJSON(false)}
                />
                Vega-Lite
              </label>
            </div>
          )}
          <div className="input-container">
            {downloadVegaJSON ? (
              <p>コンパイル済みVegaには設定(config)が含まれ、フォーマット済みです。</p>
            ) : (
              <div>
                <label>
                  <input
                    type="checkbox"
                    name="config-include"
                    checked={includeConfig}
                    onChange={() => setIncludeConfig(!includeConfig)}
                  />
                  configを含める
                </label>
                {includeConfig && <p>ダウンロードされる仕様(spec)はフォーマット済みです。</p>}
              </div>
            )}
          </div>
          <button onClick={downloadJSON}>ダウンロード</button>
        </div>
        <div className="export-container">
          <div className="header-text">
            <Map />
            <span>SVG</span>
          </div>
          <p>
            SVGはベクター画像形式で、幾何学的形状を使用して異なる部分を個別のオブジェクトとして表現し、無限にスケーラブルです。
          </p>
          <button onClick={() => openViz('svg')}>開く</button>
          <button onClick={() => downloadViz('svg')} className="export-button download">
            ダウンロード
          </button>
        </div>
        <div className="export-container">
          <div className="header-text">
            <Book />
            <span>PDF</span>
          </div>
          <p>
            PDFは通常ドキュメントに使用されるベクター形式です。これには数秒かかる場合があります。しばらくお待ちください。
          </p>
          <button onClick={() => downloadPDF()} disabled={loadingPDF}>
            {loadingPDF ? '読み込み中...' : 'ダウンロード'}
          </button>
          {errorLoadingPdf && <p className="error-message">PDFの読み込みエラー: {errorLoadingPdf}</p>}
        </div>
        <div className="export-container">
          <div className="header-text">
            <BookOpen />
            <span>HTML</span>
          </div>
          <p>HTMLはウェブページを作成するためのマークアップ言語です。</p>
          <button onClick={() => downloadHTML()}>ダウンロード</button>
        </div>
      </div>
    </>
  );
}
