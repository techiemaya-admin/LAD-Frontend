import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { safeStorage } from '@/utils/storage';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  User as UserIcon, Mail, Phone, Clock, Paperclip, MessageSquare, FileText, GripVertical,
  Trash2, MoreVertical, Building2, DollarSign, Calendar, Flag, CheckCircle2,
  AlertCircle, TrendingUp, TrendingDown, X, Edit, Save, XCircle, Plus,
  UserCircle, AlertTriangle, FolderTree, Ban, Sparkles, CheckCheck, Copy, Archive
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/services/api';
import leadsService from '@/services/leadsService';
import { FileDown } from 'lucide-react';
import { getStatusLabel } from '@/utils/statusMappings';
import { getFieldValue } from '@/utils/fieldMappings';
import { selectStatuses, selectPriorities, selectSources } from '@/store/slices/masterDataSlice';
import { selectStages } from '../store/slices/pipelineSlice';
import { updateLeadAction, deleteLeadAction } from '../store/action/pipelineActions';
import type { Lead as PipelineLead } from '../types';
import { 
  selectLeadCardActiveTab,
  selectLeadCardExpanded,
  selectLeadCardEditingOverview,
  selectLeadCardEditFormData,
  setLeadCardActiveTab,
  setLeadCardExpanded,
  setLeadCardEditingOverview,
  setLeadCardEditFormData,
  resetLeadCardEditFormData
} from '@/store/slices/uiSlice';
import { 
  selectUsers, 
  selectUsersLoading, 
  selectUsersError,
  User
} from '@/store/slices/usersSlice';
import { fetchUsersAction } from '@/store/actions/usersActions';
import BookingSlot from './BookingSlot';
import * as bookingService from '@/services/bookingService';
import { selectUser as selectAuthUser } from '@/store/slices/authSlice';

