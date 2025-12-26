import React, {useState, useCallback} from 'react';
import {useAppContext} from '../../../context/app-context';
import {DatavizApi} from '../../../utils/dataviz-api-client';

interface Props {
  closePortal: () => void;
}

const APP_NAME = 'vega-editor';

const SaveModal: React.FC<Props> = ({closePortal}) => {
  const {state, setState} = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(state.projectTitle || '');

  // update existing
  const handleUpdate = useCallback(async () => {
    if (!state.projectId) return;
    setLoading(true);
    setError(null);

    try {
      const view = state.view;
      let thumbnail: string | undefined = undefined;
      // vega view API to get image URL
      if (view) {
        thumbnail = await view.toImageURL('png');
      }

      const updates: any = {
        data: JSON.parse(state.editorString),
        thumbnail,
      };

      // タイトルが変わっていれば更新
      if (projectName !== state.projectTitle) {
        updates.name = projectName;
      }

      const res = await DatavizApi.updateProject(state.projectId, updates);

      setState((s) => ({
        ...s,
        projectTitle: res.project.name,
        // projectIdは変わらない
      }));

      closePortal();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error updating project');
    } finally {
      setLoading(false);
    }
  }, [state.projectId, state.editorString, state.view, state.projectTitle, projectName, setState, closePortal]);

  // create new
  const handleCreate = useCallback(async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const view = state.view;
      let thumbnail: string | undefined = undefined;
      if (view) {
        thumbnail = await view.toImageURL('png');
      }

      const data = JSON.parse(state.editorString);

      const res = await DatavizApi.createProject(projectName, APP_NAME, data, thumbnail);

      setState((s) => ({
        ...s,
        projectId: res.project.id,
        projectTitle: res.project.name,
      }));

      closePortal();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error creating project');
    } finally {
      setLoading(false);
    }
  }, [state.editorString, state.view, projectName, setState, closePortal]);

  return (
    <div className="save-modal" style={{padding: 20}}>
      <h2>Save Project</h2>
      {error && (
        <div className="error-message" style={{color: 'red', marginBottom: 10}}>
          {error}
        </div>
      )}

      <div className="input-group">
        <label>Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="My Visualization"
          style={{width: '100%', padding: '8px', margin: '8px 0', boxSizing: 'border-box'}}
        />
      </div>

      <div className="actions" style={{marginTop: 20, display: 'flex', gap: 10}}>
        {state.projectId ? (
          <>
            <button onClick={handleUpdate} disabled={loading} style={{padding: '8px 16px', cursor: 'pointer'}}>
              {loading ? 'Saving...' : 'Save (Overwrite)'}
            </button>
            <button onClick={handleCreate} disabled={loading} style={{padding: '8px 16px', cursor: 'pointer'}}>
              {loading ? 'Saving...' : 'Save As New'}
            </button>
          </>
        ) : (
          <button onClick={handleCreate} disabled={loading} style={{padding: '8px 16px', cursor: 'pointer'}}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SaveModal;
