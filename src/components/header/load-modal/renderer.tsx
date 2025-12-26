import React, {useState, useEffect, useCallback} from 'react';
import {useAppContext} from '../../../context/app-context';
import {DatavizApi, Project} from '../../../utils/dataviz-api-client';
import {Mode} from '../../../constants';
import stringify from 'json-stringify-pretty-compact';

interface Props {
  closePortal: () => void;
}

const APP_NAME = 'vega-editor';

const LoadModal: React.FC<Props> = ({closePortal}) => {
  const {setState} = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{[key: string]: string}>({});

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DatavizApi.getProjects(APP_NAME);
      setProjects(res.projects);

      // サムネイルのロード（非同期で順次行う）
      res.projects.forEach(async (p) => {
        if (p.thumbnail_path) {
          try {
            const blob = await DatavizApi.fetchThumbnailBlob(p.id);
            const url = URL.createObjectURL(blob);
            setThumbnails((prev) => ({...prev, [p.id]: url}));
          } catch (e) {
            // ignore thumbnail error
            console.warn('Failed to load thumbnail for', p.id, e);
          }
        }
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    // cleanup object urls
    return () => {
      Object.values(thumbnails).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleLoad = async (project: Project) => {
    try {
      setLoading(true);
      const data = await DatavizApi.getProject(project.id);
      const str = stringify(data);

      let mode = Mode.VegaLite;
      if (data['$schema']) {
        if (data['$schema'].includes('vega-lite')) {
          mode = Mode.VegaLite;
        } else if (data['$schema'].includes('vega')) {
          mode = Mode.Vega;
        }
      }

      setState((s) => ({
        ...s,
        editorString: str,
        projectId: project.id,
        projectTitle: project.name,
        parse: true, // Run parse
        mode,
      }));

      closePortal();
    } catch (e: any) {
      setError(e.message || 'Failed to load project data');
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await DatavizApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="load-modal" style={{padding: 20}}>
      <h2>Open Project</h2>
      {error && (
        <div className="error" style={{color: 'red', marginBottom: 10}}>
          {error}
        </div>
      )}

      {loading && projects.length === 0 && <div>Loading projects...</div>}

      <div
        className="project-list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 20,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        {projects.map((p) => (
          <div
            key={p.id}
            className="project-item"
            onClick={() => handleLoad(p)}
            style={{
              border: '1px solid #ddd',
              padding: 10,
              cursor: 'pointer',
              borderRadius: 6,
              backgroundColor: '#fff',
              position: 'relative',
              transition: 'box-shadow 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: 120,
                backgroundColor: '#f9f9f9',
                marginBottom: 10,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundImage: thumbnails[p.id] ? `url(${thumbnails[p.id]})` : 'none',
                border: '1px solid #eee',
              }}
            >
              {!thumbnails[p.id] && (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ccc',
                  }}
                >
                  No Preview
                </div>
              )}
            </div>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={p.name}
            >
              {p.name}
            </div>
            <div style={{fontSize: 11, color: '#888', marginTop: 4}}>
              Updated: {new Date(p.updated_at).toLocaleDateString()}
            </div>
            <button
              onClick={(e) => handleDelete(e, p.id)}
              style={{
                marginTop: 8,
                fontSize: 11,
                color: '#d32f2f',
                background: 'none',
                border: '1px solid #d32f2f',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {!loading && projects.length === 0 && !error && (
        <div style={{color: '#666'}}>No projects found on the server.</div>
      )}
    </div>
  );
};

export default LoadModal;