interface Lead {
  id: string | number;
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  status?: string;
  priority?: string;
  stage?: string;
  amount?: number | string;
  assignee?: string;
  assigned_to_id?: string | number;
  source?: string;
  closeDate?: string;
  close_date?: string;
  expectedCloseDate?: string;
  expected_close_date?: string;
  description?: string;
  tags?: string[];
  goals?: string | string[];
  avatar?: string;
  lastActivity?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
  [key: string]: unknown;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lead-tabpanel-${index}`}
      aria-labelledby={`lead-tab-${index}`}
      {...other}
      className="h-full min-h-[500px] flex flex-col"
    >
      <div className="p-6 h-full overflow-auto flex flex-col">
        {children}
      </div>
    </div>
  );
};

const a11yProps = (index: number) => ({
  id: `lead-tab-${index}`,
  'aria-controls': `lead-tabpanel-${index}`,
});

interface Note {
  id: string | number;
  content: string;
  user_id?: string | number;
  user_name?: string;
  user_avatar?: string | null;
  created_at?: string;
}

interface Comment {
  id: string | number;
  content: string;
  user_id?: string | number;
  user_name?: string;
  user_avatar?: string | null;
  created_at?: string;
}

interface Attachment {
  id: string | number;
  name: string;
  size?: number;
  type?: string;
  user_id?: string | number;
  uploadedAt?: string;
}

interface AssignedUser {
  id: string | number;
  name: string;
  avatar?: string | null;
}

interface PipelineLeadCardProps {
  lead: Lead;
  isPreview?: boolean;
  onDelete?: (leadId: string | number) => Promise<void> | void;
  onEdit?: (lead: Lead) => void;
  currentStage?: number;
  totalStages?: number;
  onStatusChange?: (leadId: string | number, status: string) => Promise<void> | void;
  assignedUsers?: AssignedUser[];
  teamMembers?: User[];
  activityData?: number[];
  probability?: number;
  onAddNote?: (note: string) => Promise<void> | void;
  onAddComment?: (comment: string) => Promise<void> | void;
  onAddAttachment?: (file: File) => Promise<void> | void;
  onDeleteNote?: (noteId: string | number) => Promise<void> | void;
  onDeleteComment?: (commentId: string | number) => Promise<void> | void;
  onDeleteAttachment?: (attachmentId: string | number) => Promise<void> | void;
  externalDetailsOpen?: boolean | null;
  onExternalDetailsClose?: (() => void) | null;
  hideCard?: boolean;
}

const PipelineLeadCard: React.FC<PipelineLeadCardProps> = ({ 
  lead, 
  isPreview = false, 
  onDelete, 
  onEdit, 
  currentStage = 0, 
  totalStages = 1, 
  onStatusChange, 
  assignedUsers = [], 
  teamMembers = [],
  activityData = [], 
  probability = 0, 
  onAddNote, 
  onAddComment, 
  onAddAttachment, 
  onDeleteNote, 
  onDeleteComment, 
  onDeleteAttachment,
  externalDetailsOpen = null,
  onExternalDetailsClose = null,
  hideCard = false
}) => {
  const dispatch = useDispatch();
  const statusOptions = useSelector(selectStatuses);
  const priorityOptions = useSelector(selectPriorities);
  const sourceOptions = useSelector(selectSources);
  const stageOptions = useSelector(selectStages);

  const authUser = useSelector(selectAuthUser) as any;
  const createdBy = String(authUser?.id || authUser?._id || '');
  const tenantId = String(
    authUser?.tenantId ||
      authUser?.organizationId ||
      (lead as any)?.tenant_id ||
      (lead as any)?.organization_id ||
      ''
  );
  const assignedUserId = String(
    (lead as any)?.assigned_user_id ||
      (lead as any)?.assigned_to_id ||
      (lead as any)?.assigned_to ||
      createdBy ||
      ''
  );
  const studentId = String(
    (lead as any)?.student_id || (lead as any)?.studentId || (lead as any)?.student?.id || ''
  );
  
  // Get team members from global Redux state
  const globalTeamMembers = useSelector(selectUsers);
  const teamMembersLoading = useSelector(selectUsersLoading);
  const teamMembersError = useSelector(selectUsersError);
  
  // Get leadCard state from Redux
  const globalActiveTab = useSelector(selectLeadCardActiveTab);
  const globalExpanded = useSelector(selectLeadCardExpanded);
  const globalEditingOverview = useSelector(selectLeadCardEditingOverview);
  const globalEditFormData = useSelector(selectLeadCardEditFormData);
  
  // Use global team members if available, fallback to props for backward compatibility
  const effectiveTeamMembers = globalTeamMembers.length > 0 ? globalTeamMembers : teamMembers;
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Use external dialog control if provided, otherwise use internal state
  const isDetailsOpen = externalDetailsOpen !== null ? externalDetailsOpen : detailsOpen;
  const handleDetailsClose = onExternalDetailsClose || (() => setDetailsOpen(false));
  
  // Local states that should remain local (component-specific UI states)
  const [newNote, setNewNote] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const snackbarClasses: Record<'success' | 'error' | 'info' | 'warning', string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-500 text-gray-900'
  };
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; type: string; id: string | number | null }>({ open: false, type: '', id: null });
  
  // Edit states for notes and comments
  const [editingNote, setEditingNote] = useState<{ id: string | number | null; content: string }>({ id: null, content: '' });
  const [editingComment, setEditingComment] = useState<{ id: string | number | null; content: string }>({ id: null, content: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggable, setIsDraggable] = useState(false);
  
  // Loading states for individual tabs
  const [notesLoading, setNotesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | number | null>(null);
  
  // Local state for current status to handle optimistic updates
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  
  // Local states that remain component-specific
  const [newTagInput, setNewTagInput] = useState('');

  // Users state
  const [users, setUsers] = useState<Array<{
    id: string | number;
    name: string;
    email: string;
  }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const goalsArray = Array.isArray(lead.goals) ? lead.goals : 
                    typeof lead.goals === 'string' && lead.goals.trim() !== '' ? [lead.goals] : [];
  const tagsArray = Array.isArray(lead.tags) ? lead.tags : [];
  const allTags = [...new Set([...goalsArray, ...tagsArray])];

  // Detect mobile using window width
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const cardRef = useRef<HTMLDivElement>(null);

  // Critical: Don't disable sortable - use handle strategy instead to prevent re-initialization issues
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
    disabled: isPreview // Only disable for preview, NOT for dialog state
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition as string,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    userSelect: 'none' as const,
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleCardClick(event as unknown as React.MouseEvent);
    }
  };

  const handleTouchStart = () => undefined;

  const handleDragHandleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDraggable(true);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggable(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Load team members via Redux when component mounts
  useEffect(() => {
    if (globalTeamMembers.length === 0 && !teamMembersLoading && !teamMembersError) {
      console.log('🌐 Loading team members via Redux...');
      dispatch(fetchUsersAction() as any);
    }
  }, [dispatch, globalTeamMembers, teamMembersLoading, teamMembersError]); // Remove dependency on globalTeamMembers.length to prevent infinite loops

  // Initialize Redux editFormData when lead changes
  useEffect(() => {
    if (lead) {
      // Convert Lead to Partial<Lead> with proper type conversions
      const leadForForm: Partial<Lead> = {
        ...lead,
        amount: typeof lead.amount === 'string' ? parseFloat(lead.amount) || null : lead.amount
      };
      dispatch(resetLeadCardEditFormData(leadForForm));
    }
  }, [lead, dispatch]);

  // Sync local status with prop changes
  useEffect(() => {
    setCurrentStatus(lead.status);
  }, [lead.status]);

  // Load tab data when dialog opens or tab changes
  useEffect(() => {
    if (isDetailsOpen) {
      loadTabData(globalActiveTab);
    }
  }, [isDetailsOpen, globalActiveTab]);

  // Fetch users from API only once and only when needed
  useEffect(() => {
    // Skip if users are already loaded from Redux or component state
    if (users.length > 0 || globalTeamMembers.length > 0 || usersLoading) {
      return;
    }

    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const fetchedUsers = await bookingService.fetchUsers();
        setUsers(fetchedUsers);
        console.log('[PipelineLeadCard] Users loaded:', fetchedUsers.length);
      } catch (error) {
        console.error('[PipelineLeadCard] Error loading users:', error);
        // Keep empty array on error
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, []); // Only run once on mount

  // Load data for specific tab
  const loadTabData = async (tabIndex: number) => {
    if (!lead.id) return;

    try {
      switch (tabIndex) {
        case 1: // Notes tab
          if (notes.length === 0) {
            setNotesLoading(true);
            const fetchedNotes = await leadsService.getLeadNotes(lead.id);
            setNotes(fetchedNotes as Note[]);
          }
          break;
        case 2: // Comments tab
          if (comments.length === 0) {
            setCommentsLoading(true);
            const fetchedComments = await leadsService.getLeadComments(lead.id);
            setComments(fetchedComments as Comment[]);
          }
          break;
        case 3: // Attachments tab
          if (attachments.length === 0) {
            setAttachmentsLoading(true);
            const fetched = await leadsService.getLeadAttachments(lead.id);
            const fetchedAttachments = Array.isArray(fetched)
              ? fetched
              : (fetched as any)?.attachments || (fetched as any)?.data || (fetched as any)?.result || [];
            setAttachments((Array.isArray(fetchedAttachments) ? fetchedAttachments : []) as Attachment[]);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error loading tab ${tabIndex} data:`, error);
      showSnackbar(`Failed to load ${['overview', 'notes', 'comments', 'attachments'][tabIndex]}`, 'error');
    } finally {
      setNotesLoading(false);
      setCommentsLoading(false);
      setAttachmentsLoading(false);
    }
  };

//   useEffect(() => {
//   const fetchComments = async () => {
//     try {
//       const res = await axios.get(`/api/leads/${lead.id}/comments`);
//       setComments(res.data);
//     } catch (err) {
//       console.error('Failed to fetch comments:', err);
//     }
//   };

//   fetchComments();
// }, [lead.id]);

