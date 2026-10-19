import { apiClient } from "../utils/api/apiClient";

export interface SnippetComment {
  id: number;
  snippet_id: number;
  user_id: number;
  parent_comment_id: number | null;
  root_comment_id: number;
  reply_to_username?: string | null;
  username: string;
  content: string;
  created_at: string;
  updated_at: string;
  can_manage: boolean;
}

export const snippetCommentService = {
  async list(snippetId: string, isPublicView: boolean): Promise<{ data: SnippetComment[]; total: number }> {
    const endpoint = isPublicView ? "/api/public/snippets" : "/api/snippets";
    return apiClient.get<{ data: SnippetComment[]; total: number }>(`${endpoint}/${snippetId}/comments`);
  },

  async create(snippetId: string, isPublicView: boolean, content: string, parentCommentId: number | null = null): Promise<SnippetComment> {
    const endpoint = isPublicView ? "/api/public/snippets" : "/api/snippets";
    return apiClient.post<SnippetComment>(`${endpoint}/${snippetId}/comments`, { content, parent_comment_id: parentCommentId });
  },

  async update(snippetId: string, isPublicView: boolean, commentId: number, content: string): Promise<SnippetComment> {
    const endpoint = isPublicView ? "/api/public/snippets" : "/api/snippets";
    return apiClient.put<SnippetComment>(`${endpoint}/${snippetId}/comments/${commentId}`, { content });
  },

  async delete(snippetId: string, isPublicView: boolean, commentId: number): Promise<void> {
    const endpoint = isPublicView ? "/api/public/snippets" : "/api/snippets";
    return apiClient.delete<void>(`${endpoint}/${snippetId}/comments/${commentId}`);
  },
};
