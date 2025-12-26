const API_BASE_URL = 'https://api.dataviz.jp';

export interface Project {
  id: string;
  name: string;
  app_name: string;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
  data?: any;
}

export interface ProjectDetail extends Project {
  data: any;
  storage_path: string;
}

export class DatavizApi {
  private static async getAccessToken(): Promise<string | null> {
    const supabase = (window as any).supabase;
    if (supabase) {
      const {data} = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    }
    return null;
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response;
  }

  static async getProjects(appName: string): Promise<{projects: Project[]}> {
    return this.request(`/api/projects?app=${appName}`);
  }

  static async createProject(
    name: string,
    appName: string,
    data: any,
    thumbnail?: string,
  ): Promise<{project: ProjectDetail}> {
    return this.request('/api/projects', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, app_name: appName, data, thumbnail}),
    });
  }

  static async getProject(id: string): Promise<any> {
    return this.request(`/api/projects/${id}`);
  }

  static async updateProject(
    id: string,
    updates: {name?: string; data?: any; thumbnail?: string},
  ): Promise<{project: ProjectDetail}> {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updates),
    });
  }

  static async deleteProject(id: string): Promise<{success: boolean}> {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  static async fetchThumbnailBlob(projectId: string): Promise<Blob> {
    const response = await this.request(`/api/projects/${projectId}/thumbnail`);
    return response.blob();
  }
}
