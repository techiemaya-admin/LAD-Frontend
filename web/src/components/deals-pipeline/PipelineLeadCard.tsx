import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { safeStorage } from '../../utils/storage';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '../../app/components/ui/dialog';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Textarea } from '../../app/components/ui/textarea';
import { Select } from '../../app/components/ui/select';
import { Label } from '../../app/components/ui/label';
import { Chip } from '../../app/components/ui/chip';
import { Avatar } from '../../app/components/ui/avatar';
import { Tabs, Tab } from '../../app/components/ui/tabs';
import { Progress } from '../../app/components/ui/progress';
import { Checkbox } from '../../app/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../app/components/ui/dropdown-menu';
import {
  User as UserIcon, Mail, Phone, Clock, Paperclip, MessageSquare, FileText, GripVertical,
  Trash2, MoreVertical, Building2, DollarSign, Calendar, Flag, CheckCircle2,
  AlertCircle, TrendingUp, TrendingDown, X, Edit, Save, XCircle, Plus,
  UserCircle, AlertTriangle, FolderTree, Ban, Sparkles, CheckCheck, Copy, Archive
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import leadsService from '../../services/leadsService';
import AttachmentPreview from '../common/AttachmentPreview';
import { getStatusLabel } from '../../utils/statusMappings';
import { getFieldValue } from '../../utils/fieldMappings';
import { selectStatuses, selectPriorities, selectSources } from '../../store/slices/masterDataSlice';
import { selectStages } from '../../store/slices/pipelineSlice';
import { updateLeadAction, deleteLeadAction } from '../../store/actions/pipelineActions';
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
} from '../../store/slices/uiSlice';
import { 
  selectUsers, 
  selectUsersLoading, 
  selectUsersError,
  User
} from '../../store/slices/usersSlice';
import { fetchUsersAction } from '../../store/actions/usersActions';
import { Lead } from '../leads/types';

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
  
  // Local state for current status to handle optimistic updates
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  
  // Local states that remain component-specific
  const [newTagInput, setNewTagInput] = useState('');

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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
    disabled: isPreview || isDetailsOpen
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
      dispatch(resetLeadCardEditFormData(lead));
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
            const fetchedAttachments = await leadsService.getLeadAttachments(lead.id);
            setAttachments(fetchedAttachments as Attachment[]);
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

  const handleCardClick = (event?: React.MouseEvent) => {
    if (!event) return;
    const target = event.target as HTMLElement;
    if (
      isDragging ||
      isDraggable ||
      target.closest('[data-ignore-card-click]') ||
      target.closest('[role="dialog"]') ||
      target.closest('.drag-handle')
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDetailsOpen(true);
  };

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
      const newAttachment = await leadsService.uploadLeadAttachment(lead.id, file);
      setAttachments([newAttachment as Attachment, ...attachments]);
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
      // Prepare update data with proper field mapping
      const updateData = {
        ...globalEditFormData,
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
      await dispatch(updateLeadAction(lead.id, updateData as Partial<Lead>) as any);
      
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
                        id="assignee"
                        value={globalEditFormData.assignee || ''}
                        onChange={(e) => handleFormFieldChange('assignee', e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select assignee...</option>
                        {effectiveTeamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="source" className="text-sm text-gray-600 mb-1 block">Source</Label>
                      <Select
                        id="source"
                        value={globalEditFormData.source || ''}
                        onChange={(e) => handleFormFieldChange('source', e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select source...</option>
                        {sourceOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
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
                      <span className="text-gray-900">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{lead.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getAssigneeName(lead.assignee || lead.assigned_to_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getOptionLabel(sourceOptions, lead.source) || 'No source'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Pipeline Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Pipeline Information
              </h3>
              <div className="flex flex-col gap-4">
                {globalEditingOverview ? (
                  <>
                    <div>
                      <Label htmlFor="status" className="text-sm text-gray-600 mb-1 block">Status</Label>
                      <Select
                        id="status"
                        value={globalEditFormData.status || ''}
                        onChange={(e) => handleFormFieldChange('status', e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select status...</option>
                        {statusOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority" className="text-sm text-gray-600 mb-1 block">Priority</Label>
                      <Select
                        id="priority"
                        value={globalEditFormData.priority || ''}
                        onChange={(e) => handleFormFieldChange('priority', e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select priority...</option>
                        {priorityOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stage" className="text-sm text-gray-600 mb-1 block">Stage</Label>
                      <Select
                        id="stage"
                        value={globalEditFormData.stage || ''}
                        onChange={(e) => handleFormFieldChange('stage', e.target.value)}
                        className="w-full"
                      >
                        <option value="">Select stage...</option>
                        {stageOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
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
                        {getOptionLabel(priorityOptions, lead.priority) || 'No priority'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">
                        {getOptionLabel(stageOptions, lead.stage) || lead.stage || 'No stage'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Deal Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Deal Information
              </h3>
              <div className="flex flex-col gap-4">
                {globalEditingOverview ? (
                  <>
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
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-gray-900">
                        {formatCurrency(lead.amount || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-gray-900">
                          Close Date: {formatDate(getFieldValueLocal(lead, 'closeDate')) || 'Not set'}
                        </span>
                        {getDaysRemaining() !== null && getDaysRemaining() < 7 && (
                          <Chip className="ml-2 bg-red-100 text-red-600 text-xs">
                            {`${getDaysRemaining()} days left`}
                          </Chip>
                        )}
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

            {/* Description Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-base font-semibold mb-4 text-gray-900">
                Description
              </h3>
              {globalEditingOverview ? (
                <Textarea
                  value={globalEditFormData.description || ''}
                  onChange={(e) => handleFormFieldChange('description', e.target.value)}
                  placeholder="Enter lead description..."
                  rows={3}
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {lead.description || 'No description provided'}
                </p>
              )}
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
                    {globalEditFormData.tags && globalEditFormData.tags.map((tag, index) => (
                      <Chip 
                        key={index}
                        className="bg-gray-200 text-gray-900 text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {allTags.map((tag, index) => (
                    <Chip 
                      key={index}
                      className="bg-gray-200 text-gray-900 text-xs hover:bg-gray-300 transition-colors"
                    >
                      {tag}
                    </Chip>
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
                attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment as any}
                    onDelete={canUserModify(attachment.user_id) ? (attachmentId: string | number, userId?: string | number) => handleDeleteConfirmationOpen('attachment', attachmentId, userId) : null}
                  />
                ))
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
      <DialogTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {lead.avatar ? (
                <img src={lead.avatar} alt={lead.name || 'Lead avatar'} className="h-full w-full object-cover rounded-full" />
              ) : (
                <span className="text-base font-semibold text-white bg-blue-500 h-full w-full rounded-full flex items-center justify-center">
                  {lead.name?.charAt(0) || 'L'}
                </span>
              )}
            </Avatar>
            <div>
              <p className="text-base font-semibold text-gray-900">{lead.name}</p>
              {lead.company && (
                <p className="text-sm text-gray-500">{lead.company}</p>
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
      
      <DialogContent className="flex-1 overflow-hidden p-0">
        <div className="w-full">
          <div className="border-b border-gray-200 px-6">
            <Tabs 
              value={String(globalActiveTab)} 
              onValueChange={(value) => dispatch(setLeadCardActiveTab(parseInt(value, 10)))}
              className="flex gap-2 py-2"
            >
              {tabs.map((tab) => (
                <Tab 
                  key={tab.index}
                  value={String(tab.index)}
                  label={tab.label}
                  className="px-3 py-1 text-sm"
                />
              ))}
            </Tabs>
          </div>

          {tabs.map((tab) => (
            <TabPanel key={tab.index} value={globalActiveTab} index={tab.index}>
              {tab.content}
            </TabPanel>
          ))}
        </div>
      </DialogContent>

      <DialogActions className="border-t border-gray-200 px-6 py-4">
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
      </DialogActions>
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
      {...listeners}
      onClick={handleCardClick}
      onKeyDown={handleKeyPress}
      onTouchStart={handleTouchStart}
      role="button"
      tabIndex={0}
    >
      <div
        className={`relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition ${
          isDragging ? 'opacity-50' : 'hover:shadow-md'
        }`}
      >
        <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getProgressValue()}%` }}
          />
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            data-ignore-card-click
            className="drag-handle text-gray-400 hover:text-gray-600 mt-1"
            onMouseDown={handleDragHandleMouseDown}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start gap-2">
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 min-w-0">
                {lead.name}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500" title={`Success Probability: ${probability}%`}>
                <Progress value={probability} className="h-2 w-16" />
                <span>{probability}%</span>
              </div>
            </div>
            {lead.company && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {lead.company}
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
                <Chip className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                  {getStatusIcon(currentStatus)}
                  {getStatusLabel(currentStatus, statusOptions)}
                </Chip>
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
                {formatCurrency(lead.amount || 0)}
              </span>
              {lead.closeDate && (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    getDaysRemaining() !== null && getDaysRemaining() < 7 ? 'text-red-500' : 'text-gray-500'
                  }`}
                  title={getDaysRemaining() !== null ? `Due in ${getDaysRemaining()} days` : undefined}
                >
                  <Calendar className="h-4 w-4" />
                  {formatDate(lead.closeDate)}
                </span>
              )}
            </div>

            {lead.description && (
              <p className="text-sm text-gray-600">{lead.description}</p>
            )}

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag, index) => (
                  <Chip key={index} className="bg-gray-100 text-gray-700 text-xs">
                    {tag}
                  </Chip>
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

        {renderDetailsDialog()}

        <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => !isOpen && handleDeleteDialogClose()}>
          <DialogTitle>Delete Lead</DialogTitle>
          <DialogContent>
            <p>Are you sure you want to delete {lead.name}? This action cannot be undone.</p>
          </DialogContent>
          <DialogActions className="px-6 py-4">
            <Button variant="outline" onClick={handleDeleteDialogClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteConfirmation.open} onOpenChange={(isOpen) => !isOpen && handleDeleteConfirmationClose()}>
          <DialogTitle>
            Delete {deleteConfirmation.type?.charAt(0).toUpperCase() + deleteConfirmation.type?.slice(1)}
          </DialogTitle>
          <DialogContent>
            <p>Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.</p>
          </DialogContent>
          <DialogActions className="px-6 py-4">
            <Button variant="outline" onClick={handleDeleteConfirmationClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {snackbar.open && (
          <div
            className={`fixed bottom-4 right-4 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${snackbarClasses[snackbar.severity]}`}
          >
            {snackbar.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineLeadCard; 