// Fetch comments

  // Memoize click handler to prevent stale closures and unnecessary re-renders
  const handleCardClick = useCallback((event?: React.MouseEvent) => {
    if (!event) return;
    
    // Prevent click if event happened during drag
    if (isDragging || isDraggable) {
      return;
    }
    
    const target = event.target as HTMLElement;
    
    // Only ignore clicks on interactive elements (buttons, dropdowns) and drag handle
    if (
      target.closest('[data-ignore-card-click]') ||
      target.closest('[role="dialog"]') ||
      target.closest('.drag-handle') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT'
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    
    console.log('[PipelineLeadCard] Card clicked, opening details for lead:', lead.id);
    setDetailsOpen(true);
  }, [isDragging, isDraggable, lead.id]);

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // Get current user from token or auth context
  const getCurrentUserId = () => {
    try {
      const token = safeStorage.getItem('auth_token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  };

  // Check if current user can edit/delete item
  const canUserModify = (itemUserId?: string | number | null): boolean => {
    const currentUserId = getCurrentUserId();
    console.log('Checking permissions:', { currentUserId, itemUserId });
    if (!currentUserId || itemUserId === null || itemUserId === undefined) return false;
    return currentUserId === itemUserId || currentUserId.toString() === itemUserId.toString();
  };

  const handleDeleteConfirmationOpen = (type: string, id: string | number, userId?: string | number | null) => {
    console.log(`Delete confirmation opened for ${type}:`, { id, userId });
    
    // Check user permissions
    if (!canUserModify(userId)) {
      showSnackbar('You can only delete your own items.', 'error');
      return;
    }

    setDeleteConfirmation({ open: true, type, id });
  };

  const handleDeleteConfirmationClose = () => {
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsLoading(true);
    try {
      const newNoteObj = await leadsService.addLeadNote(lead.id, newNote.trim());
      setNotes([newNoteObj as Note, ...notes]);
      setNewNote('');
      showSnackbar('Note added successfully', 'success');
    } catch (error) {
      console.error('Failed to add note:', error);
      const err = error as Error;
      showSnackbar(err.message || 'Failed to add note', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsLoading(true);
    try {
      const newCommentObj = await leadsService.addLeadComment(lead.id, newComment.trim());
      setComments([newCommentObj as Comment, ...comments]);
      setNewComment('');
      showSnackbar('Comment added successfully', 'success');
    } catch (error) {
      console.error('Failed to add comment:', error);
      const err = error as Error;
      showSnackbar(err.message || 'Failed to add comment', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const created = await leadsService.uploadLeadAttachment(lead.id, file);
      const normalized =
        (created as any)?.attachment?.db || (created as any)?.attachment || (created as any);
      setAttachments([normalized as Attachment, ...attachments]);
      showSnackbar('File uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload file:', error);
      const err = error as Error;
      showSnackbar(err.message || 'Failed to upload file', 'error');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resolveAttachmentNameAndUrl = (raw: any): { filename: string; url: string } => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
    const filename =
      raw?.file_name ||
      raw?.filename ||
      raw?.name ||
      raw?.db?.file_name ||
      raw?.file?.originalName ||
      raw?.originalName ||
      'Untitled';

    const fileUrlPath =
      raw?.url ||
      raw?.file_url ||
      raw?.file_path ||
      raw?.db?.file_url ||
      '';

    const url = typeof fileUrlPath === 'string' && fileUrlPath
      ? (fileUrlPath.startsWith('http')
          ? fileUrlPath
          : `${apiBaseUrl}${fileUrlPath.startsWith('/') ? '' : '/'}${fileUrlPath}`)
      : '';

    return { filename: String(filename), url };
  };

  const handleDownloadAttachment = async (rawAttachment: any) => {
    const { filename, url } = resolveAttachmentNameAndUrl(rawAttachment);
    if (!url) {
      showSnackbar('Attachment URL missing', 'error');
      return;
    }

    const attachmentId = rawAttachment?.id ?? rawAttachment?.db?.id ?? null;
    setDownloadingAttachmentId(attachmentId);
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token') || '';
      const response = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const err = error as Error;
      console.error('Failed to download attachment:', err);
      showSnackbar(err.message || 'Failed to download attachment', 'error');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleDeleteNote = async (noteId: string | number) => {
    console.log('Attempting to delete note:', noteId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadNote(lead.id, noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      showSnackbar('Note deleted successfully', 'success');
      console.log('Note deleted successfully');
    } catch (error) {
      console.error('Failed to delete note:', error);
      const err = error as Error;
      showSnackbar(`Failed to delete note: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleDeleteComment = async (commentId: string | number) => {
    console.log('Attempting to delete comment:', commentId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadComment(lead.id, commentId);
      setComments(comments.filter(comment => comment.id !== commentId));
      showSnackbar('Comment deleted successfully', 'success');
      console.log('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      const err = error as Error;
      showSnackbar(`Failed to delete comment: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    console.log('Attempting to delete attachment:', attachmentId, 'for lead:', lead.id);
    try {
      setIsLoading(true);
      await leadsService.deleteLeadAttachment(lead.id, attachmentId);
      setAttachments(attachments.filter(attachment => attachment.id !== attachmentId));
      showSnackbar('Attachment deleted successfully', 'success');
      console.log('Attachment deleted successfully');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      const err = error as Error;
      showSnackbar(`Failed to delete attachment: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
    setDeleteConfirmation({ open: false, type: '', id: null });
  };

  // Edit handlers for notes and comments
  const handleEditNote = (note: Note) => {
    // Check user permissions
    if (!canUserModify(note.user_id)) {
      showSnackbar('You can only edit your own items.', 'error');
      return;
    }
    setEditingNote({ id: note.id, content: note.content });
  };

  const handleCancelEditNote = () => {
    setEditingNote({ id: null, content: '' });
  };

  const handleSaveEditNote = async () => {
    if (!editingNote.content.trim()) return;
    
    console.log('Attempting to update note:', editingNote.id);
    try {
      setIsLoading(true);
      const updatedNote = await leadsService.updateLeadNote(lead.id, editingNote.id!, editingNote.content.trim());
      setNotes(notes.map(note => note.id === editingNote.id ? (updatedNote as Note) : note));
      showSnackbar('Note updated successfully', 'success');
      setEditingNote({ id: null, content: '' });
    } catch (error) {
      console.error('Failed to update note:', error);
      const err = error as Error;
      showSnackbar(`Failed to update note: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    // Check user permissions
    if (!canUserModify(comment.user_id)) {
      showSnackbar('You can only edit your own items.', 'error');
      return;
    }
    setEditingComment({ id: comment.id, content: comment.content });
  };

  const handleCancelEditComment = () => {
    setEditingComment({ id: null, content: '' });
  };

  const handleSaveEditComment = async () => {
    if (!editingComment.content.trim()) return;
    
    console.log('Attempting to update comment:', editingComment.id);
    try {
      setIsLoading(true);
      const updatedComment = await leadsService.updateLeadComment(lead.id, editingComment.id!, editingComment.content.trim());
      setComments(comments.map(comment => comment.id === editingComment.id ? (updatedComment as Comment) : comment));
      showSnackbar('Comment updated successfully', 'success');
      setEditingComment({ id: null, content: '' });
    } catch (error) {
      console.error('Failed to update comment:', error);
      const err = error as Error;
      showSnackbar(`Failed to update comment: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    // Optimistic update - update UI immediately
    setCurrentStatus(status as Lead['status']);
    
    try {
      // Call the parent's status change handler
      if (onStatusChange) {
        await onStatusChange(lead.id, status);
      }
      // Use global snackbar for status updates
      showSnackbar('Status updated successfully', 'success');
    } catch (error) {
      // Revert the optimistic update on error
      setCurrentStatus(lead.status);
      showSnackbar('Failed to update status', 'error');
    }
  };

  // Overview tab edit handlers
  const handleStartEdit = () => {
    dispatch(setLeadCardEditingOverview(true));
    
    // Use getFieldValue helper to get values from lead object
    const formData = {
      // Lead Information
      email: String(getFieldValue<string>(lead, 'email') || ''),
      phone: String(getFieldValue<string>(lead, 'phone') || ''),
      company: String(getFieldValue<string>(lead, 'company') || ''),
      assignee: String(getFieldValue<string>(lead, 'assignee') || getFieldValue<string>(lead, 'assigned_to_id') || ''),
      source: String(getFieldValue<string>(lead, 'source') || ''),
      // Pipeline Information
      status: String(getFieldValue<string>(lead, 'status') || ''),
      priority: String(getFieldValue<string>(lead, 'priority') || ''),
      stage: String(getFieldValue<string>(lead, 'stage') || ''),
      // Deal Information
      amount: String(getFieldValue<number | string>(lead, 'amount') || ''),
      closeDate: String(getFieldValue<string>(lead, 'closeDate') || getFieldValue<string>(lead, 'close_date') || ''),
      expectedCloseDate: String(getFieldValue<string>(lead, 'expectedCloseDate') || getFieldValue<string>(lead, 'expected_close_date') || ''),
      // Description and Tags
      description: String(getFieldValue<string>(lead, 'description') || ''),
      tags: (lead.tags as string[]) || []
    };
    
    console.log('Starting edit with lead data:', lead);
    console.log('Initialized form data:', formData);
    dispatch(setLeadCardEditFormData(formData));
  };

  const handleCancelEdit = () => {
    dispatch(setLeadCardEditingOverview(false));
    setNewTagInput(''); // Reset tag input
    
    // Reset form data to original lead values using getFieldValue helper
    const originalFormData = {
      // Lead Information
      email: String(getFieldValue<string>(lead, 'email') || ''),
      phone: String(getFieldValue<string>(lead, 'phone') || ''),
      company: String(getFieldValue<string>(lead, 'company') || ''),
      assignee: String(getFieldValue<string>(lead, 'assignee') || getFieldValue<string>(lead, 'assigned_to_id') || ''),
      source: String(getFieldValue<string>(lead, 'source') || ''),
      // Pipeline Information
      status: String(getFieldValue<string>(lead, 'status') || ''),
      priority: String(getFieldValue<string>(lead, 'priority') || ''),
      stage: String(getFieldValue<string>(lead, 'stage') || ''),
      // Deal Information
      amount: String(getFieldValue<number | string>(lead, 'amount') || ''),
      closeDate: String(getFieldValue<string>(lead, 'closeDate') || getFieldValue<string>(lead, 'close_date') || ''),
      expectedCloseDate: String(getFieldValue<string>(lead, 'expectedCloseDate') || getFieldValue<string>(lead, 'expected_close_date') || ''),
      // Description and Tags
      description: String(getFieldValue<string>(lead, 'description') || ''),
      tags: (lead.tags as string[]) || []
    };
    
    dispatch(setLeadCardEditFormData(originalFormData));
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      const amountRaw = (globalEditFormData as any).amount;
      const parsedAmount =
        amountRaw === '' || amountRaw === null || amountRaw === undefined
          ? undefined
          : Number(amountRaw);
      const amount = Number.isFinite(parsedAmount as number) ? (parsedAmount as number) : undefined;

      const { amount: _ignoredAmount, ...restFormData } = (globalEditFormData as any) || {};

      // Prepare update data with proper field mapping
      const updateData = {
        ...restFormData,
        amount,
        // Ensure proper field mapping for backend (snake_case)
        assigned_to_id: globalEditFormData.assignee,
        close_date: globalEditFormData.closeDate,
        expected_close_date: globalEditFormData.expectedCloseDate
      };
      
      // Remove empty string values to avoid overwriting with empty data
      Object.keys(updateData).forEach((key: string) => {
        if ((updateData as Record<string, unknown>)[key] === '') {
          delete (updateData as Record<string, unknown>)[key];
        }
      });
      
      console.log('Updating lead with data:', updateData);
      console.log('Current globalEditFormData:', globalEditFormData);
      console.log('Original lead object:', lead);
      
      // Use Redux action instead of direct API call
      await dispatch(updateLeadAction(lead.id, updateData as Partial<PipelineLead>) as any);
      
      dispatch(setLeadCardEditingOverview(false));
      setNewTagInput(''); // Reset tag input on successful save
      showSnackbar('Lead updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update lead:', error);
      const err = error as Error;
      showSnackbar(`Failed to update lead: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormFieldChange = (field: string, value: unknown) => {
    dispatch(setLeadCardEditFormData({
      ...globalEditFormData,
      [field]: value
    }));
  };

  // Tag management functions
  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !globalEditFormData.tags.includes(newTag.trim())) {
      handleFormFieldChange('tags', [...globalEditFormData.tags, newTag.trim()]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleFormFieldChange('tags', globalEditFormData.tags.filter(tag => tag !== tagToRemove));
  };

  // Helper function to get assignee name
  const getAssigneeName = (assigneeId?: string | number | null): string => {
    if (!assigneeId) return 'Unassigned';
    
    if (teamMembersLoading) {
      return `Loading...`;
    }
    
    if (effectiveTeamMembers.length === 0) {
      return 'Former User';
    }
    
    const member = effectiveTeamMembers.find(m => {
      const matches = [
        m.id === assigneeId,
        m._id === assigneeId,
        String(m.id) === String(assigneeId),
        String(m._id) === String(assigneeId)
      ];
      return matches.some(match => match);
    });
    
    return member?.name || 'Former User';
  };

  // Helper function to get field value with fallback (local override)
  const getFieldValueLocal = (obj: unknown, field: string): string => {
    if (!obj || typeof obj !== 'object') return '';
    const objRecord = obj as Record<string, unknown>;
    return String(objRecord[field] || objRecord[field.replace(/([A-Z])/g, '_$1').toLowerCase()] || '');
  };

  const normalizeDisplayValue = (value: unknown, fallback = '-'): string => {
    if (value === null || value === undefined) return fallback;
    const asString = String(value).trim();
    if (!asString || asString === 'null' || asString === 'undefined') return fallback;
    return asString;
  };

  const getLeadDisplayName = (leadObj: any): string => {
    const name = normalizeDisplayValue(leadObj?.name, '').trim();
    if (name) return name;

    const firstName = normalizeDisplayValue(leadObj?.first_name ?? leadObj?.firstName, '').trim();
    const lastName = normalizeDisplayValue(leadObj?.last_name ?? leadObj?.lastName, '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;

    const contactName = normalizeDisplayValue(leadObj?.contact_name ?? leadObj?.contactName, '').trim();
    if (contactName) return contactName;

    const email = normalizeDisplayValue(leadObj?.email, '').trim();
    if (email) return email;

    return 'Unnamed Lead';
  };

  // Helper function to format date for input fields
  const formatDateForInput = (dateString?: string | Date | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  // Helper function to get display label for options
  const getOptionLabel = (options: Array<{ key: string; label: string }>, key?: string): string => {
    const option = options.find(opt => opt.key === key);
    return option?.label ?? key ?? '';
  };

  const formatCurrency = (amount?: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString?: string | Date | number | null): string => {
    if (!dateString) return 'No date set';
    
    // Handle various date formats and invalid dates
    try {
      let date;
      
      // If it's already a Date object
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        // Handle empty strings, 'null', 'undefined' strings
        if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
          return 'No date set';
        }
        date = new Date(dateString);
      } else if (typeof dateString === 'number') {
        // Handle Unix timestamps (both seconds and milliseconds)
        date = new Date(dateString < 10000000000 ? dateString * 1000 : dateString);
      } else {
        return 'Invalid date';
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Check for unrealistic dates (before 1900 or too far in future)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
  } catch (error) {
    const err = error as Error;
    console.warn('Date formatting error:', { dateString, error: err.message });
      return 'Invalid date';
    }
  };

  const getProgressValue = (): number => {
    return ((currentStage + 1) / totalStages) * 100;
  };

  const getDaysRemaining = (): number | null => {
    const closeDate = getFieldValueLocal(lead, 'closeDate');
    if (!closeDate) return null;
    
    try {
      const closeDateObj = new Date(closeDate);
      if (isNaN(closeDateObj.getTime())) return null;
      
      const today = new Date();
      const diffTime = closeDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  const getStatusColor = (status?: string | null): string => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'blocked': return '#EF4444';
      case 'inactive': return '#64748B';
      case 'new': return '#3B82F6';
      case 'completed': return '#059669';
      default: return '#64748B';
    }
  };

  const getProbabilityColor = (prob: number): string => {
    if (prob >= 70) return '#10B981';
    if (prob >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusIcon = (status?: string | null): React.ReactElement => {
    const iconClass = "h-4 w-4";
    switch (status?.toLowerCase()) {
      case 'active': return <CheckCircle2 className={iconClass} />;
      case 'blocked': return <AlertCircle className={iconClass} />;
      case 'pending': return <Flag className={iconClass} />;
      case 'inactive': return <Ban className={iconClass} />;
      case 'new': return <Sparkles className={iconClass} />;
      case 'completed': return <CheckCheck className={iconClass} />;
      default: return <Flag className={iconClass} />;
    }
  };

  const getActivityTrend = (): number => {
    if (!activityData.length || activityData.length < 2) return 0;
    const recent = activityData.slice(-2);
    return (recent[1] || 0) - (recent[0] || 0);
  };

  const handleClose = () => {
    if (onExternalDetailsClose) {
      onExternalDetailsClose();
    } else {
      setDetailsOpen(false);
    }
    dispatch(setLeadCardExpanded(false));
    setNewNote('');
    setNewComment('');
    dispatch(setLeadCardActiveTab(0)); 
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 4000);
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirmation;
    console.log('handleConfirmDelete called with:', { type, id });
    
    if (type && id) {
      // Handle item deletion (note, comment, attachment)
      switch (type) {
        case 'note':
          console.log('Calling handleDeleteNote for note ID:', id);
          await handleDeleteNote(id);
          break;
        case 'comment':
          console.log('Calling handleDeleteComment for comment ID:', id);
          await handleDeleteComment(id);
          break;
        case 'attachment':
          console.log('Calling handleDeleteAttachment for attachment ID:', id);
          await handleDeleteAttachment(id);
          break;
        default:
          console.log('Unknown delete type:', type);
          break;
      }
    } else {
      // Handle lead deletion
      if (onDelete) {
        setIsLoading(true);
        try {
          await onDelete(lead.id);
          setDeleteDialogOpen(false);
          showSnackbar('Lead deleted successfully', 'success');
        } catch (error) {
          showSnackbar('Failed to delete lead', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleTabChange = (newValue: string) => {
    dispatch(setLeadCardActiveTab(parseInt(newValue)));
  };

  const tabs: Array<{ label: string; index: number; content: React.ReactNode }> = [
    { 
      label: 'Overview', 
      index: 0,
      content: (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Lead Information
              </h3>
              <div className="flex flex-col gap-4">
                {globalEditingOverview ? (
                  <>
                    <div className="relative">
                      <Label htmlFor="email" className="text-sm text-gray-600 mb-1 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={globalEditFormData.email || ''}
                          onChange={(e) => handleFormFieldChange('email', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="phone" className="text-sm text-gray-600 mb-1 block">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={globalEditFormData.phone || ''}
                          onChange={(e) => handleFormFieldChange('phone', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="company" className="text-sm text-gray-600 mb-1 block">Company</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="company"
                          value={globalEditFormData.company || ''}
                          onChange={(e) => handleFormFieldChange('company', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="assignee" className="text-sm text-gray-600 mb-1 block">Assignee</Label>
                      <Select
                        value={globalEditFormData.assignee || 'unassigned'}
                        onValueChange={(value: string) => handleFormFieldChange('assignee', value === 'unassigned' ? '' : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select assignee..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {effectiveTeamMembers.map((member) => {
                            const memberId = String(member.id || '');
                            if (!memberId) return null;
                            return (
                              <SelectItem key={member.id} value={memberId}>
                                {member.name || member.email || 'Unknown'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="source" className="text-sm text-gray-600 mb-1 block">Source</Label>
                      <Select
                        value={globalEditFormData.source || undefined}
                        onValueChange={(value: string) => handleFormFieldChange('source', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select source..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceOptions
                            .filter((option) => option.key && String(option.key).trim() !== '')
                            .map((option) => (
                              <SelectItem key={option.key} value={String(option.key)}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{String(lead.phone) || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{String(lead.company) || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getAssigneeName((lead.assignee || lead.assigned_to_id) as string | number | null | undefined)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getOptionLabel(sourceOptions, String(lead.source) || undefined) || 'No source'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Pipeline & Deal Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Pipeline & Deal Information
              </h3>
              <div className="flex flex-col gap-4">
                {globalEditingOverview ? (
                  <>
                    <div>
                      <Label htmlFor="status" className="text-sm text-gray-600 mb-1 block">Status</Label>
                      <Select
                        value={globalEditFormData.status || undefined}
                        onValueChange={(value: string) => handleFormFieldChange('status', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions
                            .filter((option) => option.key && String(option.key).trim() !== '')
                            .map((option) => (
                              <SelectItem key={option.key} value={String(option.key)}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority" className="text-sm text-gray-600 mb-1 block">Priority</Label>
                      <Select
                        value={globalEditFormData.priority || undefined}
                        onValueChange={(value: string) => handleFormFieldChange('priority', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions
                            .filter((option) => option.key && String(option.key).trim() !== '')
                            .map((option) => (
                              <SelectItem key={option.key} value={String(option.key)}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stage" className="text-sm text-gray-600 mb-1 block">Stage</Label>
                      <Select
                        value={globalEditFormData.stage || undefined}
                        onValueChange={(value: string) => handleFormFieldChange('stage', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select stage..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stageOptions
                            .filter((option) => option.key && String(option.key).trim() !== '')
                            .map((option) => (
                              <SelectItem key={option.key} value={String(option.key)}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="relative">
                      <Label htmlFor="amount" className="text-sm text-gray-600 mb-1 block">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        <Input
                          id="amount"
                          type="number"
                          value={globalEditFormData.amount || ''}
                          onChange={(e) => handleFormFieldChange('amount', parseFloat(e.target.value) || 0)}
                          className="pl-10"
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="closeDate" className="text-sm text-gray-600 mb-1 block">Close Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="closeDate"
                          type="date"
                          value={globalEditFormData.closeDate ? formatDateForInput(globalEditFormData.closeDate) : ''}
                          onChange={(e) => handleFormFieldChange('closeDate', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="expectedCloseDate" className="text-sm text-gray-600 mb-1 block">Expected Close Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
                        <Input
                          id="expectedCloseDate"
                          type="date"
                          value={globalEditFormData.expectedCloseDate ? formatDateForInput(globalEditFormData.expectedCloseDate) : ''}
                          onChange={(e) => handleFormFieldChange('expectedCloseDate', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(lead.status)}
                      <span className="text-gray-900">
                        {getOptionLabel(statusOptions, lead.status) || 'No status'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getOptionLabel(priorityOptions, String(lead.priority) || undefined) || 'No priority'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getOptionLabel(stageOptions, lead.stage) || lead.stage || 'No stage'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-gray-900">
                        {formatCurrency((lead.amount as number) || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-gray-900">
                          Close Date: {formatDate(getFieldValueLocal(lead, 'closeDate')) || 'Not set'}
                        </span>
                        {(() => { const days = getDaysRemaining(); return days !== null && days < 7 ? (
                          <Chip className="ml-2 bg-red-100 text-red-600 text-xs">
                            {`${days} days left`}
                          </Chip>
                        ) : null; })()}
                      </div>
                    </div>
                    {getFieldValueLocal(lead, 'expectedCloseDate') && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-900">
                          Expected Close: {formatDate(getFieldValueLocal(lead, 'expectedCloseDate'))}
                        </span>
                      </div>
                    )}
                    {getFieldValueLocal(lead, 'lastActivity') && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span className="text-gray-900">
                          Last Activity: {formatDate(getFieldValueLocal(lead, 'lastActivity'))}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Schedule Appointment Section */}
            <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Schedule Appointment
              </h3>
              <div className="flex flex-col gap-4">
                {globalEditingOverview ? (
                  <BookingSlot 
                    leadId={lead.id} 
                    tenantId={tenantId || undefined}
                    studentId={studentId || undefined}
                    assignedUserId={assignedUserId || undefined}
                    createdBy={createdBy || undefined}
                    users={users}
                    isEditMode={true}
                  />
                ) : (
                  <BookingSlot 
                    leadId={lead.id} 
                    tenantId={tenantId || undefined}
                    studentId={studentId || undefined}
                    assignedUserId={assignedUserId || undefined}
                    createdBy={createdBy || undefined}
                    users={users}
                    isEditMode={false}
                  />
                )}
              </div>
            </div>

            {/* Tags Section */}
            <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Tags
              </h3>
              {globalEditingOverview ? (
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Input
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                          setNewTagInput('');
                        }
                      }}
                      placeholder="Enter tag and press Enter"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        handleAddTag(newTagInput);
                        setNewTagInput('');
                      }}
                      disabled={!newTagInput.trim()}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {globalEditFormData.tags && Array.isArray(globalEditFormData.tags) && globalEditFormData.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {allTags.map((tag, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className="text-xs hover:bg-gray-100 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      No tags assigned
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },
    { 
      label: `Notes (${notes.length})`, 
      index: 1,
      content: (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <Label htmlFor="new-note" className="text-sm font-medium text-gray-700">
              Add a private note
            </Label>
            <Textarea
              id="new-note"
              rows={3}
              placeholder="Add a private note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={isLoading}
              className="mt-2"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                Add Note
              </Button>
            </div>
          </div>
          
          {notesLoading ? (
            <div className="flex justify-center py-6">
              <p className="text-sm text-gray-500">Loading notes...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No notes yet. Add your first note above.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {note.user_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {editingNote.id !== note.id && canUserModify(note.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditNote(note)}
                            className="h-7 w-7 text-gray-500 hover:text-blue-500"
                          >
                            ✏️
                          </Button>
                        )}
                        {canUserModify(note.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfirmationOpen('note', note.id, note.user_id)}
                            className="h-7 w-7 text-gray-500 hover:text-red-500"
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      {editingNote.id === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            value={editingNote.content}
                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEditNote}
                              disabled={isLoading}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditNote}
                              className="border-gray-300 text-gray-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )
    },
    { 
      label: `Comments (${comments.length})`, 
      index: 2,
      content: (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <Label htmlFor="new-comment" className="text-sm font-medium text-gray-700">
              Add a public comment
            </Label>
            <Textarea
              id="new-comment"
              placeholder="Add a public comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isLoading}
              className="mt-2"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                Add Comment
              </Button>
            </div>
          </div>
          
          {commentsLoading ? (
            <div className="flex justify-center py-6">
              <p className="text-sm text-gray-500">Loading comments...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No comments yet. Add your first comment above.
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comment.user_name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {editingComment.id !== comment.id && canUserModify(comment.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditComment(comment)}
                            className="h-7 w-7 text-gray-500 hover:text-blue-500"
                          >
                            ✏️
                          </Button>
                        )}
                        {canUserModify(comment.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteConfirmationOpen('comment', comment.id, comment.user_id)}
                            className="h-7 w-7 text-gray-500 hover:text-red-500"
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      {editingComment.id === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            value={editingComment.content}
                            onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEditComment}
                              disabled={isLoading}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEditComment}
                              className="border-gray-300 text-gray-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )
    },
    { 
      label: `Attachments (${attachments.length})`, 
      index: 3,
      content: (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full h-24 border-dashed border-2 border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500"
            >
              Drop files here or click to upload
            </Button>
          </div>

          {attachmentsLoading ? (
            <div className="flex justify-center py-6">
              <p className="text-sm text-gray-500">Loading attachments...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attachments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No attachments yet. Upload your first file above.
                  </p>
                </div>
              ) : (
                attachments.map((rawAttachment, index) => {
                  const { filename } = resolveAttachmentNameAndUrl(rawAttachment as any);
                  const attachmentKey = String(
                    (rawAttachment as any)?.id ??
                      (rawAttachment as any)?.db?.id ??
                      (rawAttachment as any)?.file_url ??
                      (rawAttachment as any)?.db?.file_url ??
                      `attachment-${index}`
                  );
                  const attachmentId = (rawAttachment as any)?.id ?? (rawAttachment as any)?.db?.id ?? null;
                  const isDownloading = downloadingAttachmentId !== null && attachmentId === downloadingAttachmentId;

                  return (
                    <div
                      key={attachmentKey}
                      className="max-w-[420px] rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{filename}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          disabled={isLoading || isDownloading}
                          onClick={() => handleDownloadAttachment(rawAttachment)}
                          className="border-gray-300 text-gray-700"
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                        {canUserModify((rawAttachment as any)?.user_id) && (
                          <Button
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleDeleteConfirmationOpen('attachment', (rawAttachment as any)?.id ?? (rawAttachment as any)?.db?.id, (rawAttachment as any)?.user_id)}
                            className="border-gray-300 text-gray-700"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  const renderDetailsDialog = () => (
    <Dialog 
      open={isDetailsOpen} 
      onOpenChange={(isOpen) => !isOpen && handleClose()}
    >
      <DialogContent className="flex flex-col max-h-[90vh] p-0 overflow-hidden" showCloseButton={false}>
        <DialogTitle className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {lead.avatar ? (
                  <img src={lead.avatar} alt={getLeadDisplayName(lead) || 'Lead avatar'} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span className="text-base font-semibold text-white bg-blue-500 h-full w-full rounded-full flex items-center justify-center">
                    {getLeadDisplayName(lead).charAt(0) || 'L'}
                  </span>
                )}
              </Avatar>
              <div>
                <p className="text-base font-semibold text-gray-900">{getLeadDisplayName(lead)}</p>
                {normalizeDisplayValue((lead.company ?? (lead as any).company_name) as unknown, '') && (
                  <p className="text-sm text-gray-500">{normalizeDisplayValue((lead.company ?? (lead as any).company_name) as unknown)}</p>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-gray-500 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogTitle>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="w-full">
            <Tabs 
              value={String(globalActiveTab)} 
              onValueChange={(value) => dispatch(setLeadCardActiveTab(parseInt(value, 10)))}
              className="flex flex-col"
            >
              <div className="border-b border-gray-200 px-6 sticky top-0 bg-white z-10">
                <TabsList className="flex gap-2">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.index}
                      value={String(tab.index)}
                      className="px-3 py-1 text-sm"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {tabs.map((tab) => (
                <TabsContent 
                  key={tab.index} 
                  value={String(tab.index)}
                  className="flex flex-col mt-0 p-6"
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
        
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-white">
          {globalActiveTab === 0 && (
            globalEditingOverview ? (
              <div className="flex gap-2 ml-auto">
                <Button
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStartEdit}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white"
              >
                Edit Lead
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // If hideCard is true, only render the dialog
  if (hideCard) {
    return <>{renderDetailsDialog()}</>;
  }

  const assignedPreview = assignedUsers.slice(0, isMobile ? 2 : 3);
  const remainingAssignees = Math.max(assignedUsers.length - assignedPreview.length, 0);
  const showDetails = globalExpanded || !isMobile;
  const trendValue = getActivityTrend();
  const progressValue = getProgressValue();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      // CRITICAL: Do NOT spread {...listeners} here - it blocks ALL click events
      role="presentation"
    >
      <div
        className={`relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition ${
          isDragging ? 'opacity-50 cursor-grabbing' : 'hover:shadow-md'
        }`}
        // Enable pointer events on card for clicks
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
        onClick={handleCardClick}
        onKeyDown={handleKeyPress}
        role="button"
        tabIndex={0}
      >
        <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getProgressValue()}%` }}
          />
        </div>

        <div className="flex items-start gap-3">
          {/* CRITICAL: Apply drag listeners ONLY to drag handle */}
          <button
            type="button"
            data-ignore-card-click
            className="drag-handle text-gray-400 hover:text-gray-600 mt-1 cursor-grab active:cursor-grabbing"
            {...listeners}
            onMouseDown={handleDragHandleMouseDown}
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start gap-2">
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 min-w-0">
                {getLeadDisplayName(lead)}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500" title={`Success Probability: ${probability}%`}>
                <Progress value={probability} className="h-2 w-16" />
                <span>{probability}%</span>
              </div>
            </div>
            {normalizeDisplayValue((lead.company ?? (lead as any).company_name) as unknown, '') && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {normalizeDisplayValue((lead.company ?? (lead as any).company_name) as unknown)}
              </p>
            )}
          </div>
          {activityData.length > 0 && (
            <span
              className={`text-xs flex items-center gap-1 ${trendValue > 0 ? 'text-green-500' : 'text-red-500'}`}
              title="Activity trend"
            >
              {trendValue > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" data-ignore-card-click className="focus:outline-none">
                <Badge className="text-xs flex items-center gap-1" style={{ backgroundColor: '#172560', color: 'white' }}>
                  {getStatusIcon(currentStatus)}
                  {getStatusLabel(currentStatus, statusOptions)}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {statusOptions.map((statusOption) => (
                <DropdownMenuItem
                  key={statusOption.key}
                  onSelect={() => handleStatusChange(statusOption.key)}
                  className="flex items-center gap-2"
                >
                  {getStatusIcon(statusOption.key)}
                  <span>{statusOption.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button" 
                data-ignore-card-click 
                className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem
                onSelect={() => setDeleteDialogOpen(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Lead</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {assignedPreview.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {assignedPreview.map((user) => (
                <Avatar
                  key={user.id || user.name}
                  className="h-6 w-6 border-2 border-white bg-blue-100 text-blue-700 text-xs"
                >
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              ))}
              {remainingAssignees > 0 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 text-xs flex items-center justify-center border-2 border-white">
                  +{remainingAssignees}
                </div>
              )}
            </div>
          </div>
        )}

        {showDetails && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <span className="flex items-center gap-1 font-semibold text-green-600">
                <DollarSign className="h-4 w-4" />
                {formatCurrency((lead.amount as number) || 0)}
              </span>
              {(lead.closeDate as string | undefined) && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    (() => { const days = getDaysRemaining(); return days !== null && days < 7 ? 'text-red-500' : 'text-gray-500'; })()
                  }`}
                  title={(() => { const days = getDaysRemaining(); return days !== null ? `Due in ${days} days` : undefined; })()}
                >
                  <Calendar className="h-4 w-4" />
                  {formatDate((lead.closeDate as string) || undefined)}
                </span>
              )}
            </div>

            {(lead.description as string | undefined) && (
              <p className="text-sm text-gray-600">{String(lead.description as unknown)}</p>
            )}

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-gray-100 pt-2 text-xs text-gray-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(getFieldValueLocal(lead, 'createdAt'))}
          </span>
          <div className="flex items-center gap-3">
            {notes.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {notes.length}
              </span>
            )}
            {comments.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {comments.length}
              </span>
            )}
            {attachments.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                {attachments.length}
              </span>
            )}
          </div>
        </div>
        </div>

      {renderDetailsDialog()}

      <Dialog open={deleteDialogOpen}>
        <DialogContent showCloseButton={false} className="p-6 pt-2">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#3A3A4F]">Delete Lead</span>
            <button
              onClick={handleDeleteDialogClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <p className="mt-4">Are you sure you want to delete {getLeadDisplayName(lead)}? This action cannot be undone.</p>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleDeleteDialogClose} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmation.open}>
        <DialogContent showCloseButton={false} className="p-6 pt-2">
          <DialogTitle className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#3A3A4F]">
              Delete {String(deleteConfirmation.type?.charAt(0).toUpperCase() + deleteConfirmation.type?.slice(1))}
            </span>
            <button
              onClick={handleDeleteConfirmationClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
          <p className="mt-4">Are you sure you want to delete this {String(deleteConfirmation.type)}? This action cannot be undone.</p>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleDeleteConfirmationClose} className="border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {snackbar.open && (
        <div
          className={`fixed bottom-4 right-4 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${snackbarClasses[snackbar.severity]}`}
        >
          {snackbar.message}
        </div>
      )}
    </div>
  );
};

export default React.memo(PipelineLeadCard, (prevProps, nextProps) => {
  // Comprehensive comparison to prevent unnecessary re-renders
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.status === nextProps.lead.status &&
    prevProps.lead.priority === nextProps.lead.priority &&
    prevProps.lead.stage === nextProps.lead.stage &&
    prevProps.lead.name === nextProps.lead.name &&
    prevProps.lead.amount === nextProps.lead.amount &&
    prevProps.lead.company === nextProps.lead.company &&
    prevProps.hideCard === nextProps.hideCard &&
    prevProps.isPreview === nextProps.isPreview &&
    prevProps.externalDetailsOpen === nextProps.externalDetailsOpen
    // Note: activeCardId intentionally excluded - handled by parent's activeCard state
  );
}); 