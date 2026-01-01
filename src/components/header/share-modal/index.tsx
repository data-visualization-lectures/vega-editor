import React, {useState, useEffect, useCallback} from 'react';
import stringify from 'json-stringify-pretty-compact';
import {parse as parseJSONC} from 'jsonc-parser';
import LZString from 'lz-string';
import {useCopyToClipboard} from '../../../utils/useCopyToClipboard';
import {Copy, Link, Save} from 'react-feather';
import {useAppContext} from '../../../context/app-context.js';
import {NAMES} from '../../../constants/consts.js';
import GistSelectWidget from '../../gist-select-widget/index.js';
import LoginConditional from '../../login-conditional/index.js';
import {getGithubToken} from '../../../utils/github.js';
import './index.css';

const EDITOR_BASE = window.location.origin + window.location.pathname;

interface ShareModalState {
  copied: boolean;
  creating: boolean;
  createError: boolean;
  updateError: boolean;
  fullScreen: boolean;
  whitespace: boolean;
  generatedURL: string;
  gistFileName: string;
  gistFileNameSelected: string;
  gistPrivate: boolean;
  gistTitle: string;
  gistId: string;
  updating: boolean;
  gistEditorURL: string;
}

const ShareModal: React.FC = () => {
  const {state: appState, setState: setAppState} = useAppContext();
  const {editorString, mode, isAuthenticated, handle} = appState;

  const date = new Date().toDateString();
  const [state, setState] = useState<ShareModalState>({
    copied: false,
    creating: false,
    createError: false,
    updateError: false,
    fullScreen: false,
    whitespace: false,
    generatedURL: '',
    gistFileName: 'spec.json',
    gistFileNameSelected: '',
    gistPrivate: false,
    gistTitle: `${NAMES[mode]} spec from ${date}`,
    gistId: '',
    updating: false,
    gistEditorURL: '',
  });

  const [copy, {copied}] = useCopyToClipboard();

  const exportURL = useCallback(() => {
    const specString = state.whitespace ? editorString : JSON.stringify(parseJSONC(editorString));

    const serializedSpec = LZString.compressToEncodedURIComponent(specString) + (state.fullScreen ? '/view' : '');

    if (serializedSpec) {
      const url = `${document.location.href.split('#')[0]}#/url/${mode}/${serializedSpec}`;
      setState((prev) => ({...prev, generatedURL: url}));
    }
  }, [editorString, mode, state.whitespace, state.fullScreen]);

  const previewURL = useCallback(() => {
    const win = window.open(state.generatedURL, '_blank');
    if (win) win.focus();
  }, [state.generatedURL]);

  const onCopy = useCallback(
    (text: string) => {
      copy(text);
    },
    [copy],
  );

  const handleFullscreenCheck = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, fullScreen: event.target.checked}));
  }, []);

  const handleWhitespaceCheck = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, whitespace: event.target.checked}));
  }, []);

  const updatePrivacy = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, gistPrivate: event.target.checked}));
  }, []);

  const fileNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, gistFileName: event.target.value}));
  }, []);

  const gistFileNameSelectedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, gistFileNameSelected: event.target.value}));
  }, []);

  const titleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({...prev, gistTitle: event.target.value}));
  }, []);

  const selectGist = useCallback((id: string, fileName: string) => {
    setState((prev) => ({
      ...prev,
      gistFileNameSelected: fileName,
      gistId: id,
    }));
  }, []);

  const createGist = useCallback(async () => {
    setState((prev) => ({...prev, creating: true}));

    const body = {
      content: state.whitespace ? editorString : stringify(parseJSONC(editorString)),
      name: state.gistFileName || 'spec',
      title: state.gistTitle,
      privacy: state.gistPrivate,
    };

    try {
      let githubToken;
      try {
        githubToken = await getGithubToken();
      } catch (error) {
        console.error('Failed to get GitHub token:', error);
        setState((prev) => ({
          ...prev,
          creating: false,
          createError: true,
        }));
        setAppState((s) => ({...s, isAuthenticated: false}));
        return;
      }

      const gistBody = {
        description: body.title,
        public: !body.privacy,
        files: {
          [body.name.endsWith('.json') ? body.name : `${body.name}.json`]: {
            content: body.content,
          },
        },
      };

      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token ${githubToken}`,
        },
        body: JSON.stringify(gistBody),
      });

      if (!res.ok) {
        throw new Error(`Failed to create gist: ${res.status}`);
      }

      const data = await res.json();

      setState((prev) => ({
        ...prev,
        creating: false,
        updating: false,
      }));

      if (!data.id) {
        setState((prev) => ({...prev, createError: true}));
        if (res.status === 401) {
          setAppState((s) => ({...s, isAuthenticated: false}));
        }
      } else {
        const fileName = Object.keys(data.files)[0];
        setState((prev) => ({
          ...prev,
          createError: false,
          gistEditorURL: `${EDITOR_BASE}#/gist/${data.id}/${fileName}`,
        }));
      }
    } catch (error) {
      console.error('Error creating gist:', error);
      setState((prev) => ({
        ...prev,
        creating: false,
        createError: true,
      }));
    }
  }, [editorString, state.whitespace, state.gistFileName, state.gistTitle, state.gistPrivate, setAppState]);

  const updateGist = useCallback(async () => {
    setState((prev) => ({...prev, updating: true}));

    const fileName = state.gistFileNameSelected;

    try {
      if (state.gistId) {
        // Get GitHub access token just-in-time
        let githubToken;
        try {
          githubToken = await getGithubToken();
        } catch (error) {
          console.error('Failed to get GitHub token:', error);
          setState((prev) => ({
            ...prev,
            updating: false,
            updateError: true,
          }));
          setAppState((s) => ({...s, isAuthenticated: false}));
          return;
        }

        const gistBody = {
          files: {
            [fileName]: {
              content: editorString,
            },
          },
        };
        const res = await fetch(`https://api.github.com/gists/${state.gistId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `token ${githubToken}`,
          },
          body: JSON.stringify(gistBody),
        });

        if (!res.ok) {
          throw new Error(`Failed to update gist: ${res.status}`);
        }

        const data = await res.json();

        if (data.id) {
          setState((prev) => ({
            ...prev,
            gistEditorURL: `${EDITOR_BASE}#/gist/${data.id}/${fileName}`,
            creating: false,
            updating: false,
            updateError: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            creating: false,
            updating: false,
            updateError: true,
          }));
        }
      }
    } catch (error) {
      console.error('Error updating gist:', error);
      setState((prev) => ({
        ...prev,
        creating: false,
        updating: false,
        updateError: true,
      }));
    }
  }, [editorString, state.gistId, state.gistFileNameSelected, setAppState]);

  useEffect(() => {
    exportURL();
  }, [exportURL]);

  useEffect(() => {
    exportURL();
  }, [state.fullScreen, state.whitespace]);

  return (
    <div className="share-modal">
      <h1>共有</h1>
      <h2>URLで共有</h2>
      <p>
        {NAMES[mode]}
        の仕様をURL内のエンコードされた文字列としてパックします。LZベースの圧縮アルゴリズムを使用しています。
        空白が保持されていない場合、エディタはロード時に仕様を自動的にフォーマットします。
      </p>
      <div>
        <label className="user-pref">
          <input type="checkbox" checked={state.fullScreen} name="fullscreen" onChange={handleFullscreenCheck} />
          ビジュアライゼーションを全画面で開く
        </label>
        <label className="user-pref">
          <input type="checkbox" checked={state.whitespace} name="whitespace" onChange={handleWhitespaceCheck} />
          空白、コメント、末尾のコンマを保持する
        </label>
      </div>
      <div className="sharing-buttons">
        <button onClick={previewURL} type="button">
          <span className="copy-icon">
            <Link />
            リンクを開く
          </span>
        </button>
        <button type="button" onClick={() => onCopy(state.generatedURL)}>
          <span className="copy-icon">
            <Copy />
            クリップボードにリンクをコピー
          </span>
        </button>
        <button type="button" onClick={() => onCopy(`[Open the Chart in the Vega Editor](${state.generatedURL})`)}>
          <span className="copy-icon">
            <Copy />
            クリップボードにMarkdownリンクをコピー
          </span>
        </button>
        <div className={`copied${copied ? ' visible' : ''}`}>コピーしました!</div>
      </div>
      URLの文字数: {state.generatedURL.length}{' '}
      <span className="url-warning">
        {state.generatedURL.length > 2083 && (
          <>
            警告:{' '}
            <a
              href="https://support.microsoft.com/en-us/help/208427/maximum-url-length-is-2-083-characters-in-internet-explorer"
              target="_blank"
              rel="noopener noreferrer"
            >
              2083文字を超えるURLはInternet Explorerでサポートされない可能性があります。
            </a>
          </>
        )}
      </span>
      <div className="spacer"></div>
      <LoginConditional>
        <p>
          ここで、{NAMES[mode]}の仕様を新しいGistとして保存したり、既存のGistを更新したりできます。
          あなたのすべてのGistは<a href={`https://gist.github.com/${handle}`}>GitHub</a>で確認できます。
        </p>
        <div className="share-gist-split">
          <div className="update-gist">
            <h3>既存のGistを更新</h3>
            <p>既存のGistを更新するには、リストから選択し、下のボタンをクリックして確定してください。</p>
            <GistSelectWidget selectGist={selectGist} />
            {isAuthenticated && (
              <React.Fragment>
                <div className="share-input-container">
                  <label>
                    ファイル名:
                    <input value={state.gistFileNameSelected} onChange={gistFileNameSelectedChange} type="text" />
                    <small>選択したGistに新しいファイルを作成するには、ファイル名を変更してください</small>
                  </label>
                </div>
              </React.Fragment>
            )}
            <div className="sharing-buttons">
              <button onClick={updateGist} disabled={!state.gistFileNameSelected || state.updating}>
                <Save />
                {state.updating ? '更新中...' : '更新'}
              </button>
              {state.gistEditorURL && state.updating !== undefined && (
                <button type="button" onClick={() => onCopy(state.gistEditorURL)}>
                  <span className="copy-icon">クリップボードにリンクをコピー</span>
                </button>
              )}
            </div>
            {state.updateError && <div className="error-message share-error">Gistを更新できませんでした。</div>}
          </div>
          <div>
            <h3>新しいGistを作成</h3>
            <p>
              現在の{NAMES[mode]}の仕様をGistとして保存します。保存すると、共有可能なリンクが取得できます。
              また、エディタのGist読み込み機能を使用して、仕様を読み込むこともできます。
            </p>
            <div>
              <label className="user-pref">
                <input type="checkbox" checked={state.whitespace} name="whitespace" onChange={handleWhitespaceCheck} />
                空白、コメント、末尾のコンマを保持する
              </label>
            </div>
            <div className="share-input-container">
              <label>
                タイトル:
                <input value={state.gistTitle} onChange={titleChange} type="text" placeholder="Gistのタイトルを入力" />
              </label>
            </div>
            <div className="share-input-container">
              <label>
                ファイル名:
                <input
                  value={state.gistFileName}
                  onChange={fileNameChange}
                  type="text"
                  placeholder="ファイル名を入力"
                />
              </label>
            </div>
            <div className="share-input-container">
              <label>
                <input
                  type="checkbox"
                  name="private-gist"
                  id="private-gist"
                  value="private-select"
                  checked={state.gistPrivate}
                  onChange={updatePrivacy}
                />
                プライベートGistを作成
              </label>
            </div>
            <div className="sharing-buttons">
              <button onClick={createGist} disabled={state.creating}>
                <Save />
                {state.creating ? '作成中...' : '作成'}
              </button>
              {state.gistEditorURL && state.creating !== undefined && (
                <button type="button" onClick={() => onCopy(state.gistEditorURL)}>
                  <span className="copy-icon">クリップボードにリンクをコピー</span>
                </button>
              )}
              {state.createError && <div className="error-message share-error">Gistを作成できませんでした。</div>}
            </div>
          </div>
        </div>
      </LoginConditional>
    </div>
  );
};

export default ShareModal;
