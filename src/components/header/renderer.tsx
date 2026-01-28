import stringify from 'json-stringify-pretty-compact';
import * as React from 'react';
import {useEffect, useRef, useState, useCallback} from 'react';
import {
  ExternalLink,
  Grid,
  HelpCircle,
  Play,
  Settings,
  Share2,
  Terminal,
  X,
  UploadCloud,
  DownloadCloud,
} from 'react-feather';
import {useNavigate} from 'react-router';
import Select from 'react-select';
import {useAppContext} from '../../context/app-context.js';
import {KEYCODES, Mode} from '../../constants/index.js';
import {NAMES, VEGA_LITE_START_SPEC} from '../../constants/consts.js';
import {VEGA_LITE_SPECS, VEGA_SPECS} from '../../constants/specs.js';

import ExportModal from './export-modal/renderer.js';
import HelpModal from './help-modal/index.js';
import SaveModal from './save-modal/renderer.js';
import LoadModal from './load-modal/renderer.js';
import './index.css';
import ShareModal from './share-modal/index.js';
import {PortalWithState} from 'react-portal';

export interface Props {
  showExample: boolean;
}

const Header: React.FC<Props> = ({showExample}) => {
  const {state, setState} = useAppContext();
  const navigate = useNavigate();

  const {editorRef, isAuthenticated, lastPosition, manualParse, mode, settings, vegaSpec} = state;

  const examplePortal = useRef<HTMLDivElement>(null);
  const splitButtonRef = useRef<HTMLSpanElement>(null);
  const [scrollPosition, setScrollPos] = useState(0);
  const [showVega, setShowVega] = useState(mode === Mode.Vega);
  const [examplesModalOpen, setExamplesModalOpen] = useState(showExample);

  const scrollHandlers = useRef(new WeakMap());

  useEffect(() => {
    setShowVega(mode === Mode.Vega);
  }, [mode]);

  // Sync Supabase Auth State
  useEffect(() => {
    // interval to check until window.datavizSupabase is available
    const checkSupabase = setInterval(() => {
      const supabase = (window as any).datavizSupabase;
      if (supabase) {
        clearInterval(checkSupabase);

        // Initial Session Check
        supabase.auth.getSession().then(({data: {session}}) => {
          if (session) {
            console.log('Supabase session found:', session);
            setState((s) => ({
              ...s,
              isAuthenticated: true,
              name: session.user.email || 'User',
              handle: session.user.id,
              profilePicUrl: s.profilePicUrl || '', // Keep existing or empty
            }));
          }
        });

        // Listen for changes
        const {
          data: {subscription},
        } = supabase.auth.onAuthStateChange((_event, session) => {
          const isAuth = !!session;
          setState((s) => ({
            ...s,
            isAuthenticated: isAuth,
            name: session?.user?.email || (isAuth ? 'User' : ''),
            handle: session?.user?.id || '',
          }));
        });
      }
    }, 100);

    return () => clearInterval(checkSupabase);
  }, [setState]);

  const onSelectVega = useCallback(
    (specName) => {
      navigate(`/examples/vega/${specName}`);
    },
    [navigate],
  );

  const onSelectNewVega = useCallback(() => {
    navigate('/custom/vega');
  }, [navigate]);

  const onSelectVegaLite = useCallback(
    (specName) => {
      navigate(`/examples/vega-lite/${specName}`);
    },
    [navigate],
  );

  const onSelectNewVegaLite = useCallback(() => {
    navigate('/custom/vega-lite');
  }, [navigate]);

  const onSwitchMode = useCallback(
    (option) => {
      if (option.value === Mode.Vega) {
        const newEditorString =
          vegaSpec && Object.keys(vegaSpec).length > 0
            ? stringify(vegaSpec)
            : `{
  "$schema": "https://vega.github.io/schema/vega/v5.json"
}`;
        setState((s) => ({
          ...s,
          editorString: newEditorString,
          mode: Mode.Vega,
          config: {},
          parse: true,
        }));
        onSelectNewVega();
      } else {
        const newEditorString = VEGA_LITE_START_SPEC;
        setState((s) => ({
          ...s,
          editorString: newEditorString,
          mode: Mode.VegaLite,
          config: {},
          parse: true,
        }));
        onSelectNewVegaLite();
      }
    },
    [setState, vegaSpec, onSelectNewVega, onSelectNewVegaLite],
  );

  const handleSettingsClick = useCallback(() => {
    setState((s) => ({...s, settings: !settings}));
  }, [setState, settings]);

  const openCommandPalette = useCallback(() => {
    if (editorRef) {
      editorRef.focus();
      editorRef.trigger('', 'editor.action.quickCommand', '');
    }
  }, [editorRef]);

  const modeOptions =
    mode === Mode.Vega
      ? [{value: Mode.VegaLite, label: NAMES[Mode.VegaLite]}]
      : [{value: Mode.Vega, label: NAMES[Mode.Vega]}];

  const value = {label: `${NAMES[mode]}`, value: mode};

  const modeSwitcher = (
    <Select
      className="mode-switcher-wrapper"
      classNamePrefix="mode-switcher"
      value={value}
      options={modeOptions}
      isClearable={false}
      isSearchable={false}
      onChange={onSwitchMode}
    />
  );

  const examplesButton = (
    <div className="header-button">
      <Grid className="header-icon" />
      {'サンプル'}
    </div>
  );

  const settingsButton = (
    <div
      className="header-button settings-button"
      style={{
        backgroundColor: settings ? 'rgba(0, 0, 0, 0.08)' : '',
      }}
      onClick={handleSettingsClick}
    >
      <Settings className="header-icon" />
      {'Settings'}
    </div>
  );

  const exportButton = (
    <div className="header-button">
      <ExternalLink className="header-icon" />
      {'エクスポート'}
    </div>
  );

  const shareButton = (
    <div className="header-button">
      <Share2 className="header-icon" />
      {'共有'}
    </div>
  );

  const HelpButton = (
    <div className="header-button help">
      <HelpCircle className="header-icon" />
      {'Help'}
    </div>
  );

  const optionsButton = (
    <div className="header-button" onClick={openCommandPalette}>
      <Terminal className="header-icon" />
      {'コマンド'}
    </div>
  );

  const runOptions = manualParse ? [{label: 'Auto'}] : [{label: 'Manual'}];

  const autoRunToggle = (
    <Select
      className="auto-run-wrapper"
      classNamePrefix="auto-run"
      value={{label: ''}}
      options={runOptions}
      isClearable={false}
      isSearchable={false}
      onChange={() => setState((s) => ({...s, manualParse: !manualParse}))}
    />
  );

  const runButton = (
    <div
      className="header-button"
      id="run-button"
      onClick={() => {
        setState((s) => ({...s, parse: true}));
      }}
    >
      <Play className="header-icon" />
      <div className="run-button">
        <span className="parse-label">Run</span>
        <span className="parse-mode">{manualParse ? 'Manual' : 'Auto'}</span>
      </div>
    </div>
  );

  const splitClass = 'split-button' + (manualParse ? '' : ' auto-run');

  const renderVega = (closePortal) => (
    <div className="vega-specs">
      {Object.keys(VEGA_SPECS).map((specType, i) => {
        const specs = VEGA_SPECS[specType];
        return (
          <div className="item-group" key={i}>
            <h4 className="spec-type">{specType}</h4>
            <div className="items">
              {specs.map((spec, j) => (
                <div
                  key={j}
                  onClick={() => {
                    onSelectVega(spec.name);
                    closePortal();
                  }}
                  className="item"
                >
                  <div
                    style={{
                      backgroundImage: `url(images/examples/vg/${spec.name}.vg.png)`,
                    }}
                    className="img"
                  />
                  <div className="name">{spec.title}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderVegaLite = (closePortal) => (
    <div className="vega-specs">
      {Object.keys(VEGA_LITE_SPECS).map((specGroup, i) => (
        <div key={i}>
          {Object.keys(VEGA_LITE_SPECS[specGroup]).map((specType, j) => {
            const specs = VEGA_LITE_SPECS[specGroup][specType];
            return (
              <div className="item-group" key={j}>
                <h4 className="spec-type">{specType}</h4>
                <div className="items">
                  {specs.map((spec, k) => (
                    <div
                      key={k}
                      onClick={() => {
                        onSelectVegaLite(spec.name);
                        closePortal();
                      }}
                      className="item"
                    >
                      <div
                        style={{
                          backgroundImage: `url(images/examples/vl/${spec.name}.vl.png)`,
                        }}
                        className="img"
                      />
                      <div className="name">{spec.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const exportContent = <ExportModal />;
  const shareContent = <ShareModal />;

  const handleVegaToggle = useCallback((isVega) => {
    setShowVega(isVega);
  }, []);

  useEffect(() => {
    if (showExample !== examplesModalOpen) {
      setExamplesModalOpen(showExample);
    }
  }, [showExample]);

  useEffect(() => {
    return () => {
      if (examplePortal.current) {
        const handler = scrollHandlers.current.get(examplePortal.current);
        if (handler) {
          examplePortal.current.removeEventListener('scroll', handler);
          scrollHandlers.current.delete(examplePortal.current);
        }
      }
    };
  }, []);

  const isAuthDebug = new URLSearchParams(window.location.search).has('auth_debug');

  return (
    <div className="app-header" role="banner" style={{display: 'none'}}>
      <section className="left-section">
        {modeSwitcher}
        <span ref={splitButtonRef} className={splitClass}>
          {runButton}
          {autoRunToggle}
        </span>
        {optionsButton}

        {(isAuthenticated || isAuthDebug) && (
          <>
            <PortalWithState closeOnEsc>
              {({openPortal, closePortal, isOpen, portal}) => (
                <>
                  <span onClick={openPortal}>
                    <div className="header-button">
                      <UploadCloud className="header-icon" />
                      {'保存'}
                    </div>
                  </span>
                  {portal(
                    <div className="modal-background" onClick={closePortal}>
                      <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <button className="close-button" onClick={closePortal}>
                            <X />
                          </button>
                        </div>
                        <div className="modal-body">
                          <SaveModal closePortal={closePortal} />
                        </div>
                      </div>
                    </div>,
                  )}
                </>
              )}
            </PortalWithState>

            <PortalWithState closeOnEsc>
              {({openPortal, closePortal, isOpen, portal}) => (
                <>
                  <span onClick={openPortal}>
                    <div className="header-button">
                      <DownloadCloud className="header-icon" />
                      {'読込'}
                    </div>
                  </span>
                  {portal(
                    <div className="modal-background" onClick={closePortal}>
                      <div className="modal" onClick={(e) => e.stopPropagation()} style={{width: '80%', maxWidth: 800}}>
                        <div>
                          <button className="close-button" onClick={closePortal}>
                            <X />
                          </button>
                        </div>
                        <div className="modal-body">
                          <LoadModal closePortal={closePortal} />
                        </div>
                      </div>
                    </div>,
                  )}
                </>
              )}
            </PortalWithState>
          </>
        )}

        <PortalWithState closeOnEsc>
          {({openPortal, closePortal, isOpen, portal}) => (
            <>
              <span onClick={openPortal}>{exportButton}</span>
              {portal(
                <div className="modal-background" onClick={closePortal}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <button className="close-button" onClick={closePortal}>
                        <X />
                      </button>
                    </div>
                    <div className="modal-body">{exportContent}</div>
                  </div>
                </div>,
              )}
            </>
          )}
        </PortalWithState>

        <PortalWithState closeOnEsc>
          {({openPortal, closePortal, isOpen, portal}) => (
            <>
              <span onClick={openPortal}>{shareButton}</span>
              {portal(
                <div className="modal-background" onClick={closePortal}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <button className="close-button" onClick={closePortal}>
                        <X />
                      </button>
                    </div>
                    <div className="modal-body">{shareContent}</div>
                  </div>
                </div>,
              )}
            </>
          )}
        </PortalWithState>

        <PortalWithState closeOnEsc>
          {({openPortal, closePortal, isOpen, portal}) => (
            <>
              <span onClick={openPortal}>{examplesButton}</span>
              {portal(
                <div className="modal-background" onClick={closePortal}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className="button-groups">
                        <button
                          className={showVega ? 'selected' : ''}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVegaToggle(true);
                          }}
                        >
                          Vega
                        </button>
                        <button
                          className={showVega ? '' : 'selected'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVegaToggle(false);
                          }}
                        >
                          Vega-Lite
                        </button>
                      </div>
                      <button className="close-button" onClick={closePortal}>
                        <X />
                      </button>
                    </div>
                    <div className="modal-body" ref={examplePortal}>
                      {showVega ? renderVega(closePortal) : renderVegaLite(closePortal)}
                    </div>
                  </div>
                </div>,
              )}
            </>
          )}
        </PortalWithState>
      </section>

      <section className="right-section">
        <PortalWithState closeOnEsc>
          {({openPortal, closePortal, isOpen, portal}) => (
            <>
              <span onClick={openPortal}>{HelpButton}</span>
              {portal(
                <div className="modal-background" onClick={closePortal}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <button className="close-button" onClick={closePortal}>
                        <X />
                      </button>
                    </div>
                    <div className="modal-body">
                      <HelpModal />
                    </div>
                  </div>
                </div>,
              )}
            </>
          )}
        </PortalWithState>
        {settingsButton}
      </section>
    </div>
  );
};

export default Header;